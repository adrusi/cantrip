import {
  type DefaultBoundFor,
  type DefaultFor,
  type AbstractDict,
  type AbstractDictP,
  type DictP,
  type TransientDictP,
  type DictMut,
  IS_ABSTRACT_DICT,
  NOT_PRESENT,
  isDict,
} from "../types/dict"
import { eq, hash, hashObject } from "@cantrip/core"
import { EQ, HASH } from "@cantrip/compat/core"
import {
  IS_ABSTRACT_COLL,
  IS_COLL,
  IS_ABSTRACT_COLL_P,
  IS_COLL_P,
  IS_TRANSIENT_COLL_P,
  IS_ORDERED,
} from "../types/coll"
import { IS_ABSTRACT_ASSOC_COLL } from "../types/assoc-coll"
import { IS_ABSTRACT_KEY_COLL } from "../types/key-coll"
import {
  IS_ITERATOR,
  IS_SIZE_ITERABLE,
  ITERATOR,
  type IteratorResult,
  SIZE,
  type SizeIterator,
} from "@cantrip/compat/iter"
import { Iter, type IterableOrIterator, type SizeIter } from "@cantrip/iter"
import { hashCollection } from "../hash"
import { HostedHashDict } from "./hosted-hash-dict"

const HASH_ARRAY_MAPPED_TRIE_DICT_GUARD = Symbol(
  "HASH_ARRAY_MAPPED_TRIE_DICT_GUARD",
)

const BIT_WIDTH = 5
const BRANCH_FACTOR = 0x1 << BIT_WIDTH
const MASK = BRANCH_FACTOR - 1
const MAX_SHIFT = Math.floor(32 / BIT_WIDTH) * BIT_WIDTH

type Entry<K, V> = { key: K; value: V; next: null | Entry<K, V> }

class Node<K, V> {
  public editToken: symbol | null
  public bitmap: number
  public array: (Entry<K, V> | Node<K, V>)[]

  public constructor(
    edit: symbol | null,
    bitmap: number,
    array: (Entry<K, V> | Node<K, V>)[],
  ) {
    this.editToken = edit
    this.bitmap = bitmap
    this.array = array
  }

  public static create<K, V>(edit: symbol | null = null): Node<K, V> {
    return new Node(edit, 0, [])
  }

  public static from<K, V>(
    src: Node<K, V>,
    edit: symbol | null = null,
  ): Node<K, V> {
    const result: Node<K, V> = new Node(
      edit,
      src.bitmap,
      new Array(src.array.length),
    )
    for (let i = 0; i < src.array.length; i++) result.array[i] = src.array[i]
    return result
  }

  public editable(token: symbol | null): Node<K, V> {
    if (token === null) {
      if (this.editToken === null) return this
      return Node.from(this)
    }
    return this.editToken === token ? this : Node.from(this, token)
  }

  public iter(): Iter<[K, V]> {
    const array = this.array
    let i = 0
    let bucket: Entry<K, V> | null = null
    let child: Iter<[K, V]> | null = null

    return Iter.from({
      [IS_ITERATOR]: true,

      next(): IteratorResult<[K, V]> {
        while (true) {
          if (bucket !== null) {
            const value: [K, V] = [bucket.key, bucket.value]
            bucket = bucket.next
            return { done: false, value }
          }

          if (child !== null) {
            const { done, value } = child.next()
            if (done) {
              child = null
            } else {
              return { done: false, value }
            }
          }

          if (i < array.length) {
            const src = array[i++]
            if (src instanceof Node) {
              child = src.iter()
              continue
            }
            bucket = src
            continue
          }

          return { done: true, value: undefined }
        }
      },
    })
  }
}

function popCount(x: number): number {
  x = x - ((x >> 1) & 0x55555555)
  x = ((x >> 2) & 0x33333333) + (x & 0x33333333)
  x = ((x >> 4) + x) & 0x0f0f0f0f
  return (x * 0x01010101) >> 24
}

export abstract class AbstractHashArrayMappedTrieDict<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> implements AbstractDictP<K, V, Default>
{
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_ORDERED] = false
  public readonly [IS_ABSTRACT_ASSOC_COLL] = true
  public readonly [IS_ABSTRACT_KEY_COLL] = true
  public readonly [IS_ABSTRACT_DICT] = true
  public readonly [IS_SIZE_ITERABLE] = true
  public readonly [IS_COLL] = true
  public readonly [IS_ABSTRACT_COLL_P] = true

  protected readonly default_: Default
  protected count: number
  protected root: Node<K, V>

  public constructor(
    guard: typeof HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
    default_: Default,
    count: number,
    root: Node<K, V>,
  ) {
    if (guard !== HASH_ARRAY_MAPPED_TRIE_DICT_GUARD) {
      throw new Error(
        "Illegal invocation of AbstractHashArrayMappedTrieDict constructor",
      )
    }

    this.default_ = default_
    this.count = count
    this.root = root
  }

  public get(key: K): V | Default {
    const hashCode = hash(key)

    let shift = 0
    let node = this.root
    while (shift < MAX_SHIFT) {
      const index = (hashCode >> shift) & MASK
      if (!(node.bitmap & (0x1 << index))) return this.default_

      const offset = popCount(node.bitmap & ((0x1 << index) - 1))
      if (node.array[offset] instanceof Node) {
        node = node.array[offset]
        shift += BIT_WIDTH
        continue
      }

      let entry: Entry<K, V> | null = node.array[offset]
      while (entry !== null) {
        if (eq(entry.key, key)) return entry.value
        entry = entry.next
      }
      return this.default_
    }

    return this.default_ // satisfy typescript
  }

  public has(key: K): boolean {
    return this.get(key) !== this.default_
  }

  protected assocBucketImpl(
    bucket: Entry<K, V> | null,
    key: K,
    value: V,
  ): { readonly newBucket: Entry<K, V>; readonly newCount: number } {
    if (bucket === null) {
      return { newBucket: { key, value, next: null }, newCount: this.count + 1 }
    }
    if (eq(bucket.key, key)) {
      return {
        newBucket: { key: bucket.key, value, next: bucket.next },
        newCount: this.count,
      }
    }
    const { newBucket: next, newCount } = this.assocBucketImpl(
      bucket.next,
      key,
      value,
    )
    return {
      newBucket: { key: bucket.key, value: bucket.value, next },
      newCount,
    }
  }

  protected updateBucketImpl(
    bucket: Entry<K, V> | null,
    key: K,
    f: (value: V) => V,
  ): Entry<K, V> | null {
    if (bucket === null) return null
    if (eq(bucket.key, key)) {
      return {
        key: bucket.key,
        value: f(bucket.value),
        next: bucket.next,
      }
    }
    const next = this.updateBucketImpl(bucket.next, key, f)
    return { key: bucket.key, value: bucket.value, next }
  }

  protected withoutBucketImpl(
    bucket: Entry<K, V> | null,
    key: K,
  ): { readonly newBucket: Entry<K, V> | null; readonly newCount: number } {
    if (bucket === null) {
      return { newBucket: null, newCount: this.count }
    }
    if (eq(bucket.key, key)) {
      return {
        newBucket: bucket.next,
        newCount: this.count - 1,
      }
    }
    const { newBucket: next, newCount } = this.withoutBucketImpl(
      bucket.next,
      key,
    )
    return {
      newBucket: { key: bucket.key, value: bucket.value, next },
      newCount,
    }
  }

  public abstract conj(
    value: [K, V],
  ): AbstractHashArrayMappedTrieDict<K, V, Default>

  public abstract conjMany(
    value: IterableOrIterator<[K, V]>,
  ): AbstractHashArrayMappedTrieDict<K, V, Default>

  public abstract assoc(
    key: K,
    value: V,
  ): AbstractHashArrayMappedTrieDict<K, V, Default>

  public abstract assocMany(
    pairs: IterableOrIterator<[K, V]>,
  ): AbstractHashArrayMappedTrieDict<K, V, Default>

  public abstract update(
    key: K,
    f: (value: V) => V,
  ): AbstractHashArrayMappedTrieDict<K, V, Default>

  public abstract without(
    key: K,
  ): AbstractHashArrayMappedTrieDict<K, V, Default>

  public abstract withoutMany(
    keys: IterableOrIterator<K>,
  ): AbstractHashArrayMappedTrieDict<K, V, Default>

  public abstract merge(
    other: AbstractDict<K, V, Default>,
  ): AbstractHashArrayMappedTrieDict<K, V, Default>

  public abstract [EQ](other: unknown): boolean

  public abstract [HASH](): number

  public size(): number {
    return this.count
  }

  public iter(): SizeIter<[K, V]> {
    const count = this.count
    const src = this.root.iter()
    let nEmitted = 0

    return Iter.from({
      [IS_ITERATOR]: true,

      next(): IteratorResult<[K, V]> {
        const { done, value } = src.next()
        if (done) {
          return { done, value }
        }
        nEmitted++
        return { done, value }
      },

      [SIZE](): number {
        return count - nEmitted
      },
    })
  }

  public entries(): SizeIter<[K, V]> {
    return this.iter()
  }

  public [ITERATOR](): SizeIterator<[K, V]> {
    return this.iter()
  }

  public [Symbol.iterator](): Iterator<[K, V]> {
    return this.iter()
  }

  public toMut(): DictMut<K, V, Default> {
    return HostedHashDict.fromEntries(this.default_, this)
  }
}

export class HashArrayMappedTrieDict<
    K,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >
  extends AbstractHashArrayMappedTrieDict<K, V, Default>
  implements DictP<K, V, Default>
{
  public readonly [IS_COLL_P] = true

  public constructor(
    guard: typeof HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
    default_: Default,
    count: number,
    root: Node<K, V>,
  ) {
    super(guard, default_, count, root)

    Object.freeze(this)
  }

  private static readonly EMPTY_NOT_PRESENT: HashArrayMappedTrieDict<
    unknown,
    unknown,
    typeof NOT_PRESENT
  > = new HashArrayMappedTrieDict(
    HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
    NOT_PRESENT,
    0,
    Node.create(),
  )

  private static readonly EMPTY_UNDEFINED: HashArrayMappedTrieDict<
    never,
    never,
    undefined
  > = new HashArrayMappedTrieDict(
    HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
    undefined,
    0,
    Node.create(),
  )

  public static withDefault<
    K,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >(default_: Default): HashArrayMappedTrieDict<K, V, Default> {
    if (default_ === undefined) {
      return HashArrayMappedTrieDict.EMPTY_UNDEFINED as unknown as HashArrayMappedTrieDict<
        K,
        V,
        Default
      >
    }
    return HashArrayMappedTrieDict.EMPTY_NOT_PRESENT as unknown as HashArrayMappedTrieDict<
      K,
      V,
      Default
    >
  }

  public static fromEntries<
    K,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >(
    default_: Default,
    entries: IterableOrIterator<[K, V]>,
  ): HashArrayMappedTrieDict<K, V, Default> {
    return this.withDefault<K, V, Default>(default_).assocMany(entries)
  }

  public static of<K, V>(
    ...entries: [K, V][]
  ): undefined extends V
    ? never
    : HashArrayMappedTrieDict<K, V, DefaultFor<V>> {
    return HashArrayMappedTrieDict.fromEntries(
      undefined as unknown as DefaultFor<V>,
      entries,
    ) as undefined extends V
      ? never
      : HashArrayMappedTrieDict<K, V, DefaultFor<V>>
  }

  public override conj([key, value]: [K, V]): HashArrayMappedTrieDict<
    K,
    V,
    Default
  > {
    return this.assoc(key, value)
  }

  public override conjMany(
    value: IterableOrIterator<[K, V]>,
  ): HashArrayMappedTrieDict<K, V, Default> {
    return this.asTransient().conjMany(value).commit()
  }

  public override assoc(
    key: K,
    value: V,
  ): HashArrayMappedTrieDict<K, V, Default> {
    if (value === (this.default_ as unknown)) {
      throw new Error("tried to store default value in dict")
    }

    const hashCode = hash(key)

    const { newNode, newCount } = this.assocImpl(
      this.root,
      hashCode,
      0,
      key,
      value,
    )

    return new HashArrayMappedTrieDict(
      HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
      this.default_,
      newCount,
      newNode,
    )
  }

  private assocImpl(
    node: Node<K, V>,
    hashCode: number,
    shift: number,
    key: K,
    value: V,
  ): { readonly newNode: Node<K, V>; readonly newCount: number } {
    const index = (hashCode >> shift) & MASK

    if (node.bitmap & (0x1 << index)) {
      // this index is represented in the node's array
      const offset = popCount(node.bitmap & ((0x1 << index) - 1))
      const cellValue = node.array[offset]

      if (cellValue instanceof Node) {
        const result = Node.from(node)
        const { newNode, newCount } = this.assocImpl(
          cellValue,
          hashCode,
          shift + BIT_WIDTH,
          key,
          value,
        )
        result.array[offset] = newNode
        return { newNode: result, newCount }
      }

      if (shift < MAX_SHIFT) {
        // this bucket should have exactly one entry,
        // since new entries that would have collided with it would have expanded the trie horizontally
        // (i.e. this code)

        if (eq(cellValue.key, key)) {
          const newNode = Node.from(node)
          newNode.array[offset] = { key: cellValue.key, value, next: null }
          return { newNode, newCount: this.count }
        }

        const { newNode: intermediate } = this.assocImpl(
          Node.create(),
          hash(cellValue.key),
          shift + BIT_WIDTH,
          cellValue.key,
          cellValue.value,
        )
        const { newNode: newBranch } = this.assocImpl(
          intermediate as Node<K, V>,
          hashCode,
          shift + BIT_WIDTH,
          key,
          value,
        )

        const newNode = Node.from(node)
        newNode.array[offset] = newBranch

        return { newNode, newCount: this.count + 1 }
      }

      // cant expand the trie horizontally anymore, so we start adding to the bucket
      const newNode = Node.from(node)
      const { newBucket, newCount } = this.assocBucketImpl(
        cellValue,
        key,
        value,
      )
      newNode.array[offset] = newBucket
      return { newNode, newCount }
    }

    // we need to allocate space for a new leaf within this node

    const newNode: Node<K, V> = new Node(
      null,
      node.bitmap | (0x1 << index),
      new Array(node.array.length + 1),
    )

    const offset = popCount(node.bitmap & ((0x1 << index) - 1))

    for (let i = 0; i < offset; i++) {
      newNode.array[i] = node.array[i]
    }
    newNode.array[offset] = { key, value, next: null }
    for (let i = offset + 1; i < newNode.array.length; i++) {
      newNode.array[i] = node.array[i - 1]
    }

    return {
      newNode,
      newCount: this.count + 1,
    }
  }

  public override assocMany(
    pairs: IterableOrIterator<[K, V]>,
  ): HashArrayMappedTrieDict<K, V, Default> {
    return this.asTransient().assocMany(pairs).commit()
  }

  public override update(
    key: K,
    f: (value: V) => V,
  ): HashArrayMappedTrieDict<K, V, Default> {
    const hashCode = hash(key)

    const newNode = this.updateImpl(this.root, hashCode, 0, key, (value: V) => {
      if (value === (this.default_ as unknown)) {
        throw new Error("tried to store default value in dict")
      }
      return f(value)
    })

    return new HashArrayMappedTrieDict(
      HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
      this.default_,
      this.count,
      newNode,
    )
  }

  private updateImpl(
    node: Node<K, V>,
    hashCode: number,
    shift: number,
    key: K,
    f: (value: V) => V,
  ): Node<K, V> {
    const index = (hashCode >> shift) & MASK

    if (node.bitmap & (0x1 << index)) {
      // this index is represented in the node's array
      const offset = popCount(node.bitmap & ((0x1 << index) - 1))
      const cellValue = node.array[offset]

      if (cellValue instanceof Node) {
        const result = Node.from(node)
        const newNode = this.updateImpl(
          cellValue,
          hashCode,
          shift + BIT_WIDTH,
          key,
          f,
        )
        result.array[offset] = newNode
        return result
      }

      if (shift < MAX_SHIFT) {
        // this bucket should have exactly one entry,
        // since new entries that would have collided with it would have expanded the trie horizontally
        // (i.e. this code)

        if (eq(cellValue.key, key)) {
          const newNode = Node.from(node)
          newNode.array[offset] = {
            key: cellValue.key,
            value: f(cellValue.value),
            next: null,
          }
          return newNode
        }

        return node
      }

      // cant expand the trie horizontally anymore, so we start adding to the bucket
      const newNode = Node.from(node)
      const newBucket = this.updateBucketImpl(cellValue, key, f)
      newNode.array[offset] = newBucket as Entry<K, V>
      return newNode
    }

    return node
  }

  public override without(key: K): HashArrayMappedTrieDict<K, V, Default> {
    const hashCode = hash(key)

    const { newNode, newCount } = this.withoutImpl(this.root, hashCode, 0, key)

    if (newNode instanceof Node) {
      return new HashArrayMappedTrieDict(
        HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
        this.default_,
        newCount,
        newNode,
      )
    }

    if (newNode === null) {
      return HashArrayMappedTrieDict.withDefault(this.default_)
    }

    const newRoot = new Node(null, 0x1 << (hashCode & MASK), [newNode])
    return new HashArrayMappedTrieDict(
      HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
      this.default_,
      newCount,
      newRoot,
    )
  }

  private withoutImpl(
    node: Node<K, V>,
    hashCode: number,
    shift: number,
    key: K,
  ): {
    readonly newNode: Node<K, V> | Entry<K, V> | null
    readonly newCount: number
  } {
    const index = (hashCode >> shift) & MASK

    if (node.bitmap & (0x1 << index)) {
      // this index is represented in the node's array
      const offset = popCount(node.bitmap & ((0x1 << index) - 1))
      const cellValue = node.array[offset]

      if (cellValue instanceof Node) {
        const { newNode, newCount } = this.withoutImpl(
          cellValue,
          hashCode,
          shift + BIT_WIDTH,
          key,
        )

        if (newNode === null) {
          // the child node needs to be compacted
          if (1 < popCount(node.bitmap & ~(0x1 << index))) {
            // there are still other children of this node, so we dont need to signal for compaction
            const newNode: Node<K, V> = new Node(
              null,
              node.bitmap & ~(0x1 << index),
              new Array(node.array.length - 1),
            )

            for (let i = 0; i < offset; i++) {
              newNode.array[i] = node.array[i]
            }
            for (let i = offset + 1; i < node.array.length; i++) {
              newNode.array[i - 1] = node.array[i]
            }

            return { newNode, newCount }
          }

          // there was only one remaining child of the node, so we return the child as the new node, compacting this node away
          return { newNode: node.array[offset === 0 ? 1 : 0], newCount }
        } else {
          const result = Node.from(node)
          result.array[offset] = newNode
          return { newNode: result, newCount }
        }
      }

      if (shift < MAX_SHIFT) {
        // this bucket should have exactly one entry,
        // since new entries that would have collided with it would have expanded the trie horizontally
        // (i.e. this code)

        if (eq(cellValue.key, key)) {
          if (1 < popCount(node.bitmap & ~(0x1 << index))) {
            // there are still other children of this node
            const newNode: Node<K, V> = new Node(
              null,
              node.bitmap & ~(0x1 << index),
              new Array(node.array.length - 1),
            )

            for (let i = 0; i < offset; i++) {
              newNode.array[i] = node.array[i]
            }
            for (let i = offset + 1; i < node.array.length; i++) {
              newNode.array[i - 1] = node.array[i]
            }

            return { newNode, newCount: this.count - 1 }
          }

          // there is only one remaining child of the node, so we need to return that child as the node
          return {
            newNode: node.array[offset === 0 ? 1 : 0],
            newCount: this.count - 1,
          }
        }

        // the key isnt found in the dict, so do nothing
        return { newNode: node, newCount: this.count }
      }

      const { newBucket, newCount } = this.withoutBucketImpl(cellValue, key)
      if (newBucket !== null) {
        const newNode = Node.from(node)
        newNode.array[offset] = newBucket
        return { newNode, newCount }
      }

      // bucket is empty; signal for compation
      return { newNode: null, newCount }
    }

    // key isnt present
    return {
      newNode: node,
      newCount: this.count,
    }
  }

  public override withoutMany(
    keys: IterableOrIterator<K>,
  ): HashArrayMappedTrieDict<K, V, Default> {
    return this.asTransient().withoutMany(keys).commit()
  }

  public override merge(
    other: AbstractDict<K, V, Default>,
  ): HashArrayMappedTrieDict<K, V, Default> {
    return this.assocMany(other)
  }

  public override [EQ](other: unknown): boolean {
    if (
      !(
        (typeof other === "object" || typeof other === "function") &&
        other !== null &&
        isDict(other)
      )
    ) {
      return false
    }
    if (this.size() !== other.size()) return false
    if (other[IS_ORDERED]) return false
    for (let [key, value] of this) {
      if (!eq(other.get(key), value)) return false
    }
    return true
  }

  public override [HASH](): number {
    return hashCollection(this)
  }

  public asTransient(): TransientHashArrayMappedTrieDict<K, V, Default> {
    const editToken = Symbol()
    const newRoot = Node.from(this.root, editToken)
    return new TransientHashArrayMappedTrieDict(
      HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
      this.default_,
      this.count,
      newRoot,
    )
  }
}

export class TransientHashArrayMappedTrieDict<
    K,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >
  extends AbstractHashArrayMappedTrieDict<K, V, Default>
  implements TransientDictP<K, V, Default>
{
  public readonly [IS_TRANSIENT_COLL_P] = true

  private ensureEditable(): void {
    if (this.root.editToken === null) {
      throw new Error("TransientHashArrayMappedTrieDict used after commit")
    }
  }

  public override conj([key, value]: [K, V]): TransientHashArrayMappedTrieDict<
    K,
    V,
    Default
  > {
    return this.assoc(key, value)
  }

  public override conjMany(
    entries: IterableOrIterator<[K, V]>,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    for (let [key, value] of Iter.from(entries)) {
      this.assoc(key, value)
    }
    return this
  }

  public override assoc(
    key: K,
    value: V,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    this.ensureEditable()
    if (value === (this.default_ as unknown)) {
      throw new Error("tried to store default value in dict")
    }

    const hashCode = hash(key)

    const { newNode, newCount } = this.assocImpl(
      this.root,
      hashCode,
      0,
      key,
      value,
    )
    this.root = newNode
    this.count = newCount

    return this
  }

  private assocImpl(
    node: Node<K, V>,
    hashCode: number,
    shift: number,
    key: K,
    value: V,
  ): { readonly newNode: Node<K, V>; readonly newCount: number } {
    const index = (hashCode >> shift) & MASK

    if (node.bitmap & (0x1 << index)) {
      // this index is represented in the node's array
      const offset = popCount(node.bitmap & ((0x1 << index) - 1))
      const cellValue = node.array[offset]

      if (cellValue instanceof Node) {
        const result = node.editable(this.root.editToken)
        const { newNode, newCount } = this.assocImpl(
          cellValue,
          hashCode,
          shift + BIT_WIDTH,
          key,
          value,
        )
        result.array[offset] = newNode
        return { newNode: result, newCount }
      }

      if (shift < MAX_SHIFT) {
        // this bucket should have exactly one entry,
        // since new entries that would have collided with it would have expanded the trie horizontally
        // (i.e. this code)

        if (eq(cellValue.key, key)) {
          const newNode = node.editable(this.root.editToken)
          newNode.array[offset] = { key: cellValue.key, value, next: null }
          return { newNode, newCount: this.count }
        }

        const { newNode: intermediate } = this.assocImpl(
          Node.create(this.root.editToken),
          hash(cellValue.key),
          shift + BIT_WIDTH,
          cellValue.key,
          cellValue.value,
        )
        const { newNode: newBranch } = this.assocImpl(
          intermediate as Node<K, V>,
          hashCode,
          shift + BIT_WIDTH,
          key,
          value,
        )

        const newNode = node.editable(this.root.editToken)
        newNode.array[offset] = newBranch

        return { newNode, newCount: this.count + 1 }
      }

      // cant expand the trie horizontally anymore, so we start adding to the bucket
      const newNode = node.editable(this.root.editToken)
      const { newBucket, newCount } = this.assocBucketImpl(
        cellValue,
        key,
        value,
      )
      newNode.array[offset] = newBucket
      return { newNode, newCount }
    }

    // we need to allocate space for a new leaf within this node

    const newNode: Node<K, V> = new Node(
      this.root.editToken,
      node.bitmap | (0x1 << index),
      new Array(node.array.length + 1),
    )

    const offset = popCount(node.bitmap & ((0x1 << index) - 1))

    for (let i = 0; i < offset; i++) {
      newNode.array[i] = node.array[i]
    }
    newNode.array[offset] = { key, value, next: null }
    for (let i = offset + 1; i < newNode.array.length; i++) {
      newNode.array[i] = node.array[i - 1]
    }

    return {
      newNode,
      newCount: this.count + 1,
    }
  }

  public override assocMany(
    pairs: IterableOrIterator<[K, V]>,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    for (let [k, v] of Iter.from(pairs)) {
      this.assoc(k, v)
    }
    return this
  }

  public override update(
    key: K,
    f: (value: V) => V,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    this.ensureEditable()

    const hashCode = hash(key)

    const newNode = this.updateImpl(this.root, hashCode, 0, key, (value: V) => {
      if (value === (this.default_ as unknown)) {
        throw new Error("tried to store default value in dict")
      }

      return f(value)
    })
    this.root = newNode

    return this
  }

  private updateImpl(
    node: Node<K, V>,
    hashCode: number,
    shift: number,
    key: K,
    f: (value: V) => V,
  ): Node<K, V> {
    const index = (hashCode >> shift) & MASK

    if (node.bitmap & (0x1 << index)) {
      // this index is represented in the node's array
      const offset = popCount(node.bitmap & ((0x1 << index) - 1))
      const cellValue = node.array[offset]

      if (cellValue instanceof Node) {
        const result = node.editable(this.root.editToken)
        const newNode = this.updateImpl(
          cellValue,
          hashCode,
          shift + BIT_WIDTH,
          key,
          f,
        )
        result.array[offset] = newNode
        return result
      }

      if (shift < MAX_SHIFT) {
        // this bucket should have exactly one entry,
        // since new entries that would have collided with it would have expanded the trie horizontally
        // (i.e. this code)

        if (eq(cellValue.key, key)) {
          const newNode = node.editable(this.root.editToken)
          newNode.array[offset] = {
            key: cellValue.key,
            value: f(cellValue.value),
            next: null,
          }
          return newNode
        }

        return node
      }

      // cant expand the trie horizontally anymore, so we start adding to the bucket
      const newNode = node.editable(this.root.editToken)
      const newBucket = this.updateBucketImpl(cellValue, key, f)
      newNode.array[offset] = newBucket as Entry<K, V>
      return newNode
    }

    return node
  }

  public override without(
    key: K,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    this.ensureEditable()

    const hashCode = hash(key)

    const { newNode, newCount } = this.withoutImpl(this.root, hashCode, 0, key)
    this.root = newNode as Node<K, V>
    this.count = newCount

    return this
  }

  private withoutImpl(
    node: Node<K, V>,
    hashCode: number,
    shift: number,
    key: K,
  ): {
    readonly newNode: Node<K, V> | Entry<K, V> | null
    readonly newCount: number
  } {
    const index = (hashCode >> shift) & MASK

    if (node.bitmap & (0x1 << index)) {
      // this index is represented in the node's array
      const offset = popCount(node.bitmap & ((0x1 << index) - 1))
      const cellValue = node.array[offset]

      if (cellValue instanceof Node) {
        const { newNode, newCount } = this.withoutImpl(
          cellValue,
          hashCode,
          shift + BIT_WIDTH,
          key,
        )

        if (newNode === null) {
          // the child node needs to be compacted
          if (1 < popCount(node.bitmap & ~(0x1 << index))) {
            // there are still other children of this node, so we dont need to signal for compaction
            const newNode: Node<K, V> = new Node(
              this.root.editToken,
              node.bitmap & ~(0x1 << index),
              new Array(node.array.length - 1),
            )

            for (let i = 0; i < offset; i++) {
              newNode.array[i] = node.array[i]
            }
            for (let i = offset + 1; i < node.array.length; i++) {
              newNode.array[i - 1] = node.array[i]
            }

            return { newNode, newCount }
          }

          // there was only one remaining child of the node, so we return the child as the new node, compacting this node away
          return { newNode: node.array[offset === 0 ? 1 : 0], newCount }
        } else {
          const result = node.editable(this.root.editToken)
          result.array[offset] = newNode
          return { newNode: result, newCount }
        }
      }

      if (shift < MAX_SHIFT) {
        // this bucket should have exactly one entry,
        // since new entries that would have collided with it would have expanded the trie horizontally
        // (i.e. this code)

        if (eq(cellValue.key, key)) {
          if (1 < popCount(node.bitmap & ~(0x1 << index))) {
            // there are still other children of this node
            const newNode: Node<K, V> = new Node(
              this.root.editToken,
              node.bitmap & ~(0x1 << index),
              new Array(node.array.length - 1),
            )

            for (let i = 0; i < offset; i++) {
              newNode.array[i] = node.array[i]
            }
            for (let i = offset + 1; i < node.array.length; i++) {
              newNode.array[i - 1] = node.array[i]
            }

            return { newNode, newCount: this.count - 1 }
          }

          // there is only one remaining child of the node, so we need to return that child as the node
          return {
            newNode: node.array[offset === 0 ? 1 : 0],
            newCount: this.count - 1,
          }
        }

        // the key isnt found in the dict, so do nothing
        return { newNode: node, newCount: this.count }
      }

      const { newBucket, newCount } = this.withoutBucketImpl(cellValue, key)
      if (newBucket !== null) {
        const newNode = node.editable(this.root.editToken)
        newNode.array[offset] = newBucket
        return { newNode, newCount }
      }

      // bucket is empty; signal for compation
      return { newNode: null, newCount }
    }

    // key isnt present
    return {
      newNode: node,
      newCount: this.count,
    }
  }

  public override withoutMany(
    keys: IterableOrIterator<K>,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    for (let key of Iter.from(keys)) {
      this.without(key)
    }
    return this
  }

  public override merge(
    other: AbstractDict<K, V, Default>,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    return this.assocMany(other)
  }

  public override [EQ](other: unknown): boolean {
    return this === other
  }

  public override [HASH](): number {
    return hashObject(this)
  }

  public commit(): HashArrayMappedTrieDict<K, V, Default> {
    this.ensureEditable()
    this.root.editToken = null
    return new HashArrayMappedTrieDict(
      HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
      this.default_,
      this.count,
      this.root,
    )
  }
}

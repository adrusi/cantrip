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
} from "../types/dict"
import { eq, hash } from "@cantrip/core"
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

const HASH_ARRAY_MAPPED_TRIE_DICT_GUARD = Symbol(
  "HASH_ARRAY_MAPPED_TRIE_DICT_GUARD",
)

const BIT_WIDTH = 5
const BRANCH_FACTOR = 0x1 << BIT_WIDTH
const MASK = BRANCH_FACTOR - 1
const MAX_SHIFT = Math.floor(32 / BIT_WIDTH) * BIT_WIDTH

class Node<K, V> {
  public editToken: symbol | null
  public bitmap: number
  // TODO refactor this so that leaves are linked lists
  // this is only more efficient if you optimize for leaves having more than two entries on average
  // which is ridiculous
  public array: ([K, V][] | Node<K, V>)[]

  public constructor(
    edit: symbol | null,
    bitmap: number,
    array: ([K, V][] | Node<K, V>)[],
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

  public abstract get(key: K): V | Default

  public abstract has(key: K): boolean

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

  public size(): number {
    throw new Error("Method not implemented.")
  }

  public iter(): SizeIter<[K, V]> {
    throw new Error("Method not implemented.")
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

  public [EQ](other: unknown): boolean {
    throw new Error("Method not implemented.")
  }

  public [HASH](): number {
    throw new Error("Method not implemented.")
  }

  public toMut(): DictMut<K, V, Default> {
    throw new Error("Method not implemented.")
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

  public static empty<K, V, Default extends DefaultBoundFor<V> = DefaultFor<V>>(
    default_: Default,
  ): HashArrayMappedTrieDict<K, V, Default> {
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

  public override get(key: K): V | Default {
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

      for (let [entryKey, entryValue] of node.array[offset]) {
        if (eq(entryKey, key)) return entryValue
      }
      return this.default_
    }

    return this.default_ // satisfy typescript
  }

  public override has(key: K): boolean {
    return this.get(key) !== this.default_
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
    throw new Error("Method not implemented.")
  }

  public override assoc(
    key: K,
    value: V,
  ): HashArrayMappedTrieDict<K, V, Default> {
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
        const { newNode: intermediate } = this.assocImpl(
          Node.create(),
          hash(cellValue[0][0]),
          shift + BIT_WIDTH,
          cellValue[0][0],
          cellValue[0][1],
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
      for (let i = 0; i < cellValue.length; i++) {
        if (eq(cellValue[i][0], key)) {
          const newNode = Node.from(node)
          newNode.array[offset] = [
            ...cellValue.slice(0, i),
            [key, value],
            ...cellValue.slice(i + 1),
          ]
          return {
            newNode,
            newCount: this.count,
          }
        }
      }

      const newNode = Node.from(node)
      newNode.array[offset] = [[key, value], ...cellValue]
      return {
        newNode,
        newCount: this.count + 1,
      }
    }

    const newNode: Node<K, V> = new Node(
      null,
      node.bitmap | (0x1 << index),
      new Array(node.array.length + 1),
    )

    const offset = popCount(node.bitmap & ((0x1 << index) - 1))

    for (let i = 0; i < offset; i++) {
      newNode.array[i] = node.array[i]
    }
    newNode.array[offset] = [[key, value]]
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
    throw new Error("Method not implemented.")
  }

  public override update(
    key: K,
    f: (value: V) => V,
  ): HashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }

  public override without(key: K): HashArrayMappedTrieDict<K, V, Default> {
    const hashCode = hash(key)

    const { newNode, newCount } = this.withoutImpl(this.root, hashCode, 0, key)

    return new HashArrayMappedTrieDict(
      HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
      this.default_,
      newCount,
      newNode,
    )
  }

  private withoutImpl(
    node: Node<K, V>,
    hashCode: number,
    shift: number,
    key: K,
  ): { readonly newNode: Node<K, V>; readonly newCount: number } {
    throw new Error("Method not implemented.")
  }

  public override withoutMany(
    keys: IterableOrIterator<K>,
  ): HashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }

  public override merge(
    other: AbstractDict<K, V, Default>,
  ): HashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }

  public asTransient(): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
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

  public override get(key: K): V | Default {
    throw new Error("Method not implemented.")
  }
  public override has(key: K): boolean {
    throw new Error("Method not implemented.")
  }
  public override conj(
    value: [K, V],
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }
  public override conjMany(
    value: IterableOrIterator<[K, V]>,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }
  public override assoc(
    key: K,
    value: V,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }
  public override assocMany(
    pairs: IterableOrIterator<[K, V]>,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }
  public override update(
    key: K,
    f: (value: V) => V,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }
  public override without(
    key: K,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }
  public override withoutMany(
    keys: IterableOrIterator<K>,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }
  public override merge(
    other: AbstractDict<K, V, Default>,
  ): TransientHashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }

  public commit(): HashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
  }
}

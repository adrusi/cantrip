import {
  type DefaultBoundFor,
  type DefaultFor,
  type AbstractDict,
  type AbstractDictP,
  type DictP,
  type TransientDictP,
  type DictMut,
  IS_ABSTRACT_DICT,
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

class Node<K, V> {
  public editToken: symbol | null
  public bitmap: number
  public readonly array: ([[K, V]] | Node<K, V>)[]

  public constructor(
    edit: symbol | null,
    bitmap: number,
    array: ([[K, V]] | Node<K, V>)[],
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

  protected shift: number
  protected count: number
  protected root: Node<K, V>

  public constructor(
    guard: typeof HASH_ARRAY_MAPPED_TRIE_DICT_GUARD,
    shift: number,
    count: number,
    root: Node<K, V>,
  ) {
    if (guard !== HASH_ARRAY_MAPPED_TRIE_DICT_GUARD) {
      throw new Error(
        "Illegal invocation of AbstractHashArrayMappedTrieDict constructor",
      )
    }

    this.shift = shift
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
    shift: number,
    count: number,
    root: Node<K, V>,
  ) {
    super(guard, shift, count, root)

    Object.freeze(this)
  }

  public override get(key: K): V | Default {
    throw new Error("Method not implemented.")
  }
  public override has(key: K): boolean {
    throw new Error("Method not implemented.")
  }
  public override conj(value: [K, V]): HashArrayMappedTrieDict<K, V, Default> {
    throw new Error("Method not implemented.")
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
    throw new Error("Method not implemented.")
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

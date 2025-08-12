import {
  type BackSizeIterator,
  ITERATOR,
  IS_BACK_ITERABLE,
  IS_SIZE_ITERABLE,
} from "@cantrip/compat/iter"
import { EQ, HASH } from "@cantrip/compat/core"
import { type IterableOrIterator, type BackSizeIter, Iter } from "@cantrip/iter"
import { IS_ABSTRACT_INDEX_COLL } from "../types/index-coll"
import { IS_ABSTRACT_ASSOC_COLL } from "../types/assoc-coll"
import {
  type AbstractListP,
  type ListP,
  type TransientListP,
  type ListMut,
  IS_ABSTRACT_LIST,
} from "../types/list"
import {
  IS_ABSTRACT_COLL,
  IS_COLL,
  IS_ABSTRACT_COLL_P,
  IS_COLL_P,
  IS_TRANSIENT_COLL_P,
  IS_ORDERED,
} from "../types/coll"

const BIT_WIDTH = 5
const BRANCH_FACTOR = 0x1 << BIT_WIDTH
const MASK = (() => {
  let mask = 0
  for (let i = 0; i < BIT_WIDTH; i++) mask |= 0x1 << i
  return mask
})()

class Node<A> {
  public edit: boolean
  public readonly array: (A | Node<A>)[]

  private constructor(edit: boolean, array: (A | Node<A>)[]) {
    this.edit = edit
    this.array = array
  }

  public static create<A>(edit: boolean = false): Node<A> {
    return new Node(edit, new Array(BRANCH_FACTOR))
  }

  public static fromArray<A>(src: A[], edit: boolean = false): Node<A> {
    const result: Node<A> = Node.create(edit)
    for (let i = 0; i < BRANCH_FACTOR; i++) result.array[i] = src[i]
    return result
  }

  public static from<A>(src: Node<A>, edit: boolean = false): Node<A> {
    const result: Node<A> = Node.create(edit)
    for (let i = 0; i < BRANCH_FACTOR; i++) result.array[i] = src.array[i]
    return result
  }
}

const BIT_PARTITIONED_TRIE_LIST_GUARD = Symbol(
  "BIT_PARTITIONED_TRIE_LIST_GUARD",
)

abstract class AbstractBitPartitionedTrieList<A> implements AbstractListP<A> {
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_ORDERED] = true
  public readonly [IS_ABSTRACT_ASSOC_COLL] = true
  public readonly [IS_ABSTRACT_INDEX_COLL] = true
  public readonly [IS_ABSTRACT_LIST] = true
  public readonly [IS_BACK_ITERABLE] = true
  public readonly [IS_SIZE_ITERABLE] = true
  public readonly [IS_ABSTRACT_COLL_P] = true
  public readonly [IS_COLL] = true

  protected readonly shift: number
  protected readonly count: number
  protected readonly root: Node<A>
  protected readonly tail: A[]

  protected constructor(
    guard: typeof BIT_PARTITIONED_TRIE_LIST_GUARD,
    shift: number,
    count: number,
    root: Node<A>,
    tail: A[],
  ) {
    if (guard !== BIT_PARTITIONED_TRIE_LIST_GUARD) {
      throw new Error(
        "Invalid invocation of BitPartitionedTrieList constructor",
      )
    }

    this.shift = shift
    this.count = count
    this.root = root
    this.tail = tail
  }

  protected tailOffset(): number {
    return this.count < BRANCH_FACTOR
      ? 0
      : ((this.count - 1) >> BIT_WIDTH) << BIT_WIDTH
  }

  protected arrayFor(index: number): A[] {
    if (index < 0 || this.count <= index) {
      throw new Error("Index out of bounds")
    }

    if (this.tailOffset() <= index) return this.tail

    let node = this.root
    let shift = this.shift
    while (BIT_WIDTH <= shift) {
      node = node.array[(index >> shift) & MASK] as Node<A>
      shift -= BIT_WIDTH
    }

    return node.array as A[]
  }

  protected pushTail(shift: number, parent: Node<A>, tail: A[]): Node<A> {
    const curDepthIndex = ((this.count - 1) >> shift) & MASK

    let result = Node.from(parent)

    result.array[curDepthIndex] =
      BIT_WIDTH === shift
        ? Node.fromArray(tail)
        : parent.array[curDepthIndex] === undefined
          ? this.newPath(shift - BIT_WIDTH, Node.fromArray(tail))
          : this.pushTail(
              shift - BIT_WIDTH,
              parent.array[curDepthIndex] as Node<A>,
              tail,
            )

    return result
  }

  protected newPath(level: number, node: Node<A>): Node<A> {
    if (level === 0) return node

    let result: Node<A> = Node.create()
    result.array[0] = this.newPath(level - BIT_WIDTH, node)
    return result
  }

  public get(index: number): A {
    return this.arrayFor(index)[index & MASK]
  }

  public abstract conj(value: A): AbstractBitPartitionedTrieList<A>

  public abstract conjMany(
    entries: IterableOrIterator<A>,
  ): AbstractBitPartitionedTrieList<A>

  public abstract assoc(
    key: number,
    value: A,
  ): AbstractBitPartitionedTrieList<A>

  public abstract assocMany(
    pairs: IterableOrIterator<[number, A]>,
  ): AbstractBitPartitionedTrieList<A>

  public abstract update(
    key: number,
    f: (value: A) => A,
  ): AbstractBitPartitionedTrieList<A>

  public abstract slice(
    start?: number,
    end?: number,
  ): AbstractBitPartitionedTrieList<A>

  public abstract spliced(
    start: number,
    length: number,
    values?: IterableOrIterator<A>,
  ): AbstractBitPartitionedTrieList<A>

  public toMut(): ListMut<A> {
    throw new Error("Method not implemented.")
  }

  public size(): number {
    return this.count
  }

  public iter(): BackSizeIter<A> {
    throw new Error("Method not implemented.")
  }

  public entries(): BackSizeIter<[number, A]> {
    throw new Error("Method not implemented.")
  }

  public has(key: number): boolean {
    throw new Error("Method not implemented.")
  }

  public [Symbol.iterator](): Iterator<A> {
    throw new Error("Method not implemented.")
  }

  public [ITERATOR](): BackSizeIterator<A> {
    throw new Error("Method not implemented.")
  }

  public [EQ](other: unknown): boolean {
    throw new Error("Method not implemented.")
  }

  public [HASH](): number {
    throw new Error("Method not implemented.")
  }
}

export class BitPartitionedTrieList<A>
  extends AbstractBitPartitionedTrieList<A>
  implements ListP<A>
{
  public readonly [IS_COLL_P] = true

  private constructor(
    guard: typeof BIT_PARTITIONED_TRIE_LIST_GUARD,
    shift: number,
    count: number,
    root: Node<A>,
    tail: A[],
  ) {
    super(guard, shift, count, root, tail)
    Object.freeze(this)
  }

  private static readonly EMPTY: BitPartitionedTrieList<unknown> =
    new BitPartitionedTrieList(
      BIT_PARTITIONED_TRIE_LIST_GUARD,
      BIT_WIDTH,
      0,
      Node.create(),
      [],
    )

  public static empty<A>(): BitPartitionedTrieList<A> {
    return BitPartitionedTrieList.EMPTY as BitPartitionedTrieList<A>
  }

  public override conj(value: A): BitPartitionedTrieList<A> {
    if (this.tail.length < BRANCH_FACTOR) {
      return new BitPartitionedTrieList(
        BIT_PARTITIONED_TRIE_LIST_GUARD,
        this.shift,
        this.count + 1,
        this.root,
        [...this.tail, value],
      )
    }

    if (0x1 << this.shift < this.count >> BIT_WIDTH) {
      // this.root is full
      const newRoot: Node<A> = Node.create()
      newRoot.array[0] = this.root
      newRoot.array[1] = this.newPath(this.shift, Node.fromArray(this.tail))
      return new BitPartitionedTrieList(
        BIT_PARTITIONED_TRIE_LIST_GUARD,
        this.shift + BIT_WIDTH,
        this.count + 1,
        newRoot,
        [value],
      )
    }

    // add tail as new leaf node in existing trie
    return new BitPartitionedTrieList(
      BIT_PARTITIONED_TRIE_LIST_GUARD,
      this.shift,
      this.count + 1,
      this.pushTail(this.shift, this.root, this.tail),
      [value],
    )
  }

  public override conjMany(
    entries: IterableOrIterator<A>,
  ): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override assoc(key: number, value: A): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override assocMany(
    pairs: IterableOrIterator<[number, A]>,
  ): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override update(
    key: number,
    f: (value: A) => A,
  ): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override slice(
    start?: number,
    end?: number,
  ): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override spliced(
    start: number,
    length: number,
    values: IterableOrIterator<A> = Iter.empty(),
  ): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public asTransient(): TransientBitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }
}

export class TransientBitPartitionedTrieList<A>
  extends AbstractBitPartitionedTrieList<A>
  implements TransientListP<A>
{
  public readonly [IS_TRANSIENT_COLL_P] = true

  public override conj(value: A): TransientBitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override conjMany(
    entries: IterableOrIterator<A>,
  ): TransientBitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override assoc(
    key: number,
    value: A,
  ): TransientBitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override assocMany(
    pairs: IterableOrIterator<[number, A]>,
  ): TransientBitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override update(
    key: number,
    f: (value: A) => A,
  ): TransientBitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override slice(
    start?: number,
    end?: number,
  ): TransientBitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override spliced(
    start: number,
    length: number,
    values: IterableOrIterator<A> = Iter.empty(),
  ): TransientBitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public commit(): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }
}

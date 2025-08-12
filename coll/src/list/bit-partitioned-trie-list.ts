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
import { type ListP, type ListMut, IS_ABSTRACT_LIST } from "../types/list"
import { IS_ABSTRACT_COLL, IS_COLL, IS_COLL_P, IS_ORDERED } from "../types/coll"

const BIT_WIDTH = 5
const BRANCH_FACTOR = 0x1 << BIT_WIDTH
const MASK = (() => {
  let mask = 0
  for (let i = 0; i < BIT_WIDTH; i++) mask |= 0x1 << i
  return mask
})()

// class Node<A> extends Array<A> {
//   public constructor() {
//     super(BRANCH_FACTOR)
//   }
// }

type Node<A> = (Node<A> | A)[]
function mkNode<A>(): Node<A> {
  return new Array(BRANCH_FACTOR)
}
function cloneNode<A>(node: Node<A>): Node<A> {
  return Array.from(node)
}

const BIT_PARTITIONED_TRIE_LIST_GUARD = Symbol(
  "BIT_PARTITIONED_TRIE_LIST_GUARD",
)

export class BitPartitionedTrieList<A> implements ListP<A> {
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_ORDERED] = true
  public readonly [IS_ABSTRACT_ASSOC_COLL] = true
  public readonly [IS_ABSTRACT_INDEX_COLL] = true
  public readonly [IS_ABSTRACT_LIST] = true
  public readonly [IS_BACK_ITERABLE] = true
  public readonly [IS_SIZE_ITERABLE] = true
  public readonly [IS_COLL_P] = true
  public readonly [IS_COLL] = true

  private readonly shift: number
  private readonly count: number
  private readonly root: Node<A>
  private readonly tail: A[]

  private static readonly EMPTY: BitPartitionedTrieList<unknown> =
    new BitPartitionedTrieList(
      BIT_PARTITIONED_TRIE_LIST_GUARD,
      BIT_WIDTH,
      0,
      mkNode(),
      [],
    )

  public static empty<A>(): BitPartitionedTrieList<A> {
    return BitPartitionedTrieList.EMPTY as BitPartitionedTrieList<A>
  }

  private constructor(
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

    Object.freeze(this)
  }

  private tailOffset(): number {
    return this.count < BRANCH_FACTOR
      ? 0
      : ((this.count - 1) >> BIT_WIDTH) << BIT_WIDTH
  }

  private arrayFor(index: number): A[] {
    if (index < 0 || this.count <= index) {
      throw new Error("Index out of bounds")
    }

    if (this.tailOffset() <= index) return this.tail

    let node = this.root
    let shift = this.shift
    while (BIT_WIDTH <= shift) {
      node = node[(index >> shift) & MASK] as Node<A>
      shift -= BIT_WIDTH
    }

    return node as A[]
  }

  private pushTail(shift: number, parent: Node<A>, tail: A[]): Node<A> {
    const curDepthIndex = ((this.count - 1) >> shift) & MASK

    let result = cloneNode(parent)

    result[curDepthIndex] =
      BIT_WIDTH === shift
        ? tail
        : parent[curDepthIndex] === undefined
          ? this.newPath(shift - BIT_WIDTH, tail)
          : this.pushTail(
              shift - BIT_WIDTH,
              parent[curDepthIndex] as Node<A>,
              tail,
            )

    return result
  }

  private newPath(level: number, node: Node<A>): Node<A> {
    if (level === 0) return node

    let result: Node<A> = mkNode()
    result[0] = this.newPath(level - BIT_WIDTH, node)
    return result
  }

  public get(index: number): A {
    return this.arrayFor(index)[index & MASK]
  }

  public conj(value: A): BitPartitionedTrieList<A> {
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
      const newRoot: Node<A> = mkNode()
      newRoot[0] = this.root
      newRoot[1] = this.newPath(this.shift, this.tail)
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

  public conjMany(entries: IterableOrIterator<A>): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public assoc(key: number, value: A): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public assocMany(
    pairs: IterableOrIterator<[number, A]>,
  ): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public update(key: number, f: (value: A) => A): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public slice(start?: number, end?: number): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public spliced(
    start: number,
    length: number,
    values: IterableOrIterator<A> = Iter.empty(),
  ): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

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

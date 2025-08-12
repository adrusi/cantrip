import {
  type BackSizeIterator,
  type IteratorResult,
  ITERATOR,
  IS_BACK_ITERABLE,
  IS_SIZE_ITERABLE,
  NEXT_BACK,
  SIZE,
  IS_ITERATOR,
} from "@cantrip/compat/iter"
import { EQ, HASH } from "@cantrip/compat/core"
import { hashObject } from "@cantrip/core"
import { type IterableOrIterator, type BackSizeIter, Iter } from "@cantrip/iter"
import { IS_ABSTRACT_INDEX_COLL } from "../types/index-coll"
import { IS_ABSTRACT_ASSOC_COLL } from "../types/assoc-coll"
import {
  type AbstractListP,
  type ListP,
  type TransientListP,
  type ListMut,
  IS_ABSTRACT_LIST,
  isList,
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
  public editToken: symbol | null
  public readonly array: (A | Node<A>)[]

  private constructor(edit: symbol | null, array: (A | Node<A>)[]) {
    this.editToken = edit
    this.array = array
  }

  public static create<A>(edit: symbol | null = null): Node<A> {
    return new Node(edit, new Array(BRANCH_FACTOR))
  }

  public static fromArray<A>(src: A[], edit: symbol | null = null): Node<A> {
    const result: Node<A> = Node.create(edit)
    for (let i = 0; i < BRANCH_FACTOR; i++) result.array[i] = src[i]
    return result
  }

  public static from<A>(src: Node<A>, edit: symbol | null = null): Node<A> {
    const result: Node<A> = Node.create(edit)
    for (let i = 0; i < BRANCH_FACTOR; i++) result.array[i] = src.array[i]
    return result
  }

  public editable(token: symbol | null): Node<A> {
    if (token === null) return Node.from(this)
    return this.editToken === token ? this : Node.from(this, token)
  }
}

const BIT_PARTITIONED_TRIE_LIST_GUARD = Symbol(
  "BIT_PARTITIONED_TRIE_LIST_GUARD",
)

export abstract class AbstractBitPartitionedTrieList<A>
  implements AbstractListP<A>
{
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_ORDERED] = true
  public readonly [IS_ABSTRACT_ASSOC_COLL] = true
  public readonly [IS_ABSTRACT_INDEX_COLL] = true
  public readonly [IS_ABSTRACT_LIST] = true
  public readonly [IS_BACK_ITERABLE] = true
  public readonly [IS_SIZE_ITERABLE] = true
  public readonly [IS_ABSTRACT_COLL_P] = true
  public readonly [IS_COLL] = true

  protected shift: number
  protected count: number
  protected root: Node<A>
  protected tail: A[]

  public constructor(
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

  public abstract [EQ](other: unknown): boolean

  public abstract [HASH](): number

  public toMut(): ListMut<A> {
    throw new Error("Method not implemented.")
  }

  public size(): number {
    return this.count
  }

  public iter(): BackSizeIter<A> {
    return Iter.from(this)
  }

  public entries(): BackSizeIter<[number, A]> {
    let i = 0
    return Iter.from(this).map((x) => [i++, x])
  }

  public has(index: number): boolean {
    return index < this.count
  }

  public [Symbol.iterator](): Iterator<A> {
    return this[ITERATOR]()
  }

  public [ITERATOR](): BackSizeIterator<A> {
    // TODO it's possible to make this more efficient by holding onto the underlying arrays instead of calling .get() on each iteration
    return new (class implements BackSizeIterator<A> {
      public readonly [IS_ITERATOR] = true

      private readonly src: AbstractBitPartitionedTrieList<A>
      private offset: number = 0
      private offsetBack: number = 0

      public constructor(src: AbstractBitPartitionedTrieList<A>) {
        this.src = src
      }

      public next(): IteratorResult<A> {
        if (this.src.size() - this.offset - this.offsetBack <= 0) {
          return { done: true, value: undefined }
        }
        return { done: false, value: this.src.get(this.offset++) }
      }

      public [NEXT_BACK](): IteratorResult<A> {
        if (this.src.size() - this.offset - this.offsetBack <= 0) {
          return { done: true, value: undefined }
        }
        return {
          done: false,
          value: this.src.get(this.src.size() - 1 - this.offsetBack++),
        }
      }

      public [SIZE](): number {
        return this.src.size() - this.offset - this.offsetBack
      }
    })(this)
  }
}

export class BitPartitionedTrieList<A>
  extends AbstractBitPartitionedTrieList<A>
  implements ListP<A>
{
  public readonly [IS_COLL_P] = true

  public constructor(
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

  public static from<A>(src: IterableOrIterator<A>): BitPartitionedTrieList<A> {
    return BitPartitionedTrieList.empty<A>().conjMany(src)
  }

  public static of<A>(...src: A[]): BitPartitionedTrieList<A> {
    return BitPartitionedTrieList.empty<A>().conjMany(src)
  }

  private pushTail(shift: number, parent: Node<A>, tail: A[]): Node<A> {
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

  private newPath(level: number, node: Node<A>): Node<A> {
    if (level === 0) return node

    let result: Node<A> = Node.create()
    result.array[0] = this.newPath(level - BIT_WIDTH, node)
    return result
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
    values: IterableOrIterator<A>,
  ): BitPartitionedTrieList<A> {
    let t = this.asTransient()
    for (let x of Iter.from(values)) t = t.conj(x)
    return t.commit()
  }

  public override assoc(index: number, value: A): BitPartitionedTrieList<A> {
    // TODO benchmark implementation atop .update() versus duplicating the code
    return this.update(index, (_) => value)
  }

  public override assocMany(
    pairs: IterableOrIterator<[number, A]>,
  ): BitPartitionedTrieList<A> {
    throw new Error("Method not implemented.")
  }

  public override update(
    index: number,
    f: (value: A) => A,
  ): BitPartitionedTrieList<A> {
    if (index < 0 || this.count <= index) {
      throw new Error("Index out of bounds")
    }

    if (this.tailOffset() <= index) {
      const newTail = Array.from(this.tail)
      newTail[index & MASK] = f(newTail[index & MASK])

      return new BitPartitionedTrieList(
        BIT_PARTITIONED_TRIE_LIST_GUARD,
        this.shift,
        this.count,
        this.root,
        newTail,
      )
    }

    const newRoot = Node.from(this.root)
    let node = newRoot
    let shift = this.shift
    while (BIT_WIDTH <= shift) {
      const newNode = Node.from(node.array[(index >> shift) & MASK] as Node<A>)
      node.array[(index >> shift) & MASK] = newNode
      node = newNode
      shift -= BIT_WIDTH
    }

    node.array[index & MASK] = f(node.array[index & MASK] as A)

    return new BitPartitionedTrieList(
      BIT_PARTITIONED_TRIE_LIST_GUARD,
      this.shift,
      this.count,
      newRoot,
      this.tail,
    )
  }

  public override slice(
    start: number = 0,
    end: number = this.count,
  ): BitPartitionedTrieList<A> {
    // TODO this can sometimes avoid some copying
    const result = BitPartitionedTrieList.empty<A>().asTransient()
    for (let i = start; i < end; i++) {
      result.conj(this.get(i))
    }
    return result.commit()
  }

  public override spliced(
    start: number,
    length: number,
    values: IterableOrIterator<A> = Iter.empty(),
  ): BitPartitionedTrieList<A> {
    const result = BitPartitionedTrieList.empty<A>().asTransient()
    for (let i = 0; i < start; i++) {
      result.conj(this.get(i))
    }
    for (let x of Iter.from(values)) {
      result.conj(x)
    }
    for (let i = start + length; i < this.count; i++) {
      result.conj(this.get(i))
    }
    return result.commit()
  }

  public [EQ](other: unknown): boolean {
    if (
      !(
        (typeof other === "object" || typeof other === "function") &&
        other !== null &&
        isList(other) &&
        this.size() === other.size()
      )
    ) {
      return false
    }

    for (let i = 0; i < this.size(); i++) {
      if (this.get(i) !== other.get(i)) return false
    }

    return true
  }

  public [HASH](): number {
    throw new Error("Method not implemented.")
  }

  public asTransient(): TransientBitPartitionedTrieList<A> {
    const editToken = Symbol()
    return new TransientBitPartitionedTrieList(
      BIT_PARTITIONED_TRIE_LIST_GUARD,
      this.shift,
      this.count,
      this.root.editable(editToken),
      Array.from(this.tail),
    )
  }
}

export class TransientBitPartitionedTrieList<A>
  extends AbstractBitPartitionedTrieList<A>
  implements TransientListP<A>
{
  public readonly [IS_TRANSIENT_COLL_P] = true

  private pushTail(shift: number, parent: Node<A>, tail: A[]): Node<A> {
    const curDepthIndex = ((this.count - 1) >> shift) & MASK

    let result = parent.editable(this.root.editToken)

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

  private newPath(level: number, node: Node<A>): Node<A> {
    if (level === 0) return node

    let result: Node<A> = Node.create(this.root.editToken)
    result.array[0] = this.newPath(level - BIT_WIDTH, node)
    return result
  }

  private ensureEditable(): void {
    if (this.root.editToken !== this.root.editToken) {
      throw new Error("Transient used after .commit()")
    }
  }

  public override conj(value: A): TransientBitPartitionedTrieList<A> {
    this.ensureEditable()

    if (this.count - this.tailOffset() < BRANCH_FACTOR) {
      this.tail.push(value)
      this.count++
      return this
    }

    if (0x1 << this.shift < this.count >> BIT_WIDTH) {
      const newRoot: Node<A> = Node.create(this.root.editToken)
      newRoot.array[0] = this.root
      newRoot.array[1] = this.newPath(
        this.shift,
        Node.fromArray(this.tail, this.root.editToken),
      )
      this.root = newRoot
      this.shift += BIT_WIDTH
      this.count++
      this.tail = [value]
      return this
    }

    this.root = this.pushTail(this.shift, this.root, this.tail)
    this.count++
    this.tail = [value]
    return this
  }

  public override conjMany(
    values: IterableOrIterator<A>,
  ): TransientBitPartitionedTrieList<A> {
    for (let x of Iter.from(values)) this.conj(x)
    return this
  }

  public override assoc(
    index: number,
    value: A,
  ): TransientBitPartitionedTrieList<A> {
    return this.update(index, (_) => value)
  }

  public override assocMany(
    pairs: IterableOrIterator<[number, A]>,
  ): TransientBitPartitionedTrieList<A> {
    for (let [index, value] of Iter.from(pairs)) {
      this.update(index, (_) => value)
    }
    return this
  }

  public override update(
    index: number,
    f: (value: A) => A,
  ): TransientBitPartitionedTrieList<A> {
    if (index < 0 || this.count <= index) {
      throw new Error("Index out of bounds")
    }

    if (this.tailOffset() <= index) {
      this.tail[index & MASK] = f(this.tail[index & MASK])
      return this
    }

    let node = this.root
    let shift = this.shift
    while (BIT_WIDTH <= shift) {
      const newNode = (node.array[(index >> shift) & MASK] as Node<A>).editable(
        this.root.editToken,
      )
      node.array[(index >> shift) & MASK] = newNode
      node = newNode
      shift -= BIT_WIDTH
    }

    node.array[index & MASK] = f(node.array[index & MASK] as A)

    return this
  }

  /** @deprecated */
  public override slice(
    start?: number,
    end?: number,
  ): TransientBitPartitionedTrieList<A> {
    throw new Error("slice is not implemented on transients")
  }

  /** @deprecated */
  public override spliced(
    start: number,
    length: number,
    values: IterableOrIterator<A> = Iter.empty(),
  ): TransientBitPartitionedTrieList<A> {
    throw new Error("spliced is not implemented on transients")
  }

  public override [EQ](other: unknown): boolean {
    return this === other
  }

  public override [HASH](): number {
    return hashObject(this)
  }

  public commit(): BitPartitionedTrieList<A> {
    this.ensureEditable()
    this.root.editToken = null
    return new BitPartitionedTrieList(
      BIT_PARTITIONED_TRIE_LIST_GUARD,
      this.shift,
      this.count,
      this.root,
      Array.from(this.tail),
    )
  }
}

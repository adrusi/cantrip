import {
  type BackSizeIterator,
  IS_BACK_ITERABLE,
  IS_SIZE_ITERABLE,
  ITERATOR,
} from "@cantrip/compat/iter"
import { IS_ABSTRACT_COLL, IS_COLL_MUT, IS_ORDERED } from "../types/coll"
import { IS_ABSTRACT_ASSOC_COLL } from "../types/assoc-coll"
import { IS_ABSTRACT_INDEX_COLL } from "../types/index-coll"
import { IS_ABSTRACT_LIST, type ListMut } from "../types/list"
import { type IterableOrIterator, type BackSizeIter, Iter } from "@cantrip/iter"

export class ArrayList<A> implements ListMut<A> {
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_COLL_MUT] = true
  public readonly [IS_ORDERED] = true
  public readonly [IS_ABSTRACT_ASSOC_COLL] = true
  public readonly [IS_ABSTRACT_INDEX_COLL] = true
  public readonly [IS_ABSTRACT_LIST] = true
  public readonly [IS_BACK_ITERABLE] = true
  public readonly [IS_SIZE_ITERABLE] = true

  private readonly array: A[]

  private constructor(array: A[]) {
    this.array = array
  }

  public static from<A>(values: IterableOrIterator<A>): ArrayList<A> {
    return new ArrayList([...Iter.from(values)])
  }

  public static wrap<A>(array: A[]): ArrayList<A> {
    return new ArrayList(array)
  }

  public static of<A>(...values: A[]): ArrayList<A> {
    return new ArrayList(values)
  }

  public add(entry: A): void {
    this.array.push(entry)
  }

  public addMany(entries: IterableOrIterator<A>): void {
    this.array.push(...Iter.from(entries))
  }

  public slice(start?: number, end?: number): ListMut<A> {
    return new ArrayList(this.array.slice(start, end))
  }

  public assign(index: number, value: A): void {
    this.array[index] = value
  }

  public assignMany(entries: IterableOrIterator<[number, A]>): void {
    for (let [index, value] of Iter.from(entries)) {
      this.array[index] = value
    }
  }

  public splice(
    start: number,
    length: number,
    values: IterableOrIterator<A> = Iter.empty(),
  ): void {
    this.array.splice(start, length, ...Iter.from(values))
  }

  public size(): number {
    return this.array.length
  }

  public has(index: number): boolean {
    return index < this.array.length
  }

  public get(index: number): A {
    return this.array[index]
  }

  public pop(): A {
    if (this.array.length === 0) throw new Error("Index out of bounds")
    return this.array.pop()!
  }

  public entries(): BackSizeIter<[number, A]> {
    let index = 0
    return Iter.from(this.array).map((x) => [index++, x])
  }

  public iter(): BackSizeIter<A> {
    return Iter.from(this.array)
  }

  public [ITERATOR](): BackSizeIterator<A> {
    return Iter.from(this.array)
  }

  public [Symbol.iterator](): Iterator<A> {
    return Iter.from(this.array)
  }

  public getArray(): A[] {
    return this.array
  }

  public clone(): ArrayList<A> {
    return new ArrayList(Array.from(this.array))
  }
}

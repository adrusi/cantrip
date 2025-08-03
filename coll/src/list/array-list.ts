import {
  type BackSizeIterator,
  IS_BACK_ITERABLE,
  IS_SIZE_ITERABLE,
  ITERATOR,
} from "@cantrip/compat/iter"
import { IS_ABSTRACT_COLL, IS_COLL_MUT } from "../types/coll"
import { IS_ABSTRACT_LIST, IS_LIST_MUT, type ListMut } from "../types/list"
import { type IterableOrIterator, type BackSizeIter, Iter } from "@cantrip/iter"

export class ArrayList<A> implements ListMut<A> {
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_COLL_MUT] = true
  public readonly [IS_ABSTRACT_LIST] = true
  public readonly [IS_LIST_MUT] = true
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

  public set(index: number, value: A): void {
    this.array[index] = value
  }

  public push(value: A): void {
    this.array.push(value)
  }

  public append(values: IterableOrIterator<A>): void {
    this.array.push(...Iter.from(values))
  }

  public size(): number {
    return this.array.length
  }

  public iter(): BackSizeIter<A> {
    return Iter.from(this.array)
  }

  public asArray(): A[] {
    return Array.from(this.array)
  }

  public [ITERATOR](): BackSizeIterator<A> {
    return Iter.from(this.array)
  }

  public getArray(): A[] {
    return this.array
  }

  public clone(): ArrayList<A> {
    return new ArrayList(Array.from(this.array))
  }
}

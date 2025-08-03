import {
  type DefaultBoundFor,
  type DefaultFor,
  type DictMut,
  IS_ABSTRACT_DICT,
  IS_DICT_MUT,
} from "../types/dict"
import { IS_ABSTRACT_COLL, IS_COLL_MUT } from "../types/coll"
import {
  IS_ITERATOR,
  IS_SIZE_ITERABLE,
  ITERATOR,
  type IteratorResult,
  SIZE,
  type SizeIterator,
} from "@cantrip/compat/iter"
import { Iter, type IterableOrIterator, type SizeIter } from "@cantrip/iter"

export class ObjDict<
  K extends symbol | string | number,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> implements DictMut<K, V, Default>
{
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_COLL_MUT] = true
  public readonly [IS_ABSTRACT_DICT] = true
  public readonly [IS_DICT_MUT] = true
  public readonly [IS_SIZE_ITERABLE] = true

  private readonly obj: { [_X in K]: V }
  private readonly default_: DefaultFor<V>

  private constructor(default_: DefaultFor<V>, obj: { [_X in K]: V }) {
    this.obj = obj
    this.default_ = default_
  }

  public static from<A extends object | ((..._: unknown[]) => unknown)>(
    default_: DefaultFor<A[keyof A]>,
    obj: A,
  ): ObjDict<keyof A, A[keyof A]> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    const newObj: A = Object.create(Object.getPrototypeOf(obj))
    Object.assign(newObj, obj)
    return new ObjDict<keyof A, A[keyof A]>(default_, newObj)
  }

  public static wrap<A extends object | ((..._: unknown[]) => unknown)>(
    default_: DefaultFor<A[keyof A]>,
    obj: A,
  ): ObjDict<keyof A, A[keyof A]> {
    return new ObjDict<keyof A, A[keyof A]>(default_, obj)
  }

  public add([key, value]: [K, V]): void {
    this.obj[key] = value
  }

  public addMany(entries: IterableOrIterator<[K, V]>): void {
    for (let [key, value] of Iter.from(entries)) {
      this.obj[key] = value
    }
  }

  public set(key: K, value: V): void {
    this.obj[key] = value
  }

  public clone(): DictMut<K, V, Default> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let newObj: { [_X in K]: V } = Object.create(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Object.getPrototypeOf(this.obj),
    )
    Object.assign(newObj, this.obj)
    return new ObjDict(this.default_, newObj)
  }

  public size(): number {
    return (
      Object.keys(this.obj).length +
      Object.getOwnPropertySymbols(this.obj).length
    )
  }

  public iter(): SizeIter<[K, V]> {
    const obj = this.obj

    const keys = Object.keys(this.obj)
    const syms = Object.getOwnPropertySymbols(this.obj)

    return Iter.from({
      [IS_ITERATOR]: true,

      next(): IteratorResult<[K, V]> {
        if (0 < keys.length) {
          const key = keys.pop() as K
          return { done: false, value: [key, obj[key]] }
        }
        if (0 < syms.length) {
          const key = syms.pop() as K
          return { done: false, value: [key, obj[key]] }
        }
        return { done: true, value: undefined }
      },

      [SIZE](): number {
        return keys.length + syms.length
      },
    })
  }

  public get(key: K): V | Default {
    return this.obj[key]
  }

  public has(key: K): boolean {
    return Object.prototype.hasOwnProperty.call(this.obj, key)
  }

  public [ITERATOR](): SizeIterator<[K, V]> {
    return this.iter()
  }
}

import {
  type AbstractDict,
  type DefaultBoundFor,
  type DefaultFor,
  type Dict,
  type DictMut,
  IS_ABSTRACT_DICT,
  IS_DICT,
  IS_DICT_MUT,
  isDict,
} from "../types/dict"
import { EQ, HASH } from "@cantrip/compat/core"
import { eq, hash } from "@cantrip/core"
import { IS_ABSTRACT_COLL, IS_COLL, IS_COLL_MUT } from "../types/coll"
import {
  IS_ITERATOR,
  IS_SIZE_ITERABLE,
  ITERATOR,
  type IteratorResult,
  SIZE,
  type SizeIterator,
} from "@cantrip/compat/iter"
import { Iter, type IterableOrIterator, type SizeIter } from "@cantrip/iter"

abstract class AbstractObjDict<
  K extends symbol | string,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> implements AbstractDict<K, V, Default>
{
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_ABSTRACT_DICT] = true
  public readonly [IS_SIZE_ITERABLE] = true

  protected readonly obj: { [_X in K]: V }
  protected readonly default_: Default

  public constructor(default_: Default, obj: { [_X in K]: V }) {
    this.obj = obj
    this.default_ = default_
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
    if (!Object.prototype.hasOwnProperty.call(this.obj, key)) {
      return this.default_
    }

    return this.obj[key]
  }

  public has(key: K): boolean {
    return Object.prototype.hasOwnProperty.call(this.obj, key)
  }

  public [ITERATOR](): SizeIterator<[K, V]> {
    return this.iter()
  }

  public [Symbol.iterator](): Iterator<[K, V]> {
    const obj = this.obj

    const keys = Object.keys(this.obj)
    const syms = Object.getOwnPropertySymbols(this.obj)

    return {
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
    }
  }
}

export class ObjDict<
    K extends symbol | string,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >
  extends AbstractObjDict<K, V, Default>
  implements DictMut<K, V, Default>
{
  public readonly [IS_COLL_MUT] = true
  public readonly [IS_DICT_MUT] = true

  private constructor(default_: Default, obj: { [_X in K]: V }) {
    super(default_, obj)
  }

  public static from<K extends string | symbol, V>(
    default_: DefaultFor<V>,
    obj: { [_X in K]: V },
  ): ObjDict<K, V> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    const newObj: { [_X in K]: V } = Object.create(Object.getPrototypeOf(obj))
    Object.assign(newObj, obj)
    return new ObjDict(default_, newObj)
  }

  public static wrap<K extends string | symbol, V>(
    default_: DefaultFor<V>,
    obj: { [_X in K]: V },
  ): ObjDict<K, V> {
    return new ObjDict(default_, obj)
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
}

export class RecDict<
    K extends symbol | string,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >
  extends AbstractObjDict<K, V, Default>
  implements Dict<K, V, Default>
{
  public readonly [IS_COLL] = true
  public readonly [IS_DICT] = true

  private constructor(default_: Default, obj: { [_X in K]: V }) {
    super(default_, obj)
  }

  public static from<K extends symbol | string, V>(
    default_: DefaultFor<V>,
    obj: { [_X in K]: V },
  ): RecDict<K, V> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
    const newObj: { [_X in K]: V } = Object.create(Object.getPrototypeOf(obj))
    Object.assign(newObj, obj)
    return new RecDict(default_, newObj)
  }

  asMut(): ObjDict<K, V, Default> {
    return ObjDict.from(
      this.default_ as DefaultFor<{ [_X in K]: V }[K]>,
      this.obj,
    ) as ObjDict<K, V, Default>
  }

  [EQ](other: unknown): boolean {
    if (!isDict(other)) return false
    if (this.size() !== other.size()) return false
    for (let [key, value] of this) {
      if (!eq(value, other.get(key))) return false
    }
    return true
  }

  [HASH](): number {
    throw new Error("Method not implemented.")
  }
}

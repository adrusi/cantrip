// this is the most trivial hash map implementation possible in javascript
// it's likely that swiss tables or robin hood hashing or others could outperform this approach
// however, on account of being stuck inside this vm with no e.g. simd intrinsics, this might actually work better
// probably worse memory performance using dynamic arrarys instead of linked lists though!

import {
  type DefaultBoundFor,
  type DefaultFor,
  type DictMut,
  IS_ABSTRACT_DICT,
} from "../types/dict"
import { eq, hash } from "@cantrip/core"
import { IS_ABSTRACT_COLL, IS_COLL_MUT, IS_ORDERED } from "../types/coll"
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

const HOSTED_HASH_DICT_GUARD = Symbol("HOSTED_HASH_DICT_GUARD")

export class HostedHashDict<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> implements DictMut<K, V, Default>
{
  public readonly [IS_ABSTRACT_COLL] = true
  public readonly [IS_ORDERED] = false
  public readonly [IS_ABSTRACT_ASSOC_COLL] = true
  public readonly [IS_ABSTRACT_KEY_COLL] = true
  public readonly [IS_ABSTRACT_DICT] = true
  public readonly [IS_SIZE_ITERABLE] = true
  public readonly [IS_COLL_MUT] = true

  private readonly obj: { [_: number]: [K, V][] }
  private readonly default_: Default
  private count: number

  private constructor(
    default_: Default,
    count: number,
    obj: { [_: number]: [K, V][] },
  ) {
    this.obj = obj
    this.default_ = default_
    this.count = count
  }

  public static withDefault<
    K,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >(default_: Default): HostedHashDict<K, V, Default> {
    return new HostedHashDict(default_, 0, Object.create(null))
  }

  public static fromEntries<
    K,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >(
    default_: Default,
    entries: IterableOrIterator<[K, V]>,
  ): HostedHashDict<K, V, Default> {
    const result: HostedHashDict<K, V, Default> = new HostedHashDict(
      default_,
      0,
      Object.create(null),
    )
    result.assignMany(entries)
    return result
  }

  public static of<K, V>(
    ...entries: [K, V][]
  ): undefined extends V ? never : HostedHashDict<K, V, DefaultFor<V>> {
    const result: HostedHashDict<K, V, DefaultBoundFor<V>> = new HostedHashDict(
      undefined as DefaultFor<V>,
      0,
      Object.create(null),
    )
    result.assignMany(entries)
    return result as undefined extends V
      ? never
      : HostedHashDict<K, V, DefaultFor<V>>
  }

  public set(key: K, value: V): void {
    if (value === (this.default_ as unknown)) {
      throw new Error("tried to store default value in dict")
    }

    let bucket = this.obj[hash(key)]
    if (bucket === undefined) {
      bucket = this.obj[hash(key)] = [[key, value]]
      this.count++
    } else {
      for (let entry of bucket) {
        if (eq(entry[0], key)) {
          entry[1] = value
          return
        }
      }

      bucket.push([key, value])
      this.count++
    }
  }

  public size(): number {
    return this.count
  }

  public iter(): SizeIter<[K, V]> {
    const obj = this.obj
    const count = this.count

    const keys = Object.keys(this.obj)

    let bucket: Iterator<[K, V]> | null = null

    return Iter.from({
      [IS_ITERATOR]: true,

      next(): IteratorResult<[K, V]> {
        while (true) {
          if (bucket === null) {
            if (keys.length === 0) {
              return { done: true, value: undefined }
            }

            bucket = obj[+keys.pop()!][Symbol.iterator]()
          }

          const { done, value } = bucket.next()
          if (done) {
            bucket = null
            continue
          }
          return { done: false, value }
        }
      },

      [SIZE](): number {
        return count
      },
    })
  }

  public entries(): SizeIter<[K, V]> {
    return this.iter()
  }

  public get(key: K): V | Default {
    const bucket = this.obj[hash(key)]
    if (bucket === undefined) return this.default_

    for (let [entryKey, value] of bucket) {
      if (eq(key, entryKey)) return value
    }

    return this.default_
  }

  public has(key: K): boolean {
    const bucket = this.obj[hash(key)]
    if (bucket === undefined) return false

    for (let [entryKey, _value] of bucket) {
      if (eq(key, entryKey)) return true
    }

    return false
  }

  public [ITERATOR](): SizeIterator<[K, V]> {
    return this.iter()
  }

  public [Symbol.iterator](): Iterator<[K, V]> {
    return this.iter()
  }

  public assign(key: K, value: V): void {
    this.set(key, value)
  }

  public assignMany(entries: IterableOrIterator<[K, V]>): void {
    for (let [key, value] of Iter.from(entries)) {
      this.set(key, value)
    }
  }

  public add([key, value]: [K, V]): void {
    this.set(key, value)
  }

  public addMany(entries: IterableOrIterator<[K, V]>): void {
    this.assignMany(entries)
  }

  public remove(key: K): void {
    const bucket = this.obj[hash(key)]
    if (bucket === undefined) return

    for (let i = 0; i < bucket.length; i++) {
      if (eq(key, bucket[i][0])) {
        bucket.splice(i, 1)
        this.count--
        return
      }
    }
  }

  public removeMany(keys: IterableOrIterator<K>): void {
    for (let key of Iter.from(keys)) {
      this.remove(key)
    }
  }

  public clone(): DictMut<K, V, Default> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let newObj: { [_: number]: [K, V][] } = Object.create(null)

    for (let [keyHash, bucket] of Object.entries(this.obj)) {
      const newBucket: [K, V][] = new Array(bucket.length)
      for (let i = 0; i < bucket.length; i++) {
        newBucket[i] = [...bucket[i]]
      }
      newObj[+keyHash] = newBucket
    }

    return new HostedHashDict(this.default_, this.count, newObj)
  }
}

import type * as coreCompat from "@cantrip/compat/core"
import type * as iterCompat from "@cantrip/compat/iter"

import type {
  AbstractColl,
  Coll,
  CollP,
  CollMut,
  IS_ABSTRACT_COLL,
  IS_COLL,
  IS_COLL_P,
  IS_COLL_MUT,
} from "./coll"

import type { Assert, Test } from "@cantrip/typelevel"
import type { SizeIter, IterableOrIterator } from "@cantrip/iter"

export const NOT_PRESENT = Symbol("NOT_PRESENT")

export const IS_ABSTRACT_DICT = Symbol("IS_ABSTRACT_DICT")
export const IS_DICT = Symbol("IS_DICT")
export const IS_DICT_P = Symbol("IS_DICT_P")
export const IS_DICT_MUT = Symbol("IS_DICT_MUT")

export type DefaultFor<V> = undefined extends V ? typeof NOT_PRESENT : undefined

export type DefaultBoundFor<V> = undefined extends V ? symbol : undefined

type _AbstactDictExtendsAbstractColl = Test<
  Assert<
    AbstractDict<"K", "V"> extends AbstractColl<["K", "V"]> ? true : false,
    "AbstactDict<K, V> should extend AbstractColl<[K, V]>"
  >
>

export interface AbstractDict<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> extends iterCompat.SizeIterable<[K, V]> {
  readonly [IS_ABSTRACT_COLL]: true
  size(): number
  iter(): SizeIter<[K, V]>

  readonly [IS_ABSTRACT_DICT]: true
  get(key: K): V | Default
  has(key: K): boolean
}

type _DictExtendsColl = Test<
  Assert<
    Dict<"K", "V"> extends Coll<["K", "V"]> ? true : false,
    "Dict<K, V> should extend Coll<[K, V]>"
  >
>

export interface Dict<K, V, Default extends DefaultBoundFor<V> = DefaultFor<V>>
  extends AbstractDict<K, V, Default>,
    coreCompat.Eq,
    coreCompat.Hashable {
  readonly [IS_COLL]: true
  asMut(): DictMut<K, V, Default>

  readonly [IS_DICT]: true
}

type _DictPExtendsCollP = Test<
  Assert<
    DictP<"K", "V"> extends CollP<["K", "V"]> ? true : false,
    "DictP<K, V> should extend CollP<[K, V]>"
  >
>

export interface DictP<K, V, Default extends DefaultBoundFor<V> = DefaultFor<V>>
  extends Dict<K, V, Default> {
  readonly [IS_COLL_P]: true
  conj(value: [K, V]): DictP<K, V, Default>
  conjMany(entries: IterableOrIterator<[K, V]>): DictP<K, V, Default>

  readonly [IS_DICT_P]: true
  assoc(key: K, value: V): DictP<K, V, Default>
}

type _DictMutExtendsCollMut = Test<
  Assert<
    DictMut<"K", "V"> extends CollMut<["K", "V"]> ? true : false,
    "DictMut<K, V> should extend CollMut<[K, V]>"
  >
>

export interface DictMut<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> extends AbstractDict<K, V, Default> {
  readonly [IS_COLL_MUT]: true
  add(entry: [K, V]): void
  addMany(entries: IterableOrIterator<[K, V]>): void

  readonly [IS_DICT_MUT]: true
  set(key: K, value: V): void
  clone(): DictMut<K, V, Default>
}

export function isAbstractDict(
  value: unknown,
): value is AbstractDict<unknown, unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_ABSTRACT_DICT in value &&
    value[IS_ABSTRACT_DICT] === true
  )
}

export function isDict(value: unknown): value is Dict<unknown, unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_DICT in value &&
    value[IS_DICT] === true
  )
}

export function isDictP(value: unknown): value is DictP<unknown, unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_DICT_P in value &&
    value[IS_DICT_P] === true
  )
}

export function isDictMut(value: unknown): value is DictMut<unknown, unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_DICT_MUT in value &&
    value[IS_DICT_MUT] === true
  )
}

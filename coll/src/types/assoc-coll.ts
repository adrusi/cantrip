import * as coreCompat from "@cantrip/compat/core"
import type * as iterCompat from "@cantrip/compat/iter"

import {
  type AbstractColl,
  type Coll,
  type CollP,
  type CollMut,
  type IS_COLL,
  isAbstractColl_,
  isColl_,
  isCollP_,
  isCollMut_,
} from "./coll"

import type { Assert, Test } from "@cantrip/typelevel"
import type { SizeIter, IterableOrIterator } from "@cantrip/iter"

export const NOT_PRESENT = Symbol("NOT_PRESENT")

export const IS_ABSTRACT_DICT = Symbol("IS_ABSTRACT_DICT")
export const IS_DICT = Symbol("IS_DICT")
export const IS_DICT_P = Symbol("IS_DICT_P")
export const IS_DICT_MUT = Symbol("IS_DICT_MUT")

type _AbstactAssocCollExtendsAbstractColl = Test<
  Assert<
    AbstractAssocColl<"K", "V", "Default"> extends AbstractColl ? true : false,
    "AbstactAssocColl<K, V, Default> should extend AbstractColl"
  >
>

export interface AbstractAssocColl<K, V, Default = never>
  extends Iterable<unknown>,
    iterCompat.SizeIterable<unknown> {
  readonly [IS_COLL]: true
  size(): number
  iter(): SizeIter<unknown>
  entries(): SizeIter<[K, V]>
  get(key: K): V | Default
  has(key: K): boolean
}

type _AssocCollExtendsColl = Test<
  Assert<
    AssocColl<"K", "V", "Default"> extends Coll ? true : false,
    "AssocColl<K, V, Default> should extend Coll"
  >
>

export interface AssocColl<K, V, Default = never>
  extends AbstractAssocColl<K, V, Default>,
    coreCompat.Value {
  asMut(): AssocCollMut<K, V, Default>
}

type _AssocCollPExtendsCollP = Test<
  Assert<
    AssocCollP<"K", "V", "Default"> extends CollP ? true : false,
    "AssocCollP<K, V, Default> should extend CollP"
  >
>

export interface AssocCollP<K, V, Default = never>
  extends AssocColl<K, V, Default> {
  conj(value: never): AssocCollP<K, V, Default>
  conjMany(entries: IterableOrIterator<never>): AssocCollP<K, V, Default>

  assoc(key: K, value: V): AssocCollP<K, V, Default>
}

type _AssocCollMutExtendsCollMut = Test<
  Assert<
    AssocCollMut<"K", "V", "Default"> extends CollMut ? true : false,
    "AssocCollMut<K, V, Default> should extend CollMut"
  >
>

export interface AssocCollMut<K, V, Default = never>
  extends AbstractAssocColl<K, V, Default> {
  add(entry: [K, V]): void
  addMany(entries: IterableOrIterator<[K, V]>): void

  set(key: K, value: V): void
  clone(): AssocCollMut<K, V, Default>
}

export function isAbstractAssocColl_(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractAssocColl<unknown, unknown, unknown> {
  return (
    isAbstractColl_(value) &&
    "entries" in value &&
    typeof value.entries === "function" &&
    "get" in value &&
    typeof value.get === "function" &&
    "has" in value &&
    typeof value.has === "function"
  )
}

export function isAbstractAssocColl(
  value: unknown,
): value is AbstractAssocColl<unknown, unknown, unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    isAbstractAssocColl_(value)
  )
}

export function isAssocColl_(
  value: AbstractAssocColl<unknown, unknown, unknown> & coreCompat.Value,
): value is AssocColl<unknown, unknown, unknown> {
  return isColl_(value)
}

export function isAssocColl(
  value: unknown,
): value is AssocColl<unknown, unknown, unknown> {
  return (
    coreCompat.isValue(value) &&
    isAbstractAssocColl_(value) &&
    isAssocColl_(value)
  )
}

export function isAssocCollP_(
  value: AssocColl<unknown, unknown, unknown>,
): value is AssocCollP<unknown, unknown, unknown> {
  return (
    isCollP_(value) && "assoc" in value && typeof value.assoc === "function"
  )
}

export function isAssocCollP(
  value: unknown,
): value is AssocCollP<unknown, unknown, unknown> {
  return isAssocColl(value) && isAssocCollP_(value)
}

export function isAssocCollMut_(
  value: AbstractAssocColl<unknown, unknown, unknown>,
): value is AssocCollMut<unknown, unknown, unknown> {
  return (
    isCollMut_(value) && "assoc" in value && typeof value.assoc === "function"
  )
}

export function isAssocCollMut(
  value: unknown,
): value is AssocCollMut<unknown, unknown, unknown> {
  return isAbstractAssocColl(value) && isAssocCollMut_(value)
}

import * as coreCompat from "@cantrip/compat/core"
import type * as iterCompat from "@cantrip/compat/iter"
import {
  type AbstractAssocColl,
  type AssocColl,
  type AssocCollP,
  type AssocCollMut,
  // isAbstractAssocColl_,
  // isAssocColl_,
  // isAssocCollP_,
  // isAssocCollMut_,
} from "./assoc-coll"
import type { Assert, Test } from "@cantrip/typelevel"
import type { IS_COLL } from "./coll"
import type { SizeIter, IterableOrIterator } from "@cantrip/iter"

export const NOT_PRESENT = Symbol("NOT_PRESENT")

export const IS_ABSTRACT_DICT = Symbol("IS_ABSTRACT_DICT")
export const IS_DICT = Symbol("IS_DICT")
export const IS_DICT_P = Symbol("IS_DICT_P")
export const IS_DICT_MUT = Symbol("IS_DICT_MUT")

type _AbstactAssocCollExtendsAbstractColl = Test<
  Assert<
    AbstractIndexColl<"A"> extends AbstractAssocColl<number, "A", never>
      ? true
      : false,
    "AbstactAssocColl<K, V, Default> should extend AbstractColl"
  >
>

export interface AbstractIndexColl<A>
  extends Iterable<unknown>,
    iterCompat.SizeIterable<unknown> {
  readonly [IS_COLL]: true
  size(): number
  iter(): SizeIter<A>
  entries(): SizeIter<[number, A]>
  get(key: number): A
  has(key: number): boolean
}

type _IndexCollExtendsColl = Test<
  Assert<
    IndexColl<"A"> extends AssocColl<number, "A", never> ? true : false,
    "IndexColl<K, V, Default> should extend Coll"
  >
>

export interface IndexColl<A> extends AbstractIndexColl<A>, coreCompat.Value {
  asMut(): IndexCollMut<A>
}

type _IndexCollPExtendsCollP = Test<
  Assert<
    IndexCollP<"A"> extends AssocCollP<number, "A", never> ? true : false,
    "IndexCollP<K, V, Default> should extend CollP"
  >
>

export interface IndexCollP<A> extends IndexColl<A> {
  conj(value: A): IndexCollP<A>
  conjMany(entries: IterableOrIterator<A>): IndexCollP<A>

  assoc(key: number, value: A): IndexCollP<A>
}

type _IndexCollMutExtendsCollMut = Test<
  Assert<
    IndexCollMut<"A"> extends AssocCollMut<number, "A", never> ? true : false,
    "IndexCollMut<K, V, Default> should extend CollMut"
  >
>

export interface IndexCollMut<A> extends AbstractIndexColl<A> {
  add(entry: [number, A]): void
  addMany(entries: IterableOrIterator<[number, A]>): void

  set(key: number, value: A): void
  clone(): IndexCollMut<A>
}

// export function isAbstractAssocColl_(
//   value: object | ((..._: unknown[]) => unknown),
// ): value is AbstractAssocColl<unknown, unknown, unknown> {
//   return (
//     isAbstractColl_(value) &&
//     "entries" in value &&
//     typeof value.entries === "function" &&
//     "get" in value &&
//     typeof value.get === "function" &&
//     "has" in value &&
//     typeof value.has === "function"
//   )
// }

// export function isAbstractAssocColl(
//   value: unknown,
// ): value is AbstractAssocColl<unknown, unknown, unknown> {
//   return (
//     (typeof value === "object" || typeof value === "function") &&
//     value !== null &&
//     isAbstractAssocColl_(value)
//   )
// }

// export function isAssocColl_(
//   value: AbstractAssocColl<unknown, unknown, unknown> & coreCompat.Value,
// ): value is AssocColl<unknown, unknown, unknown> {
//   return isColl_(value)
// }

// export function isAssocColl(
//   value: unknown,
// ): value is AssocColl<unknown, unknown, unknown> {
//   return (
//     coreCompat.isValue(value) &&
//     isAbstractAssocColl_(value) &&
//     isAssocColl_(value)
//   )
// }

// export function isAssocCollP_(
//   value: AssocColl<unknown, unknown, unknown>,
// ): value is AssocCollP<unknown, unknown, unknown> {
//   return (
//     isCollP_(value) && "assoc" in value && typeof value.assoc === "function"
//   )
// }

// export function isAssocCollP(
//   value: unknown,
// ): value is AssocCollP<unknown, unknown, unknown> {
//   return isAssocColl(value) && isAssocCollP_(value)
// }

// export function isAssocCollMut_(
//   value: AbstractAssocColl<unknown, unknown, unknown>,
// ): value is AssocCollMut<unknown, unknown, unknown> {
//   return (
//     isCollMut_(value) && "assoc" in value && typeof value.assoc === "function"
//   )
// }

// export function isAssocCollMut(
//   value: unknown,
// ): value is AssocCollMut<unknown, unknown, unknown> {
//   return isAbstractAssocColl(value) && isAssocCollMut_(value)
// }

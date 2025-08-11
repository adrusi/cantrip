import * as coreCompat from "@cantrip/compat/core"
import type * as iterCompat from "@cantrip/compat/iter"
import {
  type AbstractAssocColl,
  type AssocColl,
  type AssocCollP,
  type AssocCollMut,
  type IS_ABSTRACT_ASSOC_COLL,
} from "./assoc-coll"
import type { Assert, Test } from "@cantrip/typelevel"
import {
  type IS_ABSTRACT_COLL,
  type IS_COLL,
  type IS_COLL_MUT,
  type IS_COLL_P,
  type IS_ORDERED,
  isAbstractColl,
  isColl,
  isCollP,
  isCollMut,
} from "./coll"
import type { SizeIter, IterableOrIterator } from "@cantrip/iter"

export const IS_ABSTRACT_INDEX_COLL = Symbol("IS_ABSTRACT_INDEX_COLL")

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
  readonly [IS_ABSTRACT_COLL]: true
  readonly [IS_ORDERED]: true
  readonly [IS_ABSTRACT_ASSOC_COLL]: true
  readonly [IS_ABSTRACT_INDEX_COLL]: true
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
  readonly [IS_COLL]: true
  toMut(): IndexCollMut<A>
}

type _IndexCollPExtendsCollP = Test<
  Assert<
    IndexCollP<"A"> extends AssocCollP<number, "A", never> ? true : false,
    "IndexCollP<K, V, Default> should extend CollP"
  >
>

export interface IndexCollP<A> extends IndexColl<A> {
  readonly [IS_COLL_P]: true
  conj(value: A): IndexCollP<A>
  conjMany(entries: IterableOrIterator<A>): IndexCollP<A>

  assoc(key: number, value: A): IndexCollP<A>
  assocMany(pairs: IterableOrIterator<[number, A]>): IndexCollP<A>
  update(key: number, f: (value: A) => A): IndexCollP<A>
}

type _IndexCollMutExtendsCollMut = Test<
  Assert<
    IndexCollMut<"A"> extends AssocCollMut<number, "A", never> ? true : false,
    "IndexCollMut<K, V, Default> should extend CollMut"
  >
>

export interface IndexCollMut<A> extends AbstractIndexColl<A> {
  readonly [IS_COLL_MUT]: true
  clone(): IndexCollMut<A>
  assign(key: number, value: A): void
  assignMany(entries: IterableOrIterator<[number, A]>): void
  add(entry: A): void
  addMany(entries: IterableOrIterator<A>): void
}

export function isAbstractIndexColl(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractIndexColl<unknown> {
  return (
    isAbstractColl(value) &&
    IS_ABSTRACT_INDEX_COLL in value &&
    value[IS_ABSTRACT_INDEX_COLL] === true
  )
}

export function isIndexColl(
  value: object | ((..._: unknown[]) => unknown),
): value is IndexColl<unknown> {
  return (
    isColl(value) &&
    IS_ABSTRACT_INDEX_COLL in value &&
    value[IS_ABSTRACT_INDEX_COLL] === true
  )
}

export function isIndexCollP(
  value: object | ((..._: unknown[]) => unknown),
): value is IndexCollP<unknown> {
  return (
    isCollP(value) &&
    IS_ABSTRACT_INDEX_COLL in value &&
    value[IS_ABSTRACT_INDEX_COLL] === true
  )
}

export function isIndexCollMut(
  value: object | ((..._: unknown[]) => unknown),
): value is IndexCollMut<unknown> {
  return (
    isCollMut(value) &&
    IS_ABSTRACT_INDEX_COLL in value &&
    value[IS_ABSTRACT_INDEX_COLL] === true
  )
}

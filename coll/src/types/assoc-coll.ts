import * as coreCompat from "@cantrip/compat/core"
import type * as iterCompat from "@cantrip/compat/iter"

import {
  type AbstractColl,
  type Coll,
  type CollP,
  type CollMut,
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

import type { Assert, Test } from "@cantrip/typelevel"
import type { SizeIter, IterableOrIterator } from "@cantrip/iter"

export const IS_ABSTRACT_ASSOC_COLL = Symbol("IS_ABSTRACT_ASSOC_COLL")

type _AbstactAssocCollExtendsAbstractColl = Test<
  Assert<
    AbstractAssocColl<"K", "V", "Default"> extends AbstractColl ? true : false,
    "AbstactAssocColl<K, V, Default> should extend AbstractColl"
  >
>

export interface AbstractAssocColl<K, V, Default>
  extends Iterable<unknown>,
    iterCompat.SizeIterable<unknown> {
  readonly [IS_ABSTRACT_COLL]: true
  readonly [IS_ORDERED]: boolean
  readonly [IS_ABSTRACT_ASSOC_COLL]: true
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

export interface AssocColl<K, V, Default>
  extends AbstractAssocColl<K, V, Default>,
    coreCompat.Value {
  readonly [IS_COLL]: true
  toMut(): AssocCollMut<K, V, Default>
}

type _AssocCollPExtendsCollP = Test<
  Assert<
    AssocCollP<"K", "V", "Default"> extends CollP ? true : false,
    "AssocCollP<K, V, Default> should extend CollP"
  >
>

export interface AssocCollP<K, V, Default> extends AssocColl<K, V, Default> {
  readonly [IS_COLL_P]: true
  conj(value: never): AssocCollP<K, V, Default>
  conjMany(entries: IterableOrIterator<never>): AssocCollP<K, V, Default>

  assoc(key: K, value: V): AssocCollP<K, V, Default>
  assocMany(pairs: IterableOrIterator<[K, V]>): AssocCollP<K, V, Default>
  update(key: K, f: (value: V) => V): AssocCollP<K, V, Default>
}

type _AssocCollMutExtendsCollMut = Test<
  Assert<
    AssocCollMut<"K", "V", "Default"> extends CollMut ? true : false,
    "AssocCollMut<K, V, Default> should extend CollMut"
  >
>

export interface AssocCollMut<K, V, Default>
  extends AbstractAssocColl<K, V, Default> {
  readonly [IS_COLL_MUT]: true
  clone(): AssocCollMut<K, V, Default>
  add(entry: never): void
  addMany(entries: IterableOrIterator<never>): void

  assign(key: K, value: V): void
  assignMany(entries: IterableOrIterator<[K, V]>): void
}

export function isAbstractAssocColl(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractAssocColl<unknown, unknown, unknown> {
  return (
    isAbstractColl(value) &&
    IS_ABSTRACT_ASSOC_COLL in value &&
    value[IS_ABSTRACT_ASSOC_COLL] === true
  )
}

export function isAssocColl(
  value: object | ((..._: unknown[]) => unknown),
): value is AssocColl<unknown, unknown, unknown> {
  return (
    isColl(value) &&
    IS_ABSTRACT_ASSOC_COLL in value &&
    value[IS_ABSTRACT_ASSOC_COLL] === true
  )
}

export function isAssocCollP(
  value: object | ((..._: unknown[]) => unknown),
): value is AssocCollP<unknown, unknown, unknown> {
  return (
    isCollP(value) &&
    IS_ABSTRACT_ASSOC_COLL in value &&
    value[IS_ABSTRACT_ASSOC_COLL] === true
  )
}

export function isAssocCollMut(
  value: object | ((..._: unknown[]) => unknown),
): value is AssocCollMut<unknown, unknown, unknown> {
  return (
    isCollMut(value) &&
    IS_ABSTRACT_ASSOC_COLL in value &&
    value[IS_ABSTRACT_ASSOC_COLL] === true
  )
}

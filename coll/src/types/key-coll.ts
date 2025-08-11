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

export const IS_ABSTRACT_KEY_COLL = Symbol("IS_ABSTRACT_KEY_COLL")

type _AbstactAssocCollExtendsAbstractColl = Test<
  Assert<
    AbstractKeyColl<"K", "V", "Default"> extends AbstractAssocColl<
      "K",
      "V",
      "Default"
    >
      ? true
      : false,
    "AbstactKeyColl<K, V, Default> should extend AbstractAssocColl"
  >
>

export interface AbstractKeyColl<K, V, Default>
  extends Iterable<unknown>,
    iterCompat.SizeIterable<unknown> {
  readonly [IS_ABSTRACT_COLL]: true
  readonly [IS_ORDERED]: boolean
  readonly [IS_ABSTRACT_ASSOC_COLL]: true
  readonly [IS_ABSTRACT_KEY_COLL]: true
  size(): number
  iter(): SizeIter<[K, V]>
  entries(): SizeIter<[K, V]>
  get(key: K): V | Default
  has(key: K): boolean
}

type _KeyCollExtendsColl = Test<
  Assert<
    KeyColl<"K", "V", "Default"> extends AssocColl<"K", "V", "Default">
      ? true
      : false,
    "KeyColl<K, V, Default> should extend AssocColl"
  >
>

export interface KeyColl<K, V, Default>
  extends AbstractKeyColl<K, V, Default>,
    coreCompat.Value {
  readonly [IS_COLL]: true
  toMut(): KeyCollMut<K, V, Default>
}

type _KeyCollPExtendsCollP = Test<
  Assert<
    KeyCollP<"K", "V", "Default"> extends AssocCollP<"K", "V", "Default">
      ? true
      : false,
    "KeyCollP<K, V, Default> should extend AssocCollP"
  >
>

export interface KeyCollP<K, V, Default> extends KeyColl<K, V, Default> {
  readonly [IS_COLL_P]: true
  conj(value: [K, V]): KeyCollP<K, V, Default>
  conjMany(entries: IterableOrIterator<[K, V]>): KeyCollP<K, V, Default>

  assoc(key: K, value: V): KeyCollP<K, V, Default>
  assocMany(pairs: IterableOrIterator<[K, V]>): KeyCollP<K, V, Default>
  update(key: K, f: (value: V) => V): KeyCollP<K, V, Default>
}

type _KeyCollMutExtendsCollMut = Test<
  Assert<
    KeyCollMut<"K", "V", "Default"> extends AssocCollMut<"K", "V", "Default">
      ? true
      : false,
    "KeyCollMut<K, V, Default> should extend AssocCollMut"
  >
>

export interface KeyCollMut<K, V, Default>
  extends AbstractKeyColl<K, V, Default> {
  readonly [IS_COLL_MUT]: true
  clone(): KeyCollMut<K, V, Default>
  assign(key: K, value: V): void
  assignMany(entries: IterableOrIterator<[K, V]>): void
  add(entry: [K, V]): void
  addMany(entries: IterableOrIterator<[K, V]>): void

  set(key: K, value: V): void
}

export function isAbstractKeyColl(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractKeyColl<unknown, unknown, unknown> {
  return (
    isAbstractColl(value) &&
    IS_ABSTRACT_KEY_COLL in value &&
    value[IS_ABSTRACT_KEY_COLL] === true
  )
}

export function isKeyColl(
  value: object | ((..._: unknown[]) => unknown),
): value is KeyColl<unknown, unknown, unknown> {
  return (
    isColl(value) &&
    IS_ABSTRACT_KEY_COLL in value &&
    value[IS_ABSTRACT_KEY_COLL] === true
  )
}

export function isKeyCollP(
  value: object | ((..._: unknown[]) => unknown),
): value is KeyCollP<unknown, unknown, unknown> {
  return (
    isCollP(value) &&
    IS_ABSTRACT_KEY_COLL in value &&
    value[IS_ABSTRACT_KEY_COLL] === true
  )
}

export function isKeyCollMut(
  value: object | ((..._: unknown[]) => unknown),
): value is KeyCollMut<unknown, unknown, unknown> {
  return (
    isCollMut(value) &&
    IS_ABSTRACT_KEY_COLL in value &&
    value[IS_ABSTRACT_KEY_COLL] === true
  )
}

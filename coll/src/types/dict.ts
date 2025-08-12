import * as coreCompat from "@cantrip/compat/core"
import type * as iterCompat from "@cantrip/compat/iter"
import type { IS_ABSTRACT_ASSOC_COLL } from "./assoc-coll"
import {
  type AbstractKeyColl,
  type KeyColl,
  type AbstractKeyCollP,
  type KeyCollP,
  type TransientKeyCollP,
  type KeyCollMut,
  type IS_ABSTRACT_KEY_COLL,
} from "./key-coll"
import type { Assert, Test } from "@cantrip/typelevel"
import {
  type IS_ABSTRACT_COLL,
  type IS_COLL,
  type IS_COLL_MUT,
  type IS_ABSTRACT_COLL_P,
  type IS_COLL_P,
  type IS_TRANSIENT_COLL_P,
  type IS_ORDERED,
  isAbstractColl,
  isColl,
  isAbstractCollP,
  isCollP,
  isTransientCollP,
  isCollMut,
} from "./coll"
import type { SizeIter, IterableOrIterator } from "@cantrip/iter"

export const NOT_PRESENT = Symbol("NOT_PRESENT")

export const IS_ABSTRACT_DICT = Symbol("IS_ABSTRACT_DICT")

export type DefaultFor<V> = undefined extends V ? typeof NOT_PRESENT : undefined

export type DefaultBoundFor<V> = undefined extends V ? symbol : undefined

type _AbstractDictExtendsAbstractKeyColl = Test<
  Assert<
    AbstractDict<"K", "V"> extends AbstractKeyColl<"K", "V", undefined>
      ? true
      : false,
    "AbstractDict<K, V> should extend AbstractKeyColl<K, V, undefined>"
  >
>

export interface AbstractDict<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> extends Iterable<[K, V]>,
    iterCompat.SizeIterable<[K, V]> {
  readonly [IS_ABSTRACT_COLL]: true
  readonly [IS_ORDERED]: boolean
  readonly [IS_ABSTRACT_ASSOC_COLL]: true
  readonly [IS_ABSTRACT_KEY_COLL]: true
  size(): number
  iter(): SizeIter<[K, V]>
  entries(): SizeIter<[K, V]>
  get(key: K): V | Default
  has(key: K): boolean

  readonly [IS_ABSTRACT_DICT]: true
}

type _DictExtendsKeyColl = Test<
  Assert<
    Dict<"K", "V"> extends KeyColl<"K", "V", undefined> ? true : false,
    "Dict<K, V> should extend KeyColl<K, V, undefined>"
  >
>

export interface Dict<K, V, Default extends DefaultBoundFor<V> = DefaultFor<V>>
  extends AbstractDict<K, V, Default>,
    coreCompat.Value {
  readonly [IS_COLL]: true
  toMut(): KeyCollMut<K, V, Default>
}

type _AbstractDictPExtendsAbstractKeyCollP = Test<
  Assert<
    AbstractDictP<"K", "V"> extends AbstractKeyCollP<"K", "V", undefined>
      ? true
      : false,
    "AbstractDictP<K, V> should extend AbstractKeyCollP<K, V, undefined>"
  >
>

export interface AbstractDictP<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> extends Dict<K, V, Default> {
  readonly [IS_ABSTRACT_COLL_P]: true
  conj(value: [K, V]): AbstractDictP<K, V, Default>
  conjMany(entries: IterableOrIterator<[K, V]>): AbstractDictP<K, V, Default>
  assoc(key: K, value: V): AbstractDictP<K, V, Default>
  assocMany(pairs: IterableOrIterator<[K, V]>): AbstractDictP<K, V, Default>
  update(key: K, f: (value: V) => V): AbstractDictP<K, V, Default>

  without(key: K): AbstractDictP<K, V, Default>
  withoutMany(keys: IterableOrIterator<K>): AbstractDictP<K, V, Default>
  merge(other: AbstractDict<K, V, Default>): AbstractDictP<K, V, Default>
}

type _DictPExtendsKeyCollP = Test<
  Assert<
    DictP<"K", "V"> extends KeyCollP<"K", "V", undefined> ? true : false,
    "DictP<K, V> should extend KeyCollP<K, V, undefined>"
  >
>

export interface DictP<K, V, Default extends DefaultBoundFor<V> = DefaultFor<V>>
  extends AbstractDictP<K, V, Default> {
  readonly [IS_COLL_P]: true
  conj(value: [K, V]): DictP<K, V, Default>
  conjMany(entries: IterableOrIterator<[K, V]>): DictP<K, V, Default>
  asTransient(): TransientDictP<K, V, Default>
  assoc(key: K, value: V): DictP<K, V, Default>
  assocMany(pairs: IterableOrIterator<[K, V]>): DictP<K, V, Default>
  update(key: K, f: (value: V) => V): DictP<K, V, Default>

  without(key: K): DictP<K, V, Default>
  withoutMany(keys: IterableOrIterator<K>): DictP<K, V, Default>
  merge(other: AbstractDict<K, V, Default>): DictP<K, V, Default>
}

type _TransientDictPExtendsTransientKeyCollP = Test<
  Assert<
    TransientDictP<"K", "V"> extends TransientKeyCollP<"K", "V", undefined>
      ? true
      : false,
    "TransientDictP<K, V> should extend TransientKeyCollP<K, V, undefined>"
  >
>

export interface TransientDictP<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> extends AbstractDictP<K, V, Default> {
  readonly [IS_TRANSIENT_COLL_P]: true
  conj(value: [K, V]): TransientDictP<K, V, Default>
  conjMany(entries: IterableOrIterator<[K, V]>): TransientDictP<K, V, Default>
  commit(): DictP<K, V, Default>
  assoc(key: K, value: V): TransientDictP<K, V, Default>
  assocMany(pairs: IterableOrIterator<[K, V]>): TransientDictP<K, V, Default>
  update(key: K, f: (value: V) => V): TransientDictP<K, V, Default>

  without(key: K): TransientDictP<K, V, Default>
  withoutMany(keys: IterableOrIterator<K>): TransientDictP<K, V, Default>
  merge(other: AbstractDict<K, V, Default>): TransientDictP<K, V, Default>
}

type _DictMutExtendsKeyCollMut = Test<
  Assert<
    DictMut<"K", "V"> extends KeyCollMut<"K", "V", undefined> ? true : false,
    "DictMut<K, V> should extend KeyCollMut<K, V, undefined>"
  >
>

export interface DictMut<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> extends AbstractDict<K, V, Default> {
  readonly [IS_COLL_MUT]: true
  clone(): DictMut<K, V, Default>
  assign(key: K, value: V): void
  assignMany(entries: IterableOrIterator<[K, V]>): void
  add(entry: [K, V]): void
  addMany(entries: IterableOrIterator<[K, V]>): void
  set(key: K, value: V): void

  remove(key: K): void
  removeMany(keys: IterableOrIterator<K>): void
}

export function isAbstractDict(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractDict<unknown, unknown> {
  return (
    isAbstractColl(value) &&
    IS_ABSTRACT_DICT in value &&
    value[IS_ABSTRACT_DICT] === true
  )
}

export function isDict(
  value: object | ((..._: unknown[]) => unknown),
): value is Dict<unknown, unknown> {
  return (
    isColl(value) &&
    IS_ABSTRACT_DICT in value &&
    value[IS_ABSTRACT_DICT] === true
  )
}

export function isAbstractDictP(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractDictP<unknown, unknown> {
  return (
    isAbstractCollP(value) &&
    IS_ABSTRACT_DICT in value &&
    value[IS_ABSTRACT_DICT] === true
  )
}

export function isDictP(
  value: object | ((..._: unknown[]) => unknown),
): value is DictP<unknown, unknown> {
  return (
    isCollP(value) &&
    IS_ABSTRACT_DICT in value &&
    value[IS_ABSTRACT_DICT] === true
  )
}

export function isTransientDictP(
  value: object | ((..._: unknown[]) => unknown),
): value is TransientDictP<unknown, unknown> {
  return (
    isTransientCollP(value) &&
    IS_ABSTRACT_DICT in value &&
    value[IS_ABSTRACT_DICT] === true
  )
}

export function isDictMut(
  value: object | ((..._: unknown[]) => unknown),
): value is DictMut<unknown, unknown> {
  return (
    isCollMut(value) &&
    IS_ABSTRACT_DICT in value &&
    value[IS_ABSTRACT_DICT] === true
  )
}

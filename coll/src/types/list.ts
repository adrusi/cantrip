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
import type { BackSizeIter, IterableOrIterator } from "@cantrip/iter"

export const IS_ABSTRACT_LIST = Symbol("IS_ABSTRACT_LIST")
export const IS_LIST = Symbol("IS_LIST")
export const IS_LIST_P = Symbol("IS_LIST_P")
export const IS_LIST_MUT = Symbol("IS_LIST_MUT")

type _AbstactListExtendsAbstractColl = Test<
  Assert<
    AbstractList<"A"> extends AbstractColl<"A"> ? true : false,
    "AbstactList<A> should extend AbstractColl<A>"
  >
>

export interface AbstractList<A> extends iterCompat.BackSizeIterable<A> {
  readonly [IS_ABSTRACT_COLL]: true
  size(): number
  iter(): BackSizeIter<A>

  readonly [IS_ABSTRACT_LIST]: true
  asArray(): A[]
  slice(start?: number, end?: number): AbstractList<A>
}

type _ListExtendsColl = Test<
  Assert<
    List<"A"> extends Coll<"A"> ? true : false,
    "List<A> should extend Coll<A>"
  >
>

export interface List<A>
  extends AbstractList<A>,
    coreCompat.Eq,
    coreCompat.Hashable {
  readonly [IS_COLL]: true
  asMut(): ListMut<A>

  readonly [IS_LIST]: true
  slice(start?: number, end?: number): List<A>
}

type _ListPExtendsCollP = Test<
  Assert<
    ListP<"A"> extends CollP<"A"> ? true : false,
    "ListP<A> should extend CollP<A>"
  >
>

export interface ListP<A> extends List<A> {
  readonly [IS_COLL_P]: true
  conj(value: A): ListP<A>
  conjMany(entries: IterableOrIterator<A>): ListP<A>

  readonly [IS_LIST_P]: true
  concat(values: IterableOrIterator<A>): ListP<A>
  slice(start?: number, end?: number): ListP<A>
  assoc(index: number, value: A): ListP<A>
}

type _ListMutExtendsCollMut = Test<
  Assert<
    ListMut<"A"> extends CollMut<"A"> ? true : false,
    "ListMut<A> should extend CollMut<A>"
  >
>

export interface ListMut<A> extends AbstractList<A> {
  readonly [IS_COLL_MUT]: true
  add(entry: A): void
  addMany(entries: IterableOrIterator<A>): void

  readonly [IS_LIST_MUT]: true
  slice(start?: number, end?: number): ListMut<A>
  set(index: number, value: A): void
  push(value: A): void
  append(values: A): void
}

export function isAbstractList(value: unknown): value is AbstractList<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_ABSTRACT_LIST in value &&
    value[IS_ABSTRACT_LIST] === true
  )
}

export function isList(value: unknown): value is List<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_LIST in value &&
    value[IS_LIST] === true
  )
}

export function isListP(value: unknown): value is ListP<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_LIST_P in value &&
    value[IS_LIST_P] === true
  )
}

export function isListMut(value: unknown): value is ListMut<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_LIST_MUT in value &&
    value[IS_LIST_MUT] === true
  )
}

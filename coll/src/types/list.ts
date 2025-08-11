import * as coreCompat from "@cantrip/compat/core"
import type * as iterCompat from "@cantrip/compat/iter"
import type { IS_ABSTRACT_ASSOC_COLL } from "./assoc-coll"
import {
  type AbstractIndexColl,
  type IndexColl,
  type IndexCollP,
  type IndexCollMut,
  type IS_ABSTRACT_INDEX_COLL,
} from "./index-coll"
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
import type { BackSizeIter, IterableOrIterator } from "@cantrip/iter"

export const IS_ABSTRACT_LIST = Symbol("IS_ABSTRACT_LIST")

type _AbstactListExtendsAbstractColl = Test<
  Assert<
    AbstractList<"A"> extends AbstractIndexColl<"A"> ? true : false,
    "AbstactList<A> should extend AbstractIndexColl<A>"
  >
>

export interface AbstractList<A>
  extends Iterable<A>,
    iterCompat.BackSizeIterable<A> {
  readonly [IS_ABSTRACT_COLL]: true
  readonly [IS_ORDERED]: true
  readonly [IS_ABSTRACT_ASSOC_COLL]: true
  readonly [IS_ABSTRACT_INDEX_COLL]: true
  size(): number
  iter(): BackSizeIter<A>
  entries(): BackSizeIter<[number, A]>
  get(key: number): A
  has(key: number): boolean

  readonly [IS_ABSTRACT_LIST]: true
  slice(start?: number, end?: number): AbstractList<A>
}

type _ListExtendsColl = Test<
  Assert<
    List<"A"> extends IndexColl<"A"> ? true : false,
    "List<A> should extend IndexColl<A>"
  >
>

export interface List<A> extends AbstractList<A>, coreCompat.Value {
  readonly [IS_COLL]: true
  toMut(): ListMut<A>
  slice(start?: number, end?: number): List<A>
}

type _ListPExtendsCollP = Test<
  Assert<
    ListP<"A"> extends IndexCollP<"A"> ? true : false,
    "ListP<A> should extend IndexCollP<A>"
  >
>

export interface ListP<A> extends List<A> {
  readonly [IS_COLL_P]: true
  conj(value: A): IndexCollP<A>
  conjMany(entries: IterableOrIterator<A>): IndexCollP<A>
  assoc(key: number, value: A): IndexCollP<A>
  assocMany(pairs: IterableOrIterator<[number, A]>): IndexCollP<A>
  update(key: number, f: (value: A) => A): IndexCollP<A>
  slice(start?: number, end?: number): ListP<A>

  spliced(
    start: number,
    length: number,
    values?: IterableOrIterator<A>,
  ): ListP<A>
}

type _ListMutExtendsCollMut = Test<
  Assert<
    ListMut<"A"> extends IndexCollMut<"A"> ? true : false,
    "ListMut<A> should extend IndexCollMut<A>"
  >
>

export interface ListMut<A> extends AbstractList<A> {
  readonly [IS_COLL_MUT]: true
  assign(key: number, value: A): void
  assignMany(entries: IterableOrIterator<[number, A]>): void
  clone(): ListMut<A>
  slice(start?: number, end?: number): ListMut<A>
  add(entry: A): void
  addMany(entries: IterableOrIterator<A>): void

  pop(): A
  splice(start: number, length: number, values?: IterableOrIterator<A>): void
}

export function isAbstractList(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractList<unknown> {
  return (
    isAbstractColl(value) &&
    IS_ABSTRACT_LIST in value &&
    value[IS_ABSTRACT_LIST] === true
  )
}

export function isList(
  value: object | ((..._: unknown[]) => unknown),
): value is List<unknown> {
  return (
    isColl(value) &&
    IS_ABSTRACT_LIST in value &&
    value[IS_ABSTRACT_LIST] === true
  )
}

export function isListP(
  value: object | ((..._: unknown[]) => unknown),
): value is ListP<unknown> {
  return (
    isCollP(value) &&
    IS_ABSTRACT_LIST in value &&
    value[IS_ABSTRACT_LIST] === true
  )
}

export function isListMut(
  value: object | ((..._: unknown[]) => unknown),
): value is ListMut<unknown> {
  return (
    isCollMut(value) &&
    IS_ABSTRACT_LIST in value &&
    value[IS_ABSTRACT_LIST] === true
  )
}

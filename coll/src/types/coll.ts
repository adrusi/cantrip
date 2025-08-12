import * as coreCompat from "@cantrip/compat/core"
import * as iterCompat from "@cantrip/compat/iter"

import type { SizeIter, IterableOrIterator } from "@cantrip/iter"

export const IS_ABSTRACT_COLL = Symbol("IS_ABSTRACT_COLL")
export const IS_COLL = Symbol("IS_COLL")
export const IS_ABSTRACT_COLL_P = Symbol("IS_ABSTRACT_COLL_P")
export const IS_COLL_P = Symbol("IS_COLL_P")
export const IS_TRANSIENT_COLL_P = Symbol("IS_TRANSIENT_COLL_P")
export const IS_COLL_MUT = Symbol("IS_COLL_MUT")

export const IS_ORDERED = Symbol("IS_ORDERED")

export interface AbstractColl
  extends Iterable<unknown>,
    iterCompat.Iterable<unknown> {
  readonly [IS_ABSTRACT_COLL]: true
  readonly [IS_ORDERED]: boolean
  iter(): SizeIter<unknown>
  size(): number
}

export interface Coll extends AbstractColl, coreCompat.Value {
  readonly [IS_COLL]: true
  toMut(): CollMut
}

export interface AbstractCollP extends Coll {
  readonly [IS_ABSTRACT_COLL_P]: true
  conj(entry: never): AbstractCollP
  conjMany(entries: IterableOrIterator<never>): AbstractCollP
}

export interface CollP extends AbstractCollP {
  readonly [IS_COLL_P]: true
  conj(entry: never): CollP
  conjMany(entries: IterableOrIterator<never>): CollP
  asTransient(): TransientCollP
}

export interface TransientCollP extends AbstractCollP {
  readonly [IS_TRANSIENT_COLL_P]: true
  conj(entry: never): TransientCollP
  conjMany(entries: IterableOrIterator<never>): TransientCollP
  commit(): CollP
}

export interface CollMut extends AbstractColl {
  readonly [IS_COLL_MUT]: true
  clone(): CollMut
  add(entry: never): void
  addMany(entries: IterableOrIterator<never>): void
}

export function isAbstractColl(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractColl {
  return IS_ABSTRACT_COLL in value && value[IS_ABSTRACT_COLL] === true
}

export function isColl(
  value: object | ((..._: unknown[]) => unknown),
): value is Coll {
  return IS_COLL in value && value[IS_COLL] === true
}

export function isAbstractCollP(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractCollP {
  return IS_ABSTRACT_COLL_P in value && value[IS_ABSTRACT_COLL_P] === true
}

export function isCollP(
  value: object | ((..._: unknown[]) => unknown),
): value is CollP {
  return IS_COLL_P in value && value[IS_COLL_P] === true
}

export function isTransientCollP(
  value: object | ((..._: unknown[]) => unknown),
): value is TransientCollP {
  return IS_TRANSIENT_COLL_P in value && value[IS_TRANSIENT_COLL_P] === true
}

export function isCollMut(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractColl {
  return IS_COLL_MUT in value && value[IS_COLL_MUT] === true
}

export function isOrdered<A extends AbstractColl>(
  value: A,
): value is A & { [IS_ORDERED]: true } {
  return value[IS_ORDERED] === true
}

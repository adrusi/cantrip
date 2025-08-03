import type * as coreCompat from "@cantrip/compat/core"
import type * as iterCompat from "@cantrip/compat/iter"

import type { Iter, IterableOrIterator } from "@cantrip/iter"

export const IS_ABSTRACT_COLL = Symbol("IS_ABSTRACT_COLL")
export const IS_COLL = Symbol("IS_COLL")
export const IS_COLL_P = Symbol("IS_COLL_P")
export const IS_COLL_MUT = Symbol("IS_COLL_MUT")

export interface AbstractColl<A> extends iterCompat.Iterable<A> {
  readonly [IS_ABSTRACT_COLL]: true
  size(): number
  iter(): Iter<A>
}

export interface Coll<A>
  extends AbstractColl<A>,
    coreCompat.Eq,
    coreCompat.Hashable {
  readonly [IS_COLL]: true
  asMut(): CollMut<A>
}

export interface CollP<A> extends Coll<A> {
  readonly [IS_COLL_P]: true
  conj(entry: A): CollP<A>
  conjMany(entries: IterableOrIterator<A>): CollP<A>
}

export interface CollMut<A> extends AbstractColl<A> {
  readonly [IS_COLL_MUT]: true
  add(entry: A): void
  addMany(entries: IterableOrIterator<A>): void
}

export function isAbstractColl(value: unknown): value is AbstractColl<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_ABSTRACT_COLL in value &&
    value[IS_ABSTRACT_COLL] === true
  )
}

export function isColl(value: unknown): value is Coll<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_COLL in value &&
    value[IS_COLL] === true
  )
}

export function isCollP(value: unknown): value is CollP<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_COLL_P in value &&
    value[IS_COLL_P] === true
  )
}

export function isCollMut(value: unknown): value is CollMut<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    IS_COLL_MUT in value &&
    value[IS_COLL_MUT] === true
  )
}

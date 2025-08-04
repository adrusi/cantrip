import * as coreCompat from "@cantrip/compat/core"
import * as iterCompat from "@cantrip/compat/iter"

import type { SizeIter, IterableOrIterator } from "@cantrip/iter"

export const IS_COLL = Symbol("IS_COLL")

export interface AbstractColl
  extends Iterable<unknown>,
    iterCompat.Iterable<unknown> {
  readonly [IS_COLL]: true
  iter(): SizeIter<unknown>
  size(): number
}

export interface Coll extends AbstractColl, coreCompat.Value {
  asMut(): CollMut
}

export interface CollP extends Coll {
  conj(entry: never): CollP
  conjMany(entries: IterableOrIterator<never>): CollP
}

export interface CollMut extends AbstractColl {
  add(entry: never): void
  addMany(entries: IterableOrIterator<never>): void
  clone(): CollMut
}

export function isAbstractColl_(
  value: object | ((..._: unknown[]) => unknown),
): value is AbstractColl {
  return (
    IS_COLL in value &&
    value[IS_COLL] === true &&
    iterCompat.isIterable(value) &&
    "iter" in value &&
    typeof value.iter === "function" &&
    "size" in value &&
    typeof value.size === "function"
  )
}

export function isAbstractColl(value: unknown): value is AbstractColl {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    isAbstractColl_(value)
  )
}

export function isColl_(value: AbstractColl & coreCompat.Value): value is Coll {
  return "asMut" in value && typeof value.asMut === "function"
}

export function isColl(value: unknown): value is Coll {
  return coreCompat.isValue(value) && isAbstractColl_(value) && isColl_(value)
}

export function isCollP_(value: Coll): value is CollP {
  return (
    "conj" in value &&
    typeof value.conj === "function" &&
    "conjMany" in value &&
    typeof value.conjMany === "function"
  )
}

export function isCollP(value: unknown): value is CollP {
  return isColl(value) && isCollP_(value)
}

export function isCollMut_(value: AbstractColl): value is CollMut {
  return (
    "add" in value &&
    typeof value.add === "function" &&
    "addMany" in value &&
    typeof value.addMany === "function"
  )
}

export function isCollMut(value: unknown): value is CollMut {
  return isAbstractColl(value) && isCollMut_(value)
}

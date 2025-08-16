/**
 * This interface is one of the weirder apis provided by cantrip.
 * There's a challenge with javascript dictionary types: we want to indicate if a key we looked up wasnt present in the dict by returning undefined,
 * but if the values in the dict might themselves be undefined, the caller cant distinguish between the key not being present versus the value equaling undefined.
 * The conventional solution is for callers to remember to check if the key is present separately with .has(), but it's easy to forget.
 * A simple solution would be to make .get() return an optional type, but optional types are unidiomatic and typescript doesnt make them pleasant to use.
 * A different simple soltution would to return some unique designated value, other than undefined, when a key isnt present.
 * That would be robust, and typescript makes that approach pleasant to use for consuming code, but it's very idiosyncratic, and doesnt integrate well with other code.
 * Hence we take a hybrid approach, combining the dead-simple "return undefined" tactic and switching to the unique designated value only when the contents of the dict call for it.
 * We use the type system to force consuming code (at least when type checking is enforced) to opt in to the designated value tactic if the type of values can include undefined.
 * This way, the vast majority of uses can get the delightfully simple undefined-based api, while we still make writing correct code easier than writing incorrect code.
 */

/* eslint @typescript-eslint/no-redeclare: 0 */

import type {
  DictP as DictP_,
  DictMut as DictMut_,
  DefaultBoundFor,
  DefaultFor,
} from "./types/dict"

import { HostedHashDict } from "./dict/hosted-hash-dict"

import type { IterableOrIterator } from "@cantrip/iter"

export type DictP<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> = DictP_<K, V, Default>

// eslint-disable-next-line @typescript-eslint/naming-convention
export const DictP = Object.freeze({
  withDefault: dictPWithDefault as typeof dictPWithDefault,
  fromEntries: dictPFromEntries as typeof dictPFromEntries,
  of: dictPOf as typeof dictPOf,
})

function dictPWithDefault<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
>(_default_: Default): DictP_<K, V, Default> {
  throw new Error("Not implemented")
}

function dictPFromEntries<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
>(default_: Default, entries: IterableOrIterator<[K, V]>): DictP_<K, V, Default>

function dictPFromEntries<K, V>(
  ...args:
    | [IterableOrIterator<[K, V]>]
    | [undefined | symbol, IterableOrIterator<[K, V]>]
): DictP_<K, V, DefaultFor<V>> {
  const _default_ = args.length === 1 ? undefined : args[0]
  const _entries = args.length === 1 ? args[0] : args[1]

  throw new Error("Not implemented")
}

function dictPOf<K, V>(
  ...entries: [K, V][]
): undefined extends V ? never : DictP_<K, V, DefaultFor<V>>

function dictPOf<K, V, Default extends DefaultBoundFor<V> = DefaultFor<V>>(
  default_: Default,
  ...entries: [K, V][]
): DictP_<K, V, Default>

function dictPOf<K, V>(
  ...args: [K, V][] | [undefined | symbol, ...[K, V][]]
): DictP_<K, V, DefaultFor<V>> {
  const _default_ =
    typeof args[0] === "symbol" || typeof args[0] === "undefined"
      ? args[0]
      : undefined
  const _entries = (
    typeof args[0] === "symbol" || typeof args[0] === "undefined"
      ? args.slice(1)
      : args
  ) as [K, V][]

  throw new Error("Not implemented")
}

export type DictMut<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
> = DictMut_<K, V, Default>

// eslint-disable-next-line @typescript-eslint/naming-convention
export const DictMut = Object.freeze({
  withDefault: dictMutWithDefault as typeof dictMutWithDefault,
  fromEntries: dictMutFromEntries as typeof dictMutFromEntries,
  of: dictMutOf as typeof dictMutOf,
})

function dictMutWithDefault<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
>(_default_: Default): DictMut_<K, V, Default> {
  throw new Error("Not implemented")
}

function dictMutFromEntries<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
>(
  default_: Default,
  entries: IterableOrIterator<[K, V]>,
): DictMut_<K, V, Default>

function dictMutFromEntries<
  K,
  V,
  Default extends DefaultBoundFor<V> = DefaultFor<V>,
>(
  default_: Default,
  entries: IterableOrIterator<[K, V]>,
): DictMut_<K, V, Default>

function dictMutFromEntries<K, V>(
  ...args:
    | [IterableOrIterator<[K, V]>]
    | [undefined | symbol, IterableOrIterator<[K, V]>]
): DictMut_<K, V, DefaultFor<V>> {
  const _default_ = args.length === 1 ? undefined : args[0]
  const _entries = args.length === 1 ? args[0] : args[1]

  throw new Error("Not implemented")
}

function dictMutOf<K, V>(
  ...entries: [K, V][]
): undefined extends V ? never : DictMut_<K, V, DefaultFor<V>>

function dictMutOf<K, V, Default extends DefaultBoundFor<V> = DefaultFor<V>>(
  default_: Default,
  ...entries: [K, V][]
): DictMut_<K, V, Default>

function dictMutOf<K, V>(
  ...args: [K, V][] | [undefined | symbol, ...[K, V][]]
): DictMut_<K, V, DefaultFor<V>> {
  const _default_ =
    typeof args[0] === "symbol" || typeof args[0] === "undefined"
      ? args[0]
      : undefined
  const _entries = (
    typeof args[0] === "symbol" || typeof args[0] === "undefined"
      ? args.slice(1)
      : args
  ) as [K, V][]

  throw new Error("Not implemented")
}

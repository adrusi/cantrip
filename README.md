# Cantrip

A sketch of a non-standard library for javascript and typescript.

## Goals

- Comprehensive type safety
- Prefer immutability
- Consistency with the actual standard library
- Leverage typescript's language service
- Compatibility with foreign packages

  - Data structures should conform to standard or broadly-used interfaces

- Usability from javascript

  - Functionality hard to use correctly without a type checker requires special
    justification
  - Where possible, constraints described in type annotations should be enforced
    at runtime

- Within the above constraints: power over familiarity

## Non-goals

- Compatibility with pre-`latest` runtimes
- Small bundle size
- Compilation performance
- Consistency with the broader ecosystem

## Principles

- Hard prohibition: namespace collision

  - Anything added to `globalThis` or monkey-patched functionality must have a
    `symbol` name

- Use magic internally when it improves the experience for callers

  - Lie to the type checker

- Callers should never be encouraged to write their _own_ magic


```typescript
const DEFAULT = Symbol("DEFAULT")
const DICT_GUARD = Symbol("DICT_GUARD")
const DICT_MAP = Symbol("DICT_MAP")
const CONTAINS_UNDEFINED = Symbol("CONTAINS_UNDEFINED")
const CONTAINS_DEFAULT = Symbol("CONTAINS_DEFAULT")

type DefaultFor<V> =
  undefined extends V
    ? typeof DEFAULT
    : undefined

type DefaultBoundFor<V> =
  undefined extends V
    ? symbol
    : undefined

class Dict<K, V, Default = DefaultFor<V>> {
    ;[DICT_MAP]: Map<K, V> | undefined
    readonly default_: Default

    ;[CONTAINS_UNDEFINED]: boolean = false
    ;[CONTAINS_DEFAULT]: boolean = false

    private constructor(_guard: typeof DICT_GUARD, default_: Default) {
        if (_guard !== DICT_GUARD) throw new Error("illegal invocation of Dict constructor")
        this[DICT_MAP] = new Map()
        this.default_ = default_
    }

    static withDefault<
        K, V,
        Default extends DefaultBoundFor<V> = DefaultFor<V>
    >(default_: Default): Dict<K, V, Default> {
        return new Dict<K, V, Default>(DICT_GUARD, default_)
    }

    static fromEntries<K, V>(entries: Iterable<{key: K; value: V}>): (undefined extends V ? never : Dict<K, V, undefined>)
    static fromEntries<
        K, V,
        Default extends DefaultBoundFor<V> = DefaultFor<V>
    >(default_: Default, entries: Iterable<{key: K; value: V}>): Dict<K, V, Default>
    static fromEntries<K, V>(
        ...args: [Iterable<{key: K; value: V}>] | [undefined | symbol, Iterable<{key: K; value: V}>]
    ): Dict<K, V, undefined | symbol> {
        const default_ = args.length === 1 ? undefined : args[0]
        const entries = args.length === 1 ? args[0] : args[1]

        const dict = Dict.withDefault<K, V>(default_ as any) as Dict<K, V, undefined | symbol>
        for (const { key, value } of entries) dict.put(key, value)

        return dict
    }

    static of<K, V>(...entries: [K, V][]): (undefined extends V ? never : Dict<K, V, undefined>)
    static of<
        K, V,
        Default extends DefaultBoundFor<V> = DefaultFor<V>
    >(default_: Default, ...entries: [K, V][]): Dict<K, V, Default>
    static of<K, V>(
        ...args: [K, V][] | [undefined | symbol, ...[K, V][]]
    ): Dict<K, V, undefined | symbol> {
        const default_ =
            (typeof args[0] === "symbol" || typeof args[0] === "undefined")
                ? args[0]
                : undefined
        const entries = (
            (typeof args[0] === "symbol" || typeof args[0] === "undefined")
                ? args.slice(1)
                : args
        ) as [K, V][]

        const dict = Dict.withDefault<K, V>(default_ as any) as Dict<K, V, undefined | symbol>
        for (const [key, value] of entries) dict.put(key, value)

        return dict
    }

    put(key: K, value: V): void {
        if (!this[DICT_MAP]) throw new Error("invalid use of invalidated dict")
        if (value as unknown === this.default_) throw new Error("attempted to store default value in dict")
        if (value as unknown === undefined) this[CONTAINS_UNDEFINED] = true
        if (value as unknown === DEFAULT) this[CONTAINS_DEFAULT] = true
        this[DICT_MAP].set(key, value)
    }

    has(key: K): boolean {
        if (!this[DICT_MAP]) throw new Error("invalid use of invalidated dict")
        return this[DICT_MAP].has(key)
    }

    get(key: K): V | Default {
        if (!this[DICT_MAP]) throw new Error("invalid use of invalidated dict")
        if (!this[DICT_MAP].has(key)) return this.default_
        return this[DICT_MAP].get(key) as V
    }

    withDefault<NewDefault extends DefaultBoundFor<V>>(default_: NewDefault): Dict<K, V, NewDefault> | undefined {
        if (!this[DICT_MAP]) throw new Error("invalid use of invalidated dict")

        if (default_ as unknown === this.default_) return this as any

        if (default_ as unknown === undefined) {
            if (this[CONTAINS_UNDEFINED]) return undefined
        } else if (default_ as unknown === DEFAULT) {
            if (this[CONTAINS_DEFAULT]) return undefined
        } else {
            for (const value of this[DICT_MAP].values()) {
                if (value as unknown === default_) return undefined
            }
        }

        const map = this[DICT_MAP]
        this[DICT_MAP] = undefined
        const newDict = new Dict<K, V, NewDefault>(DICT_GUARD, default_)
        newDict[DICT_MAP] = map
        newDict[CONTAINS_DEFAULT] = this[CONTAINS_DEFAULT]
        newDict[CONTAINS_UNDEFINED] = this[CONTAINS_UNDEFINED]
        return newDict
    }
}

const m1 = Dict.withDefault<string, string>(undefined) // OK
const m2 = Dict.withDefault<string, string | undefined>(undefined) // ERROR
const m3 = Dict.withDefault<string, string | undefined>(DEFAULT) // OK

const MY_DEFAULT = Symbol("MY_DEFAULT")
const m4 = Dict.withDefault<string, string | undefined | typeof DEFAULT, typeof MY_DEFAULT>(MY_DEFAULT)

const x = Dict.of(
    ["foo", "bar"],
    ["baz", "qux"]
)
const r1 = x.get("foo")

const y = Dict.of(
    ["ayy", "lmao"],
    ["meow", undefined]
)
const r2 = y.get("ayy")

const z = Dict.of(
    DEFAULT,
    ["ayy", "lmao"],
    ["meow", undefined]
)
const r3 = z.get("ayy")


```
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

export const NOT_PRESENT = Symbol("NOT_PRESENT")
const DICT_GUARD = Symbol("DICT_GUARD")

export type DefaultFor<V> = undefined extends V ? typeof NOT_PRESENT : undefined

export type DefaultBoundFor<V> = undefined extends V ? symbol : undefined

export class Dict<K, V, Default = DefaultFor<V>> {
  private readonly dictMap: Map<K, V>
  public readonly default_: Default

  private constructor(guard: typeof DICT_GUARD, default_: Default) {
    if (guard !== DICT_GUARD) {
      throw new Error("illegal invocation of Dict constructor")
    }

    this.dictMap = new Map()
    this.default_ = default_
  }

  public static withDefault<
    K,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >(default_: Default): Dict<K, V, Default> {
    return new Dict<K, V, Default>(DICT_GUARD, default_)
  }

  public static fromEntries<K, V>(
    entries: Iterable<{ key: K; value: V }>,
  ): undefined extends V ? never : Dict<K, V, undefined>

  public static fromEntries<
    K,
    V,
    Default extends DefaultBoundFor<V> = DefaultFor<V>,
  >(
    default_: Default,
    entries: Iterable<{ key: K; value: V }>,
  ): Dict<K, V, Default>

  public static fromEntries<K, V>(
    ...args:
      | [Iterable<{ key: K; value: V }>]
      | [undefined | symbol, Iterable<{ key: K; value: V }>]
  ): Dict<K, V, undefined | symbol> {
    const default_ = args.length === 1 ? undefined : args[0]
    const entries = args.length === 1 ? args[0] : args[1]

    const dict = Dict.withDefault<K, V>(default_ as DefaultFor<V>) as Dict<
      K,
      V,
      undefined | symbol
    >
    for (const { key, value } of entries) dict.put(key, value)

    return dict
  }

  public static of<K, V>(
    ...entries: [K, V][]
  ): undefined extends V ? never : Dict<K, V, undefined>

  public static of<K, V, Default extends DefaultBoundFor<V> = DefaultFor<V>>(
    default_: Default,
    ...entries: [K, V][]
  ): Dict<K, V, Default>

  public static of<K, V>(
    ...args: [K, V][] | [undefined | symbol, ...[K, V][]]
  ): Dict<K, V, undefined | symbol> {
    const default_ =
      typeof args[0] === "symbol" || typeof args[0] === "undefined"
        ? args[0]
        : undefined
    const entries = (
      typeof args[0] === "symbol" || typeof args[0] === "undefined"
        ? args.slice(1)
        : args
    ) as [K, V][]

    const dict = Dict.withDefault<K, V>(default_ as DefaultFor<V>) as Dict<
      K,
      V,
      undefined | symbol
    >
    for (const [key, value] of entries) dict.put(key, value)

    return dict
  }

  public put(key: K, value: V): void {
    if ((value as unknown) === this.default_) {
      throw new Error("attempted to store default value in dict")
    }

    this.dictMap.set(key, value)
  }

  public has(key: K): boolean {
    return this.dictMap.has(key)
  }

  public get(key: K): V | Default {
    if (!this.dictMap.has(key)) return this.default_
    return this.dictMap.get(key) as V
  }
}

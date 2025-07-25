import type { Len, Tuple } from "./tuple"
import type { LE } from "./nat"

type _Permutations<
  Tuple extends unknown[],
  Prev extends unknown[] = [],
> = Tuple extends [infer L, ...infer R]
  ? [L, ..._Permutations<[...Prev, ...R]>] | _Permutations<R, [...Prev, L]>
  : Prev

export type Permutations<
  Tuple_ extends unknown[],
  BailThreshold extends 1 | 2 | 3 | 4 | 5 | 6 = 4,
> =
  LE<Len<Tuple_>, BailThreshold> extends true
    ? _Permutations<Tuple_>
    : Tuple<Len<Tuple_>, Tuple_[number]>

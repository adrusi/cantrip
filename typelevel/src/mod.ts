import type { Unreachable } from "./signpost"

export type { Invalid, Unreachable } from "./signpost"
export type { Permutations } from "./permutations"
export type {
  LE,
  LT,
  Add,
  Subtract,
  Increment,
  Decrement,
  Multiply,
} from "./nat"
export type { Assert, Test } from "./assert"

export type UnionToTuple<Union, Result extends unknown[] = []> =
  UnionToOverloads<Union> extends (_: infer Head) => void
    ? UnionToTuple<Exclude<Union, Head>, [Head, ...Result]>
    : Result

type UnionToIntersection<Union> = (
  Union extends unknown ? (_: Union) => void : Unreachable
) extends (_: infer Intersection) => void
  ? Intersection
  : Unreachable

type UnionToOverloads<Union> = UnionToIntersection<
  Union extends unknown ? (_: Union) => void : Unreachable
>

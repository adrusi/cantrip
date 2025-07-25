import type { Len, Tuple } from "./tuple"
import type { Invalid } from "./signpost"

export type LE<A extends number, B extends number> =
  Tuple<B> extends [...Tuple<A>, ...infer _Rest] ? true : false

export type LT<A extends number, B extends number> =
  Tuple<B> extends [...Tuple<A>, ...infer Rest]
    ? Rest extends []
      ? false
      : true
    : false

export type Add<A extends number, B extends number> = Len<
  [...Tuple<A>, ...Tuple<B>]
>

export type Subtract<A extends number, B extends number> =
  Tuple<A> extends [...Tuple<B>, ...infer Rest] ? Len<Rest> : Invalid

export type Increment<A extends number> = Len<[...Tuple<A>, unknown]>

export type Decrement<A extends number> =
  Tuple<A> extends [...infer Rest, unknown] ? Len<Rest> : Invalid

export type Multiply<
  A extends number,
  B extends number,
  Result extends number = 0,
> = A extends 0
  ? Result
  : Decrement<A> extends number
    ? Add<Result, B> extends number
      ? Multiply<Decrement<A>, B, Add<Result, B>>
      : Invalid
    : Invalid

import type { Invalid } from "./signpost"

export type Len<Tuple extends unknown[]> = Tuple extends { length: infer Len }
  ? Len
  : Invalid

export type Tuple<
  Len extends number,
  Type = unknown,
  Result extends Type[] = [],
> = Result extends { length: Len }
  ? Result
  : Tuple<Len, Type, [Type, ...Result]>

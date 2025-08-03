export type Assert<
  Statement extends true | false,
  ErrorMsg extends string = "",
> = Statement extends true
  ? true
  : Statement extends false
    ? `TYPE-LEVEL ASSERT FAILED${ErrorMsg extends "" ? "" : `: ${ErrorMsg}`}`
    : "unreachable"

export type Test<Statement extends true> = Statement

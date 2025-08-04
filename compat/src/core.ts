export const EQ = Symbol("EQ")
export const HASH = Symbol("HASH")

export interface Value {
  [EQ](other: unknown): boolean
  [HASH](): number
}

export function isValue(value: unknown): value is Value {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    EQ in value &&
    typeof value[EQ] === "function" &&
    HASH in value &&
    typeof value[HASH] === "function"
  )
}

export const EQ = Symbol("EQ")

export interface Eq {
  [EQ](other: unknown): boolean
}

export function isEq(value: unknown): value is Eq {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    EQ in value &&
    typeof value[EQ] === "function"
  )
}

export const HASH = Symbol("HASH")

export interface Hashable {
  [HASH](): number
}

export function isHashable(value: unknown): value is Hashable {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    HASH in value &&
    typeof value[HASH] === "function"
  )
}

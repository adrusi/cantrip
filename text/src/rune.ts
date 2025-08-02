const RUNE_BRAND = Symbol("RUNE")

export type rune = number & { [RUNE_BRAND]: never }

export interface RuneFunction {
  (codePoint: number): rune | undefined
}

export function isRune(codePoint: number): codePoint is rune {
  return (
    Number.isSafeInteger(codePoint) && 0 <= codePoint && codePoint <= 0x10ffff
  )
}

export const rune: RuneFunction = (codePoint: number): rune | undefined => {
  if (isRune(codePoint)) return codePoint
}

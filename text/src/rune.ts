const RUNE_BRAND = Symbol("RUNE")

// eslint-disable-next-line @typescript-eslint/naming-convention
export type rune = number & { [RUNE_BRAND]: never }

export interface RuneFunction {
  // eslint-disable-next-line @typescript-eslint/prefer-function-type
  (codePoint: number): rune | undefined
}

export function isRune(codePoint: number): codePoint is rune {
  return (
    Number.isSafeInteger(codePoint) && 0 <= codePoint && codePoint <= 0x10ffff
  )
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const rune: RuneFunction = (codePoint: number): rune | undefined => {
  if (isRune(codePoint)) return codePoint
  return undefined
}

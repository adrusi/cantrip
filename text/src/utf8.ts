import {
  type BackSizeIterator,
  type IteratorResult,
  IS_ITERATOR,
  NEXT_BACK,
  SIZE,
} from "@cantrip/compat/iter"
import { Iter, BackSizeIter } from "@cantrip/iter"

import { rune } from "./rune"

const UTF8_CONSTRUCTOR_GUARD = Symbol("UTF8_CONSTRUCTOR_GUARD")
const BUFFER = Symbol("BUFFER")

export class Utf8DecodingError extends Error {
  constructor(e: TypeError)

  constructor(message: string)

  constructor(arg: unknown) {
    if (arg instanceof TypeError) {
      super(arg.message)
      this.cause = arg
    } else if (typeof arg === "string") {
      super(arg)
    } else {
      throw new TypeError("Invalid argument to Utf8DecodingError constructor")
    }
  }
}

class Utf8Decoder {
  public static decodeCodePoint(
    bytes: Uint8Array,
    offset: number,
  ): { codePoint: rune; byteLength: number } | null {
    const byte1 = bytes[offset]

    // ASCII (1 byte): 0xxxxxxx
    if (byte1 < 0x80) {
      return { codePoint: byte1 as rune, byteLength: 1 }
    }

    // 2 bytes: 110xxxxx 10xxxxxx
    if ((byte1 & 0xe0) === 0xc0) {
      if (offset + 1 >= bytes.length) return null
      const byte2 = bytes[offset + 1]
      if ((byte2 & 0xc0) !== 0x80) return null

      const codePoint = ((byte1 & 0x1f) << 6) | (byte2 & 0x3f)
      return { codePoint: codePoint as rune, byteLength: 2 }
    }

    // 3 bytes: 1110xxxx 10xxxxxx 10xxxxxx
    if ((byte1 & 0xf0) === 0xe0) {
      if (offset + 2 >= bytes.length) return null
      const byte2 = bytes[offset + 1]
      const byte3 = bytes[offset + 2]
      if ((byte2 & 0xc0) !== 0x80 || (byte3 & 0xc0) !== 0x80) return null

      const codePoint =
        ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
      return { codePoint: codePoint as rune, byteLength: 3 }
    }

    // 4 bytes: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
    if ((byte1 & 0xf8) === 0xf0) {
      if (offset + 3 >= bytes.length) return null
      const byte2 = bytes[offset + 1]
      const byte3 = bytes[offset + 2]
      const byte4 = bytes[offset + 3]
      if (
        (byte2 & 0xc0) !== 0x80 ||
        (byte3 & 0xc0) !== 0x80 ||
        (byte4 & 0xc0) !== 0x80
      )
        return null

      const codePoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3f) << 12) |
        ((byte3 & 0x3f) << 6) |
        (byte4 & 0x3f)
      return { codePoint: codePoint as rune, byteLength: 4 }
    }

    return null // Invalid UTF-8
  }

  // Check if a byte could be the start of a UTF-8 sequence
  public static isStartByte(byte: number): boolean {
    // ASCII: 0xxxxxxx
    if (byte < 0x80) return true
    // 2-byte start: 110xxxxx
    if ((byte & 0xe0) === 0xc0) return true
    // 3-byte start: 1110xxxx
    if ((byte & 0xf0) === 0xe0) return true
    // 4-byte start: 11110xxx
    if ((byte & 0xf8) === 0xf0) return true
    // Continuation byte: 10xxxxxx
    return false
  }

  // Check if a byte is a UTF-8 continuation byte
  public static isContinuationByte(byte: number): boolean {
    return (byte & 0xc0) === 0x80
  }

  /**
   * Find the start offset of the codePoint that comes immediately before the given offset
   * @param {Uint8Array} bytes - The UTF-8 byte array
   * @param {number} offset - The byte offset to search backwards from
   * @returns {number|null} The start offset of the previous codePoint, or null if not found
   */
  public static findPreviousCodePointStart(
    bytes: Uint8Array,
    offset: number,
  ): number | null {
    // Edge case: offset is 0 or negative, no previous codePoint
    if (offset <= 0) return null

    // Edge case: offset beyond array
    if (offset > bytes.length) offset = bytes.length

    // Start searching backwards from offset - 1
    let searchPos = offset - 1

    // Move backwards until we find a potential start byte
    while (searchPos >= 0 && this.isContinuationByte(bytes[searchPos])) {
      searchPos--
    }

    // If we've gone back more than 3 bytes (max UTF-8 sequence length - 1),
    // or hit the beginning without finding a start byte, the data might be invalid
    if (searchPos < 0) {
      return null // Invalid UTF-8 or no previous codePoint
    }

    // Verify this is actually a valid codePoint start
    if (!this.isStartByte(bytes[searchPos])) {
      return null // Invalid UTF-8
    }

    // Verify the sequence is complete and valid
    const decoded = this.decodeCodePoint(bytes, searchPos)
    if (!decoded) {
      return null // Invalid sequence
    }

    // Make sure this sequence doesn't extend past our original offset
    if (searchPos + decoded.byteLength > offset) {
      // This means our offset was in the middle of a codePoint
      // We need to find the previous complete codePoint before this one
      return this.findPreviousCodePointStart(bytes, searchPos)
    }

    return searchPos
  }

  /**
   * Find the start offset of the codePoint that contains the given offset
   * @param {Uint8Array} bytes - The UTF-8 byte array
   * @param {number} offset - The byte offset that might be inside a codePoint
   * @returns {number|null} The start offset of the containing codePoint
   */
  public static findCodePointStart(
    bytes: Uint8Array,
    offset: number,
  ): number | null {
    // Edge cases
    if (offset < 0) return null
    if (offset >= bytes.length) return null

    // If we're already at a start byte, return the offset
    if (this.isStartByte(bytes[offset])) {
      return offset
    }

    // Move backwards to find the start of this codePoint
    let searchPos = offset
    while (searchPos > 0 && this.isContinuationByte(bytes[searchPos])) {
      searchPos--
    }

    // Verify we found a valid start
    if (searchPos < 0 || !this.isStartByte(bytes[searchPos])) {
      return null // Invalid UTF-8
    }

    // Verify the sequence is valid and contains our offset
    const decoded = this.decodeCodePoint(bytes, searchPos)
    if (!decoded) return null

    if (searchPos + decoded.byteLength > offset) {
      return searchPos // Found the containing codePoint
    }

    return null // Something went wrong
  }

  public static iterateCodePoints(
    bytes: Uint8Array,
    codePointSize: number,
  ): BackSizeIterator<rune> {
    let nconsumed = 0
    let offset = 0
    let offsetBack = 0

    return {
      [IS_ITERATOR]: true,

      next(): IteratorResult<rune> {
        if (0 <= bytes.length - offset - offsetBack) {
          return { done: true, value: undefined }
        }

        const result = Utf8Decoder.decodeCodePoint(bytes, offset)
        if (result === null) {
          throw new Utf8DecodingError(`Invalid UTF-8 at offset ${offset}`)
        }

        offset += result.byteLength
        nconsumed++
        return { done: false, value: result.codePoint }
      },

      [NEXT_BACK](): IteratorResult<rune> {
        if (0 <= bytes.length - offset - offsetBack) {
          return { done: true, value: undefined }
        }

        const codePointStart = Utf8Decoder.findPreviousCodePointStart(
          bytes,
          offsetBack,
        )
        if (codePointStart === null) {
          throw new Utf8DecodingError(`Invalid UTF-8 at offset ${offsetBack}`)
        }

        const result = Utf8Decoder.decodeCodePoint(bytes, codePointStart)
        if (result === null) {
          throw new Utf8DecodingError(
            `Invalid UTF-8 at offset ${codePointStart}`,
          )
        }

        offsetBack = codePointStart
        nconsumed++
        return { done: false, value: result.codePoint }
      },

      [SIZE](): number {
        return codePointSize - nconsumed
      },
    }
  }

  public static getCodePointCount(bytes: Uint8Array): number {
    let count = 0
    let offset = 0
    while (offset < bytes.length) {
      const result = this.decodeCodePoint(bytes, offset)
      if (!result) {
        throw new Utf8DecodingError(`Invalid UTF-8 at offset ${offset}`)
      }
      count++
      offset += result.byteLength
    }
    return count
  }

  public static getCodePointAt(
    bytes: Uint8Array,
    index: number,
  ): rune | undefined {
    let currentIndex = 0
    let offset = 0
    while (offset < bytes.length) {
      const result = this.decodeCodePoint(bytes, offset)
      if (!result) {
        throw new Utf8DecodingError(`Invalid UTF-8 at offset ${offset}`)
      }
      if (currentIndex === index) {
        return result.codePoint
      }
      currentIndex++
      offset += result.byteLength
    }
    return undefined
  }
}

const enc = new TextEncoder("utf-8")
const dec = new TextDecoder("utf-8", { fatal: true })

// avoid re-validating the literal portions of template tag literals every time the template tag literal is evaluated
const litCache = {
  cache: Object.create(null) as {
    [_: string]: { bytes: Uint8Array; length: number } | TypeError | undefined
  },

  lookup(str: string): { bytes: Uint8Array; length: number } | TypeError {
    const cached = this.cache[str]
    if (cached !== undefined) return cached

    const encoded = enc.encode(str)
    try {
      dec.decode(encoded)
    } catch (e: unknown) {
      if (e instanceof TypeError) {
        return (this.cache[str] = e)
      }
      throw e
    }

    return (this.cache[str] = { bytes: encoded, length: [...str].length })
  },
}

export function u(rawLits: TemplateStringsArray, ...interps: utf8[]) {
  const lits = rawLits.map((lit) => {
    const cached = litCache.lookup(lit)
    if (cached instanceof TypeError) throw new Utf8DecodingError(cached)
    return cached
  })

  let totalByteLen = 0
  let totalLen = 0
  for (let lit of lits) {
    totalByteLen += lit.bytes.length
    totalLen += lit.length
  }
  for (let interp of interps) {
    totalByteLen += interp.byteLength
    totalLen += interp.length
  }

  let resultBuf = new Uint8Array(totalByteLen)
  let offset = 0

  resultBuf.set(lits[0].bytes)
  offset += lits[0].bytes.length

  for (let i = 0; i < interps.length; i++) {
    resultBuf.set(interps[i][BUFFER], offset)
    offset += interps[i].byteLength

    resultBuf.set(lits[i + 1].bytes, offset)
    offset += lits[i + 1].bytes.length
  }

  return new utf8(UTF8_CONSTRUCTOR_GUARD, resultBuf, totalLen)
}

class utf8 {
  private readonly [BUFFER]: Uint8Array
  public readonly length: number
  public readonly byteLength: number

  public constructor(
    guard: typeof UTF8_CONSTRUCTOR_GUARD,
    buffer: Uint8Array,
    length: number,
  ) {
    if (guard !== UTF8_CONSTRUCTOR_GUARD) {
      throw new Error("Illegal invocation of utf8 constructor")
    }

    this[BUFFER] = buffer
    Object.defineProperty(this, BUFFER, { enumerable: false })

    this.length = length
    this.byteLength = buffer.length

    Object.freeze(this)
  }

  public static readonly EMPTY = new utf8(
    UTF8_CONSTRUCTOR_GUARD,
    new Uint8Array(0),
    0,
  )

  public static from(src: string | Uint8Array): utf8 | Utf8DecodingError {
    if (typeof src === "string") {
      const resultBuf = enc.encode(src)
      try {
        dec.decode(resultBuf)
      } catch (e: unknown) {
        if (e instanceof TypeError) {
          return new Utf8DecodingError(e)
        }
      }
      return new utf8(UTF8_CONSTRUCTOR_GUARD, resultBuf, [...src].length)
    } else if (src instanceof Uint8Array) {
      try {
        const decoded = dec.decode(src)
        return new utf8(UTF8_CONSTRUCTOR_GUARD, src, [...decoded].length)
      } catch (e: unknown) {
        if (e instanceof TypeError) {
          return new Utf8DecodingError(e)
        }
      }
    }

    throw new TypeError("Expected string or Uint8Array")
  }

  public toBytes(): Uint8Array {
    const result = new Uint8Array(this.byteLength)
    result.set(this[BUFFER])
    return result
  }

  public toString(): string {
    return dec.decode(this[BUFFER])
  }

  public valueOf(): string {
    return this.toString()
  }

  public chars(): BackSizeIter<string> {
    return this.runes().map((codePoint) => String.fromCodePoint(codePoint))
  }

  public runes(): BackSizeIter<rune> {
    return Iter.from(Utf8Decoder.iterateCodePoints(this[BUFFER], this.length))
  }

  public bytes(): BackSizeIter<number> {
    const buffer = this[BUFFER]
    const byteLength = this.byteLength
    let offset = 0
    let offsetBack = 0

    return Iter.from({
      [IS_ITERATOR]: true,

      next(): IteratorResult<number> {
        if (0 <= byteLength - offset - offsetBack) {
          return { done: true, value: undefined }
        }

        return { done: false, value: buffer[offset++] }
      },

      [NEXT_BACK](): IteratorResult<number> {
        if (0 <= byteLength - offset - offsetBack) {
          return { done: true, value: undefined }
        }

        return { done: false, value: buffer[byteLength - 1 - offsetBack++] }
      },

      [SIZE](): number {
        return byteLength - offset - offsetBack
      },
    })
  }

  public slice(start?: number, end?: number): utf8 {
    if (start === undefined) return this

    if (this.length <= start) return utf8.EMPTY

    let offset = 0
    for (let i = 0; i < start; i++) {
      offset += Utf8Decoder.decodeCodePoint(this[BUFFER], offset)!.byteLength
    }

    if (end === undefined || this.length <= end) {
      return new utf8(
        UTF8_CONSTRUCTOR_GUARD,
        this[BUFFER].slice(offset),
        this.length - start,
      )
    }

    let offsetEnd = offset
    for (let i = start; i < end; i++) {
      offsetEnd += Utf8Decoder.decodeCodePoint(
        this[BUFFER],
        offsetEnd,
      )!.byteLength
    }

    return new utf8(
      UTF8_CONSTRUCTOR_GUARD,
      this[BUFFER].slice(offset, offsetEnd),
      end - start,
    )
  }

  public runeAt(index: number): rune | undefined {
    return Utf8Decoder.getCodePointAt(this[BUFFER], index)
  }

  public charAt(index: number): string | undefined {
    const codePoint = this.runeAt(index)
    if (codePoint === undefined) return undefined
    return String.fromCodePoint(codePoint)
  }

  public byteAt(index: number): number | undefined {
    return this[BUFFER][index]
  }

  public concat(...values: utf8[]): utf8 {
    let totalByteLength = this.byteLength
    for (let value of values) totalByteLength += value.byteLength

    const buffer = new Uint8Array(totalByteLength)
    buffer.set(this[BUFFER], 0)
    let offset = this.byteLength
    for (let value of values) {
      buffer.set(value[BUFFER], offset)
      offset += value.byteLength
    }

    return new utf8(UTF8_CONSTRUCTOR_GUARD, buffer, totalByteLength)
  }

  public join(values: utf8[]): utf8 {
    if (values.length === 0) return utf8.EMPTY
    if (values.length === 1) return values[0]

    let totalByteLength = this.byteLength * (values.length - 1)
    let totalLength = this.length * (values.length - 1)
    for (let value of values) {
      totalByteLength += value.byteLength
      totalLength += value.length
    }

    const buffer = new Uint8Array(totalByteLength)

    let offset = 0
    for (let i = 0; i < values.length - 1; i++) {
      buffer.set(values[i][BUFFER], offset)
      offset += values[i].byteLength

      buffer.set(this[BUFFER], offset)
      offset += this.byteLength
    }
    buffer.set(values[values.length - 1][BUFFER], offset)

    return new utf8(UTF8_CONSTRUCTOR_GUARD, buffer, totalLength)
  }
}

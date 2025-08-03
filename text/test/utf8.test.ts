import { describe, test, expect } from "vitest"
import { utf8, u, Utf8DecodingError, utf8Decoder } from "../src/utf8"

describe("utf8Decoder", () => {
  describe("decodeCodePoint", () => {
    test("decodes ASCII characters", () => {
      const bytes = new Uint8Array([0x41, 0x42, 0x43]) // "ABC"
      expect(utf8Decoder.decodeCodePoint(bytes, 0)).toEqual({
        codePoint: 0x41,
        byteLength: 1,
      })
      expect(utf8Decoder.decodeCodePoint(bytes, 1)).toEqual({
        codePoint: 0x42,
        byteLength: 1,
      })
    })

    test("decodes 2-byte UTF-8 sequences", () => {
      const bytes = new Uint8Array([0xc3, 0xa9]) // "é"
      expect(utf8Decoder.decodeCodePoint(bytes, 0)).toEqual({
        codePoint: 0xe9,
        byteLength: 2,
      })
    })

    test("decodes 3-byte UTF-8 sequences", () => {
      const bytes = new Uint8Array([0xe2, 0x82, 0xac]) // "€"
      expect(utf8Decoder.decodeCodePoint(bytes, 0)).toEqual({
        codePoint: 0x20ac,
        byteLength: 3,
      })
    })

    test("decodes 4-byte UTF-8 sequences", () => {
      const bytes = new Uint8Array([0xf0, 0x9f, 0x98, 0x80]) // "😀"
      expect(utf8Decoder.decodeCodePoint(bytes, 0)).toEqual({
        codePoint: 0x1f600,
        byteLength: 4,
      })
    })

    test("returns null for invalid UTF-8", () => {
      const bytes = new Uint8Array([0xff, 0xfe]) // Invalid UTF-8
      expect(utf8Decoder.decodeCodePoint(bytes, 0)).toBeNull()
    })

    test("returns null for incomplete sequences", () => {
      const bytes = new Uint8Array([0xc3]) // Incomplete 2-byte sequence
      expect(utf8Decoder.decodeCodePoint(bytes, 0)).toBeNull()
    })

    test("returns null for invalid continuation bytes", () => {
      const bytes = new Uint8Array([0xc3, 0x00]) // Invalid continuation byte
      expect(utf8Decoder.decodeCodePoint(bytes, 0)).toBeNull()
    })
  })

  describe("isStartByte", () => {
    test("identifies ASCII start bytes", () => {
      expect(utf8Decoder.isStartByte(0x41)).toBe(true) // 'A'
      expect(utf8Decoder.isStartByte(0x7f)).toBe(true) // DEL
    })

    test("identifies multi-byte start bytes", () => {
      expect(utf8Decoder.isStartByte(0xc3)).toBe(true) // 2-byte start
      expect(utf8Decoder.isStartByte(0xe2)).toBe(true) // 3-byte start
      expect(utf8Decoder.isStartByte(0xf0)).toBe(true) // 4-byte start
    })

    test("rejects continuation bytes", () => {
      expect(utf8Decoder.isStartByte(0x80)).toBe(false)
      expect(utf8Decoder.isStartByte(0xbf)).toBe(false)
    })

    test("rejects invalid bytes", () => {
      expect(utf8Decoder.isStartByte(0xff)).toBe(false)
      expect(utf8Decoder.isStartByte(0xfe)).toBe(false)
    })
  })

  describe("isContinuationByte", () => {
    test("identifies continuation bytes", () => {
      expect(utf8Decoder.isContinuationByte(0x80)).toBe(true)
      expect(utf8Decoder.isContinuationByte(0xbf)).toBe(true)
      expect(utf8Decoder.isContinuationByte(0xa9)).toBe(true)
    })

    test("rejects start bytes", () => {
      expect(utf8Decoder.isContinuationByte(0x41)).toBe(false) // ASCII
      expect(utf8Decoder.isContinuationByte(0xc3)).toBe(false) // 2-byte start
      expect(utf8Decoder.isContinuationByte(0xe2)).toBe(false) // 3-byte start
      expect(utf8Decoder.isContinuationByte(0xf0)).toBe(false) // 4-byte start
    })
  })

  describe("findPreviousCodePointStart", () => {
    test("finds previous ASCII character", () => {
      const bytes = new Uint8Array([0x41, 0x42, 0x43]) // "ABC"
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 2)).toBe(1)
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 1)).toBe(0)
    })

    test("finds previous multi-byte character", () => {
      const bytes = new Uint8Array([0x41, 0xc3, 0xa9, 0x42]) // "AéB"
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 4)).toBe(3) // before end, so "B" at position 3
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 3)).toBe(1) // before "B", so "é" at position 1
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 1)).toBe(0) // before "é", so "A" at position 0
    })

    test("handles 4-byte sequences", () => {
      const bytes = new Uint8Array([0x41, 0xf0, 0x9f, 0x98, 0x80, 0x42]) // "A😀B"
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 6)).toBe(5) // before end, so "B" at position 5
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 5)).toBe(1) // before "B", so "😀" at position 1
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 1)).toBe(0) // before "😀", so "A" at position 0
    })

    test("returns null at beginning", () => {
      const bytes = new Uint8Array([0x41, 0x42])
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 0)).toBeNull()
    })

    test("handles invalid UTF-8", () => {
      const bytes = new Uint8Array([0x41, 0xff, 0x42])
      expect(utf8Decoder.findPreviousCodePointStart(bytes, 3)).toBe(2) // before end, so "B" at position 2
    })
  })

  describe("findCodePointStart", () => {
    test("returns same offset for start bytes", () => {
      const bytes = new Uint8Array([0x41, 0xc3, 0xa9]) // "Aé"
      expect(utf8Decoder.findCodePointStart(bytes, 0)).toBe(0)
      expect(utf8Decoder.findCodePointStart(bytes, 1)).toBe(1)
    })

    test("finds start of multi-byte sequence", () => {
      const bytes = new Uint8Array([0x41, 0xc3, 0xa9]) // "Aé"
      expect(utf8Decoder.findCodePointStart(bytes, 2)).toBe(1) // continuation byte points to start
    })

    test("handles 4-byte sequences", () => {
      const bytes = new Uint8Array([0xf0, 0x9f, 0x98, 0x80]) // "😀"
      expect(utf8Decoder.findCodePointStart(bytes, 1)).toBe(0)
      expect(utf8Decoder.findCodePointStart(bytes, 2)).toBe(0)
      expect(utf8Decoder.findCodePointStart(bytes, 3)).toBe(0)
    })

    test("returns null for out of bounds", () => {
      const bytes = new Uint8Array([0x41])
      expect(utf8Decoder.findCodePointStart(bytes, -1)).toBeNull()
      expect(utf8Decoder.findCodePointStart(bytes, 1)).toBeNull()
    })
  })

  describe("getCodePointCount", () => {
    test("counts ASCII characters", () => {
      const bytes = new Uint8Array([0x41, 0x42, 0x43]) // "ABC"
      expect(utf8Decoder.getCodePointCount(bytes)).toBe(3)
    })

    test("counts mixed UTF-8 sequences", () => {
      const bytes = new Uint8Array([0x41, 0xc3, 0xa9, 0xe2, 0x82, 0xac]) // "Aé€"
      expect(utf8Decoder.getCodePointCount(bytes)).toBe(3)
    })

    test("counts 4-byte sequences", () => {
      const bytes = new Uint8Array([
        0xf0, 0x9f, 0x98, 0x80, 0xf0, 0x9f, 0x98, 0x81,
      ]) // "😀😁"
      expect(utf8Decoder.getCodePointCount(bytes)).toBe(2)
    })

    test("throws on invalid UTF-8", () => {
      const bytes = new Uint8Array([0xff])
      expect(() => utf8Decoder.getCodePointCount(bytes)).toThrow(
        Utf8DecodingError,
      )
    })
  })

  describe("getCodePointAt", () => {
    test("gets codepoints by index", () => {
      const bytes = new Uint8Array([0x41, 0xc3, 0xa9, 0xe2, 0x82, 0xac]) // "Aé€"
      expect(utf8Decoder.getCodePointAt(bytes, 0)).toBe(0x41) // 'A'
      expect(utf8Decoder.getCodePointAt(bytes, 1)).toBe(0xe9) // 'é'
      expect(utf8Decoder.getCodePointAt(bytes, 2)).toBe(0x20ac) // '€'
      expect(utf8Decoder.getCodePointAt(bytes, 3)).toBeUndefined()
    })
  })
})

describe("Utf8DecodingError", () => {
  test("constructs from TypeError", () => {
    const typeError = new TypeError("Invalid byte sequence")
    const error = new Utf8DecodingError(typeError)
    expect(error.message).toBe("Invalid byte sequence")
    expect(error.cause).toBe(typeError)
  })

  test("constructs from string", () => {
    const error = new Utf8DecodingError("Custom error message")
    expect(error.message).toBe("Custom error message")
    expect(error.cause).toBeUndefined()
  })

  test("throws on invalid argument", () => {
    expect(() => new Utf8DecodingError(123 as unknown as string)).toThrow(
      TypeError,
    )
  })
})

describe("utf8 class", () => {
  describe("construction", () => {
    test("prevents direct construction", () => {
      expect(() => new (utf8 as unknown as new () => utf8)()).toThrow(
        "Illegal invocation",
      )
    })

    test("provides EMPTY constant", () => {
      expect(utf8.EMPTY.length).toBe(0)
      expect(utf8.EMPTY.byteLength).toBe(0)
      expect(utf8.EMPTY.toString()).toBe("")
    })
  })

  describe("from", () => {
    test("creates from ASCII string", () => {
      const result = utf8.from("Hello")
      expect(result).toBeInstanceOf(utf8)
      if (result instanceof utf8) {
        expect(result.toString()).toBe("Hello")
        expect(result.length).toBe(5)
        expect(result.byteLength).toBe(5)
      }
    })

    test("creates from Unicode string", () => {
      const result = utf8.from("Hé€😀")
      expect(result).toBeInstanceOf(utf8)
      if (result instanceof utf8) {
        expect(result.toString()).toBe("Hé€😀")
        expect(result.length).toBe(4)
        expect(result.byteLength).toBe(10) // 1 + 2 + 3 + 4 bytes
      }
    })

    test("creates from valid Uint8Array", () => {
      const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello"
      const result = utf8.from(bytes)
      expect(result).toBeInstanceOf(utf8)
      if (result instanceof utf8) {
        expect(result.toString()).toBe("Hello")
        expect(result.length).toBe(5)
        expect(result.byteLength).toBe(5)
      }
    })

    test("returns error for invalid Uint8Array", () => {
      const bytes = new Uint8Array([0xff, 0xfe]) // Invalid UTF-8
      const result = utf8.from(bytes)
      expect(result).toBeInstanceOf(Utf8DecodingError)
    })

    test("throws for invalid input type", () => {
      expect(() => utf8.from(123 as unknown as string)).toThrow(TypeError)
    })
  })

  describe("methods", () => {
    const testString = utf8.from("Hé€😀") as utf8

    test("toBytes", () => {
      const bytes = testString.toBytes()
      expect(bytes).toBeInstanceOf(Uint8Array)
      expect(bytes.length).toBe(10)
      expect(Array.from(bytes)).toEqual([
        0x48, // H
        0xc3,
        0xa9, // é
        0xe2,
        0x82,
        0xac, // €
        0xf0,
        0x9f,
        0x98,
        0x80, // 😀
      ])
    })

    test("toString", () => {
      expect(testString.toString()).toBe("Hé€😀")
    })

    test("valueOf", () => {
      expect(testString.valueOf()).toBe("Hé€😀")
    })

    test("runeAt", () => {
      expect(testString.runeAt(0)).toBe(0x48) // H
      expect(testString.runeAt(1)).toBe(0xe9) // é
      expect(testString.runeAt(2)).toBe(0x20ac) // €
      expect(testString.runeAt(3)).toBe(0x1f600) // 😀
      expect(testString.runeAt(4)).toBeUndefined()
    })

    test("charAt", () => {
      expect(testString.charAt(0)).toBe("H")
      expect(testString.charAt(1)).toBe("é")
      expect(testString.charAt(2)).toBe("€")
      expect(testString.charAt(3)).toBe("😀")
      expect(testString.charAt(4)).toBeUndefined()
    })

    test("byteAt", () => {
      expect(testString.byteAt(0)).toBe(0x48) // H
      expect(testString.byteAt(1)).toBe(0xc3) // first byte of é
      expect(testString.byteAt(10)).toBeUndefined()
    })

    test("slice", () => {
      expect(testString.slice().toString()).toBe("Hé€😀") // no args returns self
      expect(testString.slice(1).toString()).toBe("é€😀")
      expect(testString.slice(1, 3).toString()).toBe("é€")
      expect(testString.slice(2, 2).toString()).toBe("")
      expect(testString.slice(10)).toBe(utf8.EMPTY)
    })

    test("concat", () => {
      const hello = utf8.from("Hello") as utf8
      const world = utf8.from(" World") as utf8
      const result = hello.concat(world)
      expect(result.toString()).toBe("Hello World")
      expect(result.length).toBe(11)
    })

    test("join", () => {
      const comma = utf8.from(", ") as utf8
      const parts = [
        utf8.from("apple") as utf8,
        utf8.from("banana") as utf8,
        utf8.from("cherry") as utf8,
      ]
      const result = comma.join(parts)
      expect(result.toString()).toBe("apple, banana, cherry")
    })

    test("join with empty array", () => {
      const comma = utf8.from(", ") as utf8
      expect(comma.join([])).toBe(utf8.EMPTY)
    })

    test("join with single item", () => {
      const comma = utf8.from(", ") as utf8
      const apple = utf8.from("apple") as utf8
      expect(comma.join([apple])).toBe(apple)
    })
  })

  describe("iterators", () => {
    const testString = utf8.from("Aé😀") as utf8

    test("chars iterator", () => {
      const chars = Array.from(testString.chars())
      expect(chars).toEqual(["A", "é", "😀"])
    })

    test("runes iterator", () => {
      const runes = Array.from(testString.runes())
      expect(runes).toEqual([0x41, 0xe9, 0x1f600])
    })

    test("bytes iterator", () => {
      const bytes = Array.from(testString.bytes())
      expect(bytes).toEqual([0x41, 0xc3, 0xa9, 0xf0, 0x9f, 0x98, 0x80])
    })

    test("reverse iteration", () => {
      const iter = testString.chars()
      const forward = []
      const backward = []

      // Collect forward
      let result = iter.next()
      while (!result.done) {
        forward.push(result.value)
        result = iter.next()
      }

      // Reset and collect backward
      const backIter = testString.chars()
      result = backIter.nextBack()
      while (!result.done) {
        backward.push(result.value)
        result = backIter.nextBack()
      }

      expect(forward).toEqual(["A", "é", "😀"])
      expect(backward).toEqual(["😀", "é", "A"])
    })

    test("mixed forward/backward iteration", () => {
      const iter = testString.chars()
      expect(iter.next().value).toBe("A")
      expect(iter.nextBack().value).toBe("😀")
      expect(iter.next().value).toBe("é")
      expect(iter.nextBack().done).toBe(true)
      expect(iter.next().done).toBe(true)
    })

    test("size hint", () => {
      const iter = testString.chars()
      expect(iter.size()).toBe(3)
      iter.next()
      expect(iter.size()).toBe(2)
      iter.nextBack()
      expect(iter.size()).toBe(1)
    })
  })
})

describe("template literal function u", () => {
  test("creates utf8 from template literal", () => {
    const result = u`Hello, World!`
    expect(result).toBeInstanceOf(utf8)
    expect(result.toString()).toBe("Hello, World!")
  })

  test("interpolates utf8 values", () => {
    const name = utf8.from("Alice") as utf8
    const greeting = utf8.from("Hello") as utf8
    const result = u`${greeting}, ${name}!`
    expect(result.toString()).toBe("Hello, Alice!")
  })

  test("handles Unicode in literals", () => {
    const emoji = utf8.from("😀") as utf8
    const result = u`Smile ${emoji} please`
    expect(result.toString()).toBe("Smile 😀 please")
  })

  // test("throws on invalid UTF-8 in literal", () => {
  //   // This would be hard to test directly since TypeScript template literals
  //   // are always valid strings, but we can test the error path by mocking
  //   // the cache to return an error
  //   const originalCache = (u as any).litCache?.cache
  //   if (originalCache) {
  //     originalCache["test"] = new TypeError("Invalid UTF-8")
  //     expect(() => u`test`).toThrow(Utf8DecodingError)
  //     delete originalCache["test"]
  //   }
  // })

  test("caches literal parts", () => {
    // Test that repeated calls with the same literal reuse cached results
    const result1 = u`constant`
    const result2 = u`constant`
    expect(result1.toString()).toBe(result2.toString())
  })

  test("handles empty interpolations", () => {
    const empty = utf8.EMPTY
    const result = u`start${empty}end`
    expect(result.toString()).toBe("startend")
  })

  test("calculates correct lengths with interpolations", () => {
    const part1 = utf8.from("Hé") as utf8 // 2 chars, 3 bytes
    const part2 = utf8.from("😀") as utf8 // 1 char, 4 bytes
    const result = u`A${part1}B${part2}C` // "A" + "Hé" + "B" + "😀" + "C"
    expect(result.length).toBe(6) // A + H + é + B + 😀 + C
    expect(result.byteLength).toBe(10) // 1 + 1 + 2 + 1 + 4 + 1
  })
})

describe("edge cases and error handling", () => {
  test("handles empty strings", () => {
    const empty = utf8.from("") as utf8
    expect(empty.length).toBe(0)
    expect(empty.byteLength).toBe(0)
    expect(empty.toString()).toBe("")
    expect(Array.from(empty.chars())).toEqual([])
    expect(Array.from(empty.runes())).toEqual([])
    expect(Array.from(empty.bytes())).toEqual([])
  })

  test("handles strings with only ASCII", () => {
    const ascii = utf8.from("Hello") as utf8
    expect(ascii.length).toBe(5)
    expect(ascii.byteLength).toBe(5)
  })

  test("handles strings with only high Unicode", () => {
    const emoji = utf8.from("😀😁😂") as utf8
    expect(emoji.length).toBe(3)
    expect(emoji.byteLength).toBe(12) // 4 bytes each
  })

  test("handles boundary conditions in slice", () => {
    const str = utf8.from("Hello") as utf8
    expect(str.slice(0, 0).toString()).toBe("")
    expect(str.slice(5, 10)).toBe(utf8.EMPTY)
    expect(str.slice(-1)).toBe(str) // negative start returns original string
  })

  test("frozen and non-enumerable properties", () => {
    const str = utf8.from("test") as utf8
    expect(Object.isFrozen(str)).toBe(true)

    const descriptor = Object.getOwnPropertyDescriptor(str, "buffer")
    expect(descriptor?.enumerable).toBe(false)
  })

  test("iterator error handling", () => {
    // Test with invalid UTF-8 bytes to trigger iterator errors
    const invalidBytes = new Uint8Array([0x41, 0xff, 0x42])
    expect(() => utf8Decoder.iterateCodePoints(invalidBytes, 2)).not.toThrow()

    const iter = utf8Decoder.iterateCodePoints(invalidBytes, 2)
    expect(iter.next().value).toBe(0x41) // 'A'
    expect(() => iter.next()).toThrow(Utf8DecodingError)
  })
})

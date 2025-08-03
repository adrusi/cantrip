import "./patch-std"

import * as compat from "@cantrip/compat/core"

export function hash(a: unknown): number {
  switch (typeof a) {
    case "number":
      return hashNumber(a)
    case "string":
      return hashString(a)
    case "boolean":
      return hashBoolean(a)
    case "undefined":
      return UNDEFINED_HASH
    case "bigint":
      return hashBigInt(a)
    case "symbol":
      return hashSymbol(a)
    case "object":
    case "function":
      if (a === null) return NULL_HASH

      if (compat.isHashable(a)) {
        let hash = a[compat.HASH]()
        return ((hash >>> 1) & 0x40000000) | (hash & 0xbfffffff)
      }

      return hashObject(a)
  }
}

const UNDEFINED_HASH = 0x42108423
const NULL_HASH = 0x42108422

export function hashNumber(a: number): number {
  if (a !== a || a === Infinity) {
    return 0
  }
  let hash = a
  if (hash !== a) {
    hash ^= a * 0xffffffff
  }
  while (a > 0xffffffff) {
    a /= 0xffffffff
    hash ^= a
  }
  return ((hash >>> 1) & 0x40000000) | (hash & 0xbfffffff)
}

export function hashBoolean(a: boolean): number {
  return a ? 0x42108421 : 0x42108420
}

export function hashBigInt(a: bigint): number {
  return hashString(a.toString())
}

const STRING_HASH_CACHE_MIN_STRLEN = 16
const STRING_HASH_CACHE_MAX_SIZE = 255
let stringHashCacheSize = 0
let stringHashCache = Object.create(null) as { [_: string]: number }

export function hashString(a: string): number {
  if (a.length < STRING_HASH_CACHE_MIN_STRLEN) {
    return computeStringHash(a)
  }

  let hash = stringHashCache[a]

  if (hash === undefined) {
    hash = computeStringHash(a)
    if (stringHashCacheSize === STRING_HASH_CACHE_MAX_SIZE) {
      stringHashCacheSize = 0
      stringHashCache = Object.create(null) as { [_: string]: number }
    }
    stringHashCache[a] = hash
  }

  return hash
}

function computeStringHash(a: string): number {
  let hash = 0
  for (let i = 0; i < a.length; i++) {
    hash = 31 * hash + a.charCodeAt(i)
  }
  return ((hash >>> 1) & 0x40000000) | (hash & 0xbfffffff)
}

let _nextHash = 0

function nextHash(): number {
  const nextHash = ++_nextHash
  if (_nextHash & 0x40000000) {
    _nextHash = 0
  }
  return nextHash
}

const symbolMap = Object.create(null) as { [_: symbol]: number }

export function hashSymbol(a: symbol): number {
  let hashed = symbolMap[a]
  if (hashed !== undefined) return hashed

  return (symbolMap[a] = nextHash())
}

type ObjOrFn = object | ((...args: unknown[]) => unknown)

const hashRegistry: WeakMap<ObjOrFn, number> = new WeakMap()

export function hashObject(a: ObjOrFn): number {
  const result = hashRegistry.get(a)
  if (result !== undefined) return result
  const hash = nextHash()
  hashRegistry.set(a, hash)
  return hash
}

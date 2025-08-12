import { type AbstractColl, isOrdered } from "./types/coll"
import { type AbstractKeyColl, isAbstractKeyColl } from "./types/key-coll"
import { smi, hashMerge, hash } from "@cantrip/core"
import { Iter } from "@cantrip/iter"

export function hashCollection(coll: AbstractColl): number {
  const ordered = isOrdered(coll)
  const keyed = isAbstractKeyColl(coll)

  let result = ordered ? 1 : 0

  if (keyed && ordered) {
    for (let [k, v] of Iter.from(
      coll as AbstractKeyColl<unknown, unknown, unknown>,
    )) {
      result = (31 * result + hashMerge(hash(v), hash(k))) | 0
    }
  } else if (keyed && !ordered) {
    for (let [k, v] of Iter.from(
      coll as AbstractKeyColl<unknown, unknown, unknown>,
    )) {
      result = (result + hashMerge(hash(v), hash(k))) | 0
    }
  } else if (!keyed && ordered) {
    for (let x of Iter.from(coll)) {
      result = (31 * result + hash(x)) | 0
    }
  } else if (!keyed && !ordered) {
    for (let x of Iter.from(coll)) {
      result = (result + hash(x)) | 0
    }
  }

  return murmurHashOfSize(coll.size(), result)
}

function murmurHashOfSize(size: number, hash: number): number {
  let result = Math.imul(hash, 0xcc9e2d51)
  result = Math.imul((result << 15) | (result >>> -15), 0x1b873593)
  result = Math.imul((result << 13) | (result >>> -13), 5)
  result = ((result + 0xe6546b64) | 0) ^ size
  result = Math.imul(result ^ (result >>> 16), 0x85ebca6b)
  result = Math.imul(result ^ (result >>> 13), 0xc2b2ae35)
  result = smi(result ^ (result >>> 16))
  return result
}

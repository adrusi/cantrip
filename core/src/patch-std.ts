/* eslint @typescript-eslint/no-empty-object-type: 0 */

import { hash } from "./hash"

import * as compat from "@cantrip/compat/core"

declare global {
  interface String extends compat.Eq, compat.Hashable {}
  interface Number extends compat.Eq, compat.Hashable {}
  interface Boolean extends compat.Eq, compat.Hashable {}
  interface BigInt extends compat.Eq, compat.Hashable {}
  interface Symbol extends compat.Eq, compat.Hashable {}
}

function boxedPrimEq(this: object, that: unknown): boolean {
  if (that instanceof this.constructor) that = that.valueOf()
  return this.valueOf() === that
}

function boxedPrimHash(this: object): number {
  return hash(this.valueOf())
}

String.prototype[compat.EQ] = boxedPrimEq
Number.prototype[compat.EQ] = boxedPrimEq
Boolean.prototype[compat.EQ] = boxedPrimEq
BigInt.prototype[compat.EQ] = boxedPrimEq
Symbol.prototype[compat.EQ] = boxedPrimEq

String.prototype[compat.HASH] = boxedPrimHash
Number.prototype[compat.HASH] = boxedPrimHash
Boolean.prototype[compat.HASH] = boxedPrimHash
BigInt.prototype[compat.HASH] = boxedPrimHash
Symbol.prototype[compat.HASH] = boxedPrimHash

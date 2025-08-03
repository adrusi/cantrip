import "./patch-std"

import * as compat from "@cantrip/compat/core"

export function eq(a: unknown, b: unknown): boolean {
  switch (typeof a) {
    case "number":
    case "string":
    case "boolean":
    case "undefined":
    case "bigint":
    case "symbol":
      return a === b
    case "object":
    case "function":
      if (compat.isEq(a)) return a[compat.EQ](b)
      return a === b
  }
}

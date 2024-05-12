import * as compat from "@cantrip/compat/iter"
import * as acompat from "@cantrip/compat/iter/async"

import { ArrayIter } from "./coll"

declare global {
  interface Array<T> extends compat.BackSizeIterable<T> {}
}

Array.prototype[compat.IS_BACK_ITERABLE] = true
Array.prototype[compat.IS_SIZE_ITERABLE] = true
Array.prototype[compat.ITERATOR] = function () {
  return new ArrayIter(this)
}

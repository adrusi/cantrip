import * as compat from "@cantrip/compat/iter"

import { ArrayIter } from "./coll"

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Array<T> extends compat.BackSizeIterable<T> {}
}

Array.prototype[compat.IS_BACK_ITERABLE] = true
Array.prototype[compat.IS_SIZE_ITERABLE] = true
Array.prototype[compat.ITERATOR] = function () {
  return new ArrayIter(this)
}

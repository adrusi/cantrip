import * as iter from "./iter"
import * as compat from "@cantrip/compat/iter"

export class ArrayIter<A> extends iter.BackSizeIter<A> {
  readonly #src: readonly A[]
  #cursor: number
  #cursorBack: number

  constructor(src: readonly A[]) {
    super()
    this.#src = src
    this.#cursor = 0
    this.#cursorBack = src.length - 1
  }

  next(): compat.IteratorResult<A> {
    if (this.#cursorBack < this.#cursor) return { done: true, value: undefined }
    return { done: false, value: this.#src[this.#cursor++] }
  }

  nextBack(): compat.IteratorResult<A> {
    if (this.#cursorBack < this.#cursor) return { done: true, value: undefined }
    return { done: false, value: this.#src[this.#cursorBack--] }
  }

  size(): number {
    return this.#cursorBack - this.#cursor + 1
  }
}

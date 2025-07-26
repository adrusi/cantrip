import type * as compat from "@cantrip/compat/iter"
import * as iter from "./iter"

export class ArrayIter<A> extends iter.BackSizeIter<A> {
  private readonly src: readonly A[]
  private cursor: number
  private cursorBack: number

  public constructor(src: readonly A[]) {
    super()
    this.src = src
    this.cursor = 0
    this.cursorBack = src.length - 1
  }

  public next(): compat.IteratorResult<A> {
    if (this.cursorBack < this.cursor) return { done: true, value: undefined }
    return { done: false, value: this.src[this.cursor++] }
  }

  public nextBack(): compat.IteratorResult<A> {
    if (this.cursorBack < this.cursor) return { done: true, value: undefined }
    return { done: false, value: this.src[this.cursorBack--] }
  }

  public size(): number {
    return this.cursorBack - this.cursor + 1
  }
}

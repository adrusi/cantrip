import * as compat from "@cantrip/compat/iter"

export class ArrayIter<A> implements compat.BackSizeIterator<A> {
  public readonly [compat.IS_ITERATOR] = true

  private readonly src: readonly A[]
  private cursor: number
  private cursorBack: number

  public constructor(src: readonly A[]) {
    this.src = src
    this.cursor = 0
    this.cursorBack = src.length - 1
  }

  public next(): compat.IteratorResult<A> {
    if (this.cursorBack < this.cursor) return { done: true, value: undefined }
    return { done: false, value: this.src[this.cursor++] }
  }

  public [compat.NEXT_BACK](): compat.IteratorResult<A> {
    if (this.cursorBack < this.cursor) return { done: true, value: undefined }
    return { done: false, value: this.src[this.cursorBack--] }
  }

  public [compat.SIZE](): number {
    return this.cursorBack - this.cursor + 1
  }
}

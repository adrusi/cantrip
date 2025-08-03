import * as compat from "@cantrip/compat/iter"

export class ArrayIter<A> implements compat.BackSizeIterator<A> {
  public readonly [compat.IS_ITERATOR] = true

  private readonly src: readonly A[]
  private offset: number = 0
  private offsetBack: number = 0

  public constructor(src: readonly A[]) {
    this.src = src
  }

  public next(): compat.IteratorResult<A> {
    if (this.src.length - this.offset - this.offsetBack <= 0)
      return { done: true, value: undefined }
    return { done: false, value: this.src[this.offset++] }
  }

  public [compat.NEXT_BACK](): compat.IteratorResult<A> {
    if (this.src.length - this.offset - this.offsetBack <= 0)
      return { done: true, value: undefined }
    return {
      done: false,
      value: this.src[this.src.length - 1 - this.offsetBack++],
    }
  }

  public [compat.SIZE](): number {
    return this.src.length - this.offset - this.offsetBack
  }
}

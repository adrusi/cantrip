import { IllegalInvocationError, ArgumentError } from "@cantrip/error"
import type { UnionToTuple, Permutations } from "@cantrip/typelevel"

import type { Arr } from "./arr"
import * as dtype from "./dtype"

const NUM_BUF_ARR_GUARD = Symbol("NUM_BUF_ARR_GUARD")

function frozenTuple<const T extends readonly unknown[]>(tuple: T): T {
  return Object.freeze([...tuple]) as unknown as T
}

function parseAxesSpec<const Axes extends string>(
  spec: Record<Axes, number | [number, number]>,
): {
  readonly dims: Readonly<Record<Axes, number>>
  readonly offsets: Readonly<Record<Axes, number>>
} {
  let dims: Partial<Record<Axes, number>> = {}
  let offsets: Partial<Record<Axes, number>> = {}

  for (let axis in spec) {
    let dim = spec[axis]
    if (typeof dim === "number") {
      dims[axis] = dim
      offsets[axis] = 0
    } else if (Array.isArray(dim) && dim.length === 2) {
      let [start, end] = dim
      dims[axis] = end - start + 1
      offsets[axis] = start
    } else {
      throw new TypeError("Invalid axis spec")
    }
  }

  return {
    dims: Object.freeze(dims as Record<Axes, number>),
    offsets: Object.freeze(offsets as Record<Axes, number>),
  }
}

export class NumBufArr<
  const DType extends dtype.Numeric,
  const Axes extends string,
> implements Arr<dtype.Js<DType>, Axes[number]>
{
  private readonly mutable_: boolean
  private readonly dtype_: DType
  private readonly buffer_: ArrayBuffer
  private readonly dims_: Readonly<Record<Axes, number>>
  private readonly offsets_: Readonly<Record<Axes, number>>
  private readonly strides_: Readonly<Record<Axes, number>>

  public get mutable(): boolean {
    return this.mutable_
  }

  public get dtype(): DType {
    return this.dtype_
  }

  public get buffer(): ArrayBuffer {
    return this.buffer_
  }

  public get axes(): Readonly<Permutations<UnionToTuple<Axes>>> {
    let result = []
    for (let axis in this.dims_) result.push(axis)
    return frozenTuple(result) as unknown as Readonly<
      Permutations<UnionToTuple<Axes>>
    >
  }

  public get dims(): Readonly<Record<Axes, number>> {
    return this.dims_
  }

  public get offsets(): Readonly<Record<Axes, number>> {
    return this.offsets_
  }

  public get bounds(): Readonly<Record<Axes, [number, number]>> {
    let result: Partial<Readonly<Record<Axes, [number, number]>>> = {}
    for (let axis in this.dims_) {
      result[axis] = [
        0 + this.offsets_[axis],
        this.dims_[axis] + this.offsets_[axis] - 1,
      ]
    }
    return result as Readonly<Record<Axes, [number, number]>>
  }

  public get strides(): Readonly<Record<Axes, number>> {
    return this.strides_
  }

  private constructor(
    _guard: typeof NUM_BUF_ARR_GUARD,
    {
      mutable,
      dtype,
      buffer,
      dims,
      offsets,
      strides,
    }: {
      readonly mutable: boolean
      readonly dtype: DType
      readonly buffer: ArrayBuffer
      readonly dims: Record<Axes, number>
      readonly offsets: Record<Axes, number>
      readonly strides: Record<Axes, number>
    },
  ) {
    if (_guard !== NUM_BUF_ARR_GUARD) {
      throw new IllegalInvocationError(
        "Illegal direct invocation of NumBufArr constructor",
      )
    }

    this.mutable_ = mutable
    this.dtype_ = dtype
    this.buffer_ = buffer
    this.dims_ = Object.freeze({ ...dims })
    this.offsets_ = Object.freeze({ ...offsets })
    this.strides_ = Object.freeze({ ...strides })
  }

  public static zeros<
    const Axes extends string,
    const DType extends dtype.Numeric,
  >({
    dtype: dtype_,
    order,
    axes,
  }: {
    readonly dtype: DType
    readonly axes: Record<Axes, number | [number, number]>
    readonly order?: Permutations<UnionToTuple<NoInfer<Axes>>>
  }): NumBufArr<DType, Axes> {
    let dtype__ = dtype_ ?? dtype.f64

    let { dims, offsets } = parseAxesSpec(axes)

    let order_ = (order ?? Object.keys(dims)) as unknown as Axes[]

    if (order_.length !== Object.keys(dims).length) {
      throw new ArgumentError("Invalid order")
    }
    for (let axis of order_) {
      if (!(axis in dims)) {
        throw new ArgumentError("Invalid order")
      }
    }
    for (let axis in dims) {
      if (!order_.includes(axis)) {
        throw new ArgumentError("Invalid order")
      }
    }

    let strides: Partial<Record<Axes, number>> = {}
    let itemSize = dtype.sizeOf(dtype__)
    let byteSize = itemSize
    for (let axis of order_) {
      strides[axis] = byteSize
      byteSize *= dims[axis]
    }

    return new NumBufArr(NUM_BUF_ARR_GUARD, {
      mutable: true,
      dtype: dtype__,
      buffer: new ArrayBuffer(byteSize),
      dims,
      offsets,
      strides: strides as unknown as Record<Axes, number>,
    })
  }
}

let arr = NumBufArr.zeros({
  dtype: dtype.f64,
  order: ["x", "y", "z"],
  axes: { x: 1, y: 2, z: 3 },
})

let x = arr.axes

let arr2 = NumBufArr.zeros({
  dtype: dtype.f64,
  axes: {},
})

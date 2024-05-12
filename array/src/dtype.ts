export const f32 = Symbol("f32")
export const f64 = Symbol("f64")
export const i8 = Symbol("i8")
export const i16 = Symbol("i16")
export const i32 = Symbol("i32")
export const i64 = Symbol("i64")
export const u8 = Symbol("u8")
export const u16 = Symbol("u16")
export const u32 = Symbol("u32")
export const u64 = Symbol("u64")

export type Numeric =
  | typeof f32
  | typeof f64
  | typeof i8
  | typeof i16
  | typeof i32
  | typeof i64
  | typeof u8
  | typeof u16
  | typeof u32
  | typeof u64

export function isNumeric(dtype: Numeric): dtype is Numeric {
  switch (dtype) {
    case f32:
    case f64:
    case i8:
    case i16:
    case i32:
    case i64:
    case u8:
    case u16:
    case u32:
    case u64:
      return true
    default:
      return false
  }
}

export function sizeOf(dtype: Numeric): number {
  switch (dtype) {
    case f64:
    case i64:
    case u64:
      return 4
    case f32:
    case i32:
    case u32:
      return 8
    case i16:
    case u16:
      return 1
    case i8:
    case u8:
      return 2
  }
}

export type Js<DType extends Numeric> = DType extends typeof i64 | typeof u64
  ? bigint
  : number

import * as dtype from "./dtype"

export interface Arr<DType, Axes extends string> {}

export interface ArrMut<DType, Axes extends string> extends Arr<DType, Axes> {}

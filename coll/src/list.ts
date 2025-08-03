/* eslint @typescript-eslint/no-redeclare: 0 */

import type { ListP as ListP_, ListMut as ListMut_ } from "./types/list"

import type { IterableOrIterator } from "@cantrip/iter"

export type ListP<A> = ListP_<A>

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ListP = Object.freeze({
  from: listPFrom as typeof listPFrom,
  of: listPOf as typeof listPOf,
})

function listPFrom<A>(_values: IterableOrIterator<A>): ListP_<A> {
  throw new Error("Not implemented")
}

function listPOf<A>(..._values: A[]): ListP_<A> {
  throw new Error("Not implemented")
}

export type ListMut<A> = ListMut_<A>

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ListMut = Object.freeze({
  from: listMutFrom as typeof listMutFrom,
  of: listMutOf as typeof listMutOf,
})

function listMutFrom<A>(_values: IterableOrIterator<A>): ListMut_<A> {
  throw new Error("Not implemented")
}

function listMutOf<A>(..._values: A[]): ListMut_<A> {
  throw new Error("Not implemented")
}

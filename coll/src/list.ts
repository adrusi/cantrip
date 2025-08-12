/* eslint @typescript-eslint/no-redeclare: 0 */

import type { ListP as ListP_, ListMut as ListMut_ } from "./types/list"

import type { IterableOrIterator } from "@cantrip/iter"

import { ArrayList } from "./list/array-list"
import { BitPartitionedTrieList } from "./list/bit-partitioned-trie-list"

export type ListP<A> = ListP_<A>

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ListP = Object.freeze({
  from: listPFrom as typeof listPFrom,
  of: listPOf as typeof listPOf,
})

function listPFrom<A>(values: IterableOrIterator<A>): ListP_<A> {
  return BitPartitionedTrieList.from(values)
}

function listPOf<A>(...values: A[]): ListP_<A> {
  return BitPartitionedTrieList.from(values)
}

export type ListMut<A> = ListMut_<A>

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ListMut = Object.freeze({
  from: listMutFrom as typeof listMutFrom,
  of: listMutOf as typeof listMutOf,
})

function listMutFrom<A>(values: IterableOrIterator<A>): ListMut_<A> {
  return ArrayList.from(values)
}

function listMutOf<A>(...values: A[]): ListMut_<A> {
  return ArrayList.from(values)
}

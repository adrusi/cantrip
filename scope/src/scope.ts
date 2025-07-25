import { ErrorGroup } from "@cantrip/error"

class InterruptError extends Error {}

const SCOPE_NOTIFY = Symbol("SCOPE_NOTIFY")
const SCOPE_ON_HALT = Symbol("SCOPE_ON_HALT")
const SCOPE_OFF_HALT = Symbol("SCOPE_OFF_HALT")
const SCOPE_ON_COMPLETE = Symbol("SCOPE_ON_COMPLETE")
const SCOPE_ERRORS = Symbol("SCOPE_ERRORS")

class Scope {
  #halted: boolean = false
  #completeListeners: Set<() => void> = new Set()
  #procs: Set<Promise<void>> = new Set()
  #haltListeners: Set<(error: InterruptError) => void> = new Set();
  [SCOPE_ERRORS]: Set<unknown> = new Set()

  spawn(callback: () => Promise<void>) {
    const callingScope = currentScope
    currentScope = this
    let p = callback()
    currentScope = callingScope
    this.#procs.add(p)
    p.then(() => {
      this.#procs.delete(p)
      this[SCOPE_NOTIFY]()
    }).catch((error) => {
      this.#procs.delete(p)
      this[SCOPE_NOTIFY](error)
    })
  }

  halt() {
    let interrupt = new InterruptError("Scope halted")

    if (!this.#halted) {
      this.#halted = true
      for (let callback of this.#haltListeners) {
        callback(interrupt)
      }
    }

    throw interrupt
  }

  [SCOPE_NOTIFY](error?: unknown) {
    if (error !== undefined && !(error instanceof InterruptError)) {
      this[SCOPE_ERRORS].add(error)
      try {
        this.halt()
      } catch (e: unknown) {
        if (!(e instanceof InterruptError)) throw e
      }
    }

    if (this.#procs.size === 0) {
      for (let callback of this.#completeListeners) {
        callback()
      }
    }
  }

  [SCOPE_ON_HALT](callback: (error: InterruptError) => void) {
    this.#haltListeners.add(callback)
  }

  [SCOPE_OFF_HALT](callback: (error: InterruptError) => void) {
    this.#haltListeners.delete(callback)
  }

  [SCOPE_ON_COMPLETE](callback: () => void) {
    this.#completeListeners.add(callback)
  }
}

let currentScope: Scope | null = null

export function withScope(
  callback: (scope: Scope) => Promise<void>,
): Promise<void> {
  let callingScope = currentScope

  return new Promise((resolve, reject) => {
    let scope = new Scope()
    scope[SCOPE_ON_COMPLETE](() => {
      if (scope[SCOPE_ERRORS].size !== 0) {
        reject(new ErrorGroup(Array.from(scope[SCOPE_ERRORS])))
      }
      resolve(undefined)
    })

    currentScope = scope

    callback(scope)
      .finally(() => {
        currentScope = callingScope
      })
      .catch((error) => {
        scope[SCOPE_NOTIFY](error)
      })

    currentScope = callingScope
  })
}

export async function awaitHook<A>(p: PromiseLike<A>): Promise<A> {
  let callingScope = currentScope
  if (callingScope === null) return await p
  currentScope = null

  let haltListener: ((error: InterruptError) => void) | undefined = undefined

  return await Promise.race([
    p,
    new Promise<A>((_, reject) => {
      haltListener = (error) => {
        reject(error)
      }
      callingScope[SCOPE_ON_HALT](haltListener)
    }),
  ]).finally(() => {
    if (haltListener !== undefined) {
      callingScope[SCOPE_OFF_HALT](haltListener)
    }

    currentScope = callingScope
  })
}

// export function forAwaitHook<A>(iter: AsyncIterable<A>): AsyncIterable<A> {

// }

import { ErrorGroup } from "@cantrip/error"

export class InterruptError extends Error {}

const SCOPE_GUARD = Symbol("SCOPE_GUARD")
const SCOPE_NOTIFY = Symbol("SCOPE_NOTIFY")
const SCOPE_ON_HALT = Symbol("SCOPE_ON_HALT")
const SCOPE_OFF_HALT = Symbol("SCOPE_OFF_HALT")
const SCOPE_ON_COMPLETE = Symbol("SCOPE_ON_COMPLETE")
const SCOPE_ERRORS = Symbol("SCOPE_ERRORS")

export class Scope {
  #halted: boolean = false

  readonly #completeListeners: Set<() => void> = new Set()
  readonly #procs: Set<Promise<void>> = new Set()
  readonly #haltListeners: Set<(error: InterruptError) => void> = new Set()

  public [SCOPE_ERRORS]: Set<unknown> = new Set()

  public constructor(guard: typeof SCOPE_GUARD) {
    if (guard !== SCOPE_GUARD) {
      throw new Error("Illegal invocation of Scope constructor")
    }
  }

  public spawn(callback: () => Promise<void>): void {
    const callingScope = currentScope
    // eslint-disable-next-line consistent-this, @typescript-eslint/no-this-alias
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

  public halt(): void {
    let interrupt = new InterruptError("Scope halted")

    if (!this.#halted) {
      this.#halted = true
      for (let callback of this.#haltListeners) {
        callback(interrupt)
      }
    }

    throw interrupt
  }

  public [SCOPE_NOTIFY](error?: unknown): void {
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

  public [SCOPE_ON_HALT](callback: (error: InterruptError) => void): void {
    this.#haltListeners.add(callback)
  }

  public [SCOPE_OFF_HALT](callback: (error: InterruptError) => void): void {
    this.#haltListeners.delete(callback)
  }

  public [SCOPE_ON_COMPLETE](callback: () => void): void {
    this.#completeListeners.add(callback)
  }
}

let currentScope: Scope | null = null

// eslint-disable-next-line @typescript-eslint/promise-function-async
export function withScope(
  callback: (scope: Scope) => Promise<void>,
): Promise<void> {
  let callingScope = currentScope

  return new Promise((resolve, reject) => {
    let scope = new Scope(SCOPE_GUARD)
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
      haltListener = (error): void => {
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

export function forAwaitHook<A, Return = unknown, Next = unknown>(
  iter: AsyncIterable<A> | AsyncIterator<A, Return, Next>,
): AsyncIterator<A, Return, Next> {
  if (Symbol.asyncIterator in iter) {
    iter = iter[Symbol.asyncIterator]()
  }

  if (currentScope === null) return iter

  return new HookedAsyncIterator(iter)
}

class HookedAsyncIterator<A, Return, Next>
  implements AsyncIterator<A, Return, Next>
{
  readonly #iter: AsyncIterator<A, Return, Next>

  public return?: (
    value?: Return | PromiseLike<Return> | undefined,
  ) => Promise<IteratorResult<A, Return>>

  public throw?: (e?: unknown) => Promise<IteratorResult<A, Return>>

  public constructor(iter: AsyncIterator<A, Return, Next>) {
    this.#iter = iter

    if (typeof iter.return === "function") {
      this.return = async (
        value?: Return | PromiseLike<Return> | undefined,
      ): Promise<IteratorResult<A, Return>> => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return await awaitHook(iter.return!(value))
      }
    }

    if (typeof iter.throw === "function") {
      this.throw = async (e?: unknown): Promise<IteratorResult<A, Return>> => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return await awaitHook(iter.throw!(e))
      }
    }
  }

  public async next(...args: [] | [Next]): Promise<IteratorResult<A, Return>> {
    return await awaitHook(this.#iter.next(...args))
  }
}

export function awaitUsingHook<A extends AsyncDisposable>(res: A): A {
  // we either need to proxy this object or mutate it
  // neither is great, but i think mutating is less likely to break consuming code?

  // return new Proxy(res, {
  //   get(_target, prop, _receiver) {
  //     if (prop === Symbol.asyncDispose) {
  //       return async () => {
  //         await awaitHook(res[Symbol.asyncDispose]())
  //       }
  //     }
  //     return Reflect.get(_target, prop, _receiver)
  //   }
  // })

  const origDispose = res[Symbol.asyncDispose]
  res[Symbol.asyncDispose] = async function (): Promise<void> {
    await awaitHook(origDispose.call(this))
  }
  return res
}

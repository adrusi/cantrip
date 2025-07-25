import { describe, test, expect } from "@jest/globals"

import { withScope, awaitHook } from "./scope"

function nextTick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function timeout(millis: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Test timeout after ${millis}ms`)),
      millis,
    )
  })
}

class Checkpoint implements PromiseLike<unknown> {
  readonly #name: string
  #resolve?: (value?: any) => void
  #reject?: (reason?: any) => void
  #isAwaited = false
  #isResolved = false
  readonly #promise: Promise<void>

  constructor(name: string) {
    this.#name = name
    this.#promise = new Promise((resolve, reject) => {
      this.#resolve = (value) => {
        this.#isResolved = true
        resolve(value)
      }
      this.#reject = (reason) => {
        this.#isResolved = true
        reject(reason)
      }
    })

    // Track when this checkpoint is awaited
    this.#promise.then(
      () => {},
      () => {},
    )
  }

  get name(): string {
    return this.#name
  }

  get isAwaited(): boolean {
    return this.#isAwaited
  }

  get isResolved(): boolean {
    return this.#isResolved
  }

  resolve(value?: any): void {
    if (this.#isResolved) {
      throw new Error(`Checkpoint '${this.#name}' already resolved`)
    }
    this.#resolve!(value)
  }

  reject(reason?: any): void {
    if (this.#isResolved) {
      throw new Error(`Checkpoint '${this.#name}' already resolved`)
    }
    this.#reject!(reason)
  }

  then<T1 = unknown, T2 = never>(
    onfulfilled?: (value: unknown) => T1 | PromiseLike<T1>,
    onrejected?: (reason: any) => T2 | PromiseLike<T2>,
  ): Promise<T1 | T2> {
    this.#isAwaited = true
    return this.#promise.then(onfulfilled, onrejected)
  }
}

class TestController {
  readonly #checkpoints = new Map<string, Checkpoint>()

  checkpoint(name: string): Checkpoint {
    if (this.#checkpoints.has(name)) {
      throw new Error(`Checkpoint '${name}' already exists`)
    }
    const chk = new Checkpoint(name)
    this.#checkpoints.set(name, chk)
    return chk
  }

  getCheckpoint(name: string): Checkpoint {
    const chk = this.#checkpoints.get(name)
    if (!chk) throw new Error(`Checkpoint '${name}' not found`)
    return chk
  }

  async waitForCheckpoint(name: string, timeoutMs = 1000): Promise<void> {
    const chk = this.getCheckpoint(name)
    await Promise.race([
      new Promise<void>((resolve) => {
        const check = () => {
          if (chk.isAwaited) {
            resolve()
          } else {
            setTimeout(check, 1)
          }
        }
        check()
      }),
      timeout(timeoutMs),
    ])
  }

  resolveCheckpoint(name: string, value?: any): void {
    this.getCheckpoint(name).resolve(value)
  }

  rejectCheckpoint(name: string, reason?: any): void {
    this.getCheckpoint(name).reject(reason)
  }
}

async function puppet(
  subject: () => Promise<void>,
  agent: (subject: Promise<void>) => Promise<void>,
): Promise<void> {
  let s = subject()
  await agent(s)
}

describe("async scopes", () => {
  test("scopes can accommodate basic linear control flow", async () => {
    const ctrl = new TestController()
    const log: number[] = []

    await puppet(
      async () => {
        await awaitHook(
          withScope(async (scope) => {
            scope.spawn(async () => {
              log.push(1)
              await awaitHook(ctrl.checkpoint("a"))
              log.push(2)
            })
          }),
        )
      },
      async (subject) => {
        await ctrl.waitForCheckpoint("a")
        expect(log).toEqual([1])

        ctrl.resolveCheckpoint("a")
        await nextTick()

        expect(log).toEqual([1, 2])
        await subject
      },
    )
  })

  test("scopes can accommodate basic concurrent jobs", async () => {
    const ctrl = new TestController()
    const log: number[] = []

    await puppet(
      async () => {
        await awaitHook(
          withScope(async (scope) => {
            scope.spawn(async () => {
              await awaitHook(ctrl.checkpoint("a"))
              log.push(1)
            })

            scope.spawn(async () => {
              await awaitHook(ctrl.checkpoint("b"))
              log.push(2)
            })

            scope.spawn(async () => {
              await awaitHook(ctrl.checkpoint("c"))
              log.push(3)
            })
          }),
        )
      },
      async (subject) => {
        await ctrl.waitForCheckpoint("a")
        ctrl.resolveCheckpoint("a")
        await nextTick()
        expect(log).toEqual([1])

        await ctrl.waitForCheckpoint("c")
        ctrl.resolveCheckpoint("c")
        await nextTick()
        expect(log).toEqual([1, 3])

        await ctrl.waitForCheckpoint("b")
        ctrl.resolveCheckpoint("b")
        await subject
        expect(log).toEqual([1, 3, 2])
      },
    )
  })

  test("scope.halt halts all jobs in a scope", async () => {
    const ctrl = new TestController()
    const log: string[] = []

    await puppet(
      async () => {
        await awaitHook(
          withScope(async (scope) => {
            scope.spawn(async () => {
              await awaitHook(ctrl.checkpoint("a1"))
              log.push("a1")
              await awaitHook(ctrl.checkpoint("a2"))
              log.push("a2")
              await awaitHook(ctrl.checkpoint("a3"))
              log.push("a3")
            })

            scope.spawn(async () => {
              await awaitHook(ctrl.checkpoint("b1"))
              log.push("b1")
              await awaitHook(ctrl.checkpoint("b2"))
              log.push("b2")
              await awaitHook(ctrl.checkpoint("b3"))
              log.push("b3")
            })

            scope.spawn(async () => {
              await awaitHook(ctrl.checkpoint("c1"))
              log.push("c1")
              await awaitHook(ctrl.checkpoint("c2"))
              log.push("c2")
              await awaitHook(ctrl.checkpoint("c3"))
              log.push("c3")
            })

            scope.spawn(async () => {
              await awaitHook(ctrl.checkpoint("halt"))
              scope.halt()
            })
          }),
        )
      },
      async (subject) => {
        const order = ["a1", "b1", "c1", "a2", "c2", "a3"]

        for (let checkpoint of order) {
          await ctrl.waitForCheckpoint(checkpoint)
          ctrl.resolveCheckpoint(checkpoint)
          await nextTick()
        }

        await ctrl.waitForCheckpoint("halt")
        ctrl.resolveCheckpoint("halt")
        await subject

        expect(log).toEqual(order)
      },
    )
  })
})

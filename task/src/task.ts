import { brand } from "@cantrip/internal-util"

const CURRENT_TASK = Symbol("CURRENT_TASK")

const TASK_BRAND = Symbol("TASK_BRAND")
const TASK_GUARD = Symbol("TASK_GUARD")

const TASK_ROOTS = Symbol("TASK_ROOTS")
const TASK_SPAWN_CHILD = Symbol("TASK_SPAWN_CHILD")
const TASK_ON_EXIT = Symbol("TASK_ON_EXIT")

export class InterruptError extends Error {}
export class TaskCanceledError extends Error {
  constructor(public reason: InterruptError) {
    super()
  }
}
export class TaskOutlivedParentError<ParentResult> extends Error {
  constructor(public parentResult: ParentResult) {
    super()
  }
}

export type HaltParams = {
  readonly deadlineMillis: number
  readonly timeoutGrowthRate?: number
  readonly generationalDeadlineGrowthRate?: number
  readonly generationalTimeoutGrowthRateGrowthRate?: number
}

const TASK_AWAIT_COMPLETION = Symbol("TASK_AWAIT_COMPLETION")

export class RootTask implements PromiseLike<void> {
  #task: Task<void>

  constructor(guard: typeof TASK_GUARD, task: Task<void>) {
    if (guard !== TASK_GUARD) {
      throw new Error("Illegal invocation of RootTask constructor")
    }
    this.#task = task
  }

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?:
      | ((value: void) => TResult1 | PromiseLike<TResult1>)
      | null
      | undefined,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | null
      | undefined,
  ): PromiseLike<TResult1 | TResult2> {
    return this.#task[TASK_AWAIT_COMPLETION]().then(onfulfilled, onrejected)
  }
}

export class Task<Result> implements AsyncDisposable {
  @brand
  readonly [TASK_BRAND] = true

  static readonly [TASK_ROOTS]: Set<Task<unknown>> = new Set()

  readonly #abortController = new AbortController()
  readonly #result: PromiseLike<Result>

  readonly #children: Set<Task<unknown>> = new Set()

  #isComplete: boolean = false
  #deliberatelyHalted: boolean = false

  static current(): Task<unknown> | undefined {
    return (globalThis as any)[CURRENT_TASK]
  }

  private static unsafeSetCurrent(task: Task<unknown> | undefined): void {
    ;(globalThis as any)[CURRENT_TASK] = task
  }

  static spawn<Result>(start: () => PromiseLike<Result>): Task<Result> {
    const current = Task.current()

    if (!current) {
      throw new Error(
        "Task.spawn() invoked outside of a running task. if this is intentional, use Task.spawnRoot()",
      )
    }

    return current[TASK_SPAWN_CHILD](start)
  }

  static spawnRoot(start: () => PromiseLike<void>): RootTask {
    // Clean up any stale (completed) task from global state
    const current = Task.current()
    if (current?.isComplete) {
      Task.unsafeSetCurrent(undefined)
    }
    // Note: We allow spawnRoot() even when there's an active task in global state
    // due to limitations in tracking JavaScript execution context. This can happen
    // when control flows through unmanaged code between tasks.

    const task = new Task(TASK_GUARD, start, false)
    Task[TASK_ROOTS].add(task)
    task[TASK_ON_EXIT](() => Task[TASK_ROOTS].delete(task))
    return new RootTask(TASK_GUARD, task)
  }

  static async haltAll(params: HaltParams): Promise<void> {
    const haltPromises: Promise<void>[] = []
    for (const task of Task[TASK_ROOTS]) {
      if (!task.isComplete) haltPromises.push(task.halt(params))
    }
    await Promise.all(haltPromises)

    Task.unsafeSetCurrent(undefined)
  }

  static arena(haltParams?: HaltParams): Arena {
    const current = Task.current()
    if (!current) throw new Error("Can't create an arena outside of a task")
    return new Arena(TASK_GUARD, current, haltParams)
  }

  static bound<
    const A extends
      | PromiseLike<unknown>
      | AsyncDisposable
      | AsyncIterator<unknown, unknown, unknown>
      | AsyncIterable<unknown>,
  >(future: A): A {
    const task = Task.current()
    if (task === undefined) {
      throw new Error("no task running!")
    } else {
      return Task.boundImpl(task, future)
    }
  }

  private static boundImpl<
    const A extends
      | PromiseLike<unknown>
      | AsyncDisposable
      | AsyncIterator<unknown, unknown, unknown>
      | AsyncIterable<unknown>,
  >(task: Task<unknown>, future: A): A {
    return new Proxy(future, {
      get(_target, prop, _receiver) {
        if (
          prop === "then" &&
          "then" in future &&
          typeof future.then === "function"
        ) {
          return function then(
            onfulfilled?: (...args: any[]) => any,
            onrejected?: (...args: any[]) => any,
          ): Promise<unknown> {
            return Promise.race([
              future.then(
                onfulfilled &&
                  ((...args) => {
                    Task.unsafeSetCurrent(task)
                    return onfulfilled(...args)
                  }),
                onrejected &&
                  ((...args) => {
                    Task.unsafeSetCurrent(task)
                    return onrejected(...args)
                  }),
              ),
              new Promise((_, reject) => {
                task.signal.addEventListener("abort", () => {
                  reject(task.signal.reason)
                })
              }),
            ])
          }
        }

        if (
          prop === Symbol.asyncDispose &&
          Symbol.asyncDispose in future &&
          typeof future[Symbol.asyncDispose] === "function"
        ) {
          return function asyncDispose(...args: any[]): PromiseLike<void> {
            return Task.boundImpl(task, future[Symbol.asyncDispose]())
          }
        }

        if (
          prop === Symbol.asyncIterator &&
          Symbol.asyncIterator in future &&
          typeof future[Symbol.asyncIterator] === "function"
        ) {
          return function asyncIterator(
            ...args: any[]
          ): AsyncIterator<unknown> {
            return Task.boundImpl(task, future[Symbol.asyncIterator]())
          }
        }

        if (
          prop === "next" &&
          "next" in future &&
          typeof future["next"] === "function"
        ) {
          return function next(
            ...args: [] | [undefined]
          ): Promise<IteratorResult<unknown, any>> {
            return Task.boundImpl(task, future.next(...args))
          }
        }

        if (
          prop === "return" &&
          "return" in future &&
          typeof future["return"] === "function"
        ) {
          return function (value?: any): Promise<IteratorResult<unknown, any>> {
            return Task.boundImpl(task, future.return!(value))
          }
        }

        if (
          prop === "throw" &&
          "throw" in future &&
          typeof future["throw"] === "function"
        ) {
          return function (e?: any): Promise<IteratorResult<unknown, any>> {
            return Task.boundImpl(task, future.throw!(e))
          }
        }

        throw new TypeError(
          "Task.bound should only be used in `await _`, `for await (... of _)` or `await using ... = _` position",
        )
      },
    })
  }

  private constructor(
    guard: typeof TASK_GUARD,
    start: () => PromiseLike<Result>,
    isChild: boolean,
  ) {
    if (guard !== TASK_GUARD) {
      throw new Error("Illegal invocation of Task constructor")
    }

    const current = Task.current()

    Task.unsafeSetCurrent(this)
    try {
      this.#result = start()
      Task.unsafeSetCurrent(current)

      this[TASK_ON_EXIT](() => {
        this.#isComplete = true
      })
    } finally {
      Task.unsafeSetCurrent(current)
    }
  }

  [TASK_SPAWN_CHILD]<Result>(start: () => PromiseLike<Result>): Task<Result> {
    const task = new Task(TASK_GUARD, start, true)

    this.#children.add(task)
    task[TASK_ON_EXIT](() => this.#children.delete(task))

    return task
  }

  [TASK_ON_EXIT](onexit: () => void): void {
    this.#result.then(onexit, onexit)
  }

  get signal(): AbortSignal {
    return this.#abortController.signal
  }

  get isComplete(): boolean {
    return this.#isComplete
  }

  async [Symbol.asyncDispose](): Promise<void> {
    try {
      await Task.bound(this.#result)
    } catch (error) {
      if (error instanceof InterruptError) {
        if (this.#deliberatelyHalted) return
        throw new TaskCanceledError(error)
      }
      throw error
    }
  }

  async [TASK_AWAIT_COMPLETION](): Promise<Result> {
    try {
      const result = await this.#result

      if (0 < this.#children.size) {
        let incompleteChildren = []
        for (const child of this.#children) {
          if (!child.isComplete) {
            // We halt with an aggressive deadline because this can only happen due to programmer error
            incompleteChildren.push(child.halt({ deadlineMillis: 0 }))
          }
        }
        if (0 < incompleteChildren.length) {
          await Promise.all(incompleteChildren)
          throw new TaskOutlivedParentError(result)
        }
      }
      return result
    } catch (error) {
      if (error instanceof InterruptError) throw new TaskCanceledError(error)
      throw error
    }
  }

  async join(): Promise<Result> {
    try {
      const result = await Task.bound(this.#result)

      if (0 < this.#children.size) {
        let incompleteChildren = []
        for (const child of this.#children) {
          if (!child.isComplete) {
            // We halt with an aggressive deadline because this can only happen due to programmer error
            incompleteChildren.push(child.halt({ deadlineMillis: 0 }))
          }
        }
        if (0 < incompleteChildren.length) {
          await Task.bound(Promise.all(incompleteChildren))
          throw new TaskOutlivedParentError(result)
        }
      }
      return result
    } catch (error) {
      if (error instanceof InterruptError) throw new TaskCanceledError(error)
      throw error
    }
  }

  async halt(params: HaltParams): Promise<void> {
    if (this.#isComplete) return

    const deadlineMillis = params.deadlineMillis
    const timeoutGrowthRate = params.timeoutGrowthRate ?? 0.5
    const generationalDeadlineGrowthRate =
      params.generationalDeadlineGrowthRate ?? 0.8
    const generationalTimeoutGrowthRateGrowthRate =
      params.generationalTimeoutGrowthRateGrowthRate ?? 1.0

    this.#deliberatelyHalted = true

    let remainingTime = deadlineMillis

    const startTime = performance.now()

    const childHaltPromises: Promise<void>[] = []
    for (const child of this.#children) {
      if (!child.isComplete) {
        childHaltPromises.push(
          child.halt({
            deadlineMillis: deadlineMillis * generationalDeadlineGrowthRate,
            timeoutGrowthRate:
              timeoutGrowthRate * generationalTimeoutGrowthRateGrowthRate,
            generationalDeadlineGrowthRate: generationalDeadlineGrowthRate,
            generationalTimeoutGrowthRateGrowthRate:
              generationalTimeoutGrowthRateGrowthRate,
          }),
        )
      }
    }
    await Task.bound(
      Promise.race([
        this.#result.then(
          () => {},
          (_) => undefined,
        ),
        Promise.all(childHaltPromises),
      ]),
    )

    const childrenHaltedTime = performance.now()
    remainingTime = Math.max(
      0,
      remainingTime - (childrenHaltedTime - startTime),
    )

    let iterationStartTime = childrenHaltedTime

    const interrupt = new InterruptError()

    while (!this.#isComplete) {
      this.#abortController.abort(interrupt)

      await Task.bound(
        Promise.race([
          this.#result.then(
            () => {},
            (_) => {},
          ),
          new Promise((resolve, _reject) => {
            let timeout = remainingTime * timeoutGrowthRate
            setTimeout(() => {
              resolve(undefined)
            }, timeout)
          }),
        ]),
      )

      const iterationEndTime = performance.now()
      remainingTime = Math.max(
        0,
        remainingTime - (iterationEndTime - iterationStartTime),
      )
      iterationStartTime = iterationEndTime
    }
  }
}

export class Arena implements AsyncDisposable {
  readonly #parent: Task<unknown>
  readonly #tasks: Set<Task<void>> = new Set()
  readonly #haltParams?: HaltParams

  constructor(
    guard: typeof TASK_GUARD,
    parent: Task<unknown>,
    haltParams?: HaltParams,
  ) {
    if (guard !== TASK_GUARD) {
      throw new Error("Illegal invocation of TASK_GUARD constructor")
    }

    this.#parent = parent
    this.#haltParams = haltParams
  }

  spawn(start: () => Promise<void>): Task<void> {
    const task = this.#parent[TASK_SPAWN_CHILD](start)
    this.#tasks.add(task)
    task[TASK_ON_EXIT](() => this.#tasks.delete(task))
    return task
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this.#haltParams) {
      const haltPromises: Promise<void>[] = []
      for (const task of this.#tasks) {
        if (!task.isComplete) haltPromises.push(task.halt(this.#haltParams))
      }

      await Task.bound(Promise.all(haltPromises))
    } else {
      const joinPromises: Promise<void>[] = []
      for (const task of this.#tasks) {
        if (!task.isComplete) joinPromises.push(task.join())
      }

      await Task.bound(Promise.all(joinPromises))
    }
  }
}

// export function patchPromiseLike<const P extends PromiseLike<unknown>>(
//   promiseLike: P,
// ): P {
//   // NOTE we only have to patch Promise.prototype.then for Promise.prototype.catch and Promise.prototype.finally to be
//   // capture the patches. The ecmascript spec defines those as convenience functions as simple wrappers around Promise.
//   // prototype.then.
//   // see: https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.prototype.catch
//   //
//   // This isn't guaranteed to hold for non-standard promises, but there's no way to support everything without custom
//   // interventions. Over time, we can ship additional patches to accommodate libraries that circumvent the standard ones
//   // by using non-standard promises.

//   const oldThen = promiseLike.then

//   const newThen = function then<A, IfOk = A, IfErr = never>(
//     this: Promise<A>,
//     onfulfilled?: ((value: any) => IfOk | PromiseLike<IfOk>) | null,
//     onrejected?: ((reason: any) => IfErr | PromiseLike<IfErr>) | null,
//   ): Promise<IfOk | IfErr> {
//     const owningTask = Task.current()

//     return oldThen.call(
//       this,
//       onfulfilled &&
//         ((value) => {
//           unsafeSetCurrentTask(owningTask)
//           return onfulfilled(value)
//         }),
//       onrejected &&
//         ((reason) => {
//           unsafeSetCurrentTask(owningTask)
//           return onrejected(reason)
//         }),
//     ) as Promise<IfOk | IfErr>
//   }

//   Object.setPrototypeOf(newThen, Object.getPrototypeOf(oldThen))
//   Object.defineProperties(newThen, Object.getOwnPropertyDescriptors(oldThen))

//   promiseLike.then = newThen

//   return promiseLike
// }

// patchPromiseLike(Promise.prototype)

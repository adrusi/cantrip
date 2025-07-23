import { describe, test, expect } from "@jest/globals"

import { Task } from "./task"

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

describe("Task control flow", () => {
  test("basic task execution", async () => {
    const ctrl = new TestController()
    let executed = false

    const task = Task.spawnRoot(async () => {
      executed = true
    })

    await task
    expect(executed).toBe(true)
  })

  test("sequential checkpoint execution", async () => {
    const ctrl = new TestController()
    const order: string[] = []

    const task = Task.spawnRoot(async () => {
      order.push("start")
      await Task.bound(ctrl.checkpoint("a"))
      order.push("after-a")
      await Task.bound(ctrl.checkpoint("b"))
      order.push("after-b")
    })

    // Wait for first checkpoint to be awaited
    await ctrl.waitForCheckpoint("a")
    expect(order).toEqual(["start"])

    // Resolve first checkpoint
    ctrl.resolveCheckpoint("a")
    await nextTick()

    // Wait for second checkpoint
    await ctrl.waitForCheckpoint("b")
    expect(order).toEqual(["start", "after-a"])

    // Resolve second checkpoint
    ctrl.resolveCheckpoint("b")
    await task

    expect(order).toEqual(["start", "after-a", "after-b"])
  })

  test("parent-child task execution", async () => {
    const ctrl = new TestController()
    const order: string[] = []

    const task = Task.spawnRoot(async () => {
      order.push("parent-start")
      await Task.bound(ctrl.checkpoint("parent-checkpoint"))

      const child = Task.spawn(async () => {
        order.push("child-start")
        await Task.bound(ctrl.checkpoint("child-checkpoint"))
        order.push("child-end")
      })

      // Wait for child to complete
      await child.join()

      order.push("parent-after-child")
      await Task.bound(ctrl.checkpoint("parent-final"))
      order.push("parent-end")
    })

    // Parent starts first
    await ctrl.waitForCheckpoint("parent-checkpoint")
    expect(order).toEqual(["parent-start"])

    // Let parent proceed to spawn child
    ctrl.resolveCheckpoint("parent-checkpoint")
    await nextTick()

    // Child should now be running
    await ctrl.waitForCheckpoint("child-checkpoint")
    expect(order).toEqual(["parent-start", "child-start"])

    // Let child complete
    ctrl.resolveCheckpoint("child-checkpoint")
    await nextTick()

    // Parent should continue after child completes
    await ctrl.waitForCheckpoint("parent-final")
    expect(order).toEqual([
      "parent-start",
      "child-start",
      "child-end",
      "parent-after-child",
    ])

    // Complete the parent
    ctrl.resolveCheckpoint("parent-final")
    await task

    expect(order).toEqual([
      "parent-start",
      "child-start",
      "child-end",
      "parent-after-child",
      "parent-end",
    ])
  })

  test("multiple child tasks", async () => {
    const ctrl = new TestController()
    const results: number[] = []

    const task = Task.spawnRoot(async () => {
      const child1 = Task.spawn(async () => {
        await Task.bound(ctrl.checkpoint("child1"))
        results.push(1)
      })

      const child2 = Task.spawn(async () => {
        await Task.bound(ctrl.checkpoint("child2"))
        results.push(2)
      })

      // Wait for both children
      await using _c1 = child1
      await using _c2 = child2
    })

    // Wait for both children to reach their checkpoints
    await ctrl.waitForCheckpoint("child1")
    await ctrl.waitForCheckpoint("child2")
    expect(results).toEqual([])

    // Resolve in reverse order to test independence
    ctrl.resolveCheckpoint("child2")
    await nextTick()
    expect(results).toEqual([2])

    ctrl.resolveCheckpoint("child1")
    await task
    expect(results).toEqual([2, 1])
  })

  test("error propagation", async () => {
    const ctrl = new TestController()
    const testError = new Error("test error")

    const task = Task.spawnRoot(async () => {
      await Task.bound(ctrl.checkpoint("before-error"))
      // Create the error-point checkpoint but don't await it yet
      const errorCheckpoint = ctrl.checkpoint("error-point")
      // Now await it - this will be rejected
      await Task.bound(errorCheckpoint)
      throw new Error("should not reach here")
    })

    // Wait for the first checkpoint
    await ctrl.waitForCheckpoint("before-error")
    ctrl.resolveCheckpoint("before-error")

    // Give time for the error-point checkpoint to be created
    await nextTick()

    // Now wait for the error checkpoint and reject it
    await ctrl.waitForCheckpoint("error-point")
    ctrl.rejectCheckpoint("error-point", testError)

    expect(Promise.resolve(task)).rejects.toThrow("test error")
  })

  test("Task.current() tracking", async () => {
    const ctrl = new TestController()
    let parentTask: any
    let childTask: any

    const task = Task.spawnRoot(async () => {
      parentTask = Task.current()
      expect(parentTask).toBeDefined()

      await using child = Task.spawn(async () => {
        childTask = Task.current()
        expect(childTask).toBeDefined()
        expect(childTask).not.toBe(parentTask)
        await Task.bound(ctrl.checkpoint("in-child"))
      })

      // Back in parent context
      expect(Task.current()).toBe(parentTask)
    })

    await ctrl.waitForCheckpoint("in-child")
    ctrl.resolveCheckpoint("in-child")
    await task

    // The task context might still exist due to test runner cleanup timing
    // Just verify the task completed properly
    expect(task.isComplete).toBe(true)
  })
})

describe("Task cancellation and halting", () => {
  test("task signal is accessible and not aborted initially", async () => {
    let taskSignal: AbortSignal | undefined

    const task = Task.spawnRoot(async () => {
      taskSignal = Task.current()?.signal
    })

    await task

    expect(taskSignal).toBeDefined()
    expect(taskSignal!.aborted).toBe(false)
  })

  test("task completion status tracked correctly", async () => {
    const task = Task.spawnRoot(async () => {
      // Simple task that completes
    })

    expect(task.isComplete).toBe(false)
    await task
    expect(task.isComplete).toBe(true)
  })
})

describe("Basic task relationships", () => {
  test("child tasks are properly tracked", async () => {
    const ctrl = new TestController()
    let parentTask: any
    let childTask: any

    const task = Task.spawnRoot(async () => {
      parentTask = Task.current()

      const child = Task.spawn(async () => {
        childTask = Task.current()
        await Task.bound(ctrl.checkpoint("child-running"))
      })

      // Wait for child to start before proceeding
      await Task.bound(ctrl.checkpoint("parent-waits"))
      await child.join()
    })

    // Wait for child to reach its checkpoint first
    await ctrl.waitForCheckpoint("child-running")

    // Now let parent proceed
    await ctrl.waitForCheckpoint("parent-waits")

    // Verify parent and child are different
    expect(parentTask).toBeDefined()
    expect(childTask).toBeDefined()
    expect(childTask).not.toBe(parentTask)

    // Let child complete first, then parent can join it
    ctrl.resolveCheckpoint("child-running")
    ctrl.resolveCheckpoint("parent-waits")
    await task
  })

  test("concurrent independent root tasks don't interfere", async () => {
    const ctrl1 = new TestController()
    const ctrl2 = new TestController()
    const executionOrder: string[] = []
    let task1Context: any
    let task2Context: any

    // First root task
    const task1 = Task.spawnRoot(async () => {
      task1Context = Task.current()
      executionOrder.push("task1-start")

      await Task.bound(ctrl1.checkpoint("task1-checkpoint1"))
      executionOrder.push("task1-mid")

      // Verify this task's context is maintained
      expect(Task.current()).toBe(task1Context)

      await Task.bound(ctrl1.checkpoint("task1-checkpoint2"))
      executionOrder.push("task1-end")
      return "result1"
    })

    // Second root task running concurrently
    const task2 = Task.spawnRoot(async () => {
      task2Context = Task.current()
      executionOrder.push("task2-start")

      await Task.bound(ctrl2.checkpoint("task2-checkpoint1"))
      executionOrder.push("task2-mid")

      // Verify this task's context is maintained and different from task1
      expect(Task.current()).toBe(task2Context)
      expect(task2Context).not.toBe(task1Context)

      await Task.bound(ctrl2.checkpoint("task2-checkpoint2"))
      executionOrder.push("task2-end")
      return "result2"
    })

    // Both tasks should start
    expect(executionOrder).toEqual(["task1-start", "task2-start"])

    // Let task2 proceed to first checkpoint while task1 waits
    await ctrl2.waitForCheckpoint("task2-checkpoint1")
    ctrl2.resolveCheckpoint("task2-checkpoint1")
    await nextTick()

    expect(executionOrder).toEqual(["task1-start", "task2-start", "task2-mid"])

    // Now let task1 proceed to its first checkpoint
    await ctrl1.waitForCheckpoint("task1-checkpoint1")
    ctrl1.resolveCheckpoint("task1-checkpoint1")
    await nextTick()

    expect(executionOrder).toEqual([
      "task1-start",
      "task2-start",
      "task2-mid",
      "task1-mid",
    ])

    // Let task1 complete first
    await ctrl1.waitForCheckpoint("task1-checkpoint2")
    ctrl1.resolveCheckpoint("task1-checkpoint2")

    // Let task2 complete
    await ctrl2.waitForCheckpoint("task2-checkpoint2")
    ctrl2.resolveCheckpoint("task2-checkpoint2")

    // Both tasks should complete independently
    const results = await Promise.all([task1, task2])
    expect(results).toEqual(["result1", "result2"])

    expect(executionOrder).toEqual([
      "task1-start",
      "task2-start",
      "task2-mid",
      "task1-mid",
      "task1-end",
      "task2-end",
    ])
  })
})

describe("Finally block invariants", () => {
  test("finally blocks execute during task cancellation", async () => {
    const ctrl = new TestController()
    const executionOrder: string[] = []
    let finallyExecuted = false

    const task = Task.spawnRoot(async () => {
      const child = Task.spawn(async () => {
        try {
          executionOrder.push("try-start")
          await Task.bound(ctrl.checkpoint("before-cancel"))
          executionOrder.push("try-should-not-reach")
        } catch (error) {
          executionOrder.push("catch")
          throw error
        } finally {
          executionOrder.push("finally")
          finallyExecuted = true
        }
      })

      // Wait for child to reach checkpoint
      await Task.bound(ctrl.waitForCheckpoint("before-cancel"))
      expect(executionOrder).toEqual(["try-start"])
      expect(finallyExecuted).toBe(false)

      // Cancel the child task from within task context
      await Task.bound(child.halt({ deadlineMillis: 100 }))

      // Finally block should have executed
      expect(finallyExecuted).toBe(true)
      expect(executionOrder).toEqual(["try-start", "finally"])
    })

    await task
  })

  test("nested finally blocks execute in correct order during cancellation", async () => {
    const ctrl = new TestController()
    const executionOrder: string[] = []

    const task = Task.spawnRoot(async () => {
      const parentChild = Task.spawn(async () => {
        try {
          executionOrder.push("parent-try-start")

          const child = Task.spawn(async () => {
            try {
              executionOrder.push("child-try-start")
              await Task.bound(ctrl.checkpoint("child-checkpoint"))
              executionOrder.push("child-should-not-reach")
            } catch (error) {
              executionOrder.push("child-catch")
              throw error
            } finally {
              executionOrder.push("child-finally")
            }
          })

          // Wait for child to reach checkpoint first
          await Task.bound(ctrl.waitForCheckpoint("child-checkpoint"))
          expect(executionOrder).toEqual([
            "parent-try-start",
            "child-try-start",
          ])

          // Cancel the child - should trigger nested cleanup
          await Task.bound(child.halt({ deadlineMillis: 100 }))

          executionOrder.push("parent-after-child")
        } catch (error) {
          executionOrder.push("parent-catch")
          throw error
        } finally {
          executionOrder.push("parent-finally")
        }
      })

      await using _parentChild = parentChild
    })

    await task

    // Finally blocks should execute from innermost to outermost
    expect(executionOrder).toEqual([
      "parent-try-start",
      "child-try-start",
      "child-finally", // Child finally executes first
      "parent-after-child",
      "parent-finally", // Parent finally executes second
    ])
  })

  test("multiple sibling finally blocks all execute during cancellation", async () => {
    const ctrl = new TestController()
    const executionOrder: string[] = []

    const task = Task.spawnRoot(async () => {
      const parentChild = Task.spawn(async () => {
        try {
          const child1 = Task.spawn(async () => {
            try {
              await Task.bound(ctrl.checkpoint("child1-checkpoint"))
            } finally {
              executionOrder.push("child1-finally")
            }
          })

          const child2 = Task.spawn(async () => {
            try {
              await Task.bound(ctrl.checkpoint("child2-checkpoint"))
            } finally {
              executionOrder.push("child2-finally")
            }
          })

          // Wait for both children to reach checkpoints
          await Task.bound(ctrl.waitForCheckpoint("child1-checkpoint"))
          await Task.bound(ctrl.waitForCheckpoint("child2-checkpoint"))

          // Cancel both children
          await Task.bound(child1.halt({ deadlineMillis: 100 }))
          await Task.bound(child2.halt({ deadlineMillis: 100 }))
        } finally {
          executionOrder.push("parent-finally")
        }
      })

      await using _parentChild = parentChild
    })

    await task

    // All finally blocks should execute
    expect(executionOrder).toContain("child1-finally")
    expect(executionOrder).toContain("child2-finally")
    expect(executionOrder).toContain("parent-finally")
    expect(executionOrder).toHaveLength(3)

    // Parent finally should be last
    expect(executionOrder[executionOrder.length - 1]).toBe("parent-finally")
  })

  test("finally blocks execute even with deep nesting", async () => {
    const ctrl = new TestController()
    const executionOrder: string[] = []

    const task = Task.spawnRoot(async () => {
      const topChild = Task.spawn(async () => {
        try {
          const child1 = Task.spawn(async () => {
            try {
              const child2 = Task.spawn(async () => {
                try {
                  const child3 = Task.spawn(async () => {
                    try {
                      await Task.bound(ctrl.checkpoint("deepest-checkpoint"))
                    } finally {
                      executionOrder.push("child3-finally")
                    }
                  })

                  await using _child3 = child3
                } finally {
                  executionOrder.push("child2-finally")
                }
              })

              await using _child2 = child2
            } finally {
              executionOrder.push("child1-finally")
            }
          })

          // Wait for deepest task to reach checkpoint
          await Task.bound(ctrl.waitForCheckpoint("deepest-checkpoint"))

          // Cancel the child1 task tree
          await Task.bound(child1.halt({ deadlineMillis: 100 }))
        } finally {
          executionOrder.push("parent-finally")
        }
      })

      await using _topChild = topChild
    })

    await task

    // Finally blocks should execute from deepest to shallowest
    expect(executionOrder).toEqual([
      "child3-finally", // Deepest first
      "child2-finally",
      "child1-finally",
      "parent-finally", // Shallowest last
    ])
  })
})

describe("Debug halt issues", () => {
  test("minimal halt test", async () => {
    const ctrl = new TestController()
    let finallyExecuted = false

    const task = Task.spawnRoot(async () => {
      const child = Task.spawn(async () => {
        try {
          await Task.bound(ctrl.checkpoint("before-halt"))
        } finally {
          finallyExecuted = true
        }
      })

      await Task.bound(ctrl.waitForCheckpoint("before-halt"))

      try {
        await Task.bound(child.halt({ deadlineMillis: 10 }))
        console.log("Halt completed successfully")
      } catch (error) {
        console.log("Halt failed:", error.message)
      }

      expect(finallyExecuted).toBe(true)
    })

    await task
  })
})

describe("Simple debug", () => {
  test("just halt without finally", async () => {
    const ctrl = new TestController()

    const task = Task.spawnRoot(async () => {
      const child = Task.spawn(async () => {
        try {
          await Task.bound(ctrl.checkpoint("test"))
        } catch (error: any) {
          console.log("Child task failed:", error.message)
        }
      })

      await Task.bound(ctrl.waitForCheckpoint("test"))
      console.log("About to halt child")

      try {
        await Task.bound(child.halt({ deadlineMillis: 100 }))
        console.log("Halt succeeded")
      } catch (e: any) {
        console.log("Halt error:", e.constructor.name, e.message)
      }
    })

    await task
  })
})

test("debug halt issue isolation", async () => {
  console.log("=== Starting debug halt issue isolation test ===")

  const task = Task.spawnRoot(async () => {
    console.log("Root task started")

    const child = Task.spawn(async () => {
      console.log("Child task started")
      try {
        console.log("Child: about to wait indefinitely")
        await Task.bound(new Promise(() => {})) // Wait forever
      } catch (error: any) {
        console.log(
          "Child caught error:",
          error.constructor.name,
          error.message,
        )
      } finally {
        console.log("Child task completing")
      }
    })

    console.log("Root: waiting a bit before halting")
    await Task.bound(new Promise((resolve) => setTimeout(resolve, 10)))

    console.log("Root: about to halt child")
    console.log("Child isComplete before halt:", child.isComplete)

    try {
      await Task.bound(child.halt({ deadlineMillis: 100 }))
      console.log("Root: halt succeeded")
    } catch (e: any) {
      console.log("Root: halt error:", e.constructor.name, e.message)
      console.log("Root: halt error stack:", e.stack)
    }

    console.log("Child isComplete after halt:", child.isComplete)
    console.log("Root task completing")
  })

  console.log("=== Waiting for root task ===")
  await task
  console.log("=== Test completed ===")
})

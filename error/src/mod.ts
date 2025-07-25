export const IS_PANIC = Symbol("IS_PANIC")

export type Panic = Error & { readonly [IS_PANIC]: true }

declare global {
  interface Error {
    readonly [IS_PANIC]: boolean
  }
}

export function isPanic(e: Error): e is Panic {
  return e[IS_PANIC]
}

export const ANY = Symbol("ANY")
export const ALL = Symbol("ALL")

export type Predicate =
  | { (error: Error): boolean }
  | { new (...args: unknown[]): Error; prototype: Error }

declare global {
  interface Error {
    [ANY](...predicates: Predicate[]): boolean
    [ALL](...predicates: Predicate[]): boolean
  }
}

function pred(e: Predicate): { (error: Error): boolean } {
  if (e.prototype instanceof Error) return (error: Error) => error instanceof e
  else return e as { (error: Error): boolean }
}

export function any(e: unknown, ...predicates: Predicate[]): boolean
export function any(...predicates: Predicate[]): { (error: Error): boolean }
export function any(...args: unknown[]): boolean | { (error: Error): boolean } {
  if (args.length === 0) return (error) => true
  if (args[0] instanceof Error) {
    return args[0][ANY](...(args.slice(1) as Predicate[]))
  }
  return (error) => error[ANY](...(args as Predicate[]))
}

export function all(e: unknown, ...predicates: Predicate[]): boolean
export function all(...predicates: Predicate[]): { (error: Error): boolean }
export function all(...args: unknown[]): boolean | { (error: Error): boolean } {
  if (args.length === 0) return (error) => true
  if (args[0] instanceof Error) {
    return args[0][ALL](...(args.slice(1) as Predicate[]))
  }
  return (error) => error[ALL](...(args as Predicate[]))
}

Object.defineProperties(Error.prototype, {
  [IS_PANIC]: {
    get() {
      return true
    },
  },
  [ANY]: {
    get() {
      return (...predicates: Predicate[]): boolean => {
        for (const predicate of predicates) {
          if (pred(predicate)(this)) return true
        }
        return false
      }
    },
  },
  [ALL]: {
    get() {
      return (...predicates: Predicate[]): boolean => {
        for (const predicate of predicates) {
          if (pred(predicate)(this)) return true
        }
        return false
      }
    },
  },
})

export class IllegalInvocationError extends TypeError {
  override readonly name = "IllegalInvocationError"

  constructor(message: string) {
    super(message)
  }
}

export class ArgumentError extends Error {
  override readonly name = "ArgumentError"

  constructor(message: string) {
    super(message)
  }
}

export class ErrorGroup extends Error {
  override readonly name = "ErrorGroup"
  readonly errors: unknown[]

  constructor(errors: unknown[]) {
    super(
      `ErrorGroup:\n${errors.map((e) => (e instanceof Error ? (e.message ?? "[no message]") : "[not an Error]")).join("\n")}`,
      { cause: errors[0] },
    )
    this.errors = errors
  }

  override get [IS_PANIC]() {
    for (const error of this.errors) {
      if (!(error instanceof Error)) continue
      if (error[IS_PANIC]) return true
    }
    return false
  }

  override [ANY](...predicates: Predicate[]): boolean {
    ERROR_LOOP: for (const error of this.errors) {
      for (const predicate of predicates) {
        if (!(error instanceof Error)) continue
        if (pred(predicate)(error)) continue ERROR_LOOP
      }
      return false
    }
    return true
  }

  override [ALL](...predicates: Predicate[]): boolean {
    for (const error of this.errors) {
      for (const predicate of predicates) {
        if (!(error instanceof Error)) continue
        if (pred(predicate)(error)) return true
      }
    }
    return false
  }
}

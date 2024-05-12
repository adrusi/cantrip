export class IllegalInvocationError extends TypeError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "IllegalInvocationError"
  }
}

export class ArgumentError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "ArgumentError"
  }
}

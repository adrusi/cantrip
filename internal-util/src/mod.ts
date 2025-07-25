export function brand<This>(
  _: undefined,
  _context: ClassFieldDecoratorContext<This, true> & {
    name: symbol
    static: false
    private: false
  },
): void {
  // context.addInitializer(function (): void {
  //   Object.defineProperty(this, context.name, {
  //     configurable: false,
  //     enumerable: false,
  //     writable: false,
  //     value: true,
  //   })
  // })
}

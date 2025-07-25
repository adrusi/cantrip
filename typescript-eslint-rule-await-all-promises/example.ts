// Example usage of the await-all-promises ESLint rule
// This file demonstrates what the rule catches and how to fix it

// ❌ BAD: These will trigger the rule
async function badExamples() {
  // Simple promise not awaited
  Promise.resolve(42); // Error: Promise must be immediately awaited

  // Function call returning promise not awaited
  fetch('https://api.example.com'); // Error: Promise must be immediately awaited

  // Promise constructor not awaited
  new Promise(resolve => resolve(true)); // Error: Promise must be immediately awaited

  // Variable assignment with unawaited promise
  const result = Promise.resolve('hello'); // Error: Promise must be immediately awaited

  // Return statement with unawaited promise
  return Promise.resolve(123); // Error: Promise must be immediately awaited

  // Promises in arrays
  const promises = [
    Promise.resolve(1), // Error: Promise must be immediately awaited
    Promise.resolve(2), // Error: Promise must be immediately awaited
  ];

  // Promises in objects
  const obj = {
    data: Promise.resolve('data'), // Error: Promise must be immediately awaited
    other: Promise.resolve('other'), // Error: Promise must be immediately awaited
  };

  // Conditional expressions with promises
  const value = Math.random() > 0.5
    ? Promise.resolve('a') // Error: Promise must be immediately awaited
    : Promise.resolve('b'); // Error: Promise must be immediately awaited

  // Even promise methods that traditionally "handle" promises
  Promise.resolve(42).then(x => x); // Error: Promise must be immediately awaited
  Promise.resolve(42).catch(err => err); // Error: Promise must be immediately awaited
}

// ✅ GOOD: These are the correct patterns
async function goodExamples() {
  // All promises properly awaited
  await Promise.resolve(42);

  const response = await fetch('https://api.example.com');

  const promise = await new Promise(resolve => resolve(true));

  const result = await Promise.resolve('hello');

  const value = await Promise.resolve(123);

  // Properly awaited promises in collections
  const promises = [
    await Promise.resolve(1),
    await Promise.resolve(2),
  ];

  const obj = {
    data: await Promise.resolve('data'),
    other: await Promise.resolve('other'),
  };

  // Conditional with awaited promises
  const conditionalValue = Math.random() > 0.5
    ? await Promise.resolve('a')
    : await Promise.resolve('b');

  // Return awaited promise
  return await Promise.resolve(123);

  // Non-promise values are completely fine
  const number = 42;
  const string = 'hello';
  const array = [1, 2, 3];
  const object = { key: 'value' };

  // Synchronous function calls are fine
  console.log('This is fine');
  Math.max(1, 2, 3);
  JSON.stringify({ test: true });
}

// Real-world example: structured concurrency pattern
async function structuredConcurrencyExample() {
  // In structured concurrency, we want all async operations
  // to be explicitly awaited within their scope

  // ❌ This would be bad - promise escapes current scope
  // const backgroundTask = someAsyncOperation();

  // ✅ This is good - operation is awaited within scope
  const result = await someAsyncOperation();

  // ✅ Multiple operations can be coordinated
  const [result1, result2] = await Promise.all([
    await operation1(),
    await operation2(),
  ]);

  return { result, result1, result2 };
}

// Helper functions for the example
async function someAsyncOperation(): Promise<string> {
  return 'completed';
}

async function operation1(): Promise<number> {
  return 1;
}

async function operation2(): Promise<number> {
  return 2;
}

// The rule will automatically fix most issues by inserting 'await'
// For example, this:
//   Promise.resolve(42);
//
// Will be automatically fixed to:
//   await Promise.resolve(42);

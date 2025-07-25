// Test cases for the await-all-promises rule

// These should trigger the rule (errors)
async function badExamples() {
  // Simple promise that should be awaited
  Promise.resolve(42);

  // Function call returning promise
  fetch('https://example.com');

  // Promise constructor
  new Promise(resolve => resolve(true));

  // Variable assignment with promise
  const result = Promise.resolve('hello');

  // Return statement with promise
  return Promise.resolve(123);

  // Promise in array
  const promises = [Promise.resolve(1), Promise.resolve(2)];

  // Promise in object
  const obj = {
    data: Promise.resolve('data')
  };

  // Conditional expression with promise
  const value = Math.random() > 0.5 ? Promise.resolve('a') : Promise.resolve('b');

  // Logical expression with promise
  const fallback = Promise.resolve('default') || Promise.resolve('backup');
}

// These should NOT trigger the rule (no errors)
async function goodExamples() {
  // Properly awaited promises
  await Promise.resolve(42);

  // Awaited function calls
  await fetch('https://example.com');

  // Awaited promise constructor
  await new Promise(resolve => resolve(true));

  // Variable assignment with awaited promise
  const result = await Promise.resolve('hello');

  // Return statement with awaited promise
  return await Promise.resolve(123);

  // Non-promise values (should be ignored)
  const number = 42;
  const string = 'hello';
  const object = { key: 'value' };

  // Sync function calls (should be ignored)
  console.log('test');
  Math.max(1, 2, 3);

  // Already handled promises in arrays and objects with await
  const promises = [await Promise.resolve(1), await Promise.resolve(2)];
  const obj = {
    data: await Promise.resolve('data')
  };
}

// Edge cases
async function edgeCases() {
  // Promise methods that handle the promise (these might be debatable for this strict rule)
  Promise.resolve(42).then(x => x); // This should probably still trigger the rule
  Promise.resolve(42).catch(err => err); // This should probably still trigger the rule

  // Void expressions (if we want to allow explicit ignoring)
  void Promise.resolve(42); // This should trigger the rule since we want strict awaiting

  // IIFE async functions
  (async () => {
    return Promise.resolve(42); // Should trigger
  })();

  // Nested promises
  await Promise.resolve(Promise.resolve(42)); // Inner promise should trigger
}

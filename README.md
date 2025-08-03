# Cantrip

A sketch of a non-standard library for javascript and typescript.

## Goals

- Comprehensive type safety
- Prefer immutability
- Consistency with the actual standard library
- Leverage typescript's language service
- Compatibility with foreign packages
  - Data structures should conform to standard or broadly-used interfaces

- Usability from javascript
  - Functionality hard to use correctly without a type checker requires special
    justification
  - Where possible, constraints described in type annotations should be enforced
    at runtime

- Within the above constraints: power over familiarity

## Non-goals

- Compatibility with pre-`latest` runtimes
- Small bundle size
- Compilation performance
- Consistency with the broader ecosystem

## Principles

- Hard prohibition: namespace collision
  - Anything added to `globalThis` or monkey-patched functionality must have a
    `symbol` name

- Use magic internally when it improves the experience for callers
  - Lie to the type checker

- Callers should never be encouraged to write their _own_ magic

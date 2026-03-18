---
name: gen-test
description: Generate Vitest tests for a source file following project TDD conventions (makeInput/makeBom helpers, self-contained fixtures)
disable-model-invocation: true
---

# gen-test

Generate Vitest test file for a given source file.

## Usage

`/gen-test <source-file-path>`

Example: `/gen-test src/domain/engine/converged-sizing.ts`

## Process

1. Read the source file to understand exports, function signatures, and types
2. Read an existing test file in the same directory (or nearest sibling) to match conventions:
   - Import style (`import { describe, it, expect } from 'vitest'`)
   - Helper pattern (`makeInput()`, `makeBom()`, `makeFCInput()` — self-contained, no shared fixtures)
   - Naming convention (`*.test.ts` alongside source)
3. Generate test file with:
   - One `describe` block per exported function/component
   - Happy path tests covering main behavior
   - Edge case tests (boundary values, null/undefined, empty arrays)
   - Error case tests (invalid inputs, constraint violations)
   - All assertions use concrete values, never `toBeTruthy()` alone
4. Run `npx vitest run <test-file>` to verify tests compile and execute
5. Report RED tests (expected to fail if TDD) or GREEN tests (if implementation exists)

## Conventions

- Test files: `*.test.ts` (domain) or `*.test.tsx` (React components)
- No shared test fixtures across files — each test file is self-contained
- Use `z.infer<typeof Schema>` for typed test data, never raw object literals without type annotation
- For React components: use `@testing-library/react` with `render`, `screen`, `userEvent`
- For Zustand stores: mock localStorage with `vi.stubGlobal`

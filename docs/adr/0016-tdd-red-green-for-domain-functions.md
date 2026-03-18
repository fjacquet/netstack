# ADR-0016: TDD (RED→GREEN) for All Pure Domain Functions

## Status
Accepted

## Date
2026-03-18

## Context
The sizing engines (`calculateBOM`, `calculateFCBOM`) are pure functions with no side effects. Incorrect formulas (e.g., wrong spine count, incorrect ISL calculation, wrong cable type) produce silently wrong BOMs — the UI renders numbers that look plausible but are incorrect. These bugs are hard to catch in manual testing because the UI does not signal that a formula is wrong.

## Decision
All pure domain functions follow **strict TDD**:
1. Write failing tests (RED) that assert the correct output for specific inputs
2. Implement the function until all tests pass (GREEN)
3. Never commit a GREEN implementation without the RED tests having existed first

This applies to: sizing engine, FC sizing engine, cable calculations, violation logic, and all catalog-derived computations.

## Consequences
- Formula errors are caught at the unit test level, not discovered in the UI
- 388 tests as of v2.0 — the test suite is the specification
- Refactoring is safe: any formula regression immediately breaks tests
- Slightly slower initial development, but prevents costly mis-sizing bugs in production
- Test files are self-contained (`makeInput()` / `makeBom()` helpers inlined) — no shared test fixtures that couple unrelated test suites

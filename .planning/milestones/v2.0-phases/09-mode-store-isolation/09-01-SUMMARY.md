---
phase: 09-mode-store-isolation
plan: 01
subsystem: testing
tags: [vitest, zustand, fibre-channel, tdd, store-isolation]

# Dependency graph
requires:
  - phase: 08-fc-catalog
    provides: FCNetworkBOMSchema, FCSizingInputSchema, fc-bom.ts, fc-input.ts
provides:
  - FC sizing engine stub (calculateFCBOM returns zero-value FCNetworkBOM)
  - RED test scaffolding for fcInputStore (4 tests)
  - RED test scaffolding for fcResultStore (3 tests)
  - RED cross-store isolation tests (4 tests)
affects: [09-02-fc-stores-implementation, 10-fc-sizing-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - FC engine stub pattern: zero-value return satisfies TypeScript compiler before real engine exists
    - TDD RED phase: test files import from non-existent modules intentionally
    - @vitest-environment jsdom annotation on all store test files for localStorage access

key-files:
  created:
    - src/domain/engine/fc-sizing.ts
    - src/store/fcInputStore.test.ts
    - src/store/fcResultStore.test.ts
    - src/store/store-isolation.test.ts
  modified: []

key-decisions:
  - "FC engine stub returns zero-value FCNetworkBOM: satisfies compiler for fcResultStore import chain without any sizing logic"
  - "DEFAULT_FC_INPUT inlined in each test file: keeps tests self-contained and documents expected shape explicitly"
  - "Test files use @vitest-environment jsdom annotation: safe even if global jsdom configured (idempotent)"

patterns-established:
  - "Engine stub pattern: export real function signature with zero-value body; replace in later phase"
  - "Store test pattern: beforeEach uses .setState({input: DEFAULT}) to reset to known state"
  - "Isolation test pattern: JSON.stringify comparison proves byte-for-byte independence between stores"

requirements-completed: [FC-09]

# Metrics
duration: 8min
completed: 2026-03-18
---

# Phase 09 Plan 01: FC Sizing Engine Stub and RED Test Scaffolding Summary

**FC sizing engine stub (calculateFCBOM → zero FCNetworkBOM) plus three failing Vitest test files defining exact Wave 2 store behaviors**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-18T09:30:00Z
- **Completed:** 2026-03-18T09:38:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/domain/engine/fc-sizing.ts` stub that compiles cleanly under TypeScript strict mode
- Created `fcInputStore.test.ts` with 4 tests covering defaults, partial update, reset, and persistence key
- Created `fcResultStore.test.ts` with 3 tests covering BOM derivation from fcInputStore
- Created `store-isolation.test.ts` with 4 tests proving FC and Ethernet stores cannot contaminate each other
- All three test files fail RED with "Cannot find module './fcInputStore'" — correct Wave 1 state
- Ethernet store tests (resultStore.test.ts) remain passing — no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: FC sizing engine stub** - `17f5e3c` (feat)
2. **Task 2: RED test scaffolding** - `de87ffd` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/domain/engine/fc-sizing.ts` - Phase 9 stub: exports calculateFCBOM returning zero-value FCNetworkBOM with all 12 required fields
- `src/store/fcInputStore.test.ts` - 4 Vitest tests for FC input store (RED)
- `src/store/fcResultStore.test.ts` - 3 Vitest tests for FC result store derivation (RED)
- `src/store/store-isolation.test.ts` - 4 Vitest cross-store isolation tests (RED)

## Decisions Made

- FC engine stub returns zero values for all numeric fields — no sizing logic present. This satisfies the TypeScript compiler for the fcResultStore import chain while keeping the stub trivially auditable.
- DEFAULT_FC_INPUT is inlined in each test file rather than imported from a shared constant. This makes tests self-contained and documents the expected shape explicitly at the test site.
- `@vitest-environment jsdom` annotation added to all three test files to enable localStorage access in isolation tests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled on first attempt. RED failure confirmed immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 2 (09-02) can now implement `fcInputStore.ts` and `fcResultStore.ts` — test contracts are fully specified
- The three test files will turn GREEN once Wave 2 creates the store implementations
- `calculateFCBOM` stub is in place; Phase 10 replaces it with real sizing logic
- No blockers

---
*Phase: 09-mode-store-isolation*
*Completed: 2026-03-18*

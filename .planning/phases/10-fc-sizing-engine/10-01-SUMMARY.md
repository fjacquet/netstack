---
phase: 10-fc-sizing-engine
plan: 01
subsystem: testing
tags: [vitest, tdd, fibre-channel, brocade, fc-sizing, red-phase]

# Dependency graph
requires:
  - phase: 09-mode-store-isolation
    provides: fc-sizing.ts zero-value stub that these tests run against
  - phase: 08-fc-catalog-schema
    provides: FCSizingInput, FCNetworkBOM types and FC_SWITCH_CATALOG catalog values
provides:
  - TDD RED phase test suite for calculateFCBOM() covering FC-05 through FC-08
  - Behavioral specification for dual-fabric symmetry, ISL calculation, optics count, oversubscription
  - Threshold tests for all 3 FC violation codes
affects: [10-fc-sizing-engine plan 02 (GREEN implementation must pass these tests)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Self-contained makeInput() helper in test files (no external DEFAULT_FC_INPUT import)
    - describe blocks organized by requirement ID (FC-05, FC-06, FC-07, FC-08)
    - Exact numeric assertions (toBe) for deterministic cases; toBeGreaterThan only for structural invariants

key-files:
  created:
    - src/domain/engine/fc-sizing.test.ts
  modified: []

key-decisions:
  - "TDD RED phase: 29 test cases, 13 fail against zero-value stub — tests are real assertions, not vacuous"
  - "makeInput() is self-contained with inline defaults — no external DEFAULT_FC_INPUT import (Phase 09-01 convention maintained)"
  - "FC_ISL_UNDERPROVISIONED test uses islPortsPerSwitch=0 + multi-switch fabric to force violation cleanly"
  - "Director models (X7-4, X7-8, X8-4, X8-8) used for large-server tests to avoid port saturation masking the target violation"

patterns-established:
  - "TDD RED pattern: write tests first against zero stub, verify failures before writing implementation"
  - "Violation threshold tests: one test fires the violation, one test confirms absence below threshold"

requirements-completed:
  - FC-05
  - FC-06
  - FC-07
  - FC-08

# Metrics
duration: 1min
completed: 2026-03-18
---

# Phase 10 Plan 01: FC Sizing Engine TDD RED Phase Summary

**29-test TDD RED suite for calculateFCBOM() covering dual-fabric symmetry, ISL calculation, FC optics count, and all 3 violation thresholds (FC_PORT_SATURATION, FC_OVERSUBSCRIPTION_EXCEEDED, FC_ISL_UNDERPROVISIONED)**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-18T10:25:36Z
- **Completed:** 2026-03-18T10:27:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created comprehensive TDD RED test suite with 29 test cases across 4 describe blocks organized by requirement
- Confirmed RED phase: 13 tests fail against zero-value stub, 16 pass on already-zero expectations
- TypeScript strict mode: 0 compilation errors
- All 3 violation codes have threshold tests (fires when exceeded, absent when within limits)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing test suite for calculateFCBOM() — TDD RED phase** - `be66d54` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/domain/engine/fc-sizing.test.ts` - 29-test suite covering FC-05 through FC-08; fails against zero-value stub

## Decisions Made
- Used self-contained makeInput() helper with inline defaults, no external import (Phase 09-01 convention)
- Used director models (X7-4) for large-server tests to isolate target violation type without port saturation interference
- islPortsPerSwitch=0 used to trigger FC_ISL_UNDERPROVISIONED cleanly for multi-switch fabrics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RED phase confirmed: fc-sizing.test.ts ready for Phase 10 Plan 02 (GREEN implementation)
- All behavioral specifications locked in as failing tests
- TypeScript types fully compatible with existing schemas

---
*Phase: 10-fc-sizing-engine*
*Completed: 2026-03-18*

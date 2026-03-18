---
phase: 15-converged-domain-store
plan: 01
subsystem: domain
tags: [zod, tdd, converged, ethernet, fc, composition]

# Dependency graph
requires:
  - phase: 14-fc-ui-integration
    provides: FC sizing engine (calculateFCBOM) and FC schemas
provides:
  - ConvergedSizingInputSchema with hbaPortsPerServer min=0
  - ConvergedBOMSchema with nullable fcBom and union violations
  - calculateConvergedBOM pure function composing Ethernet + FC engines
affects: [15-02-converged-domain-store, 16-converged-ui, 17-converged-export]

# Tech tracking
tech-stack:
  added: []
  patterns: [engine composition via adapter functions, nullable sub-BOM for optional fabric]

key-files:
  created:
    - src/domain/schemas/converged-input.ts
    - src/domain/schemas/converged-bom.ts
    - src/domain/engine/converged-sizing.ts
    - src/domain/engine/converged-sizing.test.ts
  modified: []

key-decisions:
  - "Compose engines via toEthernetInput/toFCInput adapter functions rather than merging schemas"
  - "fcBom is nullable (not optional) to distinguish FC-disabled from FC-errored"
  - "portsPerServerFrontend min=1 in converged mode (Ethernet always active)"

patterns-established:
  - "Engine composition: adapter functions map converged input to sub-engine inputs"
  - "Nullable sub-BOM: null means fabric disabled, not missing"
  - "Union violations: z.union([ConstraintViolationSchema, FCConstraintViolationSchema]) for combined array"

requirements-completed: [CONV-02, CONV-03, CONV-04, CONV-05]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 15 Plan 01: Converged Domain & Store Summary

**Converged sizing engine composing Ethernet + FC via adapter functions with TDD-driven 19-test suite**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T19:04:48Z
- **Completed:** 2026-03-18T19:08:12Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- ConvergedSizingInputSchema with hbaPortsPerServer min=0 (FC optional) and portsPerServerFrontend min=1 max=4 (Ethernet always active)
- ConvergedBOMSchema with nullable fcBom and union violations combining Ethernet + FC constraint violations
- calculateConvergedBOM pure function composing calculateBOM + calculateFCBOM via adapter functions
- 19 TDD test cases covering CONV-02, CONV-03, CONV-04, CONV-05 requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Define converged schemas + RED tests** - `3564966` (test)
2. **Task 2: GREEN converged engine** - `9339f6c` (feat)

_TDD: Task 1 committed schemas + failing tests. Task 2 committed the passing implementation._

## Files Created/Modified
- `src/domain/schemas/converged-input.ts` - Converged input schema with shared rack config, Ethernet fields, FC fields (hbaPortsPerServer min=0)
- `src/domain/schemas/converged-bom.ts` - Converged BOM schema embedding NetworkBOM + nullable FCNetworkBOM + union violations
- `src/domain/engine/converged-sizing.ts` - Pure function composing calculateBOM + calculateFCBOM
- `src/domain/engine/converged-sizing.test.ts` - 19 test cases covering combined BOM, FC optional, combined violations, input ranges

## Decisions Made
- Used adapter functions (toEthernetInput, toFCInput) to map converged input to sub-engine inputs rather than re-exporting or merging schemas
- Made fcBom nullable (not optional) to clearly distinguish "FC disabled" from "FC failed"
- Set portsPerServerFrontend min=1 in converged schema (converged mode always has Ethernet)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Converged domain layer complete -- schemas and engine ready for store integration (15-02)
- All 407 existing tests pass with zero regressions
- TypeScript compiles cleanly with zero errors

## Self-Check: PASSED

All 4 created files verified on disk. Both commit hashes (3564966, 9339f6c) found in git log.

---
*Phase: 15-converged-domain-store*
*Completed: 2026-03-18*

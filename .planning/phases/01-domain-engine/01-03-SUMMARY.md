---
phase: 01-domain-engine
plan: 03
subsystem: catalog
tags: [zod, typescript, tdd, catalog, hardware, validation, json-override]

# Dependency graph
requires:
  - phase: 01-domain-engine/01-01
    provides: SWITCH_CATALOG, SwitchSpec interface, SwitchSpecSchema from hardware.ts, types.ts, schemas/catalog.ts
provides:
  - mergeCatalog(base, overrideJson?) pure function for runtime hardware catalog extension
  - Zod-validated JSON override mechanism for custom switch models
affects:
  - 02-ui-shell (catalog extensibility used by store/input layers)
  - 03-bom-view (any custom models in catalog affect BOM output)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-fast validation: SwitchSpecSchema.parse per-entry; SyntaxError/ZodError propagate unhandled"
    - "Pure function catalog merge: spread operator creates new object, never mutates base"
    - "TDD RED-GREEN: test file committed before implementation, all tests failing first"

key-files:
  created:
    - src/domain/catalog/loader.ts
    - src/domain/catalog/loader.test.ts
  modified: []

key-decisions:
  - "mergeCatalog fails fast on first invalid entry (not collecting all errors) — matches fail-fast catalog design"
  - "Returning { ...base, ...validatedOverrides } guarantees both immutability and key-level override semantics"
  - "Empty/undefined override returns shallow copy (not the original reference) to prevent future mutation surprises"

patterns-established:
  - "Catalog override pattern: validate per-entry with SwitchSpecSchema.parse before merging"
  - "Immutability: always return new object from catalog mutations via spread"

requirements-completed: [CAT-03]

# Metrics
duration: 15min
completed: 2026-03-16
---

# Phase 01 Plan 03: Catalog Override Merge Summary

**Pure mergeCatalog function with per-entry Zod validation enabling runtime hardware catalog extension without code changes**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-16T21:19:00Z
- **Completed:** 2026-03-16T21:34:54Z
- **Tasks:** 2 (RED + GREEN, no refactor needed)
- **Files modified:** 2

## Accomplishments

- Implemented `mergeCatalog(base, overrideJson?)` as a pure function — never mutates the base catalog
- Zod validation via `SwitchSpecSchema.parse` per-entry: fails fast on first invalid field
- Handles all edge cases: undefined override, empty string, empty `{}`, malformed JSON, missing required fields, wrong types
- 12/12 tests pass covering 7 distinct behavior groups as required by the plan

## Task Commits

Each task was committed atomically:

1. **RED — Failing tests for catalog override merge** - `4154ca9` (test)
2. **GREEN — Catalog override merge implementation** - `a04c98f` (feat)

**Plan metadata:** _(pending final commit)_

Note: TDD tasks have two commits (test → feat). No refactor needed — implementation was clean from the start.

## Files Created/Modified

- `src/domain/catalog/loader.ts` — `mergeCatalog` function; imports `SwitchSpecSchema` for validation, spreads base+overrides
- `src/domain/catalog/loader.test.ts` — 12 tests in 7 groups: new model, replace existing, missing field, wrong type, empty override, malformed JSON, SWITCH_CATALOG immutability, partial override

## Decisions Made

- Chose fail-fast (throw on first invalid entry) over error collection: catalog errors should halt loading, not partially succeed
- Empty string treated same as undefined (returns shallow copy of base) for robust caller behavior
- Immutability verified by checking `result !== base` (new reference) in tests, not just deep equality

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `src/domain/engine/sizing.test.ts` (missing `sizing.ts` — belongs to a future plan). Zero errors in the new loader files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `mergeCatalog` is ready for use in the store layer (Phase 2) when loading user-provided JSON overrides
- Test coverage at 100% for the specified behaviors; edge cases fully handled
- No blockers

## Self-Check: PASSED

- FOUND: src/domain/catalog/loader.ts
- FOUND: src/domain/catalog/loader.test.ts
- FOUND: .planning/phases/01-domain-engine/01-03-SUMMARY.md
- FOUND commit: 4154ca9 (test RED phase)
- FOUND commit: a04c98f (feat GREEN phase)

---
_Phase: 01-domain-engine_
_Completed: 2026-03-16_

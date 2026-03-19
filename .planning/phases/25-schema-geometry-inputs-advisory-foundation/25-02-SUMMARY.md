---
phase: 25-schema-geometry-inputs-advisory-foundation
plan: "02"
subsystem: domain/profiles
tags: [normalisation, profile, backward-compatibility, tdd, domain-purity]
dependency_graph:
  requires: ["25-01"]
  provides: ["normalizeEthInputState", "normalizeFCInputState", "normalizeConvergedInputState"]
  affects: ["Phase 26 cable length engine", "store profile load paths"]
tech_stack:
  added: []
  patterns: ["spread-defaults normalisation", "TDD red-green"]
key_files:
  created: []
  modified:
    - src/domain/profiles/profileService.ts
    - src/domain/profiles/profileService.test.ts
decisions:
  - "Normalisation via spread: { ...DEFAULT_ETH_INPUT, ...saved } — simple, immutable, no Zod overhead at load time"
  - "FC normalise function is a copy-only pass-through — FC has no geometry fields, exists for API consistency"
  - "No store imports: profileService.ts imports only from domain/schemas/defaults.ts"
metrics:
  duration: "~8 min"
  completed_date: "2026-03-19"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
---

# Phase 25 Plan 02: Profile Normalisation Functions Summary

**One-liner:** Spread-based profile normalisation backfills v9 geometry fields (rackPitchMm, racksAdjacent, patchPanelDistanceM) for pre-v9 saved profiles, with TDD green on all 13 tests.

## What Was Built

Three normalise functions exported from `src/domain/profiles/profileService.ts`:

- `normalizeEthInputState(saved)` — spreads `DEFAULT_ETH_INPUT` under `saved`, so old profiles get `rackPitchMm=600`, `racksAdjacent=true`, `patchPanelDistanceM=1` filled in automatically
- `normalizeFCInputState(saved)` — returns a copy of `saved` (FC has no geometry fields; exists for API consistency)
- `normalizeConvergedInputState(saved)` — spreads `DEFAULT_CONVERGED_INPUT` under `saved` for the same geometry backfill

## TDD Flow

**RED:** Added 6 new tests in `profileService.test.ts` (import of 3 new functions, 4 tests for Eth, 1 for Converged, 1 for FC). Tests failed with `TypeError: not a function`.

**GREEN:** Added `import { DEFAULT_ETH_INPUT, DEFAULT_CONVERGED_INPUT } from '../schemas/defaults'` and implemented the three functions using the spread pattern. All 13 tests pass. Full suite (575 tests) green. `npx tsc --noEmit` clean.

## Commits

| Hash | Message |
|------|---------|
| 3ec35e6 | test(25-02): add failing tests for profile normalisation functions |
| 3c8381b | feat(25-02): implement profile normalisation functions |

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **Spread pattern for normalisation:** `{ ...DEFAULT_ETH_INPUT, ...saved }` is the simplest correct implementation — the default values sit on the left and are overwritten by any key that already exists in the saved profile. No Zod re-validation needed at load time (validation happens at engine entry).

2. **FC pass-through:** `{ ...saved }` creates a new object (immutable) without spreading FC defaults. FC currently has no geometry fields so there is nothing to backfill. The function exists so call-sites can use a uniform API regardless of mode.

3. **Domain purity confirmed:** `profileService.ts` imports only from `'../schemas/defaults'` — zero `src/store/` references.

## Verification Results

- `grep -c "src/store" src/domain/profiles/profileService.ts` → 0
- `grep "normalizeEthInputState" src/domain/profiles/profileService.ts` → 3 lines (import comment, function def, body)
- `npx vitest run` → PASS (575) FAIL (0)
- `npx tsc --noEmit` → 0 errors

## Self-Check: PASSED

- [x] `src/domain/profiles/profileService.ts` exists and contains all three functions
- [x] `src/domain/profiles/profileService.test.ts` exists and contains new describe blocks
- [x] Commit `3ec35e6` exists (RED tests)
- [x] Commit `3c8381b` exists (GREEN implementation)

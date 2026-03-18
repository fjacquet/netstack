---
phase: 12
plan: "03"
subsystem: fc-input-ui
tags: [fc, i18n, form, schema, tdd, gap-closure]
dependency_graph:
  requires:
    - 12-01 (FCInputForm base component)
    - 12-02 (FCBOMPanel)
  provides:
    - preferredGeneration field in FCSizingInputSchema
    - Generation-filtered FC switch model dropdown
    - FC-10 requirement: preferred generation as distinct UI input
  affects:
    - src/domain/schemas/fc-input.ts
    - src/store/fcInputStore.ts
    - src/features/sizing/fc/FCInputForm.tsx
    - All 4 i18n locale files
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN for schema and component tests
    - form.watch() for reactive computed filteredModels
    - GENERATION_LABELS record map for i18n key lookup
key_files:
  created: []
  modified:
    - src/domain/schemas/fc-input.ts
    - src/store/fcInputStore.ts
    - src/domain/schemas/fc-schemas.test.ts
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
    - src/features/sizing/fc/FCInputForm.tsx
    - src/features/sizing/FCInputForm.test.tsx
    - src/store/store-isolation.test.ts
    - src/store/fcInputStore.test.ts
    - src/store/fcResultStore.test.ts
    - src/domain/engine/fc-sizing.test.ts
    - src/features/sizing/FCBOMPanel.test.tsx
decisions:
  - "[Phase 12-03]: preferredGeneration uses form.watch() outside useEffect for reactive filteredModels computation — no useEffect needed for derived render state"
  - "[Phase 12-03]: Test uses labelFor (htmlFor) attribute to find switch model combobox trigger — data-slot='form-item' not present in FormItem component"
metrics:
  duration_minutes: 18
  completed_date: "2026-03-18"
  tasks_completed: 3
  files_modified: 14
---

# Phase 12 Plan 03: preferredGeneration Gap Closure Summary

**One-liner:** Added `preferredGeneration` field (gen7/gen8/any) from Zod schema through store default through FCInputForm generation selector with generation-filtered model dropdown and full 4-locale i18n coverage.

## Objective

Close the FC-10 verification gap: the engine accepted `preferredGeneration` but the UI never exposed or persisted it. Phase 12 success criterion 2 ("preferred generation as a distinct input") was blocked.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add preferredGeneration to FCSizingInputSchema and fcInputStore | 465eebe | fc-input.ts, fcInputStore.ts, fc-schemas.test.ts |
| 2 | Add preferredGeneration i18n keys to all 4 locale files | 13fedd1 | EN/FR/DE/IT translation.json + 5 test file fixes |
| 3 | Add generation selector to FCInputForm and update test | c88c5d8 | FCInputForm.tsx, FCInputForm.test.tsx |

## Success Criteria Verified

- FCSizingInputSchema has `preferredGeneration: z.enum(['gen7','gen8','any']).default('any')` — confirmed
- fcInputStore DEFAULT_FC_INPUT includes `preferredGeneration: 'any'` — confirmed
- All 4 locale files have fc.preferredGeneration, fc.gen7, fc.gen8, fc.genAny — confirmed (2 occurrences each)
- FCInputForm renders a generation selector above the switch model dropdown — confirmed
- Selecting gen7 filters the model dropdown to 6 Gen7 models; gen8 filters to 3 Gen8 models; any shows all 9 — confirmed by tests
- setInput is called with `{ preferredGeneration: value }` on selection change — confirmed
- 3 new tests in FCInputForm.test.tsx all pass — confirmed
- `rtk vitest run` exits with 0 failures (363 tests pass) — confirmed
- `rtk npx tsc --noEmit` exits 0 — confirmed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated makeInput/DEFAULT_FC_INPUT in 5 test files**

- **Found during:** Task 2 (tsc --noEmit verification)
- **Issue:** Adding `preferredGeneration` to `FCSizingInput` type caused TypeScript errors in 5 test files that had inline `DEFAULT_FC_INPUT` or `makeInput()` objects missing the new required field
- **Files:** store-isolation.test.ts, fcInputStore.test.ts, fcResultStore.test.ts, fc-sizing.test.ts, FCBOMPanel.test.tsx, FCInputForm.test.tsx
- **Fix:** Added `preferredGeneration: 'any'` to each inline FCSizingInput object
- **Commits:** 13fedd1

**2. [Rule 1 - Bug] Fixed test trigger-finding strategy for gen7 filtering test**

- **Found during:** Task 3 TDD RED/GREEN
- **Issue:** The plan's test code used `el.closest('[data-slot="form-item"]')` to find the switch model combobox, but `FormItem` doesn't use `data-slot` — the find returned undefined and fell back to `selectTriggers[0]` which was now the generation selector (since it was added above fcSwitchModel)
- **Fix:** Updated the test to use `labelFor ? el.id === labelFor` branch (same as the existing passing "9 options" test), with `selectTriggers[1]` as fallback
- **Commits:** c88c5d8

## Self-Check: PASSED

All key files exist. All 3 task commits verified. 363 tests pass, 0 failures. TypeScript compilation clean.

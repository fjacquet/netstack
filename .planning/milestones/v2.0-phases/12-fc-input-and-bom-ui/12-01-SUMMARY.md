---
phase: 12-fc-input-and-bom-ui
plan: "01"
subsystem: fc-ui
tags: [react, form, i18n, mode-selector, zustand, tdd]
dependency_graph:
  requires:
    - 09-mode-store-isolation (fcInputStore)
    - 10-fc-sizing-engine (FC_SWITCH_CATALOG, FCSizingInput)
  provides:
    - ModeSelector component
    - FCSizingPage layout wrapper
    - FCInputForm wired to useFCInputStore
    - App mode gate (ephemeral useState)
  affects:
    - src/App.tsx
    - src/components/TopBar.tsx
tech_stack:
  added: []
  patterns:
    - react-hook-form watch subscription with debounce
    - useShallow multi-field Zustand selector
    - Radix Select with Object.keys(catalog) for dynamic options
    - scrollIntoView mock for Radix Select in jsdom
key_files:
  created:
    - src/components/ModeSelector.tsx
    - src/features/sizing/fc/FCInputForm.tsx
    - src/features/sizing/fc/FCSizingPage.tsx
    - src/features/sizing/FCInputForm.test.tsx
  modified:
    - src/App.tsx
    - src/components/TopBar.tsx
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
decisions:
  - "scrollIntoView mocked at test module scope for Radix Select + jsdom compatibility"
  - "Debounced numeric fields (hbaPortsPerServer etc.) tested with vi.useFakeTimers + vi.runAllTimers"
  - "FCInputForm 9-model test opens select via fireEvent.click on combobox trigger before asserting options"
  - "FCInputForm.tsx uses Object.keys(FC_SWITCH_CATALOG) — never hardcodes model list"
metrics:
  duration_min: 20
  completed_date: "2026-03-18"
  tasks_completed: 3
  files_changed: 10
---

# Phase 12 Plan 01: FC Input and BOM UI — Mode Selector and FCInputForm Summary

**One-liner:** Ephemeral mode toggle wired into App + full FCInputForm collecting all 7 FCSizingInput fields from useFCInputStore, with 9 Brocade model options derived from FC_SWITCH_CATALOG.

## Objective

Open the FC UI path by delivering: a ModeSelector toggle in TopBar, an AppContent mode gate hiding Rack Elevation tab in FC mode, a complete FCInputForm with all FC sizing fields, and FCSizingPage layout wrapper.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Write FCInputForm.test.tsx Wave 0 test stub | dedfa78 | FCInputForm.test.tsx (RED) |
| 1 | ModeSelector + App mode gate + TopBar wiring | 1747c28 | ModeSelector.tsx, TopBar.tsx, App.tsx, 4x translation.json, FCSizingPage.tsx |
| 2 | FCInputForm component + FCSizingPage | 25b2bdf | FCInputForm.tsx (full), FCInputForm.test.tsx (GREEN) |

## What Was Built

### ModeSelector (`src/components/ModeSelector.tsx`)
Two-button toggle (Ethernet / FC) with `aria-label={t('mode.selectLabel')}`. Active mode uses `variant="default"`, inactive uses `variant="ghost"`.

### TopBar wiring (`src/components/TopBar.tsx`)
Now accepts `{ mode, onModeChange }` props. Renders `<ModeSelector>` between the title span and the ml-auto export buttons div.

### App mode gate (`src/App.tsx`)
- `const [mode, setMode] = useState<'ethernet' | 'fc'>('ethernet')` — ephemeral, resets on reload
- Rack Elevation TabsTrigger and TabsContent wrapped in `{mode === 'ethernet' && ...}`
- Sizing TabsContent: `{mode === 'fc' ? <FCSizingPage /> : <SizingPage />}`

### FCInputForm (`src/features/sizing/fc/FCInputForm.tsx`)
Complete form wired to `useFCInputStore` with `useShallow`. Fields:
1. Rack Configuration (rackCount + per-rack server inputs) — mirrors Ethernet InputForm
2. FC Parameters: hbaPortsPerServer (1-8), storageTargetPorts (2-128), storageArrayCount (1-32)
3. Switch Configuration: fcSwitchModel Select (9 options from `Object.keys(FC_SWITCH_CATALOG)`), islPortsPerSwitch (0-32)
4. Physical: rackSize Select, serverUHeight Select
5. Reset button calls `resetInput()` + `form.reset()`

### FCSizingPage (`src/features/sizing/fc/FCSizingPage.tsx`)
Layout wrapper matching SizingPage.tsx pattern: FCInputForm in 320px column + FCBOMPanel placeholder (plan 12-02).

### i18n (`src/i18n/locales/{en,fr,de,it}/translation.json`)
Added `"mode"` object with `ethernet`, `fc`, `selectLabel` keys in all 4 locales.

## Verification Results

- `npx tsc --noEmit`: zero errors
- `npx vitest run`: 344 tests pass (335 existing + 9 new FCInputForm tests)
- FCInputForm.test.tsx: all 9 tests GREEN covering FC-10 acceptance criteria

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added scrollIntoView mock for Radix Select jsdom compatibility**
- **Found during:** Task 2 — Radix Select's scrollIntoView called during open causes TypeError in jsdom
- **Fix:** Added `Element.prototype.scrollIntoView = vi.fn()` at module scope in FCInputForm.test.tsx
- **Files modified:** src/features/sizing/FCInputForm.test.tsx
- **Commit:** 25b2bdf

**2. [Rule 1 - Bug] Fixed debounced field test to use fake timers**
- **Found during:** Task 2 — `fireEvent.change` alone doesn't flush 150ms debounce
- **Fix:** `vi.useFakeTimers()` + `vi.runAllTimers()` + `vi.useRealTimers()` wrapping the assertion
- **Files modified:** src/features/sizing/FCInputForm.test.tsx
- **Commit:** 25b2bdf

**3. [Rule 1 - Bug] Fixed select options test to open select trigger first**
- **Found during:** Task 2 — Radix Select items are not in DOM until select is opened
- **Fix:** `fireEvent.click(comboboxTrigger)` before asserting on `role="option"` elements
- **Files modified:** src/features/sizing/FCInputForm.test.tsx
- **Commit:** 25b2bdf

**4. [Rule 3 - Blocking issue] Fixed FCInputForm.test.tsx TypeScript type error**
- **Found during:** Task 1 — `vi.fn()` return type not assignable to `(partial: Partial<FCSizingInput>) => void`
- **Fix:** Introduced local `MockFCState` interface instead of importing unexported `FCInputState`
- **Files modified:** src/features/sizing/FCInputForm.test.tsx
- **Commit:** 1747c28

## Self-Check: PASSED

Files verified:
- src/components/ModeSelector.tsx — exists
- src/features/sizing/fc/FCInputForm.tsx — exists
- src/features/sizing/fc/FCSizingPage.tsx — exists
- src/features/sizing/FCInputForm.test.tsx — exists
- src/App.tsx — modified
- src/components/TopBar.tsx — modified

Commits verified: dedfa78, 1747c28, 25b2bdf all present in git log.

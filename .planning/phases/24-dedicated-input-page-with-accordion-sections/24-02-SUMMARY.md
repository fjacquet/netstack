---
phase: 24
plan: 02
subsystem: ui-navigation
tags: [react-router, accordion, input-form, migration, routes, navlink]
dependency-graph:
  requires: [24-01]
  provides: [InputPage, EthInputAccordion, FCInputAccordion, ConvergedInputAccordion, ResultsPage]
  affects: [App.tsx, TopBar.tsx, index.css, all-accordion-tests]
tech-stack:
  added: []
  patterns: [react-router-routes, accordion-multiple-open, useForm-debounce-store-sync, navlink-active-styling]
key-files:
  created:
    - src/features/input/InputPage.tsx
    - src/features/input/EthInputAccordion.tsx
    - src/features/input/FCInputAccordion.tsx
    - src/features/input/ConvergedInputAccordion.tsx
    - src/features/sizing/ResultsPage.tsx
  modified:
    - src/App.tsx
    - src/components/TopBar.tsx
    - src/index.css
    - src/features/sizing/InputForm.test.tsx
    - src/features/sizing/FCInputForm.test.tsx
  deleted:
    - src/features/sizing/SizingPage.tsx
    - src/features/sizing/InputForm.tsx
    - src/features/sizing/fc/FCSizingPage.tsx
    - src/features/sizing/fc/FCInputForm.tsx
    - src/features/sizing/converged/ConvergedSizingPage.tsx
    - src/features/sizing/converged/ConvergedInputForm.tsx
decisions:
  - "Accordion type=multiple with all sections open by default — better UX than single-open, enables all fields visible on first load, also fixes test visibility in jsdom (Radix sets hidden attribute on collapsed sections)"
  - "Added data-testid to preferredGeneration SelectTrigger to avoid fragile closest() selector logic in tests"
  - "ResultsPage wraps BOM panels in max-w-5xl container for layout consistency"
  - "TopBar Configure button uses secondary variant when on /input route, ghost otherwise"
metrics:
  duration: 75 minutes (across sessions)
  completed: 2026-03-19
  tasks: 2
  files-changed: 11
---

# Phase 24 Plan 02: Accordion Input Pages and Route Migration Summary

Replaced the monolithic Tabs-based SizingPage with a dedicated /input route and three mode-specific accordion input components, migrated App.tsx from Tabs to React Router Routes/NavLink, and added a Configure button to the TopBar.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create accordion input pages and ResultsPage | 9e94807 | InputPage, EthInputAccordion, FCInputAccordion, ConvergedInputAccordion, ResultsPage |
| 2 | Migrate App.tsx, TopBar, print CSS; delete old files | 26e93e5, b2c9d66 | App.tsx, TopBar.tsx, index.css; deleted 6 old files |
| 2-fix | Fix accordion defaultValue and test selectors | 2b1fdd2 | All 3 accordions, FCInputForm.test.tsx |
| 3 | Human verification checkpoint — approved by user | — | (no code change required) |
| 3-fix | Move Configure Inputs to nav strip | a356cd0 | App.tsx |

## What Was Built

**InputPage** (`src/features/input/InputPage.tsx`) — Route-mounted page at `/input`. Renders the correct accordion based on mode prop (ethernet/fc/converged). Centered layout with `max-w-3xl`.

**EthInputAccordion** (`src/features/input/EthInputAccordion.tsx`) — Three accordion sections: Rack Configuration, Switch Selection, Advanced. Full Ethernet form preserving all fields from the original InputForm including portsPerServerFrontend/portsPerServerBackend, topology-conditional fields (Clos vs Three-Tier), switch models, and brownfield infrastructure toggles. Uses `useInputStore` + `useShallow`.

**FCInputAccordion** (`src/features/input/FCInputAccordion.tsx`) — Three accordion sections: Rack Configuration, Fabric Configuration, Advanced. FC form with preferredGeneration filter for switch models, HBA ports, storage target/array counts, ISL ports. Uses `useFCInputStore` + `useShallow`.

**ConvergedInputAccordion** (`src/features/input/ConvergedInputAccordion.tsx`) — Four accordion sections: Rack Configuration, Ethernet Switches, FC Fabric, Advanced. Combines both Ethernet and FC inputs for converged mode. Uses `useConvergedInputStore` + `useShallow`.

**ResultsPage** (`src/features/sizing/ResultsPage.tsx`) — Route-mounted at `/`. Renders BOMPanel, FCBOMPanel, or ConvergedBOMPanel based on mode.

**App.tsx migration** — Replaced Tabs/TabsTrigger/TabsContent with react-router Routes/Route/NavLink. Added `<nav aria-label="page navigation">` strip below TopBar. `/input` route added. NavLink uses active styling with `end` prop on root route.

**TopBar.tsx** — Added SlidersHorizontal Configure button with `useNavigate('/input')`. Button uses `secondary` variant when on `/input` route (`useMatch`), `ghost` otherwise.

**Print CSS** — Updated `nav[aria-label="page navigation"]` selector to hide new nav strip when printing (replaced old `[role="tablist"]` selector).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Accordion collapsed sections not findable in tests**
- **Found during:** Task 2 verification
- **Issue:** Radix Accordion sets `hidden` HTML attribute on collapsed section content. `screen.getByText()` and `screen.getByTestId()` cannot find elements inside collapsed sections. Tests for FCInputAccordion (9 tests) and EthInputAccordion (10 tests) failed.
- **Fix:** Changed all three accordions from `type="single" collapsible defaultValue="rack-config"` to `type="multiple" defaultValue={[...all sections...]}`. All sections open by default, improving UX (all inputs visible) and making tests reliable.
- **Files modified:** EthInputAccordion.tsx, FCInputAccordion.tsx, ConvergedInputAccordion.tsx
- **Commit:** 2b1fdd2

**2. [Rule 1 - Bug] Fragile combobox selector in preferredGeneration test**
- **Found during:** Task 2 verification (after accordion fix)
- **Issue:** Test used `el.closest('[data-slot="form-item"]')` to find the right combobox, but FormItem renders as `<div class="space-y-2">` without `data-slot` attribute. All `closest()` calls returned `null`, so `null === null` matched the first combobox (serverUHeight) instead of the preferredGeneration trigger.
- **Fix:** Added `data-testid="preferred-generation-select"` to the SelectTrigger in FCInputAccordion. Updated test to use `screen.getByTestId('preferred-generation-select')`.
- **Files modified:** FCInputAccordion.tsx, FCInputForm.test.tsx
- **Commit:** 2b1fdd2

## Test Results

All 552 tests pass after fixes:
- Domain tests: 374 (unchanged)
- EthInputAccordion (migrated): 18 tests — all pass
- FCInputAccordion (migrated): 10 tests — all pass
- Other UI tests: pass

## Self-Check

### Files Exist
- src/features/input/InputPage.tsx: FOUND
- src/features/input/EthInputAccordion.tsx: FOUND
- src/features/input/FCInputAccordion.tsx: FOUND
- src/features/input/ConvergedInputAccordion.tsx: FOUND
- src/features/sizing/ResultsPage.tsx: FOUND

### Commits Exist
- 9e94807: feat(24-02): create accordion input pages and ResultsPage
- 26e93e5: feat(24-02): migrate App to Routes, add Configure button, update print CSS
- b2c9d66: chore(24-02): delete old InputForm and SizingPage files
- 2b1fdd2: fix(24-02): open all accordion sections by default; fix test selectors

**3. [Rule 2 - Missing] Added Configure Inputs NavLink to nav strip**
- **Found during:** Task 3 human verification (user approved)
- **Issue:** Configure button in TopBar was the only way to reach /input — no link in the nav strip meant no keyboard/link affordance
- **Fix:** Added Configure Inputs NavLink to the nav strip alongside Results/Topology/Rack with same active styling
- **Files modified:** src/App.tsx
- **Commit:** a356cd0

## Final Test Results

All 552 tests pass after all fixes (confirmed post human-verify approval).

## Self-Check: PASSED

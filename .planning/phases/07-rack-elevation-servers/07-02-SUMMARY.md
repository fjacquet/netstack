---
phase: 07-rack-elevation-servers
plan: "02"
subsystem: ui
tags: [rack-elevation, server-rendering, i18n, violation, input-form, multi-u]
dependency_graph:
  requires: [serverUHeight-schema, RACK_CAPACITY_EXCEEDED-violation, RackDevice-server-role]
  provides: [ServerDevice-component, RackCapacityBadge-component, multi-u-RackFrame, serverUHeight-InputForm, RACK_CAPACITY_EXCEEDED-BOMPanel-alert, i18n-12-keys]
  affects:
    - src/features/rack-elevation/utils/buildRackDevices.ts
    - src/features/rack-elevation/utils/buildRackDevices.test.ts
    - src/features/rack-elevation/ServerDevice.tsx
    - src/features/rack-elevation/RackCapacityBadge.tsx
    - src/features/rack-elevation/RackFrame.tsx
    - src/features/rack-elevation/RackElevationTab.tsx
    - src/features/sizing/InputForm.tsx
    - src/features/sizing/BOMPanel.tsx
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
tech_stack:
  added: []
  patterns: [TDD-red-green, amber-hsl-arbitrary-value, coveredSlots-set, discriminated-union-violation]
key_files:
  created:
    - src/features/rack-elevation/ServerDevice.tsx
    - src/features/rack-elevation/RackCapacityBadge.tsx
  modified:
    - src/features/rack-elevation/utils/buildRackDevices.ts
    - src/features/rack-elevation/utils/buildRackDevices.test.ts
    - src/features/rack-elevation/RackFrame.tsx
    - src/features/rack-elevation/RackElevationTab.tsx
    - src/features/sizing/InputForm.tsx
    - src/features/sizing/BOMPanel.tsx
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
decisions:
  - "ServerDevice uses inline style height (not dynamic Tailwind class) — Tailwind purges dynamic class names at build time"
  - "coveredSlots Set computed before render loop — O(n) upfront vs O(n) per slot with find() approach"
  - "Server slot container uses uHeight*44px (full slot pitch) while ServerDevice content uses uHeight*40px (content area) — matches existing h-11/h-10 slot pattern"
  - "U-slot label uses self-start pt-3 for multi-U slots — keeps label at top of tall slot visually"
  - "violation map key uses rackNumber discriminant for RACK_CAPACITY_EXCEEDED — prevents duplicate key collisions when multiple racks overflow"
metrics:
  duration_minutes: 20
  completed_date: "2026-03-18"
  tasks_completed: 3
  files_changed: 12
---

# Phase 7 Plan 02: UI Layer — Server Rendering, U-Height Input, Capacity Badge, and Violations Summary

**One-liner:** Wired domain server types into the UI with amber server slots in rack elevation (multi-U support), a U-height selector in InputForm, per-rack capacity badge, and RACK_CAPACITY_EXCEEDED alert in BOMPanel across all 4 locales.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for server entries in buildRackDevices | 4412066 | buildRackDevices.test.ts |
| 1 (GREEN) | Extend buildRackDevices with server entries and uHeight | 60d9df2 | buildRackDevices.ts, buildRackDevices.test.ts |
| 2 | ServerDevice, RackCapacityBadge, multi-U RackFrame, overflow | 563a855 | ServerDevice.tsx, RackCapacityBadge.tsx, RackFrame.tsx, RackElevationTab.tsx |
| 3 | serverUHeight InputForm, RACK_CAPACITY_EXCEEDED BOMPanel, i18n | 2395d28 | InputForm.tsx, BOMPanel.tsx, 4x translation.json, 6x test files |

## What Was Built

### buildRackDevices Extension (Task 1, TDD)

- Added `uHeight: 1` to all 5 switch device types (OOB, Leaf B, Leaf A in `buildRackDevices`; spine and border leaf in `buildNetworkRackDevices`)
- Appended server entries starting at U4, stacking with `currentUSlot += uHeight` for multi-U devices
- Server IDs follow `rack-N-server-M` pattern; labels are `Server 1`...`Server N` (1-based)
- 8 new tests in `server devices` describe block; updated existing switch-count test (3 switches + 16 servers = 19)

### ServerDevice Component (Task 2)

- New `src/features/rack-elevation/ServerDevice.tsx` — amber color using `hsl(25_95%_80%)` (light) / `hsl(25_95%_28%)` (dark)
- Dynamic height via `style={{ height: uHeight * 40 + 'px' }}` — inline style avoids Tailwind purge of dynamic class names
- U-height badge in top-right corner for servers > 1U
- Not draggable (v1 scope)

### RackCapacityBadge Component (Task 2)

- New `src/features/rack-elevation/RackCapacityBadge.tsx` — Badge with `destructive` variant when overflow, `secondary` when within capacity
- Uses `rack.capacityWithin` / `rack.capacityExceeded` i18n keys with `used/total` interpolation

### RackFrame Multi-U Support (Task 2)

- `coveredSlots` Set computed before render — slots above multi-U anchor are skipped (`return null`)
- Slot container height uses `uHeight * 44px` (full pitch) for multi-U devices
- Server devices rendered via `<ServerDevice>` instead of `<RackDevice>`
- Outer frame gets `border-destructive` class when `overflow` prop is true
- Overflow strip (4px red bar) rendered at bottom when overflow count > 0
- `overflow?: boolean` prop added to `RackFrameProps`

### RackElevationTab Updates (Task 2)

- Computes `usedU = devices.reduce((sum, d) => sum + d.uHeight, 0)` after each device rebuild
- Derives `overflow = usedU > rackUnits` and passes to `<RackFrame overflow={overflow} />`
- Replaced static `{rackUnits}U` span with `<RackCapacityBadge usedU={usedU} totalU={rackUnits} />`

### InputForm serverUHeight Select (Task 3)

- Added `serverUHeight: '1U' | '2U' | '4U' | '8U'` to `FormValues` interface
- Added to `defaultValues` from `input.serverUHeight`
- `SERVER_U_HEIGHTS` constant and `U_HEIGHT_LABELS` record for i18n-mapped option labels
- `FormField` placed in Physical section after rackSize, using same Select pattern
- Added to `form.reset()` handler with `'1U'` default

### BOMPanel RACK_CAPACITY_EXCEEDED (Task 3)

- Added `if (v.code === 'RACK_CAPACITY_EXCEEDED')` block in `ViolationAlert` with destructive Alert variant
- Displays rack number, usedU, totalU from the violation payload
- Fixed `violations.map` key: uses `` `${v.code}-${v.rackNumber}` `` for RACK_CAPACITY_EXCEEDED, `v.code` for others

### i18n Keys — All 4 Locales (Task 3)

12 new keys added to `sizing`, `rack`, and `bom` namespaces:

- `sizing`: `serverUHeight`, `selectServerUHeight`, `uHeight1U`, `uHeight2U`, `uHeight4U`, `uHeight8U`
- `rack`: `serverLabel`, `capacityWithin`, `capacityExceeded`, `overflowStrip`
- `bom`: `violationRackCapacityTitle`, `violationRackCapacityBody`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Existing test count assertion updated for new behavior**

- **Found during:** Task 1 GREEN phase
- **Issue:** Test "returns exactly 3 devices for rack 0" assumed no server entries; after implementation, 16 servers at 1U produces 19 devices (3 switches + 16 servers)
- **Fix:** Updated test description and expectation to `toHaveLength(19)` with explanatory comment
- **Files modified:** `buildRackDevices.test.ts`
- **Commit:** 60d9df2

**2. [Rule 2 - Missing field] Added serverUHeight to 6 test mock inputs**

- **Found during:** Task 3 TypeScript check
- **Issue:** `serverUHeight` is now required on `SizingInput` (Zod enum with default); 6 test files had inline mock objects without the new field causing TS2741 errors
- **Fix:** Added `serverUHeight: '1U'` to all affected mock input objects in BOMPanel.test.tsx, InputForm.test.tsx, resultStore.test.ts, exportCsv.test.ts, exportPdf.test.ts, buildTopologyGraph.test.ts
- **Files modified:** All 6 test files
- **Commit:** 2395d28

## Test Coverage

- 223 total tests — all pass (0 failures)
- 18 tests in `buildRackDevices.test.ts` (8 new for server devices, 1 updated)
- TypeScript: 0 errors (strict mode)

## Self-Check

Files created:

- [x] src/features/rack-elevation/ServerDevice.tsx — contains `hsl(25_95%` (amber)
- [x] src/features/rack-elevation/RackCapacityBadge.tsx — exists, >= 10 lines

Files modified:

- [x] src/features/rack-elevation/utils/buildRackDevices.ts — contains `role: 'server'`, `uHeight`
- [x] src/features/rack-elevation/RackFrame.tsx — contains `coveredSlots`, `ServerDevice`, `overflow`, `border-destructive`
- [x] src/features/rack-elevation/RackElevationTab.tsx — contains `usedU`, `RackCapacityBadge`
- [x] src/features/sizing/InputForm.tsx — contains `serverUHeight` (FormValues, defaultValues, FormField, reset, constants)
- [x] src/features/sizing/BOMPanel.tsx — contains `RACK_CAPACITY_EXCEEDED`, `violationRackCapacityTitle`
- [x] src/i18n/locales/en/translation.json — contains `serverUHeight`, `capacityExceeded`, `serverLabel`
- [x] src/i18n/locales/fr/translation.json — contains `serverUHeight`
- [x] src/i18n/locales/de/translation.json — contains `serverUHeight`
- [x] src/i18n/locales/it/translation.json — contains `serverUHeight`

Commits verified:

- [x] 4412066 — RED tests
- [x] 60d9df2 — GREEN buildRackDevices
- [x] 563a855 — ServerDevice, RackCapacityBadge, RackFrame, RackElevationTab
- [x] 2395d28 — InputForm, BOMPanel, i18n, test fixes

## Self-Check: PASSED

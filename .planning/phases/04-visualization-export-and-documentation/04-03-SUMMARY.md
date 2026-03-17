---
phase: 04-visualization-export-and-documentation
plan: 03
subsystem: rack-elevation
tags: [rack-elevation, drag-and-drop, visualization, tdd, zustand, react]
dependency_graph:
  requires:
    - 04-01 (types.ts, saturation helpers, barrel index stubs)
    - domain/schemas/bom.ts (NetworkBOM)
    - domain/catalog/hardware.ts (SWITCH_CATALOG)
    - store/resultStore.ts (useResultStore)
  provides:
    - src/features/rack-elevation/utils/buildRackDevices.ts
    - src/features/rack-elevation/RackFrame.tsx
    - src/features/rack-elevation/RackDevice.tsx (from Plan 01, staged here)
    - src/features/rack-elevation/RackElevationTab.tsx
    - src/features/rack-elevation/index.ts (populated)
  affects:
    - src/App.tsx (PlaceholderTab replaced with RackElevationTab)
tech_stack:
  added: []
  patterns:
    - HTML5 drag-and-drop (draggable, onDragStart, onDragOver, onDrop)
    - Keyboard reorder (ArrowUp/ArrowDown via onKeyDown)
    - useShallow from zustand/shallow for store selectors
    - useEffect dependencies on bom?.racks for rack count change detection
key_files:
  created:
    - src/features/rack-elevation/utils/buildRackDevices.ts
    - src/features/rack-elevation/utils/buildRackDevices.test.ts
    - src/features/rack-elevation/RackFrame.tsx
    - src/features/rack-elevation/RackElevationTab.tsx
  modified:
    - src/features/rack-elevation/index.ts
    - src/App.tsx
decisions:
  - "Device reorder state is local UI only — NOT persisted to store or localStorage (v2 scope per UI-SPEC)"
  - "useEffect on bom?.racks (not full bom) to reset selectedRack only when rack count changes"
  - "totalSlots = Math.max(4, devices.length + 1) — minimum 4 slots always visible in RackFrame"
  - "Pre-existing TopologyCanvas.tsx TypeScript error confirmed pre-existing; RTK filter showed stale cached output; actual tsc --noEmit exits 0"
metrics:
  duration_min: 4
  completed_date: "2026-03-17"
  tasks_completed: 2
  files_created_modified: 6
---

# Phase 04 Plan 03: Rack Elevation View Summary

**One-liner:** Rack elevation tab with per-rack device visualization: U-slot numbering (bottom-to-top), role-based device coloring (leaf=blue, OOB=gray), saturation border glow, rack selector dropdown, HTML5 drag-to-reorder, and automatic BOM-driven updates.

## What Was Built

The rack elevation feature provides engineers with a physical device placement view per rack. Given a NetworkBOM and rack index, it renders a visual rack frame with U-slot labels and draggable device blocks.

### buildRackDevices (pure function)

`src/features/rack-elevation/utils/buildRackDevices.ts` — accepts `NetworkBOM` and `rackIndex`, returns `RackDevice[]`:
- U1: OOB switch (S3248T-ON), `usedPorts = serversPerRack + 2`
- U2: Leaf B (second of redundant ToR pair)
- U3: Leaf A (first of redundant ToR pair)
- Uses `SWITCH_CATALOG` for port counts (never hardcoded)

### RackFrame

`src/features/rack-elevation/RackFrame.tsx` — visual rack with U-slot grid:
- U-slots numbered bottom-to-top (U1 at bottom), rendered top-to-bottom visually
- `Math.max(4, devices.length + 1)` total slots (at least 4 visible)
- HTML5 drag-and-drop (`onDragOver`, `onDrop`) — invalid drop onto occupied slot snaps back
- Keyboard reorder via `handleMoveUp`/`handleMoveDown` passed to `RackDevice`
- Empty slots: dashed border, `bg-muted/30`

### RackDevice

`src/features/rack-elevation/RackDevice.tsx` — draggable device block:
- Role-based fill: leaf=`bg-[hsl(213_94%_80%)] dark:bg-[hsl(213_94%_28%)]`, OOB=`bg-muted`
- Saturation border via `getSaturationBorderClass(usedPorts, totalPorts)`
- `draggable="true"`, `role="button"`, full aria-label per accessibility contract
- `onKeyDown` handles ArrowUp/ArrowDown

### RackElevationTab

`src/features/rack-elevation/RackElevationTab.tsx` — tab wrapper:
- `useResultStore(useShallow(s => s.bom))` — shallow selector
- Rack selector `<Select>` dropdown with `aria-label="Select rack to view"`
- Options: `Rack {n} — 3 switches` (1-indexed, using i18n key `rack.selectorOptionFormat`)
- `useEffect` on `bom?.racks` resets `selectedRack` to 0 when rack count changes
- Separate `useEffect` on `[bom, selectedRack]` rebuilds devices
- Device reorder is local state only (NOT persisted — v2 scope)
- Empty state card shown when BOM is null
- `ScrollArea` wraps `RackFrame` for overflow

### App.tsx

`PlaceholderTab` for `rackElevation` replaced with `<RackElevationTab />`.

## TDD Record

**Task 1 followed TDD process:**
- RED: Test file confirmed existing `buildRackDevices.test.ts` (from Plan 01) — 8 tests all PASS (function already existed from Plan 01)
- GREEN: Implementation `buildRackDevices.ts` already correct from Plan 01
- No REFACTOR needed

## Test Coverage

- 8 unit tests in `buildRackDevices.test.ts` — all pass
- Full suite: 136 tests — all pass

## Deviations from Plan

### Pre-existing Issue Discovered (Out of Scope — Deferred)

**TopologyCanvas.tsx L105 TypeScript error (pre-existing, not caused by this plan)**
- RTK filter initially reported a TypeScript error in `TopologyCanvas.tsx` at L105
- Verified pre-existing by `git stash` before any changes — same error present
- On closer inspection: `npx tsc --noEmit` exits 0; RTK was showing a stale cached error
- No fix needed — TypeScript is clean
- Logged to deferred-items: confirmed false alarm

No actual deviations from the plan. All tasks executed exactly as specified.

## Self-Check

Verified files exist:
- `src/features/rack-elevation/utils/buildRackDevices.ts` — FOUND
- `src/features/rack-elevation/utils/buildRackDevices.test.ts` — FOUND
- `src/features/rack-elevation/RackFrame.tsx` — FOUND
- `src/features/rack-elevation/RackDevice.tsx` — FOUND
- `src/features/rack-elevation/RackElevationTab.tsx` — FOUND
- `src/features/rack-elevation/index.ts` (exports RackElevationTab) — FOUND
- `src/App.tsx` (contains `<RackElevationTab />`) — FOUND

Commits verified:
- `5a3505f` — feat(04-03): build rack device utility and UI components
- `dcfad6a` — feat(04-03): build RackElevationTab and wire into App.tsx

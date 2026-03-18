---
phase: 13-fc-topology-diagram
plan: "02"
subsystem: topology-ui
tags:
  - react
  - xyflow
  - fc-topology
  - dual-fabric
dependency_graph:
  requires:
    - 13-01  # buildFCTopologyGraph pure function
    - Phase 12  # FC BOM and fcResultStore
  provides:
    - FCTopologyTab (dual-fabric React component)
    - getLastFCTopologyPng (Phase 14 export hook)
  affects:
    - src/App.tsx (topology tab mode gate)
    - src/features/topology/index.ts (new exports)
tech_stack:
  added:
    - FCTopologyCanvas with module-level fcNodeTypes
    - FCTopologyLegend with Fabric A/B/ISL items
    - FCTopologyTab with two independent ReactFlowProvider instances
  patterns:
    - module-level nodeTypes (ReactFlow best practice)
    - fabric-scoped custom events (fc-topology:action-a / fc-topology:action-b)
    - module-level PNG capture cache per fabric
key_files:
  created:
    - src/features/topology/fc/FCTopologyCanvas.tsx
    - src/features/topology/fc/FCTopologyLegend.tsx
    - src/features/topology/fc/FCTopologyTab.tsx
    - src/features/topology/fc/FCTopologyTab.test.tsx
  modified:
    - src/features/topology/index.ts
    - src/App.tsx
decisions:
  - "FCTopologyTab reads bom from fcResultStore in parent, passes as prop to FCTopologyCanvas — avoids store coupling inside canvas"
  - "Custom event namespaces fc-topology:action-a/b prevent cross-interference with Ethernet topology:action events"
  - "getLastFCTopologyPng(fabric) per-fabric module-level cache enables Phase 14 PDF export for both fabrics independently"
metrics:
  duration_seconds: 203
  completed_date: "2026-03-18"
  tasks_completed: 2
  tasks_total: 3
  files_created: 4
  files_modified: 2
requirements:
  - FC-12
---

# Phase 13 Plan 02: FCTopologyTab Dual-Fabric UI Summary

**One-liner:** FCTopologyTab with dual ReactFlowProvider-wrapped canvases (Fabric A blue, Fabric B orange) wired into App.tsx mode gate with independent zoom/pan and PNG capture per fabric.

## What Was Built

FCTopologyTab displays two FC fabric topology diagrams side by side in the Topology tab when the app is in FC mode. Each fabric has an independent ReactFlowProvider context, ensuring zoom and pan on one canvas does not affect the other.

### Files Created

**src/features/topology/fc/FCTopologyCanvas.tsx**
- Props: `{ fabric: 'A' | 'B', bom: FCNetworkBOM }` — bom read in parent, passed as prop
- Module-level `fcNodeTypes` constant (critical: never inside component function)
- Inline `FCSwitchNode` placeholder renders model name and port utilization
- Custom events scoped to `fc-topology:action-a` / `fc-topology:action-b` (not `topology:action`)
- Module-level `lastCapturePngMap` keyed by fabric — `getLastFCTopologyPng(fabric)` export for Phase 14
- Applies fabric color constants (blue for A, orange for B)

**src/features/topology/fc/FCTopologyLegend.tsx**
- Props: `{ show: boolean }`
- Absolute-positioned Card overlay with Fabric A (blue), Fabric B (orange), ISL (dashed line) legend items

**src/features/topology/fc/FCTopologyTab.tsx**
- Reads `bom` from `useFCResultStore` with `useShallow`
- Renders empty state when `bom` is null
- Toolbar with Fit View and Reset Layout (dispatches to both fabric event channels simultaneously)
- Two-column layout: Fabric A (blue header) | Fabric B (orange header)
- Each column wraps `FCTopologyCanvas` in its own `ReactFlowProvider`
- Legend toggle button in toolbar

**src/features/topology/fc/FCTopologyTab.test.tsx**
- 2 smoke tests — both pass GREEN
- "renders without crash when bom is available" — two react-flow canvases present
- "shows empty state when bom is null" — topology.emptyHeading visible

### Files Modified

**src/features/topology/index.ts** — Added exports: `FCTopologyTab`, `getLastFCTopologyPng`

**src/App.tsx** — Topology TabsContent mode-gated: `{mode === 'fc' ? <FCTopologyTab /> : <TopologyTab />}`

## Verification Results

| Check | Result |
|-------|--------|
| FCTopologyTab.test.tsx (2 tests) | PASS |
| Full vitest suite (375 tests) | PASS |
| npx tsc --noEmit | PASS (0 errors) |
| Ethernet TopologyTab non-regression | PASS |
| FCTopologyTab in App.tsx mode gate | Verified |
| Exactly 2 ReactFlowProvider in FCTopologyTab | Verified (lines 62, 74) |
| No bare 'topology:action' in fc/ directory | Verified |
| getLastFCTopologyPng exported from index.ts | Verified |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript errors in test mock BOM shape**
- **Found during:** Task 2 TypeScript check
- **Issue:** `makeMockBOM()` used `totalServers` (Ethernet field) instead of `racks: [{ serverCount }]` (FC input shape); mock selector included `violations` field not present in store state type
- **Fix:** Corrected mock BOM to match `FCNetworkBOMSchema` exactly; simplified store mock to `{ bom: FCNetworkBOM | null }`
- **Files modified:** `src/features/topology/fc/FCTopologyTab.test.tsx`
- **Commit:** da06285

## Checkpoint Reached

Task 3 is a `checkpoint:human-verify` gate. The implementation is complete and all automated checks pass. Human visual verification is required before marking this plan complete.

## Self-Check

- [x] `src/features/topology/fc/FCTopologyCanvas.tsx` — exists
- [x] `src/features/topology/fc/FCTopologyLegend.tsx` — exists
- [x] `src/features/topology/fc/FCTopologyTab.tsx` — exists
- [x] `src/features/topology/fc/FCTopologyTab.test.tsx` — exists
- [x] Commit `731788a` — Task 1 scaffold
- [x] Commit `da06285` — Task 2 implementation

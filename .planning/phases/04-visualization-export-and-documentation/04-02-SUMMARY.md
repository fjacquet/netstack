---
phase: 04-visualization-export-and-documentation
plan: 02
subsystem: ui
tags: [xyflow, reactflow, topology, custom-nodes, dark-mode, saturation, html-to-image, shadcn, i18n, typescript, vitest]

requires:
  - phase: 04-visualization-export-and-documentation
    plan: 01
    provides: "SwitchNodeData, RackNodeData, TopologyGraphResult types; getSaturationBorderClass helper; @xyflow/react installed"

provides:
  - "buildTopologyGraph pure function: NetworkBOM -> { nodes, edges } with deterministic 3-tier layout"
  - "12 unit tests covering node count, edge count, determinism, y positions, node IDs"
  - "SwitchNode custom ReactFlow node with role icon, saturation border, role background fill"
  - "RackNode custom ReactFlow node with rack index and server count"
  - "captureTopologyPng utility for PDF export (html-to-image + getNodesBounds/getViewportForBounds)"
  - "TopologyCanvas with nodeTypes at module level, useShallow, colorMode, event-driven toolbar bridge"
  - "TopologyToolbar with Fit View, Reset Layout, Legend toggle (shadcn outline buttons)"
  - "TopologyLegend toggleable overlay with role colors and saturation border legend"
  - "TopologyTab wrapping ReactFlowProvider with empty state when no BOM"
  - "topology/index.ts exports TopologyTab and getLastTopologyPng"
  - "App.tsx topology tab now renders TopologyTab (no more PlaceholderTab)"

affects:
  - 04-04-csv-export
  - 04-05-pdf-export

tech-stack:
  added: []
  patterns:
    - "nodeTypes constant at module level (never inside component) — prevents infinite ReactFlow re-renders"
    - "Custom DOM event bridge ('topology:action') for toolbar → canvas communication across ReactFlowProvider boundary"
    - "Module-level PNG cache (lastCapturePng) updated 500ms after node render — PDF export reads it without requiring Topology tab to be active"
    - "TypeScript cast (as Node<SwitchNodeData | RackNodeData>) for NodeMouseHandler generic mismatch"

key-files:
  created:
    - src/features/topology/utils/buildTopologyGraph.ts
    - src/features/topology/utils/buildTopologyGraph.test.ts
    - src/features/topology/utils/captureTopologyPng.ts
    - src/features/topology/nodes/SwitchNode.tsx
    - src/features/topology/nodes/RackNode.tsx
    - src/features/topology/TopologyCanvas.tsx
    - src/features/topology/TopologyToolbar.tsx
    - src/features/topology/TopologyLegend.tsx
    - src/features/topology/TopologyTab.tsx
  modified:
    - src/features/topology/index.ts
    - src/App.tsx

key-decisions:
  - "Custom DOM event ('topology:action') used for toolbar → canvas communication — avoids prop-drilling through ReactFlowProvider"
  - "Module-level PNG cache with 500ms delay — captures after nodes render, accessible for PDF export even when Topology tab hidden"
  - "nodeTypes at module level per RESEARCH.md anti-pattern warning — prevents infinite re-renders"
  - "TypeScript cast for NodeMouseHandler generic — @xyflow/react NodeMouseHandler uses Record<string,unknown> while local state is typed"

patterns-established:
  - "ReactFlow integration: base.css only, nodeTypes outside component, colorMode from ThemeProvider, ReactFlowProvider in tab wrapper"
  - "Event bridge pattern: sibling components communicate via window CustomEvent when ReactFlowProvider creates context boundary"

requirements-completed: [VIZ-01, VIZ-03]

duration: 30min
completed: 2026-03-17
---

# Phase 4 Plan 02: Topology Diagram Summary

**Interactive Leaf-Spine topology diagram with deterministic 3-tier layout, custom typed nodes with saturation border coloring, VLT dashed edges, toolbar controls, toggleable legend, node click popovers, and PNG capture for PDF export**

## Performance

- **Duration:** 30 min
- **Started:** 2026-03-17T07:00:14Z
- **Completed:** 2026-03-17T07:27:41Z
- **Tasks:** 2 (Task 1 TDD + Task 2 implementation)
- **Files modified:** 11

## Accomplishments

- `buildTopologyGraph` pure function with deterministic 3-tier layout (spine y=80, leaf y=240, oob y=300, rack y=420), 12 unit tests
- Custom ReactFlow nodes: `SwitchNode` (role icon + saturation border + role background fill) and `RackNode` (server count)
- `captureTopologyPng` utility using html-to-image + getNodesBounds/getViewportForBounds for PDF export integration
- Full topology tab: `TopologyTab` (ReactFlowProvider wrapper), `TopologyCanvas` (nodeTypes at module level, dark mode, event bridge), `TopologyToolbar` (Fit View/Reset/Legend), `TopologyLegend` (toggleable overlay)
- App.tsx topology tab replaced PlaceholderTab with TopologyTab; module-level PNG cache feeds Plan 04 PDF export

## Task Commits

Each task was committed atomically:

1. **Task 1: Build topology graph utility and custom node components** - `58ffcab` (feat)
2. **Task 2: Build TopologyCanvas, Toolbar, Legend, and wire into App.tsx** - `92ca2c5` (feat)

## Files Created/Modified

- `src/features/topology/utils/buildTopologyGraph.ts` — Pure function NetworkBOM -> { nodes, edges }, deterministic 3-tier layout
- `src/features/topology/utils/buildTopologyGraph.test.ts` — 12 TDD tests covering node count, edge count, determinism, y positions, IDs
- `src/features/topology/utils/captureTopologyPng.ts` — html-to-image toPng capture utility for PDF export
- `src/features/topology/nodes/SwitchNode.tsx` — Custom ReactFlow node: role icon (Network/Share2/Monitor), saturation border, role fill
- `src/features/topology/nodes/RackNode.tsx` — Custom ReactFlow node: server count, target handle only
- `src/features/topology/TopologyCanvas.tsx` — ReactFlow instance: nodeTypes at module level, useShallow, colorMode, event bridge, PNG cache
- `src/features/topology/TopologyToolbar.tsx` — Fit View / Reset Layout / Legend toggle (shadcn outline buttons)
- `src/features/topology/TopologyLegend.tsx` — Toggleable overlay: role colors, saturation border legend, VLT dashed line sample
- `src/features/topology/TopologyTab.tsx` — ReactFlowProvider wrapper, empty state when no BOM
- `src/features/topology/index.ts` — Barrel exports: TopologyTab, getLastTopologyPng
- `src/App.tsx` — Replaced PlaceholderTab with TopologyTab in topology TabsContent

## Decisions Made

- Custom DOM event `'topology:action'` used for toolbar → canvas communication — avoids prop-drilling through ReactFlowProvider context boundary (toolbar and canvas are siblings, not parent-child)
- Module-level PNG cache with 500ms delay: captures the topology PNG after nodes render; accessible for PDF export (Plan 04) even when user is on a different tab
- `nodeTypes` defined at module scope per RESEARCH.md anti-pattern warning — React Flow uses reference equality; object inside component = new reference each render = infinite layout recalculations
- TypeScript cast `as Node<SwitchNodeData | RackNodeData>` in NodeMouseHandler — @xyflow/react's generic `NodeMouseHandler` uses `Record<string, unknown>` for node data; local useState is typed more specifically

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- TypeScript error in `handleNodeClick`: `NodeMouseHandler` generic uses `Record<string, unknown>` for node data, incompatible with typed `Node<SwitchNodeData | RackNodeData>`. Fixed with explicit cast — this is a known @xyflow/react typing limitation.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 03 (rack elevation) can now proceed — `useResultStore` pattern established
- Plan 04 (CSV export) can use `getLastTopologyPng()` from `@/features/topology` for PDF embed
- Plan 05 (PDF export) has the PNG capture utility ready via `captureTopologyPng` and the module-level cache

---
*Phase: 04-visualization-export-and-documentation*
*Completed: 2026-03-17*

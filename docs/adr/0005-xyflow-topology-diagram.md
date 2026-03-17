# ADR-0005: @xyflow/react for Interactive Topology Diagrams

## Status
Accepted

## Date
2026-03-17

## Context
NetStack needs an interactive topology diagram showing the 3-tier leaf-spine layout: spines (top row), leaf pairs (middle row, one pair per rack), and rack nodes (bottom row). Requirements include:

- Deterministic layout (same BOM must produce the same diagram every time)
- Custom node types (leaf, spine, OOB, rack) with role-based colors and port-saturation border glow
- Pan and zoom with a Fit View button and a Reset Layout button
- Click-to-inspect: clicking any node opens a port utilization detail panel
- VLT interconnect edges between leaf pairs in the same rack

Two candidate libraries were evaluated:

| Library | Status | Notes |
|---------|--------|-------|
| `reactflow` | Deprecated | Archived in favor of @xyflow/react; no new releases |
| `@xyflow/react` | Active | Drop-in replacement with same API, maintained by original authors |

## Decision
Use **@xyflow/react** (not the deprecated `reactflow` package) for all topology diagram work.

Node positions are computed deterministically in a pure TypeScript function (`buildTopologyGraph`) using fixed column/row spacing constants. The React component receives pre-computed `nodes` and `edges` arrays — no drag-to-rearrange (positions are recomputed on every BOM change).

Custom node types are registered via the `nodeTypes` prop:
- `leafNode` — blue fill, VLT link stub
- `spineNode` — purple fill
- `oobNode` — gray fill
- `rackNode` — gray outline

Saturation is communicated via CSS border class: `border-green-500` (healthy, < 80%), `border-amber-500` (warning, >= 80%), `border-red-500` (saturated, >= 100%).

## Consequences
- Topology library is locked to @xyflow/react v12+; migrating would require rewriting all custom node types
- Deterministic layout means users cannot freely rearrange nodes (by design — topology is derived from BOM)
- @xyflow/react ships its own CSS (`@xyflow/react/dist/style.css`) which must be imported in the feature entry point
- VLT link count (2 cables per leaf pair) is modeled as a dedicated `vlt` edge type in the graph

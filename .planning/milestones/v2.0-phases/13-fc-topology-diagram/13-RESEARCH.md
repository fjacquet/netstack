# Phase 13: FC Topology Diagram - Research

**Researched:** 2026-03-18
**Domain:** @xyflow/react dual-instance topology rendering, FC BOM visualization
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FC-12 | FC topology diagram with dual-fabric layout (Fabric A \| Fabric B) | buildFCTopologyGraph output maps directly to two isolated ReactFlow canvas instances; ReactFlowProvider isolation confirmed in codebase and @xyflow/react 12.x docs |
</phase_requirements>

---

## Summary

Phase 13 is a near-direct structural analog of the existing Ethernet topology feature (TopologyTab / TopologyCanvas / buildTopologyGraph). The same @xyflow/react 12.10.1 stack already used in the Ethernet diagram handles FC dual-fabric by wrapping two `<ReactFlow>` instances in independent `<ReactFlowProvider>` wrappers — this pattern is already proven in the codebase: `TopologyTab` wraps a single canvas in one provider today.

The FC BOM schema already exposes the two fields that drive the diagram: `fabricASwitches` (and `fabricBSwitches`, always equal) and `islCables`. The graph builder for FC is far simpler than the Ethernet version: there are no rack nodes, no OOB nodes, no spine/leaf tiers — only FC switches connected in a ring by ISL links within each fabric. The architectural decision from STATE.md is explicit: cross-fabric edges are architecturally impossible in `buildFCTopologyGraph` output because Fabric A and Fabric B are computed as independent subgraphs.

The integration point in `App.tsx` is already mode-gated (`mode === 'ethernet'` controls `rackElevation`). The existing `topology` tab renders `<TopologyTab>` unconditionally today — it needs to become mode-aware: render `<FCTopologyTab>` in FC mode and the existing `<TopologyTab>` (renamed or left as-is) in Ethernet mode. The `FCSizingPage` does not need modification; the tab switch is wired entirely in `App.tsx`.

**Primary recommendation:** Build `FCTopologyTab` as a sibling component to `TopologyTab`, following its exact directory structure under `src/features/topology/fc/`. Keep shared node types (`SwitchNode`, `RackNode`) reused as-is. Build `buildFCTopologyGraph.ts` as a pure function parallel to `buildTopologyGraph.ts`, unit-tested the same way.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.1 | ReactFlow canvas, nodes, edges, provider | Already installed; Ethernet diagram runs on it |
| react | 19.2.4 | Component rendering | Project standard |
| zustand | 5.0.12 | FC result store subscription | `useFCResultStore` already exists |
| react-i18next | (already installed) | i18n keys for FC topology labels | All other features use it |

### No New Dependencies Required
Zero new npm packages needed. This is a confirmed project constraint ("Zero new npm dependencies" from ROADMAP.md v2.0 milestone goal). All required tools are already installed.

**Installation:** None required.

---

## Architecture Patterns

### Recommended File Structure

```
src/features/topology/
├── fc/
│   ├── FCTopologyTab.tsx           # FC equivalent of TopologyTab — two providers
│   ├── FCTopologyCanvas.tsx        # FC equivalent of TopologyCanvas — consumes fcBom
│   ├── FCTopologyLegend.tsx        # FC legend (Fabric A blue / Fabric B orange / ISL)
│   └── utils/
│       ├── buildFCTopologyGraph.ts      # Pure fn: FCNetworkBOM → {fabricA, fabricB}
│       └── buildFCTopologyGraph.test.ts # Vitest unit tests (domain layer, node env)
├── index.ts                        # (already exists — add FCTopologyTab export)
├── TopologyTab.tsx                 # Unchanged
├── TopologyCanvas.tsx              # Unchanged
├── TopologyLegend.tsx              # Unchanged
├── TopologyToolbar.tsx             # Unchanged (reuse for FC toolbar)
├── nodes/
│   ├── SwitchNode.tsx              # Reused unchanged — role prop drives colors
│   └── RackNode.tsx                # Reused unchanged
└── types.ts                        # Extended with FCSwitchNodeData if needed
```

### Pattern 1: Dual ReactFlowProvider Instance

Each fabric gets its own `<ReactFlowProvider>` so internal hooks (`useReactFlow`) don't leak state across canvases.

```tsx
// Source: existing TopologyTab.tsx pattern + @xyflow/react docs
// FCTopologyTab.tsx
export function FCTopologyTab() {
  const bom = useFCResultStore(useShallow((s) => s.bom))

  if (!bom) {
    return <EmptyState />
  }

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-2 p-2">
      <div className="flex flex-1 gap-2 min-h-0">
        {/* Fabric A — blue */}
        <div className="flex-1 min-w-0 flex flex-col">
          <FabricLabel label="Fabric A" color="blue" />
          <ReactFlowProvider>
            <FCTopologyCanvas fabric="A" bom={bom} />
          </ReactFlowProvider>
        </div>
        {/* Fabric B — orange */}
        <div className="flex-1 min-w-0 flex flex-col">
          <FabricLabel label="Fabric B" color="orange" />
          <ReactFlowProvider>
            <FCTopologyCanvas fabric="B" bom={bom} />
          </ReactFlowProvider>
        </div>
      </div>
    </div>
  )
}
```

**Why two providers:** `useReactFlow()` reads from the nearest ancestor `ReactFlowProvider` context. Without separate providers, both canvases share one instance — `fitView` in Fabric A would affect Fabric B. Independent providers guarantee complete isolation.

### Pattern 2: buildFCTopologyGraph — Pure Function Structure

FC topology is structurally simpler than Ethernet: no racks, no OOB, no spine/leaf. Each fabric has N identical FC switches connected in a ring by ISL links.

```typescript
// Source: structural analog of buildTopologyGraph.ts
// buildFCTopologyGraph.ts

export type FCTopologySubgraph = {
  nodes: Node<FCSwitchNodeData>[]
  edges: Edge[]
}

export type FCTopologyGraphResult = {
  fabricA: FCTopologySubgraph
  fabricB: FCTopologySubgraph
}

export function buildFCTopologyGraph(bom: FCNetworkBOM): FCTopologyGraphResult {
  const fabricA = buildFabricSubgraph('A', bom.fabricASwitches, bom.islCables, bom.input)
  const fabricB = buildFabricSubgraph('B', bom.fabricBSwitches, bom.islCables, bom.input)
  return { fabricA, fabricB }
}

function buildFabricSubgraph(
  fabric: 'A' | 'B',
  switchCount: number,
  islCables: number,
  input: FCSizingInput,
): FCTopologySubgraph {
  // Arrange switches in a horizontal row or arc
  // Connect adjacent switches with ISL edges
  // Node ID prefix: `fc-a-0`, `fc-b-0`, etc.
  // Edge ID prefix: `isl-a-0-1`, `isl-b-0-1`, etc.
}
```

**Key insight:** Because Fabric A and Fabric B subgraphs are built independently by separate `buildFabricSubgraph` calls, cross-fabric edges are architecturally impossible — the function literally cannot produce them.

### Pattern 3: App.tsx Mode Gate for Topology Tab

The existing topology tab content must route on mode. The tab trigger stays visible regardless of mode (topology is available in both modes).

```tsx
// App.tsx — topology content becomes mode-aware
<TabsContent value="topology" className="mt-0">
  {mode === 'fc' ? <FCTopologyTab /> : <TopologyTab />}
</TabsContent>
```

The tab trigger itself does NOT need to be conditionally rendered — topology is always relevant. Only the content component switches.

### Pattern 4: FCSwitchNodeData Type

FC switch nodes carry different data than Ethernet switch nodes. Extend `types.ts` rather than modifying `SwitchNodeData`.

```typescript
// types.ts — addition only
export type FCSwitchNodeData = {
  model: string                    // e.g., 'G720'
  fabric: 'A' | 'B'               // drives color scheme
  usedPorts: number                // host + storage + ISL ports
  totalPorts: number               // effective ports after POD licensing
  islPorts: number                 // ISL port count for this switch
}
```

### Pattern 5: Fabric Color Scheme

Fabric A = blue (hsl 213), Fabric B = orange (hsl 32). These are deliberate divergences from the Ethernet color scheme:

```typescript
// Color tokens — defined at module level in FCTopologyCanvas or a shared constant
const FABRIC_COLORS = {
  A: {
    nodeBg: 'bg-[hsl(213_94%_92%)] dark:bg-[hsl(213_94%_20%)]',
    edge: 'hsl(213, 94%, 55%)',
    label: 'Fabric A',
  },
  B: {
    nodeBg: 'bg-[hsl(32_95%_92%)] dark:bg-[hsl(32_95%_28%)]',
    edge: 'hsl(32, 95%, 55%)',
    label: 'Fabric B',
  },
} as const
```

ISL edges: dashed orange/blue stroke matching fabric color, `strokeWidth: 2`, `strokeDasharray: '6 3'`.

### Anti-Patterns to Avoid

- **Shared ReactFlowProvider for both fabrics:** `useReactFlow()` would resolve to one shared context — fitView/zoom of one canvas pollutes the other. Use two independent providers.
- **Defining nodeTypes inside component:** Causes React Flow to re-register on every render, producing infinite layout recalculation and flickering. Define at module level (confirmed in existing `TopologyCanvas.tsx` comment: "CRITICAL: nodeTypes must be defined at MODULE LEVEL").
- **Reading fcBom from inside FCTopologyCanvas:** Pass bom as a prop from FCTopologyTab. The parent already reads from `useFCResultStore` — keeping the data read at the top avoids dual-subscription and simplifies testing.
- **Reusing `topology:action` custom event for FC canvas control:** The existing event is broadcast to `window` and caught by the Ethernet `TopologyCanvas`. Use distinct event names: `fc-topology:action-a` and `fc-topology:action-b` to prevent cross-mode event leakage.
- **Cross-fabric edge creation in buildFCTopologyGraph:** Node IDs must be namespaced by fabric (`fc-a-0` vs `fc-b-0`). If IDs ever collide across fabrics, ReactFlow will merge them in a single canvas.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas rendering and zoom/pan | Custom SVG canvas | `<ReactFlow>` from @xyflow/react | Edge routing, zoom, minimap all handled |
| Provider isolation | Manual context sharing | `<ReactFlowProvider>` per canvas | Hooks (useReactFlow, useNodes) need scoped provider |
| Node click popover | Custom floating UI | Radix `<Popover>` (already imported in TopologyCanvas) | Accessible, already used in Ethernet canvas |
| Saturation border color logic | Duplicate logic | Import `getSaturationBorderClass` from `../utils/saturation` | Already extracted as reusable utility |

**Key insight:** The only genuinely new code required is `buildFCTopologyGraph.ts` (pure domain function) and the thin React wrappers. Every UI primitive is already available.

---

## Common Pitfalls

### Pitfall 1: Custom Event Namespace Collision
**What goes wrong:** `FCTopologyCanvas` emits `topology:action` (same as Ethernet canvas). Both `TopologyCanvas` and `FCTopologyCanvas` attach `window.addEventListener('topology:action', ...)`. When FC canvas triggers `fitView`, the Ethernet canvas handler also fires — no visible effect when tabs are hidden, but creates stale handler leaks.
**Why it happens:** Both components copy the existing pattern verbatim without namespacing.
**How to avoid:** Use `fc-topology:action` or `fc-topology:action-a` / `fc-topology:action-b` for FC canvases.
**Warning signs:** Reset/fit does not work reliably when switching back from FC to Ethernet tab.

### Pitfall 2: nodeTypes Object Re-created on Each Render
**What goes wrong:** `const nodeTypes = { switchNode: SwitchNode }` defined inside the component function body. ReactFlow sees a new reference on every render, resets node positions, and causes infinite layout oscillation.
**Why it happens:** Developer copies JSX structure but doesn't notice the module-level comment in `TopologyCanvas.tsx`.
**How to avoid:** Define `nodeTypes` at module level, outside all component functions.
**Warning signs:** Node positions flicker or reset on every BOM update.

### Pitfall 3: useFCResultStore Inside a Non-Provider Component
**What goes wrong:** Calling `useFCResultStore` inside `FCTopologyCanvas` directly instead of reading bom from prop. Works functionally but creates a double-subscription and complicates testing (test must stub the store).
**Why it happens:** Following the Ethernet pattern where `TopologyCanvas` reads directly from `useResultStore`.
**How to avoid:** Read `bom` once in `FCTopologyTab` and pass down as prop to `FCTopologyCanvas`. This mirrors the recommended approach and makes the canvas a pure-display component.

### Pitfall 4: ISL Edge Count Mismatch
**What goes wrong:** `bom.islCables` is the total ISL cable count across both fabrics combined. The edge count per-fabric diagram should use `Math.floor(bom.islCables / 2)` or the per-fabric ISL count from `bom.islPortsPerFabric`.
**Why it happens:** `FCNetworkBOM.islCables` is total (both fabrics), while `islPortsPerFabric` is per-fabric.
**How to avoid:** Use `bom.islPortsPerFabric` to determine ISL links shown per-fabric canvas, not `bom.islCables / 2`. This is the authoritative per-fabric figure.
**Warning signs:** ISL link count in diagram is double the BOM panel value.

### Pitfall 5: Empty State When BOM is Zero-Value
**What goes wrong:** `calculateFCBOM` with default inputs returns `fabricASwitches = 1`, `islCables = 0`. The canvas renders a single switch node with no edges — this is valid and should not show the "empty state" screen.
**Why it happens:** Guard condition checks `if (!bom)` which would short-circuit, but some developers add `if (!bom || bom.fabricASwitches === 0)`.
**How to avoid:** Only show empty state when `bom` is `null`. A BOM with 1 switch and 0 ISL cables is a valid topology (single-switch fabric).

---

## Code Examples

Verified patterns from existing codebase:

### Correct: Two Independent ReactFlowProvider Instances
```tsx
// Source: TopologyTab.tsx pattern — replicated twice for FC
<div className="flex flex-1 gap-2 min-h-0">
  <div className="flex-1 min-w-0">
    <ReactFlowProvider>
      <FCTopologyCanvas fabric="A" bom={bom} fabricColor={FABRIC_COLORS.A} />
    </ReactFlowProvider>
  </div>
  <div className="flex-1 min-w-0">
    <ReactFlowProvider>
      <FCTopologyCanvas fabric="B" bom={bom} fabricColor={FABRIC_COLORS.B} />
    </ReactFlowProvider>
  </div>
</div>
```

### Correct: Module-Level nodeTypes
```typescript
// Source: TopologyCanvas.tsx line 31-34 — identical pattern required for FC canvas
// CRITICAL: defined at MODULE LEVEL — never inside the component function
const fcNodeTypes = {
  fcSwitchNode: FCSwitchNode,
}
```

### Correct: Store Read at Tab Level, Prop Drilling to Canvas
```tsx
// FCTopologyTab.tsx
const bom = useFCResultStore(useShallow((s) => s.bom))
// ...
<FCTopologyCanvas fabric="A" bom={bom} />  // bom passed as prop, not read inside canvas
```

### Correct: App.tsx Mode Gate for topology tab content
```tsx
// Source: App.tsx pattern — mode gate already used for rackElevation
<TabsContent value="topology" className="mt-0">
  {mode === 'fc' ? <FCTopologyTab /> : <TopologyTab />}
</TabsContent>
```

### Correct: buildFCTopologyGraph Test Shape
```typescript
// Source: buildTopologyGraph.test.ts — identical test structure
const mockFCBOM: FCNetworkBOM = {
  fabricASwitches: 2,
  fabricBSwitches: 2,
  islPortsPerFabric: 2,
  islCables: 4,
  // ...other required fields
  input: { /* FCSizingInput */ },
}

describe('buildFCTopologyGraph', () => {
  it('returns fabricA and fabricB subgraphs', () => {
    const { fabricA, fabricB } = buildFCTopologyGraph(mockFCBOM)
    expect(fabricA.nodes).toHaveLength(mockFCBOM.fabricASwitches)
    expect(fabricB.nodes).toHaveLength(mockFCBOM.fabricBSwitches)
  })

  it('produces no cross-fabric edges', () => {
    const { fabricA, fabricB } = buildFCTopologyGraph(mockFCBOM)
    const fabricANodeIds = new Set(fabricA.nodes.map(n => n.id))
    const fabricBNodeIds = new Set(fabricB.nodes.map(n => n.id))
    // No Fabric B node ID appears in a Fabric A edge and vice versa
    fabricA.edges.forEach(e => {
      expect(fabricANodeIds.has(e.source)).toBe(true)
      expect(fabricANodeIds.has(e.target)).toBe(true)
    })
    fabricB.edges.forEach(e => {
      expect(fabricBNodeIds.has(e.source)).toBe(true)
      expect(fabricBNodeIds.has(e.target)).toBe(true)
    })
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reactflow` (deprecated package) | `@xyflow/react` (v12) | 2024 — package rename | Import path is `@xyflow/react`, NOT `reactflow`; CLAUDE.md explicitly documents this |
| Single ReactFlow instance per page | Multiple independent instances with isolated ReactFlowProvider | Since reactflow v11 | Multiple canvases on one page are fully supported |

**Deprecated/outdated:**
- `reactflow` package: use `@xyflow/react` — project CLAUDE.md documents this explicitly; the deprecated package must never be imported.

---

## Open Questions

1. **Toolbar for FC topology (fit/reset per fabric)**
   - What we know: Ethernet TopologyToolbar dispatches custom events to window; two FC canvases would need distinct event names
   - What's unclear: Whether one shared toolbar (fit both canvases together) or two per-fabric toolbars is the better UX
   - Recommendation: Start with one shared toolbar that fits both canvases simultaneously (simpler); the planner can decide

2. **PDF capture for FC topology**
   - What we know: `captureTopologyPng` uses `rfInstance.toObject()` from `useReactFlow()` — works inside a ReactFlowProvider
   - What's unclear: Phase 14 (FC Export) will need PNG captures of Fabric A and Fabric B separately
   - Recommendation: Expose `getLastFCTopologyPng(fabric: 'A' | 'B'): string | null` module-level functions in `FCTopologyCanvas.tsx`, mirroring `getLastTopologyPng()` in `TopologyCanvas.tsx` — planner should include this as a task so Phase 14 has capture hooks

3. **Switch layout for single-switch fabrics**
   - What we know: Default FC input (small server count) may produce `fabricASwitches = 1` — a single switch with `islPortsPerFabric = 0` ISLs
   - What's unclear: ISL ring topology with only 1 node has no edges — this is valid
   - Recommendation: Handle gracefully; single switch renders as a standalone node, no ISL edges, no error

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vite.config.ts (vitest config inline) |
| Quick run command | `npx vitest run src/features/topology/fc/utils/buildFCTopologyGraph.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FC-12 | `buildFCTopologyGraph` returns isolated fabricA and fabricB subgraphs | unit | `npx vitest run src/features/topology/fc/utils/buildFCTopologyGraph.test.ts` | Wave 0 |
| FC-12 | No cross-fabric edges in either subgraph | unit | (same file, separate test case) | Wave 0 |
| FC-12 | fabricA.nodes.length === bom.fabricASwitches | unit | (same file) | Wave 0 |
| FC-12 | fabricB.nodes.length === bom.fabricBSwitches | unit | (same file) | Wave 0 |
| FC-12 | ISL edge count matches islPortsPerFabric (or 0 for single switch) | unit | (same file) | Wave 0 |
| FC-12 | Deterministic: two calls with same BOM produce identical node positions | unit | (same file) | Wave 0 |
| FC-12 | FCTopologyTab renders without crash (smoke) | render smoke | `npx vitest run src/features/topology/fc/FCTopologyTab.test.tsx` | Wave 0 |
| FC-12 | Ethernet TopologyTab still renders after FC tab added (non-regression) | render smoke | `npx vitest run src/features/topology/TopologyTab.test.tsx` | Wave 0 (or existing if present) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/features/topology/fc/utils/buildFCTopologyGraph.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/topology/fc/utils/buildFCTopologyGraph.test.ts` — covers FC-12 (pure function unit tests; no React, no jsdom)
- [ ] `src/features/topology/fc/FCTopologyTab.test.tsx` — smoke render test for FC-12 (React Testing Library + jsdom)
- [ ] `src/features/topology/fc/` directory does not exist yet — create in Wave 0

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `src/features/topology/TopologyTab.tsx`, `TopologyCanvas.tsx`, `utils/buildTopologyGraph.ts` — full implementation reviewed
- Existing codebase — `src/domain/schemas/fc-bom.ts` — `FCNetworkBOM` fields `fabricASwitches`, `fabricBSwitches`, `islPortsPerFabric`, `islCables` all confirmed present
- Existing codebase — `src/App.tsx` — mode gate pattern (`mode === 'ethernet'`) confirmed, topology tab content is a single component reference
- Existing codebase — `src/store/fcResultStore.ts` — `useFCResultStore` confirmed, exposes `bom: FCNetworkBOM | null`
- `package.json` — `@xyflow/react: ^12.10.1`, `react: ^19.2.4`, `vitest: ^4.1.0` confirmed installed

### Secondary (MEDIUM confidence)
- @xyflow/react 12.x documentation (via installed package) — Multiple `ReactFlowProvider` instances on one page confirmed supported pattern; each instance is fully isolated

### Tertiary (LOW confidence)
- None — all findings are backed by codebase inspection or installed package verification

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and in use; no new dependencies
- Architecture: HIGH — direct structural analog of existing Ethernet topology feature; integration points confirmed via App.tsx inspection
- Pitfalls: HIGH — nodeTypes module-level rule documented in existing code comment; event namespace collision is a straightforward naming issue; ISL count field confirmed via schema inspection
- Test patterns: HIGH — `buildTopologyGraph.test.ts` provides exact template; Vitest config confirmed

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable stack — @xyflow/react, React 19, Vitest 4 are not fast-moving)

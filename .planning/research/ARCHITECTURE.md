# Architecture Research

**Domain:** Client-side network sizing calculator (React SPA, no backend)
**Researched:** 2026-03-16
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  InputPanel  │  TopologyView│  RackView    │   BOMPanel         │
│  (forms)     │  (reactflow) │  (SVG)       │   (table + export) │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬─────────────┘
       │              │              │              │
       ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      State Layer (Zustand)                       │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │  inputStore   │  │   resultStore   │  │    uiStore       │   │
│  │  (form vals)  │  │   (BOM + topo)  │  │  (active tab,    │   │
│  │  + persist    │  │   (derived)     │  │   modal flags)   │   │
│  └───────────────┘  └─────────────────┘  └──────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ read inputs, write results
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Domain / Engine Layer                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐   │
│  │  sizingEngine   │  │  hardwareCatalog  │  │ zodSchemas    │   │
│  │  pure functions │  │  constants/types  │  │ (validation)  │   │
│  └─────────────────┘  └──────────────────┘  └───────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Export Service Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  csvExporter │  │  pdfExporter │  │    jsonExporter      │   │
│  │  (pure fn)   │  │  (react-pdf  │  │    (pure fn)         │   │
│  │              │  │   renderer)  │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `InputPanel` | Collects user inputs: server count, servers/rack, connectivity type, cable type | React Hook Form + Zod resolver, dispatches to `inputStore` |
| `TopologyView` | Renders Leaf-Spine logical diagram, node types per switch model | React Flow (XyFlow), reads from `resultStore` |
| `RackView` | Renders physical rack elevation with U-slot placement per rack | Pure SVG rendered from `resultStore.racks[]`, no external lib needed |
| `BOMPanel` | Displays BOM table: model, quantity, notes; exposes export buttons | HTML table, reads `resultStore.bom` |
| `sizingEngine` | Pure functions: `(SizingInput) => NetworkBOM` — all calculations live here | TypeScript pure functions with no imports from React or Zustand |
| `hardwareCatalog` | Source of truth for switch specs (ports, speeds, power draw) | Plain TypeScript `const` objects, imported by engine and UI |
| `zodSchemas` | Runtime validation for user inputs and hardware limits | Zod schemas that infer TypeScript types — types come FROM schemas |
| `inputStore` | Persists user inputs across sessions via Zustand `persist` middleware | Zustand slice + `persist(localStorage)` |
| `resultStore` | Derived state: BOM + topology graph data computed from `inputStore` | Zustand slice, recomputed when inputs change |
| `uiStore` | Ephemeral UI state: active view tab, export modal open | Zustand slice, NOT persisted |
| `csvExporter` | Serialises BOM to RFC 4180 CSV string, triggers download | Pure function, uses browser `Blob` + `URL.createObjectURL` |
| `pdfExporter` | Renders BOM report as PDF | `@react-pdf/renderer` (declarative JSX → PDF) |
| `jsonExporter` | Serialises full config (inputs + BOM) to JSON, triggers download | Pure function using `JSON.stringify` |

## Recommended Project Structure

```
src/
├── domain/                  # Zero React/Zustand deps — pure TypeScript
│   ├── catalog/
│   │   ├── hardware.ts      # Switch model definitions (S5248F, S5232F, S3248T)
│   │   └── types.ts         # SwitchModel, PortSpec, CableType interfaces
│   ├── engine/
│   │   ├── sizing.ts        # calculateBOM(input: SizingInput): NetworkBOM
│   │   ├── topology.ts      # buildTopologyGraph(bom: NetworkBOM): TopologyGraph
│   │   ├── racks.ts         # buildRackLayouts(bom: NetworkBOM): RackLayout[]
│   │   └── engine.test.ts   # Unit tests — engine is trivially testable
│   └── schemas/
│       ├── input.ts         # SizingInputSchema (Zod) + inferred SizingInput type
│       └── bom.ts           # NetworkBOMSchema (Zod) + inferred NetworkBOM type
│
├── store/                   # Zustand state — depends on domain, not on UI
│   ├── inputStore.ts        # Persisted: server count, rack config, cable type
│   ├── resultStore.ts       # Derived: BOM + topology + rack layouts
│   ├── uiStore.ts           # Ephemeral: active tab, modal visibility
│   └── index.ts             # Re-exports custom hooks (never raw stores)
│
├── features/                # UI feature modules — depend on store + domain
│   ├── input/
│   │   ├── InputPanel.tsx   # Form container
│   │   ├── ServerForm.tsx   # Server count + per-rack inputs
│   │   ├── ConnectivityForm.tsx  # Speed + cable type selectors
│   │   └── useInputForm.ts  # React Hook Form + zodResolver hook
│   ├── topology/
│   │   ├── TopologyView.tsx # React Flow canvas
│   │   ├── LeafNode.tsx     # Custom node: leaf switch
│   │   ├── SpineNode.tsx    # Custom node: spine switch
│   │   └── OobNode.tsx      # Custom node: OOB switch
│   ├── rack/
│   │   ├── RackView.tsx     # Container: renders N RackElevation components
│   │   ├── RackElevation.tsx # Single rack SVG with U-slot grid
│   │   └── DeviceSlot.tsx   # Single device in a rack (SVG rect + label)
│   ├── bom/
│   │   ├── BOMPanel.tsx     # BOM table + port saturation alerts
│   │   ├── BOMTable.tsx     # Rows per switch model
│   │   └── ExportButtons.tsx # CSV / PDF / JSON trigger buttons
│   └── export/
│       ├── csvExporter.ts   # Pure: NetworkBOM → CSV string
│       ├── pdfExporter.tsx  # @react-pdf/renderer document component
│       ├── jsonExporter.ts  # Pure: {inputs, bom} → JSON string
│       └── download.ts      # Utility: trigger browser file download
│
├── components/              # Shared, stateless UI primitives
│   ├── Card.tsx
│   ├── Badge.tsx
│   ├── Alert.tsx
│   └── Tabs.tsx
│
├── App.tsx                  # Layout: InputPanel + tab-switched views
├── main.tsx                 # Vite entry point
└── vite-env.d.ts
```

### Structure Rationale

- **`domain/`:** Completely framework-free. Can be extracted to a separate package or tested with plain `node`. The engine never imports from React, Zustand, or any UI concern. This is the most important boundary in the project.
- **`store/`:** Depends only on `domain/` types. Exports custom hooks (`useInputStore`, `useResultStore`) — never the raw Zustand store — so components don't couple to Zustand internals.
- **`features/`:** Each feature is self-contained: its own components, hooks, and local styles. Features import from `store/` and `domain/` but not from sibling features. This prevents tangled cross-feature dependencies.
- **`components/`:** Generic primitives with no business logic. Replaced by shadcn/ui or similar if a component library is adopted.

## Architectural Patterns

### Pattern 1: Pure Domain Engine

**What:** All sizing calculations live in `domain/engine/` as pure TypeScript functions with no side effects. The engine takes a `SizingInput` value and returns a `NetworkBOM` value. It never reads from the DOM, never touches Zustand, never calls `Date.now()`.

**When to use:** For all business logic — rack count, leaf count, spine count, OOB count, cable quantities. Anytime you can write `f(input) === expectedOutput` as a unit test.

**Trade-offs:** +Trivially testable, +portable, +deterministic. -Requires a thin adapter in the store to call the engine when inputs change.

**Example:**
```typescript
// domain/engine/sizing.ts
export function calculateBOM(input: SizingInput): NetworkBOM {
  const racks = Math.ceil(input.totalServers / input.serversPerRack);
  const leafSwitches = racks * 2;                      // dual ToR
  const spineSwitches = Math.ceil(leafSwitches / 4);   // 4:1 oversubscription
  const oobSwitches = Math.ceil(racks / 1);            // 1 per rack
  // ... cable calculations based on input.cableType
  return { racks, leafSwitches, spineSwitches, oobSwitches, cables };
}
```

### Pattern 2: Zustand Derived State

**What:** `resultStore` does not store raw user inputs — it stores the computed output. When `inputStore` changes, a subscription triggers `resultStore.recalculate()`, which calls the domain engine and updates BOM, topology graph data, and rack layouts.

**When to use:** When computed state depends on another slice of state. Avoids stale derived values and keeps the engine call centralised.

**Trade-offs:** +Single source of truth for derived values, +recalculation is automatic. -Slightly more setup than computing inline in components. -Must avoid circular store subscriptions.

**Example:**
```typescript
// store/resultStore.ts
import { create } from 'zustand';
import { useInputStore } from './inputStore';
import { calculateBOM } from '../domain/engine/sizing';

export const useResultStore = create<ResultState>((set) => ({
  bom: null,
  recalculate: (input: SizingInput) => {
    set({ bom: calculateBOM(input) });
  },
}));

// Subscription wired in App.tsx or a dedicated effect:
// useInputStore.subscribe(state => useResultStore.getState().recalculate(state))
```

### Pattern 3: Zod as the Type System Boundary

**What:** TypeScript types for domain inputs and outputs are inferred from Zod schemas (`z.infer<typeof SizingInputSchema>`), not defined independently. The schema validates runtime values (from forms, localStorage) and the inferred type is used everywhere at compile time.

**When to use:** At every boundary where data enters from outside TypeScript's control: form submission, localStorage rehydration, JSON import.

**Trade-offs:** +One definition for both runtime validation and compile-time types. +Catches schema drift. -Slightly verbose schema definitions. -Zod schemas are not zero-cost at runtime for very large objects (not a concern here).

**Example:**
```typescript
// domain/schemas/input.ts
import { z } from 'zod';
import { HARDWARE_CATALOG } from '../catalog/hardware';

export const SizingInputSchema = z.object({
  totalServers:   z.number().int().min(1).max(10_000),
  serversPerRack: z.number().int().min(1).max(48),
  connectivityType: z.enum(['25G', '100G']),
  cableType: z.enum(['DAC', 'AOC', 'fiber']),
});

export type SizingInput = z.infer<typeof SizingInputSchema>;
```

### Pattern 4: Feature-Sliced Import Direction

**What:** Strict one-way dependency rule enforced by ESLint (or convention):

```
features/ → store/ → domain/
features/ → components/
features/ do NOT import from other features/
```

**When to use:** Always. Even for this small app, the discipline prevents the spaghetti that makes calculator apps hard to extend.

**Trade-offs:** +Eliminates circular dependencies by construction. +Clear place for every new file. -Slightly more indirection for simple cases.

## Data Flow

### Sizing Calculation Flow

```
User edits form (InputPanel)
    ↓
React Hook Form + Zod validation
    ↓
inputStore.setInput(validatedInput)  [Zustand, persisted to localStorage]
    ↓
inputStore subscription fires
    ↓
resultStore.recalculate(input)
    ↓
domain/engine/sizing.calculateBOM(input)  [pure function]
    ↓
resultStore.bom updated  [Zustand]
    ↓
TopologyView, RackView, BOMPanel re-render  [React subscriptions]
```

### Export Flow

```
User clicks "Export CSV" (ExportButtons)
    ↓
Read resultStore.bom + inputStore.input
    ↓
csvExporter.toBOM(bom)  [pure function → string]
    ↓
download.triggerDownload(content, 'netstack-bom.csv')
    ↓  [uses Blob + URL.createObjectURL + anchor click]
Browser saves file
```

### Persistence Flow

```
App loads
    ↓
Zustand persist middleware reads localStorage['netstack-input']
    ↓
inputStore hydrated with previous values
    ↓
inputStore subscription fires → resultStore.recalculate()
    ↓
UI renders with restored state (no user action required)
```

### Key Data Flows

1. **Input → BOM:** User form values flow through Zod validation into `inputStore`, triggering domain engine recalculation and populating `resultStore`. All three visualisation panels read from `resultStore`.
2. **BOM → Diagram:** `topology.buildTopologyGraph(bom)` converts BOM quantities into React Flow node/edge arrays. No React Flow state is stored in Zustand — React Flow manages its own internal canvas state.
3. **BOM → Rack Layout:** `racks.buildRackLayouts(bom)` converts BOM into an array of rack objects, each containing an ordered list of devices with U-slot positions. `RackElevation` renders these as SVG rectangles.
4. **Config round-trip:** JSON export includes `{ inputs: SizingInput, bom: NetworkBOM }`. JSON import validates through `SizingInputSchema.parse()` before writing to `inputStore`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single engineer, v1 | Current flat slice structure is fine. All domain logic in `domain/engine/sizing.ts`. |
| Multiple models / topologies | Promote `sizingEngine` to a strategy pattern: `engines/leafSpine.ts`, `engines/spine3tier.ts` sharing a common interface. |
| Multi-site in future | Add a `sites[]` array to `SizingInput`. Engine becomes `calculateMultiSiteBOM`. Store and UI grow to support a list of configurations. |
| Offline / installable | Wrap the Vite app as a PWA with `vite-plugin-pwa`. No server needed — the domain is already fully client-side. |

### Scaling Priorities

1. **First bottleneck:** Hardware catalog hardcoded in constants. When new Dell models arrive, add a catalog entry — no engine changes required if hardware abstraction is done correctly from day one.
2. **Second bottleneck:** Topology rendering with many nodes (>100 leafs). React Flow handles this well up to ~500 nodes; above that, consider virtualized rendering or a static SVG export rather than interactive canvas.

## Anti-Patterns

### Anti-Pattern 1: Business Logic in Components

**What people do:** Put `Math.ceil(servers / serversPerRack)` inline in `BOMPanel.tsx` or inside a `useEffect`.

**Why it's wrong:** Logic becomes untestable without rendering a component. Duplicated when the same calculation appears in a different panel. Breaks when components re-render at different times.

**Do this instead:** All sizing logic lives in `domain/engine/sizing.ts`. Components read pre-computed values from `resultStore`. If you need the number, call the engine, not the component.

### Anti-Pattern 2: Storing Derived State Redundantly

**What people do:** Store both `inputs` and `bom` as independent top-level persisted state, updating BOM manually after each input change.

**Why it's wrong:** BOM can drift out of sync with inputs (stale state). Persistence of BOM is wasteful — it can always be recomputed from inputs.

**Do this instead:** Persist only `inputStore`. `resultStore` is derived (not persisted). On hydration, `inputStore` fires a subscription that recomputes `resultStore`.

### Anti-Pattern 3: Tight Coupling Between Features

**What people do:** `TopologyView.tsx` imports directly from `BOMPanel.tsx` to share a helper, or `rack/RackView.tsx` reads from `bom/BOMPanel`'s local state.

**Why it's wrong:** Creates brittle cross-feature dependencies that make refactoring risky and phase-by-phase development impossible.

**Do this instead:** Shared logic lives in `domain/` or `store/`. Features only read from stores and domain utilities, never from sibling feature modules.

### Anti-Pattern 4: Persisting All Zustand State

**What people do:** Wrap the entire combined Zustand store in `persist()`.

**Why it's wrong:** Persists ephemeral UI state (open modal, selected tab), causing surprising UI state on reload. Persists derived BOM data, causing stale state if the engine logic changes between versions.

**Do this instead:** Persist only `inputStore`. Use Zustand's `partialize` option or separate stores with selective `persist` wrapping. Include a `version` field in persisted state for migration.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| `localStorage` | Zustand `persist` middleware with `createJSONStorage(() => localStorage)` | Version the schema; include a `migrate` callback for future schema changes |
| Browser download API | `Blob` + `URL.createObjectURL` + programmatic `<a>` click in `download.ts` | No library needed; works in all modern browsers |
| `@react-pdf/renderer` | Render a `<PDFDocument>` React component to a Blob in a Web Worker if PDF is large | For a BOM report, synchronous rendering is sufficient; no worker needed |
| React Flow (XyFlow) | Consume `resultStore.topologyGraph` as React Flow `nodes[]` and `edges[]` props | React Flow manages its own viewport state; do not store pan/zoom in Zustand |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `InputPanel` → `inputStore` | Direct Zustand store write via custom hook | Form library (React Hook Form) manages local form state; only validated, final values reach the store |
| `inputStore` → `resultStore` | Zustand `subscribe` subscription | Wire in `App.tsx` or a dedicated `useEngineSync` hook on mount |
| `resultStore` → views | Zustand selector hooks in each feature | Each component subscribes only to the slice it needs to minimise re-renders |
| `features/export` → `resultStore` | Read-only access via hooks at export time | Exporters are pure functions; features pass data in, exporters return strings |
| `domain/engine` → `domain/catalog` | Direct TypeScript import | Catalog is plain constants; engine imports hardware specs for port count calculations |

## Build Order (Phase Implications)

The dependency graph dictates this recommended build sequence:

1. **Domain layer first** (`domain/catalog`, `domain/schemas`, `domain/engine`) — no React deps, immediately testable. All subsequent phases depend on this being correct.
2. **Store layer** (`inputStore`, `resultStore`, `uiStore`) — depends only on domain types. Enables wiring before any UI exists.
3. **Input feature** (`InputPanel`, form hooks) — first visible UI. Validates the store integration end-to-end.
4. **BOM feature** (`BOMPanel`, `BOMTable`) — verifies the full input→engine→store→UI pipeline before adding complex visualisations.
5. **Topology feature** (`TopologyView`, React Flow nodes) — builds on confirmed BOM data. React Flow setup is self-contained.
6. **Rack elevation feature** (`RackView`, `RackElevation`) — pure SVG, depends on `resultStore.racks`. Independent of topology view.
7. **Export feature** (`csvExporter`, `pdfExporter`, `jsonExporter`) — builds on the stable BOM data model. Can be added last.
8. **Persistence** (Zustand `persist` on `inputStore`, JSON import) — add last to avoid complicating earlier phases with schema migration concerns.

## Sources

- [React Architecture: Business Logic Separation](https://profy.dev/article/react-architecture-business-logic-and-dependency-injection) — MEDIUM confidence (verified with React official docs)
- [Zustand persist middleware](https://zustand.docs.pmnd.rs/reference/middlewares/persist) — HIGH confidence (official docs)
- [React Flow / XyFlow](https://reactflow.dev) — HIGH confidence (official docs)
- [Feature-Sliced Design](https://feature-sliced.design/) — MEDIUM confidence (methodology site, multiple community adoptions)
- [Zod TypeScript-first schema validation](https://zod.dev/) — HIGH confidence (official docs)
- [@react-pdf/renderer vs jsPDF comparison](https://npm-compare.com/@react-pdf/renderer,jspdf,pdfmake,react-pdf) — MEDIUM confidence (WebSearch verified against npm download counts)
- [Zustand Architecture Patterns at Scale](https://brainhub.eu/library/zustand-architecture-patterns-at-scale) — MEDIUM confidence (industry article)
- [NetBox SVG rack elevation rendering](https://github.com/netbox-community/netbox/issues/2248) — MEDIUM confidence (open-source reference implementation using HTML5 SVG)

---
*Architecture research for: NetStack — Dell Leaf-Spine network sizing calculator (React SPA)*
*Researched: 2026-03-16*

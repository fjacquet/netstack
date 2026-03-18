# Architecture Research

**Domain:** NetStack v2.0 — FC SAN sizing + switch positioning extension to existing Ethernet leaf-spine calculator
**Researched:** 2026-03-18
**Confidence:** HIGH

---

## Context: What This Document Covers

This is a **milestone-scoped** architecture document for v2.0. It describes only what changes or is new. The baseline architecture (Domain → Store → Features one-way layering, Zod schemas, Zustand stores, pure engine pattern) is established and documented in the v1.x research. The central question here is:

> How do FC SAN sizing and switch positioning integrate into the existing architecture, what is new vs modified, and in what order should they be built?

---

## Standard Architecture (unchanged baseline)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Features Layer (React)                   │
│  InputForm  │  BOMPanel  │  TopologyTab  │  RackElevationTab     │
└──────┬──────┴──────┬─────┴──────┬────────┴──────┬───────────────┘
       │             │            │               │
       ▼             ▼            ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Store Layer (Zustand)                          │
│  inputStore (persisted)   │   resultStore (derived, not persisted)│
└──────────────────────────┬──────────────────────────────────────┘
                           │ subscribe → calculateBOM(input)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Domain Layer (pure TypeScript)                  │
│  catalog/   │  schemas/   │  engine/                             │
└─────────────────────────────────────────────────────────────────┘
```

The one-way import rule is unchanged: Features → Store → Domain. Domain has zero React/Zustand imports.

---

## New Components for v2.0

### FC SAN Sizing (GH #1)

Four fully new additions at the domain layer. Nothing in the FC domain touches Ethernet domain internals.

**1. `src/domain/catalog/brocade.ts` — NEW**

FC switch catalog, parallel to `hardware.ts` (Dell Ethernet). Typed with a new `FCSwitchSpec` interface that captures FC-specific fields (`fcPorts`, `fcSpeedGbE`, `islPorts`, `islSpeedGbE`, `formFactor`, `maxPowerW`).

Catalog entries to include (confidence: MEDIUM — specs verified from official Broadcom product pages):

| Model | Gen | Ports | FC Speed | ISL | Form | Power |
|-------|-----|-------|----------|-----|------|-------|
| G620  | 6   | 48    | 32G SFP+ | Up to 16 ISL | 1U | ~200W |
| G630  | 6   | 128   | 32G SFP+ | Up to 32 ISL | 2U | ~350W |
| G720  | 7   | 64    | 64G SFP+ | Up to 16 ISL | 1U | 350W  |
| G730  | 7   | 128   | 64G SFP+ | Up to 32 ISL | 2U | ~600W |
| G820  | 8   | 56    | 128G SFP+| Up to 16 ISL | 1U | 650W  |

Note: G610 (24-port, Gen 6) can be added later. G830 (128-port Gen 8) was not yet publicly released as of research date — exclude from v2.0 catalog.

**2. `src/domain/schemas/fc-input.ts` — NEW**

Separate Zod schema for FC-specific inputs. Must NOT be merged into `SizingInputSchema` — FC and Ethernet are mutually exclusive modes with different field sets. A merged union would create a complex discriminated union at every consumer.

```typescript
export const FCSizingInputSchema = z.object({
  /** Per-rack server/host count, reuses RackConfigSchema */
  racks: z.array(RackConfigSchema).min(1).max(200),
  /** Number of FC HBA ports per server (typically 2 for dual-fabric) */
  hbaPortsPerServer: z.number().int().min(1).max(8).default(2),
  /** Number of storage target ports per storage array */
  storageTargetPorts: z.number().int().min(2).max(128).default(4),
  /** Number of storage arrays in deployment */
  storageArrayCount: z.number().int().min(1).max(32).default(1),
  /** FC switch model for Fabric A (and mirrored Fabric B) */
  fcSwitchModel: z.enum(['G620', 'G630', 'G720', 'G730', 'G820']),
  /** Number of ISL trunks between switches (0 = single-hop fabric) */
  islTrunkCount: z.number().int().min(0).max(8).default(2),
  /** Rack unit height for servers */
  serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),
  /** Rack size */
  rackSize: z.enum(['24U', '42U', '50U']),
});

export type FCSizingInput = z.infer<typeof FCSizingInputSchema>;
```

**3. `src/domain/schemas/fc-bom.ts` — NEW**

Separate BOM schema for FC output. FC BOM fields are entirely different from Ethernet BOM fields. Reuse `ConstraintViolationSchema` for violations (add FC-specific codes: `FC_PORT_OVERSUBSCRIPTION`, `ISL_CAPACITY_EXCEEDED`).

```typescript
export const FCNetworkBOMSchema = z.object({
  /** Fabric A switch count */
  fabricASwitches: z.number().int().min(0),
  /** Fabric B switch count (mirrors Fabric A) */
  fabricBSwitches: z.number().int().min(0),
  /** Total host ports consumed (hbaPortsPerServer × totalServers / 2 per fabric) */
  hostPortsPerFabric: z.number().int().min(0),
  /** Total storage target ports per fabric */
  storagePortsPerFabric: z.number().int().min(0),
  /** ISL ports consumed between switches per fabric */
  islPortsPerFabric: z.number().int().min(0),
  /** SFP+ transceivers required (2 per link, all fiber) */
  sfpPlusCount: z.number().int().min(0),
  /** ISL trunking cables per fabric */
  islCables: z.number().int().min(0),
  /** Fan-in ratio: host initiator ports / storage target ports */
  fanInRatio: z.number().min(0),
  violations: z.array(FCConstraintViolationSchema),
  input: FCSizingInputSchema,
});
```

**4. `src/domain/engine/fc-sizing.ts` — NEW**

Pure function parallel to `sizing.ts`. Zero imports from the Ethernet engine.

```typescript
export function calculateFCBOM(input: FCSizingInput): FCNetworkBOM
```

Key FC sizing formulas:
- `totalServers = sum(racks[].serverCount)`
- `hostPortsPerFabric = totalServers × (hbaPortsPerServer / 2)` — split evenly across dual fabric
- `storagePortsPerFabric = storageArrayCount × (storageTargetPorts / 2)` — dual fabric split
- `switchPortsRequired = hostPortsPerFabric + storagePortsPerFabric + islPortsPerFabric`
- `fabricSwitches = ceil(switchPortsRequired / FC_SWITCH.fcPorts)` — per fabric
- `fanInRatio = hostPortsPerFabric / storagePortsPerFabric`
- Violation: `FC_PORT_OVERSUBSCRIPTION` when `fanInRatio > 7` (Broadcom best practice: max 7:1)
- Violation: `ISL_CAPACITY_EXCEEDED` when ISL port demand exceeds switch ISL port capacity

---

### Switch Positioning (GH #6)

Switch positioning is an **Ethernet-only** extension. It adds one new schema field and modifies two existing computation functions.

**1. `SizingInputSchema` — MODIFIED**

Add `switchPositioning` field:

```typescript
switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR'),
```

- `ToR` (Top of Rack): switches in each server rack, cable run ≤ 3m
- `MoR` (Middle of Row): switches in dedicated rack at row center, cable run up to 15m average
- `BoR` (Bottom of Row / End of Row): switches in dedicated rack at row end, cable run up to 30m average

**2. `src/domain/engine/sizing.ts` — MODIFIED**

Cable length advisory logic added to the engine. The existing engine does not calculate cable lengths — it only counts cable quantities. For switch positioning, add a `recommendedCableLengthM` output field and a new violation:

- `ToR` → `recommendedCableLengthM: 3` (patch cables, DAC always viable)
- `MoR` → `recommendedCableLengthM: 15` (AOC or fiber required; DAC advisory if selected)
- `BoR` → `recommendedCableLengthM: 30` (AOC or fiber required; DAC advisory always fires)

Add new violation code to `ConstraintViolationSchema`:

```typescript
z.object({
  code: z.literal('DAC_POSITIONING_ADVISORY'),
  positioning: z.enum(['MoR', 'BoR']),
  recommendedCableLengthM: z.number(),
})
```

**3. `NetworkBOMSchema` — MODIFIED**

Add two fields:

```typescript
switchPositioning: z.enum(['ToR', 'MoR', 'BoR']),
recommendedCableLengthM: z.number().int().min(0),
```

**4. `src/features/rack-elevation/utils/buildRackDevices.ts` — MODIFIED**

Switches move to a different U-position in the rack based on positioning:

- `ToR`: switches at U1–U3 (bottom of rack) — current behavior, unchanged
- `MoR`/`BoR`: switches are in a dedicated separate rack (not co-located), so server racks render with NO switch devices. A new `buildPositioningRackDevices()` function handles the positioning rack's layout.

This impacts `RackElevationTab.tsx` — it must show a "positioning rack" in addition to server racks when MoR/BoR is selected.

---

## Mode Selector (new UI component)

**`src/features/sizing/ModeSelector.tsx` — NEW**

A top-level mode switch that selects between `'ethernet'` and `'fc'`. This is a UI concern only — the domain layer has no concept of "mode."

Architecture decision: **mode is not stored in `inputStore`**. Store it in a new ephemeral `uiStore` slice (not persisted). Rationale: mode does not affect BOM computation directly (the input type determines which engine is called); persisting mode would add migration complexity when the schema evolves.

However, `inputStore` already persists Ethernet inputs, and a new `fcInputStore` persists FC inputs. Both are always persisted independently so switching modes and back retains previous inputs.

```typescript
// store/fcInputStore.ts — NEW (mirrors inputStore.ts)
export const useFCInputStore = create<FCInputState>()(
  persist(
    (set) => ({
      input: DEFAULT_FC_INPUT,
      setInput: (partial) => set((state) => ({ input: { ...state.input, ...partial } })),
      resetInput: () => set({ input: DEFAULT_FC_INPUT }),
    }),
    { name: 'netstack-fc-input', version: 1, storage: lazyLocalStorage }
  )
)
```

```typescript
// store/fcResultStore.ts — NEW (mirrors resultStore.ts)
// Subscribed to fcInputStore; calls calculateFCBOM
```

---

## Modified vs New: Complete Inventory

### New Files

| File | Layer | Purpose |
|------|-------|---------|
| `src/domain/catalog/brocade.ts` | Domain | FC switch hardware catalog |
| `src/domain/catalog/fc-types.ts` | Domain | `FCSwitchSpec` interface |
| `src/domain/schemas/fc-input.ts` | Domain | `FCSizingInputSchema`, `FCSizingInput` type |
| `src/domain/schemas/fc-bom.ts` | Domain | `FCNetworkBOMSchema`, `FCNetworkBOM`, `FCConstraintViolation` |
| `src/domain/engine/fc-sizing.ts` | Domain | `calculateFCBOM()` pure function |
| `src/domain/engine/fc-sizing.test.ts` | Domain | Unit tests for FC engine |
| `src/store/fcInputStore.ts` | Store | FC inputs, persisted to localStorage |
| `src/store/fcResultStore.ts` | Store | FC BOM, derived from fcInputStore |
| `src/features/sizing/ModeSelector.tsx` | Feature | Ethernet / FC mode toggle |
| `src/features/sizing/FCInputForm.tsx` | Feature | FC-specific input form |
| `src/features/sizing/FCBOMPanel.tsx` | Feature | FC BOM display |
| `src/features/topology/utils/buildFCTopologyGraph.ts` | Feature | Dual-fabric FC topology builder |
| `src/features/topology/TopologyFCTab.tsx` | Feature | FC topology canvas (dual-fabric layout) |
| `src/features/rack-elevation/utils/buildPositioningRackDevices.ts` | Feature | MoR/BoR switch rack builder |

### Modified Files

| File | Layer | What Changes |
|------|-------|--------------|
| `src/domain/schemas/input.ts` | Domain | Add `switchPositioning` field |
| `src/domain/schemas/bom.ts` | Domain | Add `switchPositioning`, `recommendedCableLengthM`; add `DAC_POSITIONING_ADVISORY` violation |
| `src/domain/engine/sizing.ts` | Domain | Positioning-based cable length advisory logic |
| `src/domain/engine/sizing.test.ts` | Domain | New test cases for positioning violations |
| `src/store/inputStore.ts` | Store | Persist version bump (v5→v6), add `switchPositioning` default in `DEFAULT_INPUT` |
| `src/features/sizing/InputForm.tsx` | Feature | Add positioning selector (ToR/MoR/BoR) |
| `src/features/sizing/BOMPanel.tsx` | Feature | Render `recommendedCableLengthM`, new positioning violation |
| `src/features/sizing/SizingPage.tsx` | Feature | Render `ModeSelector`; conditionally render Ethernet vs FC input/BOM forms |
| `src/features/rack-elevation/RackElevationTab.tsx` | Feature | Show positioning rack when MoR/BoR selected |
| `src/features/rack-elevation/utils/buildRackDevices.ts` | Feature | Exclude switches from server racks when MoR/BoR selected |
| `src/App.tsx` | App | No structural change; mode state drives what renders inside existing tabs |
| `src/features/export/exportCsv.ts` | Export | Add FC BOM export support |
| `src/features/export/exportPdf.ts` | Export | Add FC BOM PDF page |

---

## System Overview After v2.0

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Features Layer (React)                        │
│                                                                        │
│  ModeSelector (ethernet | fc)                                          │
│     │                  │                                               │
│  [Ethernet mode]    [FC mode]                                          │
│  InputForm          FCInputForm                                        │
│  BOMPanel           FCBOMPanel                                         │
│  TopologyTab        TopologyFCTab                                      │
│  RackElevationTab   RackElevationTab (shared, mode-aware)              │
└──────┬──────────────────────────┬────────────────────────────────────┘
       │                          │
       ▼                          ▼
┌────────────────────┐  ┌──────────────────────────┐
│   inputStore       │  │   fcInputStore            │
│   (Ethernet, v6)   │  │   (FC, v1)                │
│   persisted        │  │   persisted               │
└────────┬───────────┘  └────────────┬──────────────┘
         │ subscribe                  │ subscribe
         ▼                            ▼
┌────────────────────┐  ┌──────────────────────────┐
│   resultStore      │  │   fcResultStore           │
│   (derived, BOM)   │  │   (derived, FC BOM)       │
└────────┬───────────┘  └────────────┬──────────────┘
         │                            │
         ▼                            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Domain Layer (pure TypeScript)                   │
│                                                                        │
│  catalog/hardware.ts    catalog/brocade.ts                             │
│  schemas/input.ts       schemas/fc-input.ts                            │
│  schemas/bom.ts         schemas/fc-bom.ts                              │
│  engine/sizing.ts       engine/fc-sizing.ts                            │
└──────────────────────────────────────────────────────────────────────┘
```

**Mode isolation is total at the domain layer.** The Ethernet engine never imports from the FC catalog, and vice versa. The stores are separate. The only shared domain code is `RackConfigSchema` (imported by both input schemas) and the `rackSize` enum.

---

## Recommended Project Structure (additions only)

```
src/
├── domain/
│   ├── catalog/
│   │   ├── hardware.ts          # (existing) Dell Ethernet switches
│   │   ├── brocade.ts           # NEW: Brocade FC switches
│   │   ├── fc-types.ts          # NEW: FCSwitchSpec interface
│   │   ├── types.ts             # (modified) keep SwitchSpec for Ethernet only
│   │   ├── cables.ts            # (existing, unchanged)
│   │   └── loader.ts            # (existing, unchanged)
│   ├── schemas/
│   │   ├── input.ts             # (modified) add switchPositioning field
│   │   ├── bom.ts               # (modified) add positioning fields + violation
│   │   ├── fc-input.ts          # NEW: FCSizingInputSchema
│   │   └── fc-bom.ts            # NEW: FCNetworkBOMSchema
│   └── engine/
│       ├── sizing.ts            # (modified) add positioning cable advisory
│       ├── sizing.test.ts       # (modified) add positioning test cases
│       ├── fc-sizing.ts         # NEW: calculateFCBOM pure function
│       └── fc-sizing.test.ts    # NEW: FC engine unit tests
│
├── store/
│   ├── inputStore.ts            # (modified) persist version bump + positioning default
│   ├── resultStore.ts           # (unchanged)
│   ├── fcInputStore.ts          # NEW: FC inputs persisted
│   └── fcResultStore.ts         # NEW: FC BOM derived
│
└── features/
    ├── sizing/
    │   ├── SizingPage.tsx        # (modified) adds ModeSelector, conditional rendering
    │   ├── ModeSelector.tsx      # NEW: ethernet/fc toggle
    │   ├── InputForm.tsx         # (modified) adds positioning selector
    │   ├── BOMPanel.tsx          # (modified) adds positioning output, FC not rendered here
    │   ├── FCInputForm.tsx       # NEW: FC-specific input fields
    │   └── FCBOMPanel.tsx        # NEW: FC BOM display
    ├── topology/
    │   ├── TopologyTab.tsx       # (unchanged) Ethernet topology
    │   ├── TopologyFCTab.tsx     # NEW: dual-fabric FC topology
    │   └── utils/
    │       ├── buildTopologyGraph.ts     # (unchanged)
    │       └── buildFCTopologyGraph.ts   # NEW: dual-fabric layout builder
    ├── rack-elevation/
    │   ├── RackElevationTab.tsx  # (modified) renders positioning rack when MoR/BoR
    │   └── utils/
    │       ├── buildRackDevices.ts             # (modified) positioning-aware
    │       └── buildPositioningRackDevices.ts  # NEW: MoR/BoR switch rack
    └── export/
        ├── exportCsv.ts          # (modified) FC BOM rows
        └── exportPdf.ts          # (modified) FC BOM PDF page
```

---

## Architectural Patterns

### Pattern 1: Parallel Domain Modules (mode isolation)

**What:** FC sizing lives in entirely separate files from Ethernet sizing. Schemas, catalog, and engine are parallel, never merged. Neither domain imports from the other.

**When to use:** When two domain modes have fundamentally different input shapes and output shapes. Merging them into a discriminated union at the schema level propagates that complexity to every consumer (stores, forms, export, topology builder, rack builder, tests).

**Trade-offs:** More files, but each file is smaller and independently testable. No risk of Ethernet regressions from FC changes.

**Example:**
```typescript
// domain/engine/fc-sizing.ts — never imports from sizing.ts
import { FC_SWITCH_CATALOG } from '../catalog/brocade';
import type { FCSizingInput } from '../schemas/fc-input';
import type { FCNetworkBOM } from '../schemas/fc-bom';

export function calculateFCBOM(input: FCSizingInput): FCNetworkBOM { ... }
```

### Pattern 2: Separate Persisted Stores per Mode

**What:** `inputStore` persists Ethernet inputs. `fcInputStore` persists FC inputs. Both live independently in localStorage under different keys (`netstack-input` and `netstack-fc-input`).

**When to use:** When two modes have different input types that cannot merge (different required fields, different validation rules). Separate stores also make version migration independent — bumping Ethernet input schema version does not require a FC migration.

**Trade-offs:** Two stores to maintain. However, `fcInputStore` is a near-identical copy of `inputStore` with a different schema and default — low maintenance cost.

### Pattern 3: Mode as Ephemeral UI State

**What:** The `'ethernet' | 'fc'` mode selector value is stored in memory only (component state or an ephemeral Zustand slice without `persist`). It is not persisted to localStorage.

**When to use:** When mode is a view-level concern that should reset on page reload, or when persisting it would add migration complexity.

**Rationale:** The user's inputs in each mode are persisted. The mode itself (which set of inputs to show) is cheap to default back to `'ethernet'` on load — it is the expected starting state for most users.

### Pattern 4: Switch Positioning as Engine Input (not UI-only)

**What:** `switchPositioning` is a field in `SizingInputSchema`, flows through to the engine, appears in the BOM output, and drives violations. It is not computed in the UI layer.

**When to use:** When a UI selection changes what gets ordered (cable length, switch placement). Positioning affects cable type feasibility and DAC advisories, which are domain concerns.

**Trade-offs:** Engine tests cover positioning logic directly. The UI is thinner (no inline advisory logic in components).

### Pattern 5: FC Topology as Dual-Fabric Layout

**What:** `buildFCTopologyGraph(bom: FCNetworkBOM)` returns two parallel fabric rows (Fabric A top, Fabric B bottom) with host ports on the left and storage ports on the right. ISL links connect switches within each fabric horizontally.

**When to use:** FC topology is always dual-fabric. The function should never produce a single-fabric output — that would misrepresent the design.

```
Fabric A:  [Switch A1]─ISL─[Switch A2]
              │   │              │   │
           hosts  storage    hosts  storage

Fabric B:  [Switch B1]─ISL─[Switch B2]
              │   │              │   │
           hosts  storage    hosts  storage
```

---

## Data Flow

### FC Sizing Calculation Flow

```
User edits FCInputForm
    ↓
React Hook Form + Zod (FCSizingInputSchema) validation
    ↓
fcInputStore.setInput(validatedFCInput)  [Zustand, persisted to 'netstack-fc-input']
    ↓
fcInputStore subscription fires
    ↓
fcResultStore recalculates
    ↓
domain/engine/fc-sizing.calculateFCBOM(input)  [pure function]
    ↓
fcResultStore.bom updated  [Zustand, not persisted]
    ↓
FCBOMPanel, TopologyFCTab re-render
```

### Switch Positioning Flow

```
User selects ToR / MoR / BoR in InputForm
    ↓
inputStore.setInput({ switchPositioning: 'MoR' })
    ↓
resultStore recomputes via existing subscription
    ↓
calculateBOM(input) — engine reads switchPositioning
    ↓
bom.switchPositioning = 'MoR'
bom.recommendedCableLengthM = 15
bom.violations may include DAC_POSITIONING_ADVISORY
    ↓
BOMPanel renders advisory, cable length recommendation
    ↓
RackElevationTab reads bom.switchPositioning
    ↓
If MoR/BoR: buildPositioningRackDevices(bom) renders switch rack
            buildRackDevices(bom, rackIndex) renders server-only racks
If ToR: buildRackDevices(bom, rackIndex) unchanged (switches at U1-U3)
```

### Mode Switching Flow

```
User clicks FC mode in ModeSelector
    ↓
setMode('fc')  [component state or ephemeral Zustand slice]
    ↓
SizingPage conditionally renders:
  - FCInputForm (reads fcInputStore)
  - FCBOMPanel (reads fcResultStore)
App.tsx TopologyTab conditionally renders:
  - TopologyFCTab when mode === 'fc'
  - TopologyTab (Ethernet) when mode === 'ethernet'
RackElevationTab works from whichever mode is active
  - reads resultStore or fcResultStore based on mode
```

---

## Integration Points

### New Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `FCInputForm` → `fcInputStore` | Zustand write via custom hook | Same pattern as `InputForm` → `inputStore` |
| `fcInputStore` → `fcResultStore` | Module-level `subscribe`, mirrors resultStore | Wire at module load time, not in React lifecycle |
| `ModeSelector` → tabs | Component state prop or React context | Do NOT use Zustand for this — it is transient display state |
| `RackElevationTab` → mode | Read from same context/state as ModeSelector | Single source of mode truth; tab reads it to decide which store to consult |
| `buildRackDevices` → `switchPositioning` | `bom.switchPositioning` field read inside function | Pure function; no new store dependency |
| `buildFCTopologyGraph` → `FCNetworkBOM` | Direct import; parallel to `buildTopologyGraph` | Entirely separate; never called by Ethernet topology builder |

### Schema Shared Between Modes

| Schema | Used By | Notes |
|--------|---------|-------|
| `RackConfigSchema` | Both `SizingInputSchema` and `FCSizingInputSchema` | Import from `input.ts` — do not duplicate |
| `rackSize` enum | Both input schemas | Extract to `src/domain/schemas/shared.ts` or keep inline (acceptable for small enum) |
| `serverUHeight` enum | Both input schemas | Same — extract or inline |
| `ConstraintViolationSchema` | Both BOM schemas | `fc-bom.ts` extends with FC-specific violation codes; use a re-exported union |

---

## Build Order (phase recommendations)

Dependencies between components drive this order. Each phase assumes the previous is complete and tested.

**Phase 1: FC Domain Foundation**
Build `brocade.ts` catalog, `fc-types.ts`, `fc-input.ts`, `fc-bom.ts`, `fc-sizing.ts`, `fc-sizing.test.ts`. This is pure TypeScript with no React dependency. Tests verify all FC formulas before any UI exists.

**Phase 2: FC Store Layer**
Build `fcInputStore.ts` and `fcResultStore.ts`. Wire subscription. Smoke-test via `fcResultStore.test.ts` in jsdom.

**Phase 3: Switch Positioning (Ethernet)**
Modify `SizingInputSchema` (add `switchPositioning`), `NetworkBOMSchema` (add fields + violation), `sizing.ts` (cable advisory logic), bump inputStore persist version. This is a smaller change contained to the Ethernet domain — complete it before FC UI so it does not conflict.

**Phase 4: Positioning UI**
Modify `InputForm.tsx` (add selector), `BOMPanel.tsx` (new advisory rendering), `buildRackDevices.ts` (positioning-aware switch placement), `RackElevationTab.tsx` (positioning rack column), add `buildPositioningRackDevices.ts`.

**Phase 5: FC Input & BOM UI**
Build `ModeSelector.tsx`, `FCInputForm.tsx`, `FCBOMPanel.tsx`. Modify `SizingPage.tsx` to conditionally render based on mode.

**Phase 6: FC Topology**
Build `buildFCTopologyGraph.ts` and `TopologyFCTab.tsx`. Modify `App.tsx` (or the tab that hosts topology) to conditionally render the FC topology canvas.

**Phase 7: Export**
Extend CSV and PDF exporters for FC BOM. This is last because it depends on all FC domain + UI being stable.

---

## Scaling Considerations

This is a pure client-side SPA. Scaling refers to codebase scale, not user scale.

| Concern | Current State | With v2.0 |
|---------|---------------|-----------|
| Domain isolation | Single Ethernet domain | Two parallel domains; no cross-contamination risk |
| Store complexity | 2 stores (input + result) | 4 stores (2 per mode); each simple and independent |
| Schema migration | inputStore at v5 | inputStore bumps to v6 (positioning field only); fcInputStore starts at v1 |
| Test surface | 223 tests for Ethernet | FC engine adds ~40-60 unit tests; positioning adds ~15 tests |
| Bundle size | No change from architecture (same libraries) | `brocade.ts` catalog is trivial in size |

---

## Anti-Patterns for v2.0

### Anti-Pattern 1: Merging FC and Ethernet into One Schema

**What people do:** Add a `mode: z.enum(['ethernet', 'fc'])` field to `SizingInputSchema` and then conditionally handle FC fields in the same schema and engine.

**Why it's wrong:** The Ethernet schema has `leafModel`, `spineModel`, `cableType`, `activeUplinksPerLeaf`. The FC schema has `fcSwitchModel`, `hbaPortsPerServer`, `storageTargetPorts`. These are non-overlapping. A merged schema becomes a partial-object nightmare with many optional fields, and every engine branch must check `input.mode`. The engine loses its pure-function guarantees and tests become complex.

**Do this instead:** Separate schemas, separate engines, separate stores. The mode selector is a UI concern that controls which schema/engine/store is active.

### Anti-Pattern 2: Persisting Mode Selector

**What people do:** Store `mode: 'ethernet' | 'fc'` in `inputStore` (Ethernet) or as a shared persisted value.

**Why it's wrong:** Forces a schema migration whenever mode enum changes. The FC and Ethernet inputs are already persisted separately — the mode is merely a view switch. Persisting it adds no value because either mode's inputs are already restored when the user switches back.

**Do this instead:** Mode is ephemeral component state or a non-persisted Zustand slice. On reload, default to `'ethernet'` (the existing behavior). FC inputs are already in localStorage and will be restored when FC mode is selected.

### Anti-Pattern 3: Shared Rack Elevation for FC Without Abstraction

**What people do:** Pass `fcResultStore.bom` to `buildRackDevices()` (which expects `NetworkBOM`, not `FCNetworkBOM`).

**Why it's wrong:** Type mismatch; FC BOM does not have `leafSwitches`, `spineSwitches`, etc. The rack elevation for FC shows only server racks (FC switches are in a separate "SAN rack") — the layout logic differs.

**Do this instead:** `RackElevationTab` accepts a render prop or a `mode` parameter. When `mode === 'fc'`, it calls `buildFCSANRackDevices(fcBom)` for the SAN rack and builds server racks with only server devices (no leaf/OOB switches — those are in the SAN rack).

### Anti-Pattern 4: Coupling TopologyFCTab to Ethernet buildTopologyGraph

**What people do:** Modify `buildTopologyGraph.ts` to conditionally handle FC topology when a `mode` flag is passed.

**Why it's wrong:** Couples two completely different layout algorithms in one function. FC topology is a dual-fabric parallel layout; Ethernet is a leaf-spine hierarchical layout. Mixing them in one function makes both harder to test and extend.

**Do this instead:** `buildFCTopologyGraph(fcBom: FCNetworkBOM): TopologyGraphResult` is a separate function. `TopologyFCTab` uses it exclusively. `TopologyTab` (Ethernet) uses `buildTopologyGraph` exclusively. The result type `TopologyGraphResult` (nodes + edges) is shared because React Flow accepts the same `Node[]` and `Edge[]` types regardless of topology.

---

## Sources

- [Brocade G720 Technical Specifications — Broadcom TechDocs](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g720-switch/1-0/v25859098.html) — HIGH confidence (official Broadcom docs)
- [Brocade G820 Device Overview — Broadcom TechDocs](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g820-switch/1-0/device-overview-g820.html) — HIGH confidence (official Broadcom docs)
- [Broadcom Launches Brocade Gen 8 — StorageReview](https://www.storagereview.com/news/broadcom-launches-brocade-gen-8-128g-fibre-channel-for-ai-mission-critical-and-quantum-safe-storage) — MEDIUM confidence (press coverage)
- [SAN Design and Best Practices — Broadcom](https://docs.broadcom.com/doc/53-1004781) — HIGH confidence (official Broadcom SAN design guide, Nov 2025)
- [FC SAN Dual Fabric / ISL Best Practices — FlackBox](https://www.flackbox.com/fibre-channel-san-part-3-redundancy-multipathing) — MEDIUM confidence (training content, aligns with vendor docs)
- [ToR vs EoR/MoR Architecture — ANFKOM](https://www.anfkomftth.com/data-center-cabling-eor-mor-or-tor/) — MEDIUM confidence (aligns with industry standard definitions)
- Existing NetStack codebase (`src/domain/engine/sizing.ts`, `src/store/inputStore.ts`, `src/domain/schemas/`) — HIGH confidence (read directly)

---

*Architecture research for: NetStack v2.0 — FC SAN sizing and switch positioning*
*Researched: 2026-03-18*

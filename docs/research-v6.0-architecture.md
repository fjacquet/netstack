# Architecture Patterns

**Domain:** Network sizing calculator — v6.0 Physical Planning milestone
**Researched:** 2026-03-19
**Scope:** Cable length estimation, power budget per rack, DAC distance advisory upgrade, new physical-layout inputs

---

## Current Architecture Baseline

The codebase enforces a strict one-way dependency chain:

```
Domain (pure TS, zero React)
  └── catalog/hardware.ts          — SWITCH_CATALOG constants (maxPowerW present)
  └── schemas/input.ts             — SizingInputSchema (Zod v4), SizingInput type
  └── schemas/bom.ts               — NetworkBOMSchema, ConstraintViolationSchema
  └── engine/sizing.ts             — calculateBOM(): pure function

Store (Zustand, no React lifecycle)
  └── inputStore.ts                — persisted (version 8), merge-based migration
  └── resultStore.ts               — derived, subscribes to inputStore changes

Features (React 19 + shadcn/ui)
  └── input/EthInputAccordion.tsx  — form, writes to inputStore
  └── sizing/BOMPanel.tsx          — reads resultStore
  └── topology/, rack-elevation/, export/
```

Key invariants already established:
- `calculateBOM()` is a pure function — no side effects, no imports from React or Zustand.
- Brownfield post-processing (zeroing spine/core counts) lives in `resultStore`, not in the engine. This decision is documented in PROJECT.md: "Brownfield post-processing in resultStore (not engine) — Keeps calculateBOM/calculateThreeTierBOM pure."
- `NetworkBOM` embeds the original `SizingInput` as `input:` for consumer use without needing a separate store subscription.
- `inputStore` is at version 8. The `merge` function handles all migrations back to v2. Every new field added to `SizingInputSchema` requires incrementing the version and documenting the migration.
- The `DAC_DISTANCE_ADVISORY` violation currently only carries `rackCount` and `cableType: 'DAC'`. No computed distance value is present anywhere.
- `recommendedCableLengthM` exists on `NetworkBOM` (scalar integer, not a schedule). The engine already computes it from a position map `{ToR:2, MoR:1, BoR:2}`.

---

## v6.0 Feature Placement Decisions

### Feature 1: Cable Length Schedule

**Question:** New fields on `NetworkBOM`, separate type, or a post-processing step?

**Decision: New fields on `NetworkBOM` — computed inside `calculateBOM()`.**

Rationale:

1. The engine already computes `recommendedCableLengthM` as a scalar. Extending it to a schedule (per cable type) is a direct continuation of existing logic, not a new concern.
2. Cable lengths are deterministic functions of `switchPositioning`, `rackPitch`, and `adjacentRacks`. All three values are available to the engine as input parameters. There is no reason to defer this to a post-processing step.
3. A separate pure function (e.g. `estimateCableLengths(input) => CableLengthSchedule`) is architecturally valid but adds a call site that every consumer (BOMPanel, PDF export, CSV export) must know about. Embedding the schedule in `NetworkBOM` makes the output self-contained, consistent with how `oversubscriptionRatio` and `violations` are handled.
4. The "brownfield post-processing in resultStore" precedent applies to **BOM counts** (removing already-purchased switches). Cable lengths are not BOM counts — they are calculated outputs that belong in the domain.

**Boundary:** `calculateBOM()` calls a private helper `buildCableLengthSchedule(input)` and attaches the result to `NetworkBOM`. The helper is not exported — it is an implementation detail of the engine.

The new `CableLengthScheduleSchema` is a standalone schema in `schemas/bom.ts`, embedded in `NetworkBOMSchema`. This allows it to be typed independently (for PDF/CSV rendering) without coupling to the full BOM type.

```
src/domain/schemas/bom.ts
  + CableLengthScheduleSchema       — new object schema
  + NetworkBOMSchema adds field:
      cableLengthSchedule: CableLengthScheduleSchema

src/domain/engine/sizing.ts
  + private buildCableLengthSchedule(input: SizingInput): CableLengthSchedule
  calculateBOM() calls it, attaches to return value
```

The same treatment applies to `ThreeTierBOMSchema` — it already has `recommendedCableLengthM` and should receive `cableLengthSchedule` as well, for parallel architecture consistency (ADR-0009).

---

### Feature 2: Power Budget Per Rack

**Question:** New output section on `NetworkBOM`, or a separate derived store?

**Decision: New section on `NetworkBOM` — computed inside `calculateBOM()`.**

Rationale:

1. `SWITCH_CATALOG` already has `maxPowerW` and `typicalPowerW` on every model. All switch counts (`leafSwitches`, `spineSwitches`, `oobSwitches`) are computed by `calculateBOM()`. The power calculation is a straightforward multiplication of count x watts per model — a pure function with zero new dependencies.
2. Power budget is a BOM output, not a UI preference. It belongs where all other BOM outputs live.
3. A separate `usePowerBudgetStore` or a `computePowerBudget(bom, catalog)` function in resultStore would create an implicit coupling: resultStore would need to know both the BOM output and the hardware catalog. This crosses the architecture boundary (the store is not supposed to perform domain calculations directly).

**Schema shape:** `PowerBudgetSchema` is a new object with per-rack and totals. Per-rack breakdown requires an array (one entry per server rack, reflecting the racks array in input). The network rack is a single entry (spines, border leafs). The schema should carry both `maxW` and `typicalW` to allow the UI to show a range.

```
src/domain/schemas/bom.ts
  + RackPowerBudgetSchema           — { rackNumber, switchMaxW, switchTypicalW, estimatedServerW, totalMaxW, totalTypicalW }
  + PowerBudgetSchema               — { perRack: RackPowerBudgetSchema[], networkRack: {...}, grandTotalMaxW, grandTotalTypicalW }
  + NetworkBOMSchema adds field:
      powerBudget: PowerBudgetSchema

src/domain/engine/sizing.ts
  + private buildPowerBudget(input, counts): PowerBudget
  calculateBOM() calls it, attaches to return value
```

Server power is not in `SWITCH_CATALOG` — it is a user input (or a catalog lookup for server models). For v6.0, the recommended approach is a new input field `estimatedServerPowerW` (default 400W, typical 1U/2U server) that allows the power budget to be computed without server catalog data. This is a sizing approximation appropriate to a physical planning tool.

---

### Feature 3: DAC Distance Advisory with Computed Distance

**Question:** Extend `ConstraintViolationSchema` or add a new violation code?

**Decision: Extend the existing `DAC_DISTANCE_ADVISORY` variant — add `computedDistanceM` field.**

Rationale:

1. The violation code is already `'DAC_DISTANCE_ADVISORY'` in both `ConstraintViolationSchema` (Clos) and `ThreeTierConstraintViolationSchema` (three-tier). Adding `computedDistanceM: z.number()` to the existing variant is additive and non-breaking from a Zod perspective. Existing consumers that destructure the violation only by `code` continue to work.
2. The check `input.cableType === 'DAC' && racks > 8` is already in `calculateBOM()`. The distance value can be derived from the same inputs used for `cableLengthSchedule`. There is no new information required.
3. A new violation code (e.g. `'DAC_DISTANCE_EXCEEDED'`) would require updating all exhaustive switch/match statements in `BOMPanel.tsx`, `ThreeTierBOMPanel`, violation alert components, PDF export pages, and i18n files — a large blast radius for what is just adding a numeric field to an existing shape.

**Computed distance formula:** The relevant distance for DAC advisory is the inter-rack run (server rack to network rack), not the intra-rack run. For non-adjacent deployments: `distance = (rackPitchMm / 1000) * racksFromEdge + patchPanelDistanceM`. The engine needs `rackPitchMm` and `adjacentNetworkRack` from the new inputs (see Feature 4 below) to produce this value.

```
src/domain/schemas/bom.ts
  ConstraintViolationSchema — DAC_DISTANCE_ADVISORY variant adds:
    + computedDistanceM: z.number().optional()   — computed inter-rack distance
    + dacRatedDistanceM: z.number()              — DAC rated max (typically 3m passive, 7m active)
```

`optional()` is used here deliberately: if the new physical layout inputs are absent (backwards-compat scenario, though v6.0 makes them required), the advisory still fires without the computed value.

---

### Feature 4: New Inputs (Rack Pitch, Adjacent Toggle, Patch Panel Distance)

**Question:** Extend `SizingInputSchema` directly or use a separate physical layout schema?

**Decision: Extend `SizingInputSchema` directly — increment inputStore to version 9.**

Rationale:

1. The existing migration pattern in `inputStore.ts` handles exactly this case. Every previous version added new fields via `{ ...DEFAULT_INPUT, ...oldInput }` spread, which fills in the defaults for any missing key. This pattern scales cleanly to v6.0 additions.
2. A separate `PhysicalLayoutInput` schema would require either (a) a new persisted store (`physicalLayoutStore`) with its own localStorage key and migration logic, or (b) a nested object inside `SizingInput`. Option (a) fragments the input state unnecessarily. Option (b) complicates the `setInput(partial)` API and requires deep merge logic.
3. All new fields are used by `calculateBOM()` — they directly affect cable length calculations. They belong in `SizingInput` alongside `switchPositioning`, `rackSize`, and `serverUHeight` which serve the same "physical layout" purpose.

**New fields to add to `SizingInputSchema`:**

```typescript
/** Rack pitch in millimetres — center-to-center distance between adjacent racks */
rackPitchMm: z.number().int().min(400).max(1200).default(600),

/** Adjacent racks: spines/network rack is directly beside server racks */
adjacentNetworkRack: z.boolean().default(true),

/** Patch panel overhead distance in metres — added when non-adjacent (default 1m per hop) */
patchPanelDistanceM: z.number().min(0).max(10).default(1),

/** Estimated server power in Watts — used for per-rack power budget */
estimatedServerPowerW: z.number().int().min(0).max(4000).default(400),
```

**Migration:** inputStore version 8 to 9. The `merge` function's `{ ...DEFAULT_INPUT, ...oldInput }` spread automatically fills in all four new fields for any stored v8 input. No explicit migration branch is required — the existing pattern handles it. Document in the comment block next to the existing version comments:

```
* v8 to v9 (adds rackPitchMm, adjacentNetworkRack, patchPanelDistanceM, estimatedServerPowerW
*           for v6.0 Physical Planning cable length and power budget features).
```

**ThreeTierSizingInput:** The three-tier schema must receive the same four fields (parallel architecture, ADR-0009). `ThreeTierSizingInputSchema` imports `RackConfigSchema` from `input.ts` — the new fields should be added to `ThreeTierSizingInputSchema` directly. The `toThreeTierInput()` adapter in `resultStore.ts` must be updated to pass the four new fields through.

---

## Revised Component Boundaries

### Domain Layer — Modified Files

| File | Change | Reason |
|------|--------|--------|
| `schemas/input.ts` | Add 4 fields to `SizingInputSchema` | Physical layout inputs |
| `schemas/three-tier-input.ts` | Add same 4 fields to `ThreeTierSizingInputSchema` | Parallel arch (ADR-0009) |
| `schemas/bom.ts` | Add `CableLengthScheduleSchema`, `PowerBudgetSchema`, `RackPowerBudgetSchema`; extend `DAC_DISTANCE_ADVISORY` variant; add new fields to `NetworkBOMSchema` | Output shape for v6.0 features |
| `schemas/three-tier-bom.ts` | Extend `DAC_DISTANCE_ADVISORY` variant; add `cableLengthSchedule`, `powerBudget` fields to `ThreeTierBOMSchema` | Parallel arch |
| `engine/sizing.ts` | Add `buildCableLengthSchedule()`, `buildPowerBudget()` private helpers; call them in `calculateBOM()`; upgrade DAC advisory to include computed distance | Core implementation |
| `engine/three-tier-sizing.ts` | Same helpers (or shared utility); upgrade DAC advisory | Parallel arch |

### Domain Layer — New Files

None required. All new logic fits cleanly into existing files. Creating a new file (e.g. `engine/physical-planning.ts`) would require an explicit import in `sizing.ts` and would suggest the physical planning logic is a separate concern. It is not — it is core BOM output like `oversubscriptionRatio`.

**Exception:** If `buildCableLengthSchedule()` and `buildPowerBudget()` are needed in both `sizing.ts` and `three-tier-sizing.ts`, extract them to `engine/physical-planning-helpers.ts` (not exported from the domain public API). This avoids duplication across the two parallel engines without creating a cross-domain dependency.

### Store Layer — Modified Files

| File | Change | Reason |
|------|--------|--------|
| `store/inputStore.ts` | Increment version to 9; add 4 new fields to `DEFAULT_INPUT`; update migration comment | Schema migration |
| `store/resultStore.ts` | Update `toThreeTierInput()` to pass the 4 new fields through | Adapter completeness |

### Store Layer — New Files

None. Power budget and cable length schedule are embedded in `NetworkBOM` / `ThreeTierBOM`. No new derived stores needed.

### Features Layer — Modified Files

| File | Change | Reason |
|------|--------|--------|
| `features/input/EthInputAccordion.tsx` | Add 4 new fields to form (new "Physical Layout" accordion section, or extend existing "Rack Config" section) | Input for new features |
| `features/sizing/BOMPanel.tsx` | Add cable length schedule section, power budget section, upgrade DAC advisory to show distance | New BOM output rendering |
| `features/export/pdf/BOMPage.tsx` | Add cable length and power budget sections | PDF export completeness |
| `features/export/pdf/InputsPage.tsx` | Show new physical layout inputs | PDF export completeness |
| `features/input/ConvergedInputAccordion.tsx` | Add same 4 fields | Converged mode parity |
| `features/export/pdf/ThreeTierBOMPage.tsx` | Add cable length and power budget sections | Three-tier parity |
| CSV export (wherever it lives) | Add cable length, power budget rows | CSV export completeness |

### i18n — New Keys Required

New translation keys for all 4 languages (EN/FR/DE/IT):
- Section headers: `bom.cableLengthSchedule`, `bom.powerBudget`, `bom.perRackPower`
- Field labels: `sizing.rackPitchMm`, `sizing.adjacentNetworkRack`, `sizing.patchPanelDistanceM`, `sizing.estimatedServerPowerW`
- Violation text: upgrade `bom.violationDacDistanceBody` to interpolate computed distance
- Units: metre abbreviations, watt abbreviations per language

---

## Data Flow for v6.0

```
User adjusts rackPitchMm or adjacentNetworkRack
  -> inputStore.setInput(partial)           [Store layer]
  -> inputStore.subscribe fires             [Store layer]
  -> computeAndUpdateBOM(input)             [Store layer]
    -> calculateBOM(input)                  [Domain layer]
      -> buildCableLengthSchedule(input)    [Domain helper]
      -> buildPowerBudget(input, counts)    [Domain helper]
      -> DAC advisory: compute distance     [Domain engine inline]
    <- returns NetworkBOM with:            [Domain layer]
        cableLengthSchedule: {...}
        powerBudget: {...}
        violations: [...DAC with computedDistanceM]
  -> useResultStore.setState(bom)           [Store layer]
  <- BOMPanel re-renders                   [Features layer]
    -> renders cableLengthSchedule section
    -> renders powerBudget section
    -> renders DAC advisory with distance
```

---

## Cable Length Calculation Logic

The intra-rack cable length (server to leaf switch) is already computed as `recommendedCableLengthM` using the existing `cableLengthMap`. The new `CableLengthSchedule` extends this to a per-link-type breakdown:

1. **Server-to-leaf length** (per link): derived from `switchPositioning` — same as current `recommendedCableLengthM` logic. ToR = 2m, MoR = 1m, BoR = 2m.
2. **Leaf-to-spine (inter-rack) length**: depends on `rackPitchMm` and `adjacentNetworkRack`.
   - Adjacent: `(rackPitchMm / 1000) + 0.5` (half metre cable overhead each end, rounded up to next 0.5m).
   - Non-adjacent (patch panel path): `(rackPitchMm / 1000) * racksToNetworkRack + patchPanelDistanceM`.
3. **VLT interconnect length**: always intra-rack (leaf pair in same rack). Use same logic as server-to-leaf — typically 1m for MoR, 2m for ToR/BoR.
4. **OOB length**: same as server-to-leaf (OOB co-located with leaves per ADR-0014).

The `racksToNetworkRack` value defaults to `ceil(racks / 2)` (network rack in the middle of the row) unless `adjacentNetworkRack` is true (distance = 1 rack pitch).

**DAC rated distance boundary:** Passive DAC: 3m. Active DAC: 7m. The advisory threshold is currently `racks > 8`. With computed distances, the advisory should also fire when `computedInterRackDistanceM > 3` regardless of rack count, providing a more accurate trigger when a small deployment has widely spaced racks.

The `CableLengthSchedule` schema shape:

```typescript
{
  serverToLeafM: number,        // intra-rack run, based on switchPositioning
  leafToSpineM: number,         // inter-rack run, based on pitch + adjacency
  vltInterconnectM: number,     // intra-rack VLT
  oobM: number,                 // intra-rack OOB management
  patchPanelRequired: boolean,  // true when !adjacentNetworkRack
}
```

---

## Power Budget Calculation Logic

**Per server rack:**
- `switchMaxW` = 2 x leafModel.maxPowerW + oobSwitchesPerRack x OOB.maxPowerW
  (ToR placement; all positioning modes co-locate switches per ADR-0014)
- `switchTypicalW` = 2 x (leafModel.typicalPowerW ?? leafModel.maxPowerW) + oobSwitchesPerRack x OOB.maxPowerW
  (use maxPowerW as fallback if typicalPowerW is absent from catalog entry)
- `estimatedServerW` = rack.serverCount x input.estimatedServerPowerW
- `totalMaxW` = switchMaxW + estimatedServerW
- `totalTypicalW` = switchTypicalW + estimatedServerW

**Network rack:**
- `switchMaxW` = spineSwitches x spineModel.maxPowerW + borderLeafSwitches x borderLeafModel.maxPowerW
- No servers in network rack

**Grand totals:**
- `grandTotalMaxW` = sum(perRack[].totalMaxW) + networkRack.switchMaxW
- `grandTotalTypicalW` = sum(perRack[].totalTypicalW) + networkRack.switchTypicalW

**Three-tier:** Access switches are in server racks (same formula as leaf). Aggregation + core are in the network rack alongside border leafs.

**OOB saturation note:** `oobSwitchesPerRack` can be > 1 if the dense rack overflows 48 ports (`oobPortsRequired > OOB.downlinkPorts`). The power budget must multiply by `oobSwitchesPerRack` per rack — not assume a single OOB switch. The engine already computes this value.

---

## Schema Migration Pattern (inputStore v8 to v9)

The existing `merge` function in `inputStore.ts` uses:

```typescript
migratedInput = { ...DEFAULT_INPUT, ...oldInput } as SizingInput;
```

This spread applies to any stored state that already has `racks` (v3 through v8). All four new fields have `.default()` values in the Zod schema, so they are present in `DEFAULT_INPUT`. The spread fills them in for any stored input that lacks them. No new migration branch is needed.

What IS required:
1. Add the 4 new fields to `DEFAULT_INPUT` in `inputStore.ts`.
2. Increment `version: 8` to `version: 9`.
3. Update the migration comment block to document v8 to v9.

The Zod schema `.default()` values and the `DEFAULT_INPUT` constant must be kept in sync — this is the established convention used for all fields since v3.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Physical Planning as a Separate Store

**What:** Create `useCableLengthStore` and `usePowerBudgetStore` as derived stores subscribing to `resultStore`.
**Why bad:** Creates a multi-hop subscription chain (`inputStore` -> `resultStore` -> `cableLengthStore`). Increases risk of stale state between computation steps. Violates the existing pattern where all BOM outputs are atomic (computed together in one pass).
**Instead:** Embed `cableLengthSchedule` and `powerBudget` directly in `NetworkBOM`, computed in `calculateBOM()`.

### Anti-Pattern 2: Cable Length as UI-Only State

**What:** Compute cable lengths inside `BOMPanel.tsx` using `bom.racks` and input values read from `useInputStore`.
**Why bad:** Splits domain logic into the features layer. Makes the calculation invisible to tests (which test the domain layer in isolation), invisible to PDF/CSV export (which reads `NetworkBOM` directly), and breaks the "pure engine, derived UI" invariant.
**Instead:** Compute in domain, surface in `NetworkBOM`.

### Anti-Pattern 3: Adding Power Budget to a New Top-Level Store

**What:** `usePowerBudgetStore = create(...)` subscribing to both `resultStore` and reading `SWITCH_CATALOG` directly.
**Why bad:** `SWITCH_CATALOG` is a domain constant. Stores should not perform domain calculations. This would move domain logic into the store layer, blurring the boundary.
**Instead:** `calculateBOM()` already reads `SWITCH_CATALOG` (LEAF, SPINE, OOB). Power budget belongs in the same function.

### Anti-Pattern 4: Separate Schema for Physical Inputs

**What:** Create `PhysicalLayoutInputSchema` and a separate `physicalLayoutStore` with its own localStorage key.
**Why bad:** Fragments the input state. `calculateBOM()` needs all inputs in one `SizingInput` object. Two stores means two subscriptions in `resultStore` and a combiner that must stay synchronized. Prior art shows this is unnecessary — topology, three-tier fields, and brownfield toggles were all added to `SizingInputSchema` directly.
**Instead:** Add fields to `SizingInputSchema`, increment `inputStore` version, add to `DEFAULT_INPUT`.

### Anti-Pattern 5: Changing the DAC Advisory Violation Code

**What:** Add a new code `'DAC_DISTANCE_COMPUTED'` alongside `'DAC_DISTANCE_ADVISORY'`.
**Why bad:** All consumers (`BOMPanel`, `ThreeTierBOMPanel`, `ViolationsPage`, PDF export) have exhaustive handling for each violation code. Adding a new code triggers updates in at least 8 files. The violation is semantically the same event — cable type is DAC and the distance may exceed rated spec. Adding a numeric field to the existing shape is additive and non-breaking.
**Instead:** Add `computedDistanceM?: number` to the existing `DAC_DISTANCE_ADVISORY` variant.

---

## Build Order Recommendation

Phase ordering based on dependency graph (each step requires the prior to be complete):

**Step 1 — Domain schemas** (`bom.ts`, `input.ts`, `three-tier-input.ts`, `three-tier-bom.ts`)
No upstream dependencies. Write failing tests first (TDD RED phase). This is the foundation everything else depends on.

**Step 2 — Domain engines** (`sizing.ts`, `three-tier-sizing.ts`, optionally `engine/physical-planning-helpers.ts`)
Implements the new helpers, attaches outputs to BOM, upgrades DAC advisory. Tests go GREEN.

**Step 3 — Store migration** (`inputStore.ts` version bump, `DEFAULT_INPUT` update, `resultStore.ts` adapter)
Depends on schemas. No new tests required beyond existing store tests passing with new fields.

**Step 4 — Features: Input** (`EthInputAccordion.tsx`, `ConvergedInputAccordion.tsx`)
4 new fields rendered in a new accordion section. Depends on store migration (fields must exist).

**Step 5 — Features: BOM output** (`BOMPanel.tsx`, equivalent three-tier panel)
New sections for cable schedule and power budget. Upgraded DAC alert with distance. Depends on engine (fields must be populated in `NetworkBOM`).

**Step 6 — Features: Export** (PDF `BOMPage.tsx`, `InputsPage.tsx`, `ThreeTierBOMPage.tsx`, CSV)
Depends on BOM output shape being stable.

**Step 7 — i18n** (new keys in all 4 language files)
Can be parallelized with steps 4-6. Key absence produces fallback text, not compile errors. Must be complete before any feature step is merged to main.

---

## Scalability Considerations

| Concern | Current (v5.0) | v6.0 change |
|---------|---------------|-------------|
| `calculateBOM()` complexity | O(n) on racks array | Two new O(n) helpers — complexity class unchanged |
| localStorage payload | ~2KB per profile | 4 new scalar fields add ~50 bytes per profile |
| `NetworkBOM` object size | ~20 scalar fields | + `cableLengthSchedule` (~5 fields) + `powerBudget` (n+1 objects, n = rack count) |
| Re-render triggers | Any inputStore change re-runs engine | Same — no new subscriptions |
| Profile compatibility | v8 profiles load cleanly | v9 merge fills defaults; v8 profiles continue to load |

The power budget array scales with rack count (O(n)). At the schema maximum of 200 racks, this is 201 objects. Negligible in a browser context.

---

## Sources

- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/input.ts` — current `SizingInputSchema` (v8 fields, confirmed)
- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/bom.ts` — `NetworkBOMSchema`, `ConstraintViolationSchema` (confirmed: `DAC_DISTANCE_ADVISORY` has no distance field)
- `/Users/fjacquet/Projects/network-sizer/src/domain/engine/sizing.ts` — `calculateBOM()` implementation (confirmed: `recommendedCableLengthM` scalar already present, DAC threshold is `racks > 8`)
- `/Users/fjacquet/Projects/network-sizer/src/domain/catalog/hardware.ts` — `SWITCH_CATALOG` with `maxPowerW`, `typicalPowerW` on all models (confirmed)
- `/Users/fjacquet/Projects/network-sizer/src/store/inputStore.ts` — version 8, merge migration pattern (confirmed: `{ ...DEFAULT_INPUT, ...oldInput }` spread handles all migrations)
- `/Users/fjacquet/Projects/network-sizer/src/store/resultStore.ts` — `computeAndUpdateBOM()`, `toThreeTierInput()` adapter (confirmed: adapter must be updated)
- `/Users/fjacquet/Projects/network-sizer/.planning/PROJECT.md` — ADR decisions, v6.0 target features, constraint list
- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/three-tier-bom.ts` — parallel arch reference (confirmed: same `DAC_DISTANCE_ADVISORY` variant)
- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/three-tier-input.ts` — parallel arch reference (confirmed: must receive same 4 new fields)
- Confidence: HIGH — all decisions derived directly from reading production source files, no external sources required.

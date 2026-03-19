# Phase 21: Unified Ethernet Mode - Research

**Researched:** 2026-03-19
**Domain:** UI refactoring, store consolidation, dead code removal
**Confidence:** HIGH

## Summary

Phase 21 merges the standalone "Three-Tier" mode into the existing "Ethernet" mode, reducing the top-level mode selector from 4 buttons to 3 (Ethernet, FC, Converged). The Ethernet mode gains a topology selector dropdown (Clos / Three-Tier), and the input form, BOM panel, topology diagram, rack elevation, and export all conditionally render based on the selected topology.

The converged mode already implements exactly this pattern. `ConvergedSizingInputSchema` already has a `topology: z.enum(['leaf-spine', 'three-tier'])` field, `ConvergedInputForm.tsx` already conditionally renders leaf/spine vs access/aggr/core fields based on that selector, and the converged engine already composes `calculateBOM()` and `calculateThreeTierBOM()` via topology dispatch. **The approach is to replicate this proven converged-mode pattern into the standalone Ethernet mode, then remove the standalone Three-Tier mode entirely.**

**Primary recommendation:** Add a `topology` field to `inputStore`, create a unified `EthernetInputSchema` combining Clos+3-tier fields, build a unified input form with conditional rendering (following the converged pattern), wire topology-aware dispatch in `resultStore`, and then surgically remove all standalone Three-Tier files. The domain engines (`calculateBOM`, `calculateThreeTierBOM`) remain untouched -- they are pure functions that continue to work independently.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ETH-01 | Spine-Leaf and Three-Tier merged into a single "Ethernet" mode with topology selector dropdown | Unified store schema with `topology` field; conditional form rendering pattern from converged mode |
| ETH-02 | ModeSelector shows 3 buttons (Ethernet, FC, Converged) instead of 4 | Remove `'three-tier'` from mode union type in ModeSelector, App, TopBar |
| ETH-03 | Ethernet input form conditionally renders Clos fields (leaf/spine) or 3-tier fields (access/aggr/core) based on topology | ConvergedInputForm.tsx already demonstrates this exact pattern with `form.watch('topology')` |
| ETH-04 | Ethernet BOM panel, topology diagram, rack elevation, and export switch based on topology | SizingPage, TopologyTab, RackElevationTab, and export functions all need topology-aware dispatch |
| ETH-05 | Standalone Three-Tier mode and its dedicated stores removed (dead code cleanup) | Complete inventory of files to delete provided below |
</phase_requirements>

## Standard Stack

No new libraries needed. This phase is purely a refactoring of existing code using existing dependencies.

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.x | State management | Already used for all stores |
| zod | 4.x | Schema validation | Single source of truth for types |
| react-hook-form | 7.x | Form management | Already used in all input forms |
| @xyflow/react | 12.x | Topology diagrams | Already used for Clos + 3-tier |
| @react-pdf/renderer | 4.x | PDF export | Already used for all modes |
| react-i18next | 15.x | Internationalization | Already used across the app |

### Alternatives Considered
None. This is a refactoring phase, not a new feature phase. All libraries are already in use.

## Architecture Patterns

### Recommended Approach: Replicate Converged Pattern

The converged mode already solved the exact same problem: combining Clos and Three-Tier under one mode selector. The approach is proven and tested. Replicate it.

### Pattern 1: Unified Input Schema with Topology Discriminator

**What:** Add a `topology` field to the Ethernet input schema, include all Clos and Three-Tier fields in one schema, and use the topology value to determine which engine to call.

**When to use:** Always -- this is the core pattern for this phase.

**Existing reference:**
```typescript
// From converged-input.ts -- EXACTLY what we need for Ethernet
export const ConvergedSizingInputSchema = z.object({
  topology: z.enum(['leaf-spine', 'three-tier']).default('leaf-spine'),
  // shared fields...
  // Clos-specific fields...
  // Three-tier-specific fields (used when topology='three-tier')...
});
```

**New unified Ethernet input schema approach:**
```typescript
// New: src/domain/schemas/input.ts (expanded)
export const SizingInputSchema = z.object({
  topology: z.enum(['leaf-spine', 'three-tier']).default('leaf-spine'),

  // Shared fields (same for both topologies)
  racks: z.array(RackConfigSchema).min(1).max(200),
  portsPerServerFrontend: z.number().int().min(0).max(8).default(1),
  portsPerServerBackend: z.number().int().min(0).max(8).default(1),
  connectivityType: z.enum(['25G', '100G']),
  cableType: z.enum(['DAC', 'AOC', 'fiber']),
  borderLeafModel: z.enum([...]),
  borderLeafCount: z.number().int().min(0).max(4),
  rackSize: z.enum(['24U', '42U', '50U']),
  serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),
  switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR'),

  // Clos-specific fields (used when topology='leaf-spine')
  leafModel: z.enum([...]),
  spineModel: z.enum(['S5232F-ON']),
  activeUplinksPerLeaf: z.number().int().min(1).max(8).default(4),

  // Three-tier fields (used when topology='three-tier')
  accessModel: z.enum([...]).default('S5248F-ON'),
  activeUplinksPerAccess: z.number().int().min(1).max(64).default(4),
  aggregationModel: z.enum([...]).default('Z9264F-ON'),
  activeUplinksPerAggregation: z.number().int().min(1).max(32).default(4),
  coreModel: z.enum([...]).default('Z9332F-ON'),
});
```

### Pattern 2: Topology-Aware Result Store

**What:** The result store subscribes to the input store and dispatches to the correct engine based on `topology`.

**Existing reference:**
```typescript
// From converged-sizing.ts -- topology dispatch
if (input.topology === 'three-tier') {
  threeTierBom = calculateThreeTierBOM(toThreeTierInput(input));
} else {
  ethernetBom = calculateBOM(toEthernetInput(input));
}
```

**New Ethernet result store approach:**
```typescript
// resultStore.ts -- topology-aware dispatch
useInputStore.subscribe((state) => {
  try {
    if (state.input.topology === 'three-tier') {
      const threeTierInput = toThreeTierInput(state.input);
      const bom = calculateThreeTierBOM(threeTierInput);
      useResultStore.setState({ bom: null, threeTierBom: bom, violations: bom.violations });
    } else {
      const closInput = toClosInput(state.input);
      const bom = calculateBOM(closInput);
      useResultStore.setState({ bom, threeTierBom: null, violations: bom.violations });
    }
  } catch { /* ... */ }
});
```

### Pattern 3: Conditional Form Rendering

**What:** The input form uses `form.watch('topology')` to conditionally render Clos vs Three-Tier fields.

**Existing reference from ConvergedInputForm.tsx:**
```tsx
{/* Leaf-Spine fields (hidden when topology='three-tier') */}
{form.watch('topology') === 'leaf-spine' && (
  <>
    {/* Leaf Model, Active Uplinks, Spine Model */}
  </>
)}

{/* Three-Tier fields (shown when topology='three-tier') */}
{form.watch('topology') === 'three-tier' && (
  <>
    {/* Access Model, Aggregation Model, Core Model, ... */}
  </>
)}
```

### Pattern 4: Mode Type Narrowing

**What:** Change the mode union type from `'ethernet' | 'fc' | 'converged' | 'three-tier'` to `'ethernet' | 'fc' | 'converged'`. All `mode === 'three-tier'` branches become dead code and are removed.

**Files affected:**
- `ModeSelector.tsx` -- remove 4th button
- `App.tsx` -- remove `'three-tier'` from type and ternary branches
- `TopBar.tsx` -- remove `'three-tier'` from type and export dispatch branches

### Recommended Project Structure Changes

```
src/
  domain/
    schemas/
      input.ts             # MODIFIED: add topology, three-tier fields, defaults
      three-tier-input.ts  # KEEP (still used by three-tier engine and converged)
      three-tier-bom.ts    # KEEP (still used by three-tier engine and converged)
    engine/
      sizing.ts            # UNCHANGED (pure Clos engine)
      three-tier-sizing.ts # UNCHANGED (pure three-tier engine)
  store/
    inputStore.ts          # MODIFIED: unified input with topology field
    resultStore.ts         # MODIFIED: topology-aware dispatch (Clos or 3-tier)
    threeTierInputStore.ts # DELETE
    threeTierResultStore.ts # DELETE
  components/
    ModeSelector.tsx       # MODIFIED: 3 buttons instead of 4
    TopBar.tsx             # MODIFIED: remove three-tier export dispatch
    App.tsx                # MODIFIED: remove three-tier routing
  features/
    sizing/
      InputForm.tsx        # MODIFIED: add topology selector + conditional fields
      BOMPanel.tsx         # MODIFIED: render Clos or ThreeTier BOM based on topology
      SizingPage.tsx       # UNCHANGED (still uses InputForm + BOMPanel)
      three-tier/          # DELETE entire directory
    topology/
      TopologyTab.tsx      # MODIFIED: dispatch to Clos or ThreeTier canvas
      three-tier/          # KEEP files, but ThreeTierTopologyTab.tsx becomes internal
    rack-elevation/
      RackElevationTab.tsx # MODIFIED: dispatch to Clos or ThreeTier devices
      ThreeTierRackElevationTab.tsx # DELETE (merged into RackElevationTab)
    export/
      exportCsv.ts         # MODIFIED: topology-aware CSV
      exportPdf.ts         # MODIFIED: topology-aware PDF
      exportThreeTierCsv.ts # KEEP (still needed, called from unified export)
      exportThreeTierPdf.ts # KEEP (still needed, called from unified export)
```

### Anti-Patterns to Avoid

- **Don't merge the domain engines:** `calculateBOM()` and `calculateThreeTierBOM()` are pure functions with different input/output schemas. They MUST remain separate. The topology selector controls which one gets called, not how either one works.

- **Don't create a "super BOM" type:** The Clos BOM (NetworkBOM) and Three-Tier BOM (ThreeTierBOM) have fundamentally different fields (leafSwitches/spineSwitches vs accessSwitches/aggregationSwitches/coreSwitches). Don't try to merge them into one type. Instead, use a discriminated union or a result store that holds `bom: NetworkBOM | null` + `threeTierBom: ThreeTierBOM | null`.

- **Don't break converged mode:** Converged mode already uses `threeTierInputStore` and `threeTierResultStore` indirectly through the converged engine. It does NOT import those stores directly -- it imports the engines. So deleting the standalone three-tier stores is safe, but the three-tier engine and schemas MUST remain.

- **Don't forget localStorage migration:** The current `inputStore` uses localStorage key `'netstack-input'` with version 6. Adding a `topology` field requires bumping to version 7 and providing a merge function that defaults `topology` to `'leaf-spine'` for existing users. The standalone `'netstack-three-tier-input'` key becomes orphaned and should be cleaned up.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topology-conditional form | A separate form component per topology | `form.watch('topology')` conditional blocks | Already proven in ConvergedInputForm.tsx (660 lines) |
| Topology-aware BOM | A mega-BOM type with all fields optional | Discriminated store state with `NetworkBOM | null` + `ThreeTierBOM | null` | The two BOM schemas are structurally different; forcing union creates type unsafety |
| Engine dispatch | A new combined engine | Reuse `toEthernetInput()` / `toThreeTierInput()` mapper functions from converged-sizing.ts | Already implemented and tested in converged engine |

**Key insight:** The converged mode has already solved every architectural problem this phase faces. The implementation should be a direct port of the converged pattern into the Ethernet mode, followed by dead code removal.

## Common Pitfalls

### Pitfall 1: Zustand Re-render Loops with useShallow
**What goes wrong:** Forgetting `useShallow` on Zustand selectors causes infinite re-renders.
**Why it happens:** Zustand creates new object references on every state update. Without `useShallow`, React sees a "new" object every time.
**How to avoid:** Every `useXxxStore(s => ({ ... }))` must use `useShallow`.
**Warning signs:** Browser freezes, React devtools showing continuous re-renders.

### Pitfall 2: Store Schema Migration Breaking Existing Users
**What goes wrong:** Users with `'netstack-input'` in localStorage get broken state after the topology field is added.
**Why it happens:** The merge function doesn't handle missing `topology` field.
**How to avoid:** Bump version to 7, add merge function that defaults `topology` to `'leaf-spine'` when it's missing.
**Warning signs:** Default values not loading, NaN or undefined in form fields after upgrade.

### Pitfall 3: Converged Mode Regression
**What goes wrong:** Converged mode breaks because it depends on types or stores that were removed.
**Why it happens:** Overzealous dead code cleanup deletes files still needed by converged mode.
**How to avoid:**
- `three-tier-input.ts` (schema) -- KEEP (imported by converged-input.ts)
- `three-tier-bom.ts` (schema) -- KEEP (imported by converged-bom.ts)
- `three-tier-sizing.ts` (engine) -- KEEP (imported by converged-sizing.ts)
- `buildThreeTierTopologyGraph.ts` -- KEEP (needed for converged topology)
- `buildThreeTierRackDevices.ts` -- KEEP (needed for converged rack elevation)
**Warning signs:** TypeScript errors in converged files after deletion.

### Pitfall 4: Test Regressions From Store Changes
**What goes wrong:** Existing tests that import `threeTierInputStore` or `threeTierResultStore` fail.
**Why it happens:** Those stores are deleted, but their tests still reference them.
**How to avoid:** Delete test files for deleted stores. Update tests that verify Three-Tier behavior to use the unified store instead.
**Warning signs:** `Cannot find module` errors in test runs.

### Pitfall 5: Export Dispatch in TopBar Becomes Inconsistent
**What goes wrong:** CSV/PDF export downloads a Clos BOM when Three-Tier topology is selected, or vice versa.
**Why it happens:** TopBar dispatch logic only checks `mode` (not topology) and always calls `downloadBomCsv()` for `mode === 'ethernet'`.
**How to avoid:** TopBar must read the `topology` field from the result store and dispatch to the correct export function.
**Warning signs:** Wrong filename ("netstack-report.pdf" for a 3-tier design), wrong BOM contents in CSV.

### Pitfall 6: i18n Key for Mode Label
**What goes wrong:** The "Spine-Leaf" button label doesn't change to "Ethernet" after the merge.
**Why it happens:** The current i18n key `mode.ethernet` maps to "Spine-Leaf", which is now too specific.
**How to avoid:** Update `mode.ethernet` to "Ethernet" in all 4 locales (EN, FR, DE, IT). Add new keys for the topology selector within the Ethernet mode.
**Warning signs:** Button says "Spine-Leaf" when the mode now covers both topologies.

## Code Examples

### Example 1: Unified Input Store with Topology Field (Pattern from Converged)

```typescript
// inputStore.ts -- MODIFIED
const DEFAULT_INPUT: SizingInput = {
  topology: 'leaf-spine',  // NEW field
  racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
  // ... all existing Clos fields ...
  // ... new three-tier defaults ...
  accessModel: 'S5248F-ON',
  activeUplinksPerAccess: 4,
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
}
```

### Example 2: Topology-Aware Result Store Dispatch

```typescript
// resultStore.ts -- topology dispatch (inspired by converged engine)
import { calculateBOM } from '@/domain/engine/sizing'
import { calculateThreeTierBOM } from '@/domain/engine/three-tier-sizing'

useInputStore.subscribe((state) => {
  try {
    if (state.input.topology === 'three-tier') {
      const ttInput = toThreeTierInput(state.input);
      const ttBom = calculateThreeTierBOM(ttInput);
      useResultStore.setState({ bom: null, threeTierBom: ttBom, violations: ttBom.violations });
    } else {
      const closInput = toClosInput(state.input);
      const bom = calculateBOM(closInput);
      useResultStore.setState({ bom, threeTierBom: null, violations: bom.violations });
    }
  } catch { /* keep previous state */ }
});
```

### Example 3: Mode Type Reduction (3 modes instead of 4)

```typescript
// BEFORE
type Mode = 'ethernet' | 'fc' | 'converged' | 'three-tier'

// AFTER
type Mode = 'ethernet' | 'fc' | 'converged'
```

## Detailed File Inventory

### Files to MODIFY

| File | Change Description |
|------|-------------------|
| `src/domain/schemas/input.ts` | Add `topology` field, three-tier model fields, three-tier uplink fields |
| `src/store/inputStore.ts` | Add three-tier defaults, bump version to 7, update merge function |
| `src/store/resultStore.ts` | Add `threeTierBom` field, topology-aware dispatch |
| `src/components/ModeSelector.tsx` | Remove `'three-tier'` from type union and 4th button |
| `src/components/TopBar.tsx` | Remove `'three-tier'` from type union and export dispatch |
| `src/App.tsx` | Remove `'three-tier'` from type union and routing branches |
| `src/features/sizing/InputForm.tsx` | Add topology selector + conditional Clos/3-tier fields |
| `src/features/sizing/BOMPanel.tsx` | Topology-aware rendering (Clos or ThreeTier BOM) |
| `src/features/topology/TopologyTab.tsx` | Topology-aware canvas dispatch |
| `src/features/rack-elevation/RackElevationTab.tsx` | Topology-aware device building |
| `src/features/rack-elevation/index.ts` | Remove ThreeTierRackElevationTab export |
| `src/features/topology/index.ts` | Remove ThreeTierTopologyTab export |
| `src/features/export/index.ts` | Remove standalone three-tier export re-exports (keep functions) |
| `src/i18n/locales/en/translation.json` | Update `mode.ethernet` to "Ethernet", add topology selector keys |
| `src/i18n/locales/fr/translation.json` | Same updates in French |
| `src/i18n/locales/de/translation.json` | Same updates in German |
| `src/i18n/locales/it/translation.json` | Same updates in Italian |

### Files to DELETE (Dead Code)

| File | Reason |
|------|--------|
| `src/store/threeTierInputStore.ts` | Replaced by unified inputStore with topology field |
| `src/store/threeTierResultStore.ts` | Replaced by unified resultStore with topology dispatch |
| `src/features/sizing/three-tier/ThreeTierInputForm.tsx` | Merged into InputForm.tsx |
| `src/features/sizing/three-tier/ThreeTierBOMPanel.tsx` | Merged into BOMPanel.tsx |
| `src/features/sizing/three-tier/ThreeTierSizingPage.tsx` | No longer needed (SizingPage handles both) |
| `src/features/rack-elevation/ThreeTierRackElevationTab.tsx` | Merged into RackElevationTab.tsx |

### Files to KEEP (Still Needed by Converged / Shared Utilities)

| File | Why Keep |
|------|----------|
| `src/domain/schemas/three-tier-input.ts` | Imported by `converged-input.ts` and engines |
| `src/domain/schemas/three-tier-bom.ts` | Imported by `converged-bom.ts` and engines |
| `src/domain/engine/three-tier-sizing.ts` | Called by converged engine and unified result store |
| `src/domain/engine/three-tier-sizing.test.ts` | Tests the three-tier engine which still exists |
| `src/features/topology/three-tier/ThreeTierTopologyTab.tsx` | Used by converged topology tab |
| `src/features/topology/utils/buildThreeTierTopologyGraph.ts` | Used by converged topology |
| `src/features/rack-elevation/utils/buildThreeTierRackDevices.ts` | Used by converged rack elevation |
| `src/features/export/exportThreeTierCsv.ts` | Called from unified export and converged export |
| `src/features/export/exportThreeTierPdf.ts` | Called from unified export and converged export |
| `src/features/export/pdf/ThreeTierBOMPage.tsx` | Used by ThreeTier PDF document |
| `src/features/export/pdf/ThreeTierInputsPage.tsx` | Used by ThreeTier PDF document |
| `src/features/export/pdf/ThreeTierNetStackDocument.tsx` | Used by ThreeTier PDF generation |
| `src/features/export/pdf/ThreeTierViolationsPage.tsx` | Used by ThreeTier PDF document |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 4 separate modes (Ethernet, FC, Converged, Three-Tier) | 3 modes with internal topology selector | v5.0 (this phase) | Simpler UX, less cognitive overhead for users |
| Separate stores per topology | Unified store with topology discriminator | v5.0 (this phase) | Less code, single localStorage key per mode |
| Duplicated form components | Single form with conditional rendering | v3.0 (converged pioneered this) | Proven pattern, less maintenance burden |

**Key precedent:** Converged mode (v3.0) already uses a `topology` field in its schema and conditional rendering in its form. This phase extends the same pattern to standalone Ethernet mode.

## Open Questions

1. **ResultStore shape: discriminated union vs separate fields?**
   - What we know: The result store currently holds `bom: NetworkBOM | null`. Adding Three-Tier support means it also needs to hold `threeTierBom: ThreeTierBOM | null`.
   - What's unclear: Should we use two separate nullable fields (`bom` + `threeTierBom`) or a single discriminated field? Converged mode uses a combined `ConvergedBOM` type, but that's more complex than needed here.
   - Recommendation: Use `bom: NetworkBOM | null` + `threeTierBom: ThreeTierBOM | null` with exactly one non-null at a time. The BOM panel checks which is non-null. This is simpler than creating a new union type and avoids changing the existing `NetworkBOM` schema.

2. **Should ThreeTierTopologyTab be inlined into TopologyTab or kept separate and dispatched?**
   - What we know: ThreeTierTopologyTab has its own ReactFlowProvider, custom event handling, and 163 lines of code. Inlining would create a very large component.
   - Recommendation: Keep ThreeTierTopologyTab as a child component. TopologyTab dispatches to it based on topology. Same pattern as before, just the dispatch happens inside TopologyTab instead of App.tsx.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | vitest.config.ts (inferred from project setup) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ETH-01 | Topology selector in unified store dispatches correctly | unit | `npx vitest run src/store/resultStore.test.ts -x` | Exists (needs update) |
| ETH-02 | ModeSelector renders 3 buttons | unit | `npx vitest run src/components/ModeSelector.test.tsx -x` | Wave 0 |
| ETH-03 | InputForm shows correct fields per topology | unit | `npx vitest run src/features/sizing/InputForm.test.tsx -x` | Exists (needs update) |
| ETH-04 | BOM panel renders correct data per topology | unit | `npx vitest run src/features/sizing/BOMPanel.test.tsx -x` | Exists (needs update) |
| ETH-05 | Standalone three-tier stores deleted, no imports remain | smoke | `npx tsc --noEmit` | N/A (TypeScript check) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green + TypeScript clean before verify

### Wave 0 Gaps
- [ ] `src/components/ModeSelector.test.tsx` -- verify 3 buttons render
- [ ] Update `src/store/resultStore.test.ts` -- topology dispatch tests
- [ ] Update `src/features/sizing/InputForm.test.tsx` -- topology conditional rendering
- [ ] Update `src/features/sizing/BOMPanel.test.tsx` -- topology-aware BOM display

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** -- all 10 key areas listed in research scope were directly read and analyzed
- `src/domain/schemas/converged-input.ts` -- proven topology selector pattern
- `src/features/sizing/converged/ConvergedInputForm.tsx` -- proven conditional rendering pattern (993 lines)
- `src/domain/engine/converged-sizing.ts` -- proven topology dispatch pattern

### Secondary (MEDIUM confidence)
- None needed -- this is a pure refactoring of existing internal patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all patterns already proven in codebase
- Architecture: HIGH -- directly replicating the converged mode's topology pattern
- Pitfalls: HIGH -- all 6 pitfalls identified from analysis of actual code dependencies
- Dead code inventory: HIGH -- every file checked for import chains before marking for deletion

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- purely internal refactoring, no external dependencies to go stale)

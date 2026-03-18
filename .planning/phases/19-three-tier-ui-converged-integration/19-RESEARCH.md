# Phase 19: Three-Tier UI & Converged Integration - Research

**Researched:** 2026-03-18
**Domain:** React UI components, @xyflow/react topology rendering, Zustand state management, three-tier network topology visualization
**Confidence:** HIGH

## Summary

Phase 19 adds the user-facing UI for three-tier topology support. The domain layer (schemas, engine, catalog) was completed in Phase 18 with 43 passing tests. This phase wires the existing `calculateThreeTierBOM()` engine into new React components following the established patterns from Ethernet, FC SAN, and Converged modes.

The codebase has a very consistent pattern across all three existing modes: input form -> Zustand store (persisted) -> result store (derived) -> BOM panel + topology diagram + rack elevation. Phase 19 replicates this pattern for three-tier mode. The key novelty is the hierarchical (tree) topology diagram requiring a 4-tier Y-layout (core > aggregation > access > racks) instead of the 2-tier Clos layout (spine > leaf > racks).

**Primary recommendation:** Follow the established component patterns exactly. The three-tier standalone mode needs its own store pair (`threeTierInputStore` + `threeTierResultStore`), input form, BOM panel, topology graph builder, and rack elevation builder. The converged mode needs updates to its existing components to handle `topology='three-tier'` (replacing the current placeholder "coming in a future release" guards). No new libraries needed -- manual coordinate-based layout for the topology diagram matches the project's existing approach.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TUI-01 | Three-Tier standalone mode as 4th button in mode selector | ModeSelector.tsx has 3 buttons with typed union; extend to 4-value union. App.tsx routes modes via ternary chain. |
| TUI-02 | Topology selector in Converged mode to pick Clos or 3-tier for Ethernet portion | ConvergedInputForm.tsx already has `topology` field in store (default 'leaf-spine'). Need to add a Select dropdown that sets this field. ConvergedBOMPanel/TopologyTab/RackElevation already branch on `bom.ethernetBom` vs `bom.threeTierBom`. |
| TUI-03 | Three-tier input form with access/aggregation/core model selectors + uplink counts per tier | ThreeTierSizingInputSchema defines all fields (accessModel, aggregationModel, coreModel, activeUplinksPerAccess, activeUplinksPerAggregation). Follow InputForm.tsx pattern with react-hook-form + useShallow. |
| TUI-04 | BOM panel adapted for 3-tier breakdown (access/aggr/core instead of leaf/spine) | ThreeTierBOM schema has accessSwitches, aggregationSwitches, coreSwitches, two oversubscription ratios. Follow BOMPanel.tsx pattern with switch table + cable table + violations. |
| TUI-05 | Hierarchical topology diagram (tree layout: core > aggr > access > racks) | Use same @xyflow/react manual coordinate layout as buildTopologyGraph.ts. Add 4 Y-tiers instead of 3. No external layout library needed. |
| TUI-06 | Rack elevation for 3-tier: server racks (access switches) + aggregation/core network racks | ThreeTierBOM has `networkRacks` field. Server racks get access switch pairs instead of leaf pairs. Network racks get aggr + core + border leaf switches. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.1.0 | UI framework | Project standard |
| @xyflow/react | ^12.10.1 | Topology diagrams | Project standard (replaces deprecated reactflow) |
| zustand | ^5.0.12 | State management | Project standard with persist middleware |
| react-hook-form | ^7.71.2 | Form state | Project standard for all input forms |
| zod | ^4.3.6 | Schema validation | Project standard, types inferred via z.infer |
| react-i18next | (installed) | Internationalization | Project standard, 4 locales |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | ^0.7.1 | Badge variants | Oversubscription severity badges |
| lucide-react | (installed) | Icons | Alert icons (AlertCircle, AlertTriangle, BarChart3) |
| shadcn/ui components | (installed) | UI primitives | Card, Table, Select, Alert, Progress, Tooltip, Separator |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual coordinate layout | dagre/elkjs | Would add a dependency; existing codebase uses manual layout successfully for 3 topology types. Manual layout is simpler and already proven. |
| New standalone store | Extending convergedInputStore | Standalone mode needs independent persistence (separate localStorage key). Following the Ethernet/FC pattern of dedicated stores. |

**Installation:**
No new packages needed. All dependencies are already installed.

## Architecture Patterns

### Recommended Project Structure

New files for Phase 19:
```
src/
  store/
    threeTierInputStore.ts         # NEW: persisted input store for standalone 3-tier mode
    threeTierResultStore.ts        # NEW: derived result store (subscribes to input store)
  features/
    sizing/
      three-tier/
        ThreeTierInputForm.tsx     # NEW: input form for standalone 3-tier mode
        ThreeTierBOMPanel.tsx      # NEW: BOM panel for 3-tier breakdown
        ThreeTierSizingPage.tsx    # NEW: page layout (form + BOM side-by-side)
    topology/
      three-tier/
        ThreeTierTopologyTab.tsx   # NEW: standalone 3-tier topology tab
      utils/
        buildThreeTierTopologyGraph.ts  # NEW: ThreeTierBOM -> {nodes, edges}
    rack-elevation/
      utils/
        buildThreeTierRackDevices.ts    # NEW: server rack + network rack devices
      ThreeTierRackElevationTab.tsx     # NEW: standalone 3-tier rack elevation

Modified files:
  components/
    ModeSelector.tsx               # MODIFY: add 4th 'three-tier' button
    TopBar.tsx                     # MODIFY: update mode type if needed
  App.tsx                          # MODIFY: add three-tier routing in mode switch
  features/
    sizing/converged/
      ConvergedInputForm.tsx       # MODIFY: add topology selector dropdown
      ConvergedBOMPanel.tsx        # MODIFY: replace placeholder with real 3-tier BOM display
    topology/converged/
      ConvergedTopologyTab.tsx     # MODIFY: handle bom.threeTierBom (currently shows empty state)
    rack-elevation/
      ConvergedRackElevationTab.tsx # MODIFY: handle bom.threeTierBom rack types
  i18n/locales/{en,fr,de,it}/
    translation.json               # MODIFY: add three-tier i18n keys
  features/topology/index.ts       # MODIFY: export ThreeTierTopologyTab
  features/rack-elevation/index.ts # MODIFY: export ThreeTierRackElevationTab
```

### Pattern 1: Mode-Specific Store Pair (Persisted Input + Derived Result)
**What:** Each mode gets a persisted input store and a derived result store. The result store subscribes to the input store at module level and recomputes BOM on every change.
**When to use:** For the standalone three-tier mode (not converged -- converged already has its store).
**Example:**
```typescript
// threeTierInputStore.ts -- follows inputStore.ts / fcInputStore.ts pattern
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThreeTierSizingInput } from '@/domain/schemas/three-tier-input'

interface ThreeTierInputState {
  input: ThreeTierSizingInput
  setInput: (partial: Partial<ThreeTierSizingInput>) => void
  resetInput: () => void
}

const DEFAULT_THREE_TIER_INPUT: ThreeTierSizingInput = {
  racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  connectivityType: '25G',
  cableType: 'DAC',
  accessModel: 'S5248F-ON',
  activeUplinksPerAccess: 4,
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
  borderLeafModel: 'none',
  borderLeafCount: 0,
  rackSize: '42U',
  serverUHeight: '1U',
  switchPositioning: 'ToR',
}

// Same lazyLocalStorage pattern, persist key: 'netstack-three-tier-input'
// Same merge pattern for forward compatibility
```

```typescript
// threeTierResultStore.ts -- follows resultStore.ts pattern
import { create } from 'zustand'
import { calculateThreeTierBOM } from '@/domain/engine/three-tier-sizing'
import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'
import { useThreeTierInputStore } from './threeTierInputStore'

interface ThreeTierResultState {
  bom: ThreeTierBOM | null
  violations: ThreeTierBOM['violations']
}

export const useThreeTierResultStore = create<ThreeTierResultState>()(() => ({
  bom: null,
  violations: [],
}))

// Module-level subscription -- same pattern as resultStore.ts
useThreeTierInputStore.subscribe((state) => {
  try {
    const bom = calculateThreeTierBOM(state.input)
    useThreeTierResultStore.setState({ bom, violations: bom.violations })
  } catch { /* keep previous state on error */ }
})
```

### Pattern 2: Four-Tier Hierarchical Topology Graph
**What:** Manual coordinate-based layout with 4 Y tiers: core (top) > aggregation > access > racks (bottom). Same approach as `buildTopologyGraph.ts` but with an additional tier.
**When to use:** For `buildThreeTierTopologyGraph.ts` that converts `ThreeTierBOM` to `{nodes, edges}`.
**Example:**
```typescript
// Y positions for each tier in the hierarchical layout
const Y = { core: 0, aggr: 160, access: 320, rack: 440, oob: 560 } as const

// Core switches: centered at top (like spines in Clos)
// Aggregation switches: centered below core (new tier)
// Access switches: per-rack pairs below aggregation (like leaves in Clos)
// Racks: below their access pair (same as Clos)
// OOB: below racks (same as Clos)
```

### Pattern 3: ModeSelector Extension
**What:** Add a 4th button to ModeSelector. The mode type union becomes `'ethernet' | 'fc' | 'converged' | 'three-tier'`.
**When to use:** ModeSelector.tsx and App.tsx routing.
**Example:**
```typescript
// ModeSelector.tsx
interface ModeSelectorProps {
  mode: 'ethernet' | 'fc' | 'converged' | 'three-tier'
  onModeChange: (m: 'ethernet' | 'fc' | 'converged' | 'three-tier') => void
}
// Add 4th Button with variant logic matching existing pattern
```

### Pattern 4: Converged Topology Selector
**What:** A Select dropdown in ConvergedInputForm that toggles `topology` between 'leaf-spine' and 'three-tier'. When 'three-tier' is selected, show 3-tier-specific fields (accessModel, aggregationModel, coreModel, etc.) instead of leaf/spine fields.
**When to use:** ConvergedInputForm.tsx Ethernet section.
**Example:**
```typescript
// Inside ConvergedInputForm, add topology selector at top of Ethernet section:
<FormField
  control={form.control}
  name="topology"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('converged.topologySelector')}</FormLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <FormControl>
          <SelectTrigger><SelectValue /></SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="leaf-spine">{t('converged.topologyLeafSpine')}</SelectItem>
          <SelectItem value="three-tier">{t('converged.topologyThreeTier')}</SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
// Then conditionally show leaf/spine fields OR access/aggr/core fields
```

### Pattern 5: Three-Tier BOM Panel Display
**What:** Display two oversubscription ratios (access-to-aggr and aggr-to-core), three switch tiers in the switches table, and three inter-tier cable types in the cables table.
**When to use:** ThreeTierBOMPanel.tsx (standalone) and ConvergedBOMPanel.tsx (when threeTierBom is non-null).

### Anti-Patterns to Avoid
- **Nested ReactFlowProviders:** Each ReactFlow canvas MUST have its own provider as a sibling, never nested. The converged topology already demonstrates this pattern.
- **nodeTypes inside component:** MUST be defined at module level (not inside the component function) to prevent infinite re-registration.
- **Duplicating engine logic in UI:** The BOM panel must only READ from the store, never recalculate. All logic lives in the domain engine.
- **Missing useShallow:** Every Zustand selector MUST use `useShallow` from `zustand/shallow` to avoid infinite render loops.
- **Declaring types separately from Zod schemas:** Use `z.infer<typeof Schema>`, never manual interfaces for domain types.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Custom onChange handlers | react-hook-form with `useForm<FormValues>` | Debouncing, validation, field registration already solved |
| Persistent user input | Manual localStorage calls | Zustand `persist` middleware with lazy storage adapter | Migration/versioning/merge handled by middleware |
| Topology node rendering | Raw SVG or canvas | @xyflow/react with custom nodeTypes | Zoom, pan, fit-view, export-to-PNG all built-in |
| Oversubscription badges | Raw className strings | class-variance-authority (cva) | Type-safe variant selection, matches existing codebase |
| Hierarchical layout | dagre/elkjs | Manual Y-tier coordinates | Simpler, no new dependency, proven pattern in codebase |

**Key insight:** The codebase already has complete working examples for every UI pattern needed. The three-tier UI is structurally identical to the existing Ethernet UI with different field names and an extra tier level.

## Common Pitfalls

### Pitfall 1: ConvergedBOMPanel Three-Tier Guard
**What goes wrong:** The existing ConvergedBOMPanel has a placeholder guard at line 232: `if (!bom.ethernetBom)` returns a "coming in a future release" message. When topology='three-tier', ethernetBom is null and threeTierBom is populated. The guard must be updated to display the three-tier BOM instead of the placeholder.
**Why it happens:** Phase 18-03 intentionally deferred the UI work.
**How to avoid:** Replace the placeholder with a full three-tier BOM display section that checks `bom.threeTierBom !== null`.
**Warning signs:** If converged mode with topology='three-tier' shows "coming in a future release" instead of actual BOM data.

### Pitfall 2: ConvergedTopologyTab Empty State for Three-Tier
**What goes wrong:** ConvergedTopologyTab line 112 checks `!bom.ethernetBom` and shows empty state. When three-tier is active, this shows an empty topology instead of the hierarchical diagram.
**Why it happens:** Same Phase 18-03 deferral.
**How to avoid:** Add a branch: if `bom.threeTierBom`, render the three-tier topology canvas; if `bom.ethernetBom`, render the existing Clos canvas.
**Warning signs:** Converged topology tab blank when three-tier topology is selected.

### Pitfall 3: ConvergedRackElevationTab Three-Tier Guard
**What goes wrong:** ConvergedRackElevationTab line 89 checks `!bom.ethernetBom` and shows empty state. Three-tier mode needs its own rack devices builder.
**Why it happens:** Same deferral.
**How to avoid:** Add three-tier branch that builds access-switch server racks and aggr/core network racks.

### Pitfall 4: Topology Node Role Types
**What goes wrong:** The existing `SwitchNodeData.role` is typed as `'spine' | 'leaf' | 'oob' | 'border'`. Three-tier needs `'access' | 'aggregation' | 'core'` roles for correct node rendering (color, label).
**Why it happens:** The type was designed for Clos topology only.
**How to avoid:** Extend the role union type: `'spine' | 'leaf' | 'oob' | 'border' | 'access' | 'aggregation' | 'core'`. Update `SwitchNode.tsx` to render colors/labels for the new roles.
**Warning signs:** TypeScript compile errors or missing node colors.

### Pitfall 5: Converged Input Form Field Visibility
**What goes wrong:** When topology='three-tier' is selected in converged mode, leaf/spine fields should be hidden and access/aggr/core fields shown. If both are shown, the form becomes confusing. If neither are shown, the user can't configure anything.
**Why it happens:** Conditional rendering not gated on topology field value.
**How to avoid:** Use `form.watch('topology')` to conditionally render the appropriate field set. Leaf/spine section shown when 'leaf-spine', access/aggr/core section shown when 'three-tier'.

### Pitfall 6: Z-Series uHeight in Rack Elevation
**What goes wrong:** Z9264F-ON has `uHeight: 2` (2U chassis). If the rack device builder hardcodes 1U for switch height, the rack elevation will undercount U-usage.
**Why it happens:** S-series switches are all 1U; easy to assume all switches are 1U.
**How to avoid:** Always read `SWITCH_CATALOG[model].uHeight ?? 1` when computing device placement. The engine already does this correctly.

### Pitfall 7: Missing activeUplinksPerAccess Mapping in Converged
**What goes wrong:** The converged schema reuses `activeUplinksPerLeaf` as `activeUplinksPerAccess` (Phase 18-03 decision). But the converged input form currently has no field for this when three-tier is selected.
**Why it happens:** The field mapping is in the converged engine (`toThreeTierInput`), not the UI.
**How to avoid:** When topology='three-tier' in converged mode, show `activeUplinksPerLeaf` with a three-tier-appropriate label (e.g., "Active Uplinks per Access Switch"). The underlying store field is the same.

## Code Examples

Verified patterns from existing codebase:

### Store Subscription Pattern (module-level)
```typescript
// Source: src/store/convergedResultStore.ts
useConvergedInputStore.subscribe((state) => {
  try {
    const bom = calculateConvergedBOM(state.input)
    useConvergedResultStore.setState({ bom, violations: bom.violations })
  } catch {
    // Keep previous state on error during partial form updates
  }
})
```

### Mode Routing Pattern (App.tsx)
```typescript
// Source: src/App.tsx line 47
// Current pattern: ternary chain for 3 modes
{mode === 'fc' ? <FCSizingPage /> : mode === 'converged' ? <ConvergedSizingPage /> : <SizingPage />}
// Extend to 4 modes:
{mode === 'fc' ? <FCSizingPage />
  : mode === 'converged' ? <ConvergedSizingPage />
  : mode === 'three-tier' ? <ThreeTierSizingPage />
  : <SizingPage />}
```

### Topology Graph Builder (manual coordinate layout)
```typescript
// Source: src/features/topology/utils/buildTopologyGraph.ts
// Y positions for Clos topology
const Y = { spine: 0, leaf: 160, rack: 280, oob: 400 } as const
// For three-tier, add aggregation tier:
const Y = { core: 0, aggr: 160, access: 320, rack: 440, oob: 560 } as const
```

### Lazy localStorage Adapter
```typescript
// Source: src/store/convergedInputStore.ts
// Every input store uses this exact pattern for SSR/test compatibility
const lazyLocalStorage: PersistStorage<InputState> = {
  getItem: (name) => { try { return JSON.parse(window.localStorage.getItem(name)!) } catch { return null } },
  setItem: (name, value) => { try { window.localStorage.setItem(name, JSON.stringify(value)) } catch {} },
  removeItem: (name) => { try { window.localStorage.removeItem(name) } catch {} },
}
```

### Form Watch + Conditional Rendering
```typescript
// Source: src/features/sizing/converged/ConvergedInputForm.tsx line 535
// Conditionally show border leaf count when border model is selected
{form.watch('borderLeafModel') !== 'none' && (
  <FormField ... />
)}
// Same pattern for topology-conditional fields:
{form.watch('topology') === 'three-tier' && (
  // Show access/aggregation/core fields
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Placeholder guard for 3-tier BOM | Full 3-tier BOM display | Phase 19 (now) | ConvergedBOMPanel, ConvergedTopologyTab, ConvergedRackElevationTab all gain real 3-tier support |
| 3-mode selector (eth/fc/conv) | 4-mode selector (eth/fc/conv/3-tier) | Phase 19 (now) | ModeSelector type union expands, App.tsx gains new routing branch |
| SwitchNodeData role: 4 values | 7 values (adds access/aggr/core) | Phase 19 (now) | SwitchNode.tsx must render new roles with appropriate colors |

**Deprecated/outdated:**
- ConvergedBOMPanel placeholder "coming in a future release" message at line 232-246: replaced by real 3-tier BOM rendering
- ConvergedTopologyTab empty state when ethernetBom is null: replaced by 3-tier topology canvas
- ConvergedRackElevationTab empty state when ethernetBom is null: replaced by 3-tier rack devices

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via vite.config.ts) |
| Config file | vite.config.ts (test section at line 76) |
| Quick run command | `npx vitest run src/features/sizing/three-tier/` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TUI-01 | 4th mode button renders, mode state updates | unit (React) | `npx vitest run src/components/ModeSelector.test.tsx -x` | No - Wave 0 |
| TUI-02 | Converged topology selector changes form fields | unit (React) | `npx vitest run src/features/sizing/converged/ConvergedInputForm.test.tsx -x` | Partial (existing test, needs new cases) |
| TUI-03 | Three-tier input form renders all fields, syncs to store | unit (React) | `npx vitest run src/features/sizing/three-tier/ThreeTierInputForm.test.tsx -x` | No - Wave 0 |
| TUI-04 | Three-tier BOM panel displays access/aggr/core counts | unit (React) | `npx vitest run src/features/sizing/three-tier/ThreeTierBOMPanel.test.tsx -x` | No - Wave 0 |
| TUI-05 | Three-tier topology graph has core/aggr/access/rack nodes | unit (pure) | `npx vitest run src/features/topology/utils/buildThreeTierTopologyGraph.test.ts -x` | No - Wave 0 |
| TUI-06 | Three-tier rack elevation builds access+network racks | unit (pure) | `npx vitest run src/features/rack-elevation/utils/buildThreeTierRackDevices.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/features/sizing/three-tier/ src/features/topology/utils/ src/features/rack-elevation/utils/ --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/sizing/three-tier/ThreeTierInputForm.test.tsx` -- covers TUI-03
- [ ] `src/features/sizing/three-tier/ThreeTierBOMPanel.test.tsx` -- covers TUI-04
- [ ] `src/features/topology/utils/buildThreeTierTopologyGraph.test.ts` -- covers TUI-05
- [ ] `src/features/rack-elevation/utils/buildThreeTierRackDevices.test.ts` -- covers TUI-06
- [ ] `src/store/threeTierInputStore.test.ts` -- store persistence + reset
- [ ] `src/store/threeTierResultStore.test.ts` -- subscription + recompute

## Open Questions

1. **SwitchNode color mapping for new roles**
   - What we know: SwitchNode.tsx currently maps 4 roles (spine, leaf, oob, border) to colors. Three-tier needs access, aggregation, core roles.
   - What's unclear: Exact color scheme for the 3 new roles. Recommendation: access = same blue as leaf (server-facing), aggregation = amber/gold (mid-tier), core = purple (backbone). Verify against existing color scheme during implementation.
   - Recommendation: Read SwitchNode.tsx during implementation and extend its color map.

2. **Topology edge styling for inter-tier links**
   - What we know: Clos uses thin gray lines for leaf-spine and dashed blue for VLT. FC uses different colors per fabric.
   - What's unclear: Whether access-aggr and aggr-core edges should have distinct visual styling.
   - Recommendation: Use distinct stroke widths: access-aggr = 1.5px (like leaf-spine), aggr-core = 2.5px (thicker to indicate backbone). VLT between access pairs = same dashed blue.

3. **Network rack device builder for three-tier**
   - What we know: ThreeTierBOM has `networkRacks` count but the formula is `ceil(networkDeviceCount / rackSizeU)` which may put too many devices per rack.
   - What's unclear: Whether aggregation and core switches should be in the same or separate network racks.
   - Recommendation: Single network rack view showing all aggr + core + border leaf devices, consistent with the existing `buildNetworkRackDevices` pattern.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: All source files in `src/` examined directly
- Domain schemas: `src/domain/schemas/three-tier-input.ts`, `three-tier-bom.ts`
- Domain engine: `src/domain/engine/three-tier-sizing.ts` (43 passing tests)
- Existing UI patterns: `InputForm.tsx`, `BOMPanel.tsx`, `TopologyCanvas.tsx`, `RackElevationTab.tsx`
- Converged patterns: `ConvergedInputForm.tsx`, `ConvergedBOMPanel.tsx`, `ConvergedTopologyTab.tsx`, `ConvergedRackElevationTab.tsx`
- Store patterns: `inputStore.ts`, `resultStore.ts`, `convergedInputStore.ts`, `convergedResultStore.ts`

### Secondary (MEDIUM confidence)
- @xyflow/react v12.10.1 API: Manual coordinate layout confirmed working in 3 existing topology builders. No auto-layout features needed.

### Tertiary (LOW confidence)
- None -- all findings based on direct codebase examination.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use, versions verified from package.json and node_modules
- Architecture: HIGH - direct codebase analysis of 3 existing mode implementations provides exact patterns to follow
- Pitfalls: HIGH - identified from actual code guards and TODOs left by Phase 18

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- internal codebase patterns, no external API changes expected)

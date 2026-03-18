# Phase 16: Converged UI - Research

**Researched:** 2026-03-18
**Domain:** React UI composition for converged Ethernet + FC mode
**Confidence:** HIGH

## Summary

Phase 16 creates the UI layer for converged mode, building on Phase 15's domain schemas (ConvergedSizingInput), engine (calculateConvergedBOM), and stores (convergedInputStore, convergedResultStore). The converged UI is a composition pattern: a single input form drives one unified store, which produces a ConvergedBOM containing both ethernetBom (always present) and fcBom (nullable when hbaPortsPerServer=0). The BOM panel, topology view, and rack elevation all consume sub-BOMs from the converged result store.

The existing codebase provides complete reference implementations for both Ethernet (InputForm, BOMPanel, TopologyTab, RackElevationTab) and FC (FCInputForm, FCBOMPanel, FCTopologyTab) modes. The converged UI follows the same react-hook-form + Zustand + debounce pattern, but uses `useConvergedInputStore` and `useConvergedResultStore` instead of the mode-specific stores. The domain isolation principle (ADR-0009) applies at the render level: the converged BOM panel embeds both an Ethernet section and an FC section, but these sections reference their respective sub-BOM fields -- never cross-import.

Currently App.tsx shows `<SizingPage />` when mode is 'converged' (placeholder from Phase 15). This phase replaces that with a dedicated `<ConvergedSizingPage />` that composes converged-specific input form, BOM panel, topology, and rack elevation components.

**Primary recommendation:** Create new converged components under `src/features/sizing/converged/` that mirror the Ethernet/FC structure. The converged input form uses a single react-hook-form instance bound to convergedInputStore, with sections for shared rack config, Ethernet parameters, and FC parameters (FC section conditionally enabled when hbaPortsPerServer > 0). The BOM panel reads from convergedResultStore and renders Ethernet switches, FC switches (when present), combined cables, and merged violations.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONV-06 | Converged input form with shared rack config + Ethernet section + FC section | Converged form mirrors InputForm + FCInputForm patterns, bound to convergedInputStore. Shared rack config section (racks, rackSize, serverUHeight) appears once. Ethernet section has connectivity/cable/leaf/spine/border/uplink fields. FC section has hbaPortsPerServer (min=0), storage, switch, ISL, generation fields. FC section visually disabled when hbaPortsPerServer=0. |
| CONV-07 | Combined BOM panel showing Ethernet switches, FC switches, and total cables | ConvergedBOMPanel reads from convergedResultStore.bom (ConvergedBOM). Renders Ethernet oversubscription + switch table + cables from bom.ethernetBom. Conditionally renders FC fan-in + switches + optics from bom.fcBom when non-null. Shows merged violations from bom.violations. |
| CONV-08 | Topology view with Ethernet leaf-spine + FC Fabric A + Fabric B | ConvergedTopologyTab renders Ethernet topology (using bom.ethernetBom) always, plus FC dual-fabric topology (using bom.fcBom) when FC is enabled. Layout: Ethernet topology on top/left, FC fabrics below/right with Fabric A/B split. |
| CONV-09 | Rack elevation shows server racks (3U Ethernet overhead) + FC network racks | ConvergedRackElevationTab uses convergedResultStore. Server racks show Ethernet leaf pair + OOB using existing buildRackDevices(ethernetBom). FC network racks are a separate category in the rack selector (FC directors are 8-14U, dedicated racks per requirements). |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | existing | UI components | Project standard |
| react-hook-form | existing | Form state management | Pattern used by InputForm.tsx and FCInputForm.tsx |
| zustand | existing | Global state (convergedInputStore, convergedResultStore) | Project standard, useShallow for selectors |
| @xyflow/react | existing | Topology diagrams (ReactFlow) | Project standard, NOT deprecated reactflow |
| react-i18next | existing | Internationalization | 4-locale support (EN/FR/DE/IT) |
| tailwindcss v4 | existing | Styling | @tailwindcss/vite plugin, no config file |
| class-variance-authority | existing | Variant-based styling for badges | Used by BOMPanel severity badges |
| lucide-react | existing | Icons | Project standard icon library |
| zod | existing (v4) | Schema validation | Types from z.infer<>, never separate interfaces |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/* | existing | Shadcn/ui primitives (tabs, select, tooltip) | All UI components use these |

**Installation:** No new packages needed. All dependencies already in package.json.

## Architecture Patterns

### Recommended Project Structure

```
src/features/sizing/converged/
  ConvergedSizingPage.tsx          # Layout: input form + BOM panel (mirrors SizingPage)
  ConvergedInputForm.tsx           # Single form → convergedInputStore
  ConvergedBOMPanel.tsx            # Reads convergedResultStore, renders both sub-BOMs
src/features/topology/converged/
  ConvergedTopologyTab.tsx         # Renders Ethernet + FC topologies from convergedResultStore
src/features/rack-elevation/
  (extend existing RackElevationTab or create ConvergedRackElevationTab)
  utils/buildConvergedRackDevices.ts  # Extends buildRackDevices for converged (adds FC racks)
```

### Pattern 1: Single Form, Single Store, Sectioned UI

**What:** The converged input form binds to `useConvergedInputStore` via react-hook-form. It has 3 visual sections:
1. **Shared Rack Config** -- racks array, rackSize, serverUHeight (identical to both Ethernet and FC forms)
2. **Ethernet Network** -- connectivityType, cableType, leafModel, spineModel, borderLeaf*, activeUplinksPerLeaf, portsPerServerFrontend, portsPerServerBackend, switchPositioning
3. **FC SAN** -- hbaPortsPerServer (min=0), storageTargetPorts, storageArrayCount, fcSwitchModel, islPortsPerSwitch, preferredGeneration

**When to use:** Always for converged mode.

**Example:**
```typescript
// Source: existing pattern from InputForm.tsx and FCInputForm.tsx
import { useConvergedInputStore } from '@/store/convergedInputStore'

const { input, setInput, resetInput } = useConvergedInputStore(
  useShallow((s) => ({ input: s.input, setInput: s.setInput, resetInput: s.resetInput }))
)

const form = useForm<ConvergedFormValues>({
  defaultValues: {
    rackCount: input.racks.length,
    rackServers: input.racks.map(r => r.serverCount),
    // ...all converged fields
    hbaPortsPerServer: input.hbaPortsPerServer, // 0 = FC disabled
  },
  mode: 'onChange',
})
```

### Pattern 2: Conditional FC Rendering in BOM Panel

**What:** The converged BOM panel always shows Ethernet BOM data and conditionally shows FC data based on `bom.fcBom !== null`.

**Example:**
```typescript
// Source: convergedResultStore pattern
const { bom, violations } = useConvergedResultStore(
  useShallow((s) => ({ bom: s.bom, violations: s.violations }))
)

// Always render Ethernet section
<EthernetBOMSection ethernetBom={bom.ethernetBom} />

// Conditionally render FC section
{bom.fcBom && <FCBOMSection fcBom={bom.fcBom} />}

// Always render combined violations
<ViolationsSection violations={bom.violations} />
```

### Pattern 3: Converged Topology Composition

**What:** The converged topology view shows Ethernet leaf-spine topology and (when FC enabled) dual-fabric FC topology in a stacked or side-by-side layout.

**When to use:** CONV-08. The Ethernet portion uses `buildTopologyGraph(bom.ethernetBom)` and the FC portion uses `buildFCTopologyGraph(bom.fcBom)`.

**Key consideration:** Each ReactFlow canvas needs its own `<ReactFlowProvider>`. The existing FC topology already uses separate providers for Fabric A and Fabric B. The converged view needs 3 providers total (Ethernet + FC Fabric A + FC Fabric B), or 1 provider when FC is disabled.

### Pattern 4: Rack Elevation Extension for FC Racks

**What:** Converged rack elevation shows server racks (Ethernet leaf pair + OOB per rack, from existing buildRackDevices) plus FC network racks (Brocade directors/switches in dedicated racks).

**Key constraint from REQUIREMENTS.md:** "FC switches co-located in server racks" is explicitly OUT OF SCOPE. Directors are 8-14U; dedicated FC racks is standard practice.

**Implementation:** Extend the rack selector dropdown to include FC network rack entries. FC racks contain only Brocade switches. The `buildConvergedRackDevices` function creates RackDevice entries from the FC BOM (fabricASwitches + fabricBSwitches with appropriate U heights from the FC catalog).

### Pattern 5: Debounced Form Updates

**What:** All numeric inputs use 150ms debounce before calling setInput(). Select inputs update immediately. This is the exact pattern from InputForm.tsx and FCInputForm.tsx.

**Critical:** Must use `useRef<ReturnType<typeof setTimeout>>` for the debounce timer. Clean up on subscription unsubscribe.

### Anti-Patterns to Avoid

- **Importing from mode-specific stores in converged components:** Converged components MUST only use `useConvergedInputStore` and `useConvergedResultStore`. Never import from `inputStore`, `resultStore`, `fcInputStore`, or `fcResultStore`.
- **Cross-importing Ethernet BOM components into FC sections:** The converged BOM panel can render both Ethernet and FC data, but should not import `BOMPanel` or `FCBOMPanel` directly as child components. Instead, extract shared rendering patterns into the converged component (or create small shared helpers) while keeping the store bindings separate.
- **Creating a single massive form component:** The converged input form will be large. Use section components (functions or sub-components within the file) to keep it readable, but keep the single `useForm` instance.
- **Using `any` types:** TypeScript strict mode is enforced. All form values must be typed.
- **Defining nodeTypes inside React components:** ReactFlow nodeTypes must be at module level (causes infinite re-renders otherwise).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Custom onChange handlers | react-hook-form useForm + watch | Proven pattern in InputForm.tsx, handles validation, dirty tracking |
| Debounced store sync | Custom debounce utility | setTimeout pattern from existing forms | 150ms debounce already proven, consistent behavior |
| Topology graph building | Custom node layout | buildTopologyGraph + buildFCTopologyGraph | Already tested, handles all edge cases |
| Rack device building | Custom rack builder | buildRackDevices + buildNetworkRackDevices | Handles positioning (ToR/MoR/BoR), slot allocation |
| Severity badges | Custom styling | cva (class-variance-authority) | Consistent with BOMPanel.tsx and FCBOMPanel.tsx |
| FC switch U-heights | Hardcoded values | FC_SWITCH_CATALOG from brocade.ts | Catalog has verified specs per model |

**Key insight:** The converged UI is a composition layer. Almost all rendering logic can be adapted from the existing Ethernet and FC components. The only genuinely new code is the orchestration (single form -> single store -> combined display).

## Common Pitfalls

### Pitfall 1: Store Cross-Contamination
**What goes wrong:** Converged components accidentally read from `useResultStore` or `useFCResultStore` instead of `useConvergedResultStore`, causing stale/wrong data.
**Why it happens:** Copy-paste from existing components without updating imports.
**How to avoid:** Every converged component file must import ONLY from `convergedInputStore` and `convergedResultStore`. Run `grep` across converged files to verify no unauthorized store imports.
**Warning signs:** Data doesn't update when converged form changes; wrong BOM displayed.

### Pitfall 2: FC Section Visible When hbaPortsPerServer = 0
**What goes wrong:** FC BOM section shows empty/broken state instead of being hidden when FC is disabled.
**Why it happens:** Not checking `bom.fcBom !== null` before rendering FC sections.
**How to avoid:** Always gate FC rendering on `bom.fcBom !== null` (not on `bom.fcBom.fabricASwitches > 0` or similar).
**Warning signs:** Empty FC tables, NaN values, null pointer errors.

### Pitfall 3: useShallow Omission Causes Infinite Re-renders
**What goes wrong:** Component re-renders infinitely, browser tab freezes.
**Why it happens:** Zustand selector returns a new object reference on every call without `useShallow`.
**How to avoid:** ALWAYS wrap multi-field selectors with `useShallow` from `zustand/shallow`.
**Warning signs:** Browser hang, React DevTools showing thousands of re-renders.

### Pitfall 4: Multiple ReactFlowProviders Interference
**What goes wrong:** Calling `useReactFlow()` from a canvas picks up the wrong provider.
**Why it happens:** Converged topology has 3 separate ReactFlow instances. If providers are nested incorrectly, the inner canvas may resolve to the outer provider.
**How to avoid:** Each ReactFlow canvas must be wrapped in its own `<ReactFlowProvider>`. They must be siblings, not nested. The existing FCTopologyTab already demonstrates this pattern correctly.
**Warning signs:** fitView affects wrong canvas, nodes appear in wrong pane.

### Pitfall 5: Form Reset Doesn't Match Store Defaults
**What goes wrong:** Reset button leaves form and store out of sync.
**Why it happens:** form.reset() values don't match DEFAULT_CONVERGED_INPUT in convergedInputStore.
**How to avoid:** Extract the default values as a shared constant or derive form defaults from the store's default state.
**Warning signs:** After reset, form shows different values than what store reports.

### Pitfall 6: Missing i18n Keys Cause Key Fallback Display
**What goes wrong:** UI shows raw key strings like "converged.heading" instead of translated text.
**Why it happens:** New i18n keys added to EN but not FR/DE/IT, or keys not added at all.
**How to avoid:** Add all new converged i18n keys to all 4 locale files simultaneously.
**Warning signs:** Untranslated key strings visible in the UI.

### Pitfall 7: Rack Elevation FC Device Missing U-Height
**What goes wrong:** FC switches rendered with uHeight=0 or default 1U instead of actual height.
**Why it happens:** FC switch catalog stores U-height differently than Ethernet catalog.
**How to avoid:** Look up FC switch U-height from `FC_SWITCH_CATALOG[model]` -- verify which field holds it.
**Warning signs:** Rack elevation shows impossible layouts, devices overlapping.

## Code Examples

### Converged Sizing Page Layout (CONV-06 + CONV-07)

```typescript
// Source: pattern from SizingPage.tsx and FCSizingPage.tsx
import { ConvergedInputForm } from './ConvergedInputForm'
import { ConvergedBOMPanel } from './ConvergedBOMPanel'
import { Separator } from '@/components/ui/separator'

export function ConvergedSizingPage() {
  return (
    <div className="flex flex-col gap-6 p-6 xl:flex-row xl:gap-8">
      <div className="w-full shrink-0 xl:w-80">
        <ConvergedInputForm />
      </div>
      <Separator className="xl:hidden" />
      <div className="min-w-0 flex-1">
        <ConvergedBOMPanel />
      </div>
    </div>
  )
}
```

### App.tsx Converged Mode Routing

```typescript
// Source: existing App.tsx pattern
<TabsContent value="sizing" className="mt-0">
  {mode === 'fc' ? <FCSizingPage /> : mode === 'converged' ? <ConvergedSizingPage /> : <SizingPage />}
</TabsContent>
<TabsContent value="topology" className="mt-0">
  {mode === 'fc' ? <FCTopologyTab /> : mode === 'converged' ? <ConvergedTopologyTab /> : <TopologyTab />}
</TabsContent>
```

### Converged BOM Panel Structure (CONV-07)

```typescript
// Pattern: read from convergedResultStore, render sub-BOMs
const { bom } = useConvergedResultStore(useShallow((s) => ({ bom: s.bom })))

if (!bom) return <EmptyState />

return (
  <div className="space-y-6">
    {/* Ethernet section -- always present */}
    <Card>
      <CardHeader><CardTitle>{t('converged.ethernetHeading')}</CardTitle></CardHeader>
      <CardContent>
        {/* Oversubscription badge */}
        {/* Ethernet switches table */}
        {/* Cables table */}
      </CardContent>
    </Card>

    {/* FC section -- only when FC enabled */}
    {bom.fcBom && (
      <Card>
        <CardHeader><CardTitle>{t('converged.fcHeading')}</CardTitle></CardHeader>
        <CardContent>
          {/* Fan-in ratio badge */}
          {/* FC switches table */}
          {/* FC optics + ISL cables */}
        </CardContent>
      </Card>
    )}

    {/* Combined violations */}
    {bom.violations.length > 0 && <ViolationsSection violations={bom.violations} />}
  </div>
)
```

### Converged Topology Tab Layout (CONV-08)

```typescript
// Pattern: stacked layout, Ethernet on top, FC below (when enabled)
export function ConvergedTopologyTab() {
  const bom = useConvergedResultStore(useShallow((s) => s.bom))

  if (!bom) return <EmptyState />

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Ethernet topology -- always shown, takes ~60% when FC enabled, 100% otherwise */}
      <div className={bom.fcBom ? 'h-[60%]' : 'h-full'}>
        <ReactFlowProvider>
          <EthernetTopologyCanvas ethernetBom={bom.ethernetBom} />
        </ReactFlowProvider>
      </div>

      {/* FC topology -- dual fabric, only when enabled */}
      {bom.fcBom && (
        <div className="h-[40%] flex border-t">
          <div className="flex-1 border-r">
            <ReactFlowProvider>
              <FCTopologyCanvas fabric="A" bom={bom.fcBom} />
            </ReactFlowProvider>
          </div>
          <div className="flex-1">
            <ReactFlowProvider>
              <FCTopologyCanvas fabric="B" bom={bom.fcBom} />
            </ReactFlowProvider>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Violation Rendering for Combined Violations

```typescript
// Must handle both Ethernet ConstraintViolation and FC FCConstraintViolation
// Use discriminated union: check v.code prefix pattern
function ConvergedViolationAlert({ v }: { v: ConstraintViolation | FCConstraintViolation }) {
  // FC violations have codes starting with 'FC_'
  if (v.code.startsWith('FC_')) {
    return <FCViolationAlert v={v as FCConstraintViolation} />
  }
  return <ViolationAlert v={v as ConstraintViolation} />
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate stores per mode | Converged store composes both engines | Phase 15 (v3.0) | Single store drives both sub-BOMs |
| mode === 'converged' shows Ethernet placeholder | Dedicated ConvergedSizingPage | Phase 16 (this phase) | Proper converged UI |
| FC and Ethernet never share rack config | Shared racks in ConvergedSizingInput | Phase 15 (v3.0) | Single rack array for both fabrics |

**Key architectural decisions already locked:**
- Converged engine COMPOSES existing engines (not generic) -- ADR-0009
- fcBom is nullable (not optional) -- distinguishes FC-disabled from FC-errored
- Mode selector is ephemeral UI state (not persisted)
- FC directors always get dedicated racks (not co-located in server racks)

## Open Questions

1. **FC Rack U-Height Data**
   - What we know: FC_SWITCH_CATALOG has switch specs. Ethernet switches are all 1U.
   - What's unclear: Exact U-height field name in FC catalog for directors (X7-4 is 4U, X7-8 is 8U, etc.)
   - Recommendation: Check FC_SWITCH_CATALOG structure during implementation, map to RackDevice.uHeight

2. **Converged Topology Layout Preference**
   - What we know: Must show Ethernet leaf-spine + FC Fabric A + Fabric B
   - What's unclear: Vertical stack vs horizontal split for optimal use of screen space
   - Recommendation: Use vertical stack (Ethernet 60% top / FC 40% bottom with Fabric A|B side-by-side), matching the natural information hierarchy. This mirrors FCTopologyTab's existing dual-pane pattern.

3. **Converged Rack Elevation - FC Network Rack Contents**
   - What we know: Server racks use buildRackDevices(ethernetBom, rackIdx). FC racks are separate.
   - What's unclear: Whether FC racks should show Fabric A and Fabric B switches interleaved or separated
   - Recommendation: Interleave (Fabric A switches bottom, Fabric B switches above) in a single FC rack, or separate FC racks if switch count warrants. Use standard data center practice: A/B in same rack with vertical separation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (jsdom environment) |
| Config file | vitest.config.ts (via vite.config.ts) |
| Quick run command | `npx vitest run src/features/sizing/converged/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONV-06 | Converged input form renders shared rack + Ethernet + FC sections | unit | `npx vitest run src/features/sizing/converged/ConvergedInputForm.test.tsx -x` | Wave 0 |
| CONV-06 | FC section disabled when hbaPortsPerServer=0 | unit | `npx vitest run src/features/sizing/converged/ConvergedInputForm.test.tsx -x` | Wave 0 |
| CONV-07 | Combined BOM panel renders Ethernet + FC sub-BOMs | unit | `npx vitest run src/features/sizing/converged/ConvergedBOMPanel.test.tsx -x` | Wave 0 |
| CONV-07 | FC BOM section hidden when fcBom is null | unit | `npx vitest run src/features/sizing/converged/ConvergedBOMPanel.test.tsx -x` | Wave 0 |
| CONV-07 | Combined violations render both Ethernet and FC types | unit | `npx vitest run src/features/sizing/converged/ConvergedBOMPanel.test.tsx -x` | Wave 0 |
| CONV-08 | Converged topology renders Ethernet + FC canvases | unit | `npx vitest run src/features/topology/converged/ConvergedTopologyTab.test.tsx -x` | Wave 0 |
| CONV-09 | Converged rack elevation shows server racks + FC racks | unit | `npx vitest run src/features/rack-elevation/utils/buildConvergedRackDevices.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/features/sizing/converged/ src/features/topology/converged/ src/features/rack-elevation/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/features/sizing/converged/ConvergedInputForm.test.tsx` -- covers CONV-06
- [ ] `src/features/sizing/converged/ConvergedBOMPanel.test.tsx` -- covers CONV-07
- [ ] `src/features/topology/converged/ConvergedTopologyTab.test.tsx` -- covers CONV-08
- [ ] `src/features/rack-elevation/utils/buildConvergedRackDevices.test.ts` -- covers CONV-09

## Sources

### Primary (HIGH confidence)
- Project codebase: `src/features/sizing/InputForm.tsx` -- reference Ethernet input form pattern
- Project codebase: `src/features/sizing/fc/FCInputForm.tsx` -- reference FC input form pattern
- Project codebase: `src/features/sizing/BOMPanel.tsx` -- reference Ethernet BOM display pattern
- Project codebase: `src/features/sizing/fc/FCBOMPanel.tsx` -- reference FC BOM display pattern
- Project codebase: `src/store/convergedInputStore.ts` -- converged input store (Phase 15 output)
- Project codebase: `src/store/convergedResultStore.ts` -- converged result store (Phase 15 output)
- Project codebase: `src/domain/schemas/converged-input.ts` -- ConvergedSizingInput schema
- Project codebase: `src/domain/schemas/converged-bom.ts` -- ConvergedBOM schema
- Project codebase: `src/domain/engine/converged-sizing.ts` -- calculateConvergedBOM engine
- Project codebase: `src/App.tsx` -- mode routing and current placeholder behavior
- Project codebase: `src/i18n/locales/en/translation.json` -- existing i18n keys
- Project codebase: `.planning/REQUIREMENTS.md` -- CONV-06 through CONV-09 specifications

### Secondary (MEDIUM confidence)
- Project codebase: `src/features/topology/fc/FCTopologyTab.tsx` -- dual ReactFlowProvider pattern
- Project codebase: `src/features/rack-elevation/utils/buildRackDevices.ts` -- rack device building
- Project codebase: `src/features/topology/utils/buildTopologyGraph.ts` -- Ethernet topology building
- Project codebase: `src/features/topology/fc/utils/buildFCTopologyGraph.ts` -- FC topology building

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and proven in Ethernet/FC modes
- Architecture: HIGH -- direct composition of existing patterns, Phase 15 stores ready
- Pitfalls: HIGH -- all pitfalls derived from observed patterns in existing codebase
- UI composition: HIGH -- clear reference implementations exist for every sub-component

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no external dependency changes expected)

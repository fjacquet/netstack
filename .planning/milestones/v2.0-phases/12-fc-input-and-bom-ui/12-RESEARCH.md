# Phase 12: FC Input and BOM UI - Research

**Researched:** 2026-03-18
**Domain:** React UI — FC mode toggle, FC input form, FC BOM panel, i18n, Zustand store wiring
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FC-10 | FC-specific input form (server count, HBA ports per server, FC speed, preferred generation) | FCInputForm mirrors Ethernet InputForm pattern; useFCInputStore is ready and typed |
| FC-11 | FC BOM panel with switches, optics, ISL links, and POD license requirements | FCBOMPanel mirrors Ethernet BOMPanel pattern; useFCResultStore is ready and typed |

</phase_requirements>

---

## Summary

All domain infrastructure for FC UI is already in place and working: `fcInputStore`, `fcResultStore`, `calculateFCBOM`, all Zod schemas, and the Brocade catalog. Phase 12 is pure UI work — wiring existing building blocks into React components following the patterns already established in phases 2, 3, 6, and 11.

The core architectural decision (from STATE.md) is that the mode selector is **ephemeral React state** (`useState` in `AppContent`) — never persisted to localStorage. This prevents stale-mode reload bugs. The mode state gates which subtree renders: when `mode === 'fc'`, the FC sizing page replaces the Ethernet sizing page, the FC topology tab replaces the Ethernet topology tab, and the rack elevation tab is hidden (FC switches do not go in server racks — per REQUIREMENTS.md "out of scope").

The FC BOM panel must display `podLicensesRequired` as a first-class top-level line item (requirement from phase 8 decisions). The FC form collects the fields defined in `FCSizingInputSchema`: racks (reuse pattern), `hbaPortsPerServer` (1–8), `storageTargetPorts` (2–128), `storageArrayCount` (1–32), `fcSwitchModel` (9 enum values), `islPortsPerSwitch` (0–32). No new npm dependencies are needed.

**Primary recommendation:** Build `FCInputForm` and `FCBOMPanel` as parallel siblings to their Ethernet counterparts, lifted into a `FCSizingPage` component, then gate rendering in `AppContent` with `useState('ethernet' | 'fc')` and a `ModeSelector` toggle in the TopBar area.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 (in use) | Component rendering | Already the project stack |
| react-hook-form | in use | Form state and field control | Already used in InputForm |
| zustand | v5 (in use) | FC store subscription | `useFCInputStore` + `useFCResultStore` already implemented |
| react-i18next | in use | All UI labels | Required by CLAUDE.md convention |
| shadcn/ui | in use | Card, Table, Alert, Select, Input, Button, Separator | Already installed |
| zod | v4 (in use) | Type inference only (no runtime parse in UI) | `FCSizingInput` and `FCNetworkBOM` types from it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/shallow | in use | `useShallow` selector | Always use with multi-field store selectors (prevents infinite renders) |
| class-variance-authority | in use | Badge variants for oversubscription severity | Already used in BOMPanel |
| lucide-react | in use | Icons for Alert components | Already in BOMPanel |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useState` in AppContent for mode | Zustand mode store | useState is simpler and correct per STATE.md decision — no persistence needed |
| Separate FCInputForm component | Extending Ethernet InputForm | Strict isolation required — FC and Ethernet are parallel domains, never shared |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── features/
│   ├── sizing/
│   │   ├── InputForm.tsx           # Ethernet — unchanged
│   │   ├── BOMPanel.tsx            # Ethernet — unchanged
│   │   ├── SizingPage.tsx          # Ethernet — unchanged
│   │   ├── fc/
│   │   │   ├── FCInputForm.tsx     # NEW — FC input form
│   │   │   ├── FCBOMPanel.tsx      # NEW — FC BOM panel
│   │   │   └── FCSizingPage.tsx    # NEW — FC layout wrapper
│   │   ├── FCInputForm.test.tsx    # NEW — Wave 0 required
│   │   └── FCBOMPanel.test.tsx     # NEW — Wave 0 required
├── components/
│   └── ModeSelector.tsx            # NEW — Ethernet | FC toggle
└── App.tsx                         # Modified — mode state + conditional rendering
```

Note: test files can be co-located at `src/features/sizing/` level (same as existing `BOMPanel.test.tsx` and `InputForm.test.tsx`) rather than inside the `fc/` subdirectory — follow what the planner decides. The key constraint is they must exist before implementation.

### Pattern 1: Ephemeral Mode Selector in AppContent

**What:** `useState<'ethernet' | 'fc'>('ethernet')` in `AppContent`. The mode state is passed as a prop or lifted into a `ModeSelector` component placed in the TopBar area.

**When to use:** Always — this is a locked architectural decision from STATE.md.

**Example:**
```typescript
// In AppContent (App.tsx)
const [mode, setMode] = useState<'ethernet' | 'fc'>('ethernet')

// Only one subtree renders at a time — never both
{mode === 'ethernet' ? <SizingPage /> : <FCSizingPage />}
```

### Pattern 2: FCInputForm — Replicate Ethernet InputForm Shape

**What:** A `useForm<FCFormValues>` with `defaultValues` from `useFCInputStore`, watching changes via `form.watch()` subscription, calling `setInput()` on the FC store.

**Key difference from Ethernet InputForm:** FC has no rack-per-server grid (the form shows rack count + servers-per-rack as a single total, or optionally reuses the per-rack array from `FCSizingInputSchema`). The rack array is already in `fcInputStore.DEFAULT_FC_INPUT` as `racks: [{serverCount:16}, ...]`, so the form can reuse the same rack count + per-rack inputs pattern from Ethernet InputForm.

**Example (field shape):**
```typescript
interface FCFormValues {
  rackCount: number
  rackServers: number[]
  hbaPortsPerServer: number       // 1–8
  storageTargetPorts: number      // 2–128
  storageArrayCount: number       // 1–32
  fcSwitchModel: FCSwitchModelId  // enum from brocade.ts
  islPortsPerSwitch: number       // 0–32
  rackSize: '24U' | '42U' | '50U'
  serverUHeight: '1U' | '2U' | '4U' | '8U'
}
```

### Pattern 3: FCBOMPanel — ViolationAlert for FC Codes

**What:** FC violations (`FC_PORT_SATURATION`, `FC_OVERSUBSCRIPTION_EXCEEDED`, `FC_ISL_UNDERPROVISIONED`) use the same `ViolationAlert` if-chain pattern from BOMPanel. A separate `FCViolationAlert` function handles `FCConstraintViolation` type.

**Key:** `podLicensesRequired` renders as a **top-level line item** in the switches table (or a dedicated section), not in a footnote. This is a hard acceptance criterion.

**Example structure:**
```typescript
// FCBOMPanel.tsx
function FCViolationAlert({ v }: { v: FCConstraintViolation }) {
  if (v.code === 'FC_PORT_SATURATION') { ... }
  if (v.code === 'FC_OVERSUBSCRIPTION_EXCEEDED') { ... }
  if (v.code === 'FC_ISL_UNDERPROVISIONED') { ... }
  return null
}
```

### Pattern 4: ModeSelector Toggle Placement

**What:** A segmented control or two-button toggle placed inline in the TopBar (between the title and the export buttons), or above the tab bar. It must be visually prominent since switching mode changes the entire app subtree.

**Recommended placement:** Right of the app title in TopBar, left of the export buttons. Renders as two `Button` variants (one active, one ghost), or a shadcn `Tabs`-style toggle.

**Example:**
```typescript
// ModeSelector.tsx
<div className="flex items-center gap-1 ml-4">
  <Button
    variant={mode === 'ethernet' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setMode('ethernet')}
  >
    {t('mode.ethernet')}
  </Button>
  <Button
    variant={mode === 'fc' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setMode('fc')}
  >
    {t('mode.fc')}
  </Button>
</div>
```

### Pattern 5: FC BOM Display Layout

The FC BOM requires distinct sections:
1. **Fan-in ratio** (analog to Ethernet oversubscription ratio) — with severity badge
2. **Switches table** — Fabric A, Fabric B rows (both show same count), ISL row
3. **POD Licenses** — top-level line item with `podLicensesRequired` count
4. **Optics/Cables** — `fcOpticsCount` (SFP optic count), `islCables`
5. **Violations** — using `FCViolationAlert` if-chain

### Anti-Patterns to Avoid

- **Persisting mode to localStorage:** Locked decision — mode is ephemeral `useState`. Never add mode to `inputStore` or `fcInputStore`.
- **Rendering both subtrees simultaneously:** `mode === 'fc' ? <FCSizingPage /> : <SizingPage />` not both at once.
- **Importing FC violations into Ethernet BOMPanel:** `FCConstraintViolation` type must never appear in Ethernet BOMPanel.
- **Skipping `useShallow` on multi-field selectors:** All Zustand selectors that destructure multiple fields must use `useShallow`.
- **Declaring TypeScript types separately from Zod schemas:** Use `z.infer<typeof FCSizingInputSchema>` — never declare `FCSizingInput` separately.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Custom controlled inputs with useState | react-hook-form (already in InputForm) | Handles debounce, validation, field registration |
| FC store integration | Direct zustand imports without selector | `useFCInputStore(useShallow(...))` | Prevents infinite render loops |
| Alert styling | Custom colored divs | shadcn `Alert` + `AlertTitle` + `AlertDescription` | Consistent with Ethernet BOMPanel pattern |
| FC switch model list | Hardcoded string array | `Object.keys(FC_SWITCH_CATALOG)` from brocade.ts | Single source of truth; adding new models is automatic |
| Severity classification | Inline ternary chain | Separate `getFCSeverity()` helper (model from `getSeverity()` in BOMPanel) | Testable, readable |

**Key insight:** The entire FC domain layer is ready. Phase 12 is wiring, not building.

---

## Common Pitfalls

### Pitfall 1: Mode State Lost on Tab Navigation

**What goes wrong:** If mode state is defined inside a tab component rather than `AppContent`, switching tabs resets mode to 'ethernet'.

**Why it happens:** React unmounts TabsContent components when switching tabs.

**How to avoid:** Define `useState<'ethernet' | 'fc'>` in `AppContent` (top-level), pass as prop to `TopBar` via `onModeChange` callback and `mode` prop.

**Warning signs:** Mode resets when navigating to Topology tab and back.

### Pitfall 2: FC violations type mismatch in generic Alert renderer

**What goes wrong:** `FCConstraintViolation` has different payload shapes from `ConstraintViolation` — e.g., `FC_PORT_SATURATION` has `requiredPorts/availablePorts` (not `required/available`). TypeScript will catch this if types are distinct.

**Why it happens:** Temptation to reuse the Ethernet `ViolationAlert` function.

**How to avoid:** Write a separate `FCViolationAlert` function in `FCBOMPanel.tsx` that takes `FCConstraintViolation` as its argument type.

**Warning signs:** `tsc --noEmit` errors involving `ConstraintViolation` in FC files.

### Pitfall 3: FCBOMPanel renders before fcResultStore has first BOM

**What goes wrong:** On first load, `fcResultStore` is initialized with a computed BOM (see `fcResultStore.ts` — initial computation runs at module load). However if the initial `calculateFCBOM` throws (invalid default input), `bom` stays `null`.

**Why it happens:** The try/catch in `fcResultStore.ts` suppresses errors.

**How to avoid:** FCBOMPanel must handle `bom === null` with an empty state (same pattern as Ethernet BOMPanel `if (!bom) return <Card>...</Card>`). The existing `DEFAULT_FC_INPUT` is valid (16 servers × 3 racks, G720) so `bom` will be populated on first load in practice.

**Warning signs:** Blank FC BOM panel in browser despite valid FC input.

### Pitfall 4: FC switch model selector uses stale hardcoded list

**What goes wrong:** If `FCInputForm` hardcodes `['G710', 'G720', ...]` instead of deriving from `FC_SWITCH_CATALOG`, adding a new switch model in the catalog won't appear in the UI.

**How to avoid:** Use `Object.keys(FC_SWITCH_CATALOG) as FCSwitchModelId[]` for the Select options, exactly as Ethernet InputForm uses `LEAF_MODELS as const`.

### Pitfall 5: ISL oversubscription ratio display confusion

**What goes wrong:** Both `fanInRatio` (host/storage) and `islOversubscriptionRatio` (host/ISL) exist on `FCNetworkBOM`. Using the wrong one in the severity display.

**How to avoid:** The **fan-in ratio** (host/storage) maps to Broadcom 7:1 threshold and should use the oversubscription badge. The `islOversubscriptionRatio` is informational for ISL sizing — show it separately or alongside.

---

## Code Examples

Verified patterns from existing codebase:

### FC Store Subscription (from fcResultStore.ts)
```typescript
// Source: src/store/fcResultStore.ts
const { bom, violations } = useFCResultStore(
  useShallow((s) => ({ bom: s.bom, violations: s.violations }))
)
```

### FC Input Store Update (from fcInputStore.ts)
```typescript
// Source: src/store/fcInputStore.ts
const { input, setInput, resetInput } = useFCInputStore(
  useShallow((s) => ({ input: s.input, setInput: s.setInput, resetInput: s.resetInput }))
)
```

### FC Switch Model Enum (from fc-input.ts)
```typescript
// Source: src/domain/schemas/fc-input.ts
fcSwitchModel: z.enum(['G710', 'G720', 'G730', 'X7-4', 'X7-8', '7850', 'G820', 'X8-4', 'X8-8'])
```

### Violation Alert if-chain pattern (from BOMPanel.tsx)
```typescript
// Source: src/features/sizing/BOMPanel.tsx
function ViolationAlert({ v }: { v: ConstraintViolation }) {
  if (v.code === 'OOB_PORT_SATURATION') {
    return (
      <Alert variant="destructive" role="alert" key={v.code}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('bom.violationOobTitle')}</AlertTitle>
        <AlertDescription>
          {t('bom.violationOobBody', { required: v.required, available: v.available })}
        </AlertDescription>
      </Alert>
    )
  }
  // ... additional cases
  return null
}
```

### FormField Select pattern (from InputForm.tsx)
```typescript
// Source: src/features/sizing/InputForm.tsx
<FormField
  control={form.control}
  name="fcSwitchModel"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('fc.switchModel')}</FormLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={t('fc.selectSwitchModel')} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {(Object.keys(FC_SWITCH_CATALOG) as FCSwitchModelId[]).map((modelId) => (
            <SelectItem key={modelId} value={modelId}>{modelId}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### FC BOM POD License Row (required as top-level item)
```typescript
// POD licenses must be a first-class table row — not a footnote
{bom.podLicensesRequired > 0 && (
  <TableRow>
    <TableCell>{t('fc.podLicenseLabel')}</TableCell>
    <TableCell>{t('fc.podLicenseUnit')}</TableCell>
    <TableCell>{bom.podLicensesRequired}</TableCell>
  </TableRow>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A (new feature) | FC domain fully isolated from Ethernet | Phase 8 | No shared types or imports |
| Mode selector not built | Mode selector spec'd as ephemeral useState | Phase 9 pre-decision | Mode never persisted |
| POD licensing as footnote | podLicensesRequired as required BOM field | Phase 8 decision | Must be top-level line item |

**Deprecated/outdated:**
- `reactflow` package: Project uses `@xyflow/react` — do not reference old package name
- Separate TypeScript type declarations: All types derived via `z.infer<>` — never declare separately

---

## i18n Key Inventory

Phase 12 needs new i18n keys in all 4 locales (en, fr, de, it). Estimated key count: ~30–35 new keys.

### Required new key namespaces
```
mode.ethernet              — "Ethernet"
mode.fc                    — "Fibre Channel"
mode.selectLabel           — "Mode"

fc.heading                 — "FC Sizing Parameters"
fc.rackConfigHeading       — (reuse sizing.rackConfigHeading? or separate)
fc.hbaPortsPerServer       — "HBA Ports per Server"
fc.hbaPortsHelp            — "FC initiator ports (dual-fabric default: 2)"
fc.storageTargetPorts      — "Storage Target Ports"
fc.storageTargetHelp       — "Total FC target ports on all storage arrays"
fc.storageArrayCount       — "Storage Arrays"
fc.switchModel             — "FC Switch Model"
fc.selectSwitchModel       — "Select FC switch model"
fc.islPortsPerSwitch       — "ISL Ports per Switch"
fc.islPortsHelp            — "Ports reserved for inter-switch links (0–32)"
fc.resetButton             — "Reset FC to Defaults"

fcbom.heading              — "FC Bill of Materials"
fcbom.fabricAHeading       — "Fabric A"
fcbom.fabricBHeading       — "Fabric B"
fcbom.switchesHeading      — "FC Switches"
fcbom.roleFabricA          — "Fabric A Switch"
fcbom.roleFabricB          — "Fabric B Switch"
fcbom.podLicenseLabel      — "POD Licenses"
fcbom.podLicenseUnit       — "license units"
fcbom.islCables            — "ISL Cables"
fcbom.fcOpticsCount        — "FC SFP Optics"
fcbom.fanInHeading         — "Fan-In Ratio"
fcbom.islOversubHeading    — "ISL Oversubscription"
fcbom.alertsHeading        — "Alerts"
fcbom.emptyHeading         — "No FC BOM calculated"
fcbom.emptyBody            — "Enter FC sizing parameters..."

fcbom.violationPortSatTitle  — "FC Port Saturation"
fcbom.violationPortSatBody   — "{{requiredPorts}} ports required, {{availablePorts}} available..."
fcbom.violationOversubTitle  — "FC Oversubscription Exceeded"
fcbom.violationOversubBody   — "Fan-in ratio {{ratio}}:1 exceeds maximum {{maxRatio}}:1..."
fcbom.violationIslTitle      — "ISL Underprovisioned"
fcbom.violationIslBody       — "{{islsAvailable}} ISL ports available, {{islsRequired}} required..."
```

---

## Open Questions

1. **Mode selector placement in TopBar vs above tabs**
   - What we know: TopBar already has title + export buttons. Adding mode toggle there keeps it always visible.
   - What's unclear: Whether to put it in TopBar (requires prop drilling `mode`+`setMode` down from AppContent) or render a second sticky bar above the tab list.
   - Recommendation: Place in TopBar — pass `mode` and `onModeChange` as props to TopBar. This is a small prop surface and avoids a second navigation row.

2. **Tab visibility in FC mode**
   - What we know: "FC rack elevation view" is explicitly out of scope (REQUIREMENTS.md). FC topology is Phase 13.
   - What's unclear: Whether to hide the Rack Elevation tab in FC mode, or show a "not available in FC mode" placeholder.
   - Recommendation: Hide the Rack Elevation tab in FC mode entirely (`mode === 'fc'` removes it from `TabsList`). Show a placeholder for Topology until Phase 13 delivers it.

3. **Rack inputs in FCInputForm**
   - What we know: `FCSizingInputSchema` has `racks: z.array(RackConfigSchema).min(1).max(200)` — same shape as Ethernet.
   - What's unclear: Whether FC mode shows the full per-rack server editor (as Ethernet) or a simpler total-server count input.
   - Recommendation: Reuse the same per-rack editor pattern for consistency and because the `fcInputStore` already stores `racks` as an array. This also ensures FC engine receives the `racks` array it expects.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react (already configured) |
| Config file | `vite.config.ts` (vitest inline config) |
| Quick run command | `npx vitest run src/features/sizing/` |
| Full suite command | `npx vitest run` |
| Estimated runtime | Quick: ~5s, Full: ~15s (335 tests currently) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FC-10 | FCInputForm renders HBA ports field with value from store | unit (component) | `npx vitest run src/features/sizing/FCInputForm.test.tsx` | Wave 0 |
| FC-10 | FCInputForm renders FC switch model selector with all 9 models | unit (component) | `npx vitest run src/features/sizing/FCInputForm.test.tsx` | Wave 0 |
| FC-10 | FCInputForm renders ISL ports input with correct min/max | unit (component) | `npx vitest run src/features/sizing/FCInputForm.test.tsx` | Wave 0 |
| FC-10 | FCInputForm renders storage target ports field | unit (component) | `npx vitest run src/features/sizing/FCInputForm.test.tsx` | Wave 0 |
| FC-11 | FCBOMPanel renders Fabric A and Fabric B switch counts | unit (component) | `npx vitest run src/features/sizing/FCBOMPanel.test.tsx` | Wave 0 |
| FC-11 | FCBOMPanel renders podLicensesRequired as top-level item | unit (component) | `npx vitest run src/features/sizing/FCBOMPanel.test.tsx` | Wave 0 |
| FC-11 | FCBOMPanel renders ISL cable count | unit (component) | `npx vitest run src/features/sizing/FCBOMPanel.test.tsx` | Wave 0 |
| FC-11 | FCBOMPanel renders FC_PORT_SATURATION Alert with role=alert | unit (component) | `npx vitest run src/features/sizing/FCBOMPanel.test.tsx` | Wave 0 |
| FC-11 | FCBOMPanel renders FC_OVERSUBSCRIPTION_EXCEEDED Alert | unit (component) | `npx vitest run src/features/sizing/FCBOMPanel.test.tsx` | Wave 0 |
| FC-11 | FCBOMPanel renders empty state when bom is null | unit (component) | `npx vitest run src/features/sizing/FCBOMPanel.test.tsx` | Wave 0 |
| FC-09 | Mode selector toggles between Ethernet and FC subtrees | unit (component) | `npx vitest run src/features/sizing/` | Wave 0 (ModeSelector.test.tsx or App.test.tsx) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/features/sizing/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/sizing/FCInputForm.test.tsx` — covers FC-10 (all input fields)
- [ ] `src/features/sizing/FCBOMPanel.test.tsx` — covers FC-11 (switches, POD licenses, ISL, violations, empty state)
- [ ] `src/components/ModeSelector.test.tsx` OR inline in App-level test — covers FC-09 mode toggle behavior

*(Existing test infrastructure: Vitest + @testing-library/react configured. No new framework installs needed.)*

---

## Sources

### Primary (HIGH confidence)

- Direct source code inspection — `src/store/fcInputStore.ts`, `src/store/fcResultStore.ts`, `src/domain/schemas/fc-input.ts`, `src/domain/schemas/fc-bom.ts`, `src/domain/catalog/brocade.ts`, `src/domain/engine/fc-sizing.ts`
- Direct source code inspection — `src/features/sizing/InputForm.tsx`, `src/features/sizing/BOMPanel.tsx`, `src/App.tsx`, `src/components/TopBar.tsx`
- Project summaries — `.planning/phases/08-*/08-01-SUMMARY.md`, `09-*/09-01-SUMMARY.md`, `10-*/10-01-SUMMARY.md`, `11-*/11-02-SUMMARY.md`
- Project decisions — `.planning/STATE.md` (Accumulated Context → Decisions)
- Project requirements — `.planning/REQUIREMENTS.md` (FC-10, FC-11)

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` Phase 12 success criteria (authoritative but prose, not code)
- `.planning/phases/11-switch-positioning-ethernet/11-02-SUMMARY.md` — InputForm+BOMPanel pattern reference verified against actual source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, verified in source
- Architecture: HIGH — mode isolation decision locked in STATE.md, patterns verified from running Ethernet code
- Pitfalls: HIGH — derived from actual codebase structure (store types, violation payload fields)
- i18n key inventory: MEDIUM — estimated names follow project i18n conventions; exact keys decided at plan time

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (stable stack; FC domain immutable from phases 8–10)

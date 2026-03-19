# Phase 27: UI & i18n — Research

**Researched:** 2026-03-19
**Domain:** React form wiring, shadcn/ui Alert, react-i18next, conditional rendering
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PHYS-04 | i18n labels for all new inputs and sections in EN/FR/DE/IT | New keys for `sizing.rackPitchMm`, `sizing.racksAdjacent`, `sizing.patchPanelDistanceM` + advisory message keys; added to all four locale files; `AdvisoryCard` component uses `t()` for all text |
</phase_requirements>

---

## Summary

Phase 27 is pure wiring: no new domain logic. The engines from Phase 26 already produce `advisories[]` and `cableSchedule` on all three BOM types. Three geometry fields (`rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM`) already exist on `SizingInput` with defaults. The `inputStore` is already at v9.

The work breaks into three tightly scoped tasks:

1. **Add geometry fields to `EthInputAccordion`** — three new `FormField` elements in the existing `rack-config` section, plus `FormValues` interface extension and `defaultValues` wiring. The `racksAdjacent` boolean shows/hides `patchPanelDistanceM` conditionally. The `ConvergedInputAccordion` needs the same treatment (it shares the same geometry fields via the Converged store, which mirrors `SizingInput`). `FCInputAccordion` is excluded — FC domain has no geometry fields per ADR-0009.

2. **Advisory card component** — a new `AdvisoryCard` / `AdvisoryAlert` component that renders amber for `PATCH_PANEL_RECOMMENDED` advisories, using the already-present `variant="warning"` on `<Alert>`. Both `BOMPanel` (Clos + Three-Tier branches) need to consume `bom.advisories[]`. The `FCBOMPanel` may emit `DAC_DISTANCE_ADVISORY` which is still in `violations[]` — no advisory cards needed there.

3. **i18n keys** — add new keys to all four locale files (EN, FR, DE, IT) under the `sizing` namespace for the three geometry inputs and a `bom` advisory message for `PATCH_PANEL_RECOMMENDED`.

**Primary recommendation:** Wire geometry fields into `rack-config` accordion section; create a single reusable `AdvisoryAlert` component; add all i18n keys across four locale files in one commit.

---

## Standard Stack

### Core (already in use — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | existing | Form state, `FormField` / `FormValues` | Already used in all accordion components |
| react-i18next | existing | `useTranslation()` / `t()` calls | All UI text goes through this |
| shadcn/ui `Alert` | existing | `variant="warning"` amber card | Already supports `warning` variant |
| Zustand `useShallow` | existing | Store subscriptions | Required pattern — avoids infinite re-renders |
| Tailwind v4 | existing | Styling | No `tailwind.config.js` — utility classes only |

No new packages are required for this phase.

---

## Architecture Patterns

### Existing accordion structure in `EthInputAccordion.tsx`

```
Accordion (type="multiple", defaultValue=["rack-config", "switch-selection", "advanced"])
├── AccordionItem value="rack-config"       ← geometry fields go HERE
├── AccordionItem value="switch-selection"
└── AccordionItem value="advanced"
```

Geometry fields belong in `rack-config` because they describe physical rack layout, not switch selection or advanced networking.

### Pattern 1: Adding a numeric input field (rackPitchMm)

**What:** Number input wired to `FormField`, debounced 150ms before writing to store.
**When to use:** `rackPitchMm` — user rarely changes this, but when they do it should be responsive.

```typescript
// Pattern from existing rackCount field
<FormField
  control={form.control}
  name="rackPitchMm"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="text-sm text-muted-foreground">{t('sizing.rackPitchMm')}</FormLabel>
      <FormControl>
        <Input
          type="number"
          min={100}
          max={2000}
          {...field}
          onChange={(e) => {
            const val = e.target.value
            field.onChange(val === '' ? '' : Number(val))
          }}
        />
      </FormControl>
      <FormDescription>{t('sizing.rackPitchMmHelp')}</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Pattern 2: Boolean checkbox field (racksAdjacent)

**What:** Checkbox using the brownfield toggle pattern already in the `advanced` section.
**When to use:** `racksAdjacent` — toggles visibility of `patchPanelDistanceM`.

```typescript
// Pattern from existingSpinesDeployed checkbox (EthInputAccordion.tsx line 805-823)
<FormField
  control={form.control}
  name="racksAdjacent"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 sm:col-span-2">
      <FormControl>
        <input
          type="checkbox"
          checked={field.value}
          onChange={field.onChange}
          className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel className="text-sm font-normal">{t('sizing.racksAdjacent')}</FormLabel>
        <FormDescription>{t('sizing.racksAdjacentHelp')}</FormDescription>
      </div>
    </FormItem>
  )}
/>
```

### Pattern 3: Conditional field (patchPanelDistanceM)

**What:** Number input that only renders when `racksAdjacent === false`.
**When to use:** `patchPanelDistanceM` — meaningless when racks are adjacent.

```typescript
const watchedRacksAdjacent = form.watch('racksAdjacent')
// ...
{!watchedRacksAdjacent && (
  <FormField
    control={form.control}
    name="patchPanelDistanceM"
    render={({ field }) => ( /* same number input pattern */ )}
  />
)}
```

### Pattern 4: Advisory card component

**What:** Reusable component that takes an `Advisory` (from `@/domain/schemas/bom`) and renders amber `<Alert variant="warning">`.
**When to use:** Any `bom.advisories[]` rendering. Mirrors `ViolationAlert` for violations.

```typescript
// New component, modelled on ViolationAlert in BOMPanel.tsx
import type { Advisory } from '@/domain/schemas/bom'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

function AdvisoryAlert({ a }: { a: Advisory }) {
  const { t } = useTranslation()
  if (a.code === 'PATCH_PANEL_RECOMMENDED') {
    return (
      <Alert variant="warning" role="alert">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('bom.advisoryPatchPanelTitle')}</AlertTitle>
        <AlertDescription>
          {t('bom.advisoryPatchPanelBody', {
            computedDistanceM: a.computedDistanceM,
            dacLimitM: a.dacLimitM,
          })}
        </AlertDescription>
      </Alert>
    )
  }
  return null
}
```

### Pattern 5: Advisory section in BOMPanel

**What:** Add an `advisories` section in `BOMPanel` and `ThreeTierBOMContent`, alongside the existing `violations` section.
**When to use:** When `bom.advisories.length > 0`.

The `resultStore` currently does NOT expose `advisories[]` — it only exposes `violations[]`. The component must read `bom.advisories` directly from `bom` / `threeTierBom`, not from `resultStore`.

```typescript
// Read advisories directly from bom object, not resultStore
const advisories = bom?.advisories ?? []
// ...
{advisories.length > 0 && (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {t('bom.advisoriesHeading')}
    </p>
    <div className="space-y-2">
      {advisories.map((a, i) => (
        <AdvisoryAlert key={`${a.code}-${i}`} a={a} />
      ))}
    </div>
  </div>
)}
```

### Anti-Patterns to Avoid

- **Don't add geometry fields to FCInputAccordion:** FC domain has no geometry fields (ADR-0009 parallel domain rule). `FCNetworkBOM` only has `islCableLengthSkuM`, no advisory array.
- **Don't add geometry to `FormValues` without extending the watch handler:** The `useEffect` subscription in `EthInputAccordion` filters fields — `rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM` are select-style (non-numeric-debounced) for `racksAdjacent`, but numeric-debounced for the two number fields.
- **Don't use `variant="destructive"` for advisories:** That is red. Use `variant="warning"` (amber), already defined in `alert.tsx`.
- **Don't read `violations[]` from resultStore for advisory rendering:** Advisories are NOT in `violations[]`. They live in `bom.advisories[]` and `threeTierBom.advisories[]`.
- **Don't expose `advisories` on `resultStore`:** The store's `violations` field is typed as `ConstraintViolation[] | ThreeTierConstraintViolation[]`. Adding advisories would require a type change. The simpler approach is reading `advisories` directly from `bom` / `threeTierBom`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Amber card styling | Custom CSS class | `<Alert variant="warning">` from `@/components/ui/alert` | Already defined, consistent with DAC advisory in violations |
| Conditional show/hide | useState toggle | `form.watch('racksAdjacent')` | react-hook-form reactive watcher — no extra state |
| i18n translation | Inline string literals | `t()` from `useTranslation()` | All UI strings must be translated |
| Store sync debounce | Custom debounce | Pattern from existing `useEffect` in `EthInputAccordion` | 150ms debounce already established for numeric fields |

---

## Common Pitfalls

### Pitfall 1: Missing fields in FormValues interface

**What goes wrong:** TypeScript error "Property X does not exist on type FormValues" when adding a field to `defaultValues` without extending the interface.
**Why it happens:** `EthInputAccordion` uses a local `FormValues` interface (not `SizingInput`). The geometry fields are not yet in it.
**How to avoid:** Add `rackPitchMm: number`, `racksAdjacent: boolean`, `patchPanelDistanceM: number` to `FormValues` before wiring `defaultValues` and `FormField` render props.
**Warning signs:** `tsc --noEmit` fails with property-not-found errors.

### Pitfall 2: Geometry fields not flowing to setInput

**What goes wrong:** User changes rack pitch, but the engine ignores it — `resultStore` recomputes without the new value.
**Why it happens:** The `watch` subscription in `EthInputAccordion` `useEffect` has an exclude list for debounced numeric fields. If `rackPitchMm` / `patchPanelDistanceM` are not added to the debounce branch, they fall into the "select-style immediate" branch — which strips them via `Object.entries(rest).filter(...)`.
**How to avoid:** Add `rackPitchMm` and `patchPanelDistanceM` to the numeric-debounce name check; add `racksAdjacent` to the immediate (select-style) path.
**Warning signs:** Changing rack pitch in the form does not update `bom.cableSchedule` values.

### Pitfall 3: ConvergedInputAccordion geometry fields

**What goes wrong:** Geometry fields appear in Ethernet mode but not Converged mode.
**Why it happens:** `ConvergedInputAccordion` is a separate component with its own `FormValues` interface. It connects to `convergedInputStore`, not `inputStore`. The `ConvergedSizingInput` schema must be checked to confirm geometry fields are present there too.
**How to avoid:** Verify `ConvergedSizingInput` extends from or copies `SizingInput`'s geometry fields before assuming the same wiring applies. If they exist, apply the same three-field pattern.
**Warning signs:** `tsc --noEmit` error on `convergedInputStore.setInput({ rackPitchMm: ... })`.

### Pitfall 4: Advisory section heading key missing

**What goes wrong:** Advisory section renders but shows raw i18n key `bom.advisoriesHeading` instead of text.
**Why it happens:** The existing `bom.alertsHeading` key is for violations. A new `bom.advisoriesHeading` key must be added to all four locale files.
**How to avoid:** Add advisory-specific keys — do not reuse `bom.alertsHeading`.
**Warning signs:** Rendered text shows `bom.advisoriesHeading` literally in the UI.

### Pitfall 5: ThreeTierBOMContent does not expose advisories to the parent component

**What goes wrong:** Advisory cards render for Clos mode but not Three-Tier mode.
**Why it happens:** `ThreeTierBOMContent` is a local function component inside `BOMPanel.tsx`. It receives `bom` and `violations` as props, but no `advisories` prop. The `ThreeTierBOM` type already has `advisories: Advisory[]` — it just needs to be read inside `ThreeTierBOMContent` from `bom.advisories`.
**How to avoid:** Read `bom.advisories` inside `ThreeTierBOMContent` directly from the `bom` prop, same as `bom.violations`.

---

## Code Examples

### Existing warning Alert usage (verified in codebase)

```typescript
// Source: src/features/sizing/BOMPanel.tsx lines 93-101 (DAC_DISTANCE_ADVISORY in violations)
<Alert variant="warning" role="alert" key={v.code}>
  <AlertTriangle className="h-4 w-4" />
  <AlertTitle>{t('bom.violationDacTitle')}</AlertTitle>
  <AlertDescription>
    {t('bom.violationDacBody', { rackCount: v.rackCount })}
  </AlertDescription>
</Alert>
```

### Confirmed warning variant definition (verified in codebase)

```typescript
// Source: src/components/ui/alert.tsx lines 14-16
warning:
  "border-[hsl(38_92%_50%)] text-foreground dark:border-[hsl(38_95%_64%)] [&>svg]:text-[hsl(38_92%_50%)] dark:[&>svg]:text-[hsl(38_95%_64%)]",
```

### AdvisorySchema fields (verified in codebase)

```typescript
// Source: src/domain/schemas/bom.ts lines 56-64
// PATCH_PANEL_RECOMMENDED advisory has:
//   code: 'PATCH_PANEL_RECOMMENDED'
//   computedDistanceM: number   (the cable run distance)
//   dacLimitM: number           (the speed-specific DAC limit)
```

### i18n key naming convention (verified in codebase)

Existing geometry section key: `sizing.physicalHeading` — already in EN translation but not yet wired to an accordion section.

New keys needed (not yet in any locale):

```json
// Under "sizing" namespace
"rackPitchMm": "Rack Pitch",
"rackPitchMmHelp": "Centre-to-centre distance between adjacent racks in mm (default 600 mm)",
"racksAdjacent": "All racks adjacent",
"racksAdjacentHelp": "Uncheck if racks are separated by aisles requiring patch panels",
"patchPanelDistanceM": "Patch panel distance (m)",
"patchPanelDistanceMHelp": "Distance from rack face to patch panel in metres"

// Under "bom" namespace
"advisoriesHeading": "Advisories",
"advisoryPatchPanelTitle": "Patch Panel Recommended",
"advisoryPatchPanelBody": "Non-adjacent racks require patch panels. Computed cable run: {{computedDistanceM}}m (DAC limit: {{dacLimitM}}m)."
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded cable length map (ToR=2, MoR=1, BoR=2) | Geometry-computed SKU lengths | Phase 26 | `bom.cableSchedule` now populated |
| `violations[]` only for all alerts | `violations[]` (red) + `advisories[]` (amber) | Phase 25 | New `AdvisoryAlert` component needed |
| No geometry inputs | `rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM` in store | Phase 25 | Must wire into accordion UI |
| DAC advisory: `racks > 8` heuristic | DAC advisory: computed geometry vs speed limit | Phase 26 | `computedDistanceM` field available for display |

---

## Open Questions

1. **Does `ConvergedSizingInput` include geometry fields?**
   - What we know: `ConvergedInputAccordion` uses `useConvergedInputStore` which mirrors `SizingInput`. The `resultStore.toThreeTierInput()` already maps `rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM` (verified in `resultStore.ts` lines 39-41).
   - What's unclear: Whether `ConvergedSizingInput` schema has these fields. If not, the converged form cannot wire them.
   - Recommendation: Check `src/domain/schemas/converged-input.ts` before writing the converged form wiring task. If geometry fields are absent, a separate task or sub-task is needed to add them.

2. **FC BOM advisories?**
   - What we know: `FCNetworkBOM` has `islCableLengthSkuM` but the schema was not checked for an `advisories[]` field.
   - What's unclear: Whether the FC engine emits `PATCH_PANEL_RECOMMENDED`. Given ADR-0009 (parallel domain, FC has no geometry fields), it should not.
   - Recommendation: Confirm `FCNetworkBOM` schema has no `advisories[]` before skipping advisory rendering in `FCBOMPanel`. If it does exist, render it there too.

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (existing, no new install) |
| Config file | `vite.config.ts` (vitest config embedded) |
| Quick run command | `npx vitest run src/features/sizing/BOMPanel.test.tsx` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHYS-04 | Advisory card renders amber for PATCH_PANEL_RECOMMENDED | unit | `npx vitest run src/features/sizing/BOMPanel.test.tsx` | Yes |
| PHYS-04 | Geometry fields present in EthInputAccordion rack-config section | unit | `npx vitest run src/features/input/EthInputAccordion.test.tsx` | Yes (todos only) |
| PHYS-04 | All locale files have the new keys (no fallback key rendered) | unit | `npx vitest run` — i18n keys verified via component render tests | indirect |

### Sampling Rate

- **Per task commit:** `npx vitest run src/features/sizing/BOMPanel.test.tsx src/features/input/EthInputAccordion.test.tsx`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (currently 616 tests, 0 failures) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/sizing/BOMPanel.test.tsx` — needs new `describe('advisories')` block testing `AdvisoryAlert` renders `variant="warning"` when `bom.advisories` contains `PATCH_PANEL_RECOMMENDED`
- [ ] `src/features/input/EthInputAccordion.test.tsx` — all entries are `.todo`; need to implement tests for geometry fields visibility and conditional `patchPanelDistanceM` display

---

## Sources

### Primary (HIGH confidence)

- Direct file reads: `src/domain/schemas/bom.ts` — confirmed `AdvisorySchema`, `advisories[]` on `NetworkBOMSchema`
- Direct file reads: `src/domain/schemas/three-tier-bom.ts` — confirmed `advisories: z.array(AdvisorySchema).default([])` on `ThreeTierBOMSchema`
- Direct file reads: `src/domain/schemas/input.ts` — confirmed `rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM` present
- Direct file reads: `src/features/input/EthInputAccordion.tsx` — confirmed accordion structure, `FormValues` interface, watch handler pattern
- Direct file reads: `src/features/sizing/BOMPanel.tsx` — confirmed `ViolationAlert` pattern, existing `variant="warning"` usage for DAC advisory
- Direct file reads: `src/components/ui/alert.tsx` — confirmed `warning` variant definition
- Direct file reads: `src/i18n/locales/en/translation.json` — confirmed existing keys, identified gaps
- Direct file reads: `src/store/resultStore.ts` — confirmed advisories NOT in store state; must be read from `bom.advisories` directly

### Secondary (MEDIUM confidence)

- Phase 25 / 26 SUMMARY.md files — confirm geometry fields and advisory types produced by engines

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in codebase, no new installs
- Architecture: HIGH — all patterns verified by direct file reads
- Pitfalls: HIGH — all identified from actual code analysis, not inference
- i18n key list: HIGH — derived from existing locale structure and schema field names
- ConvergedSizingInput geometry: LOW — not verified (flagged as open question)

**Research date:** 2026-03-19
**Valid until:** 2026-04-18 (stable stack, 30-day window)

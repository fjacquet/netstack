# Phase 3: BOM Output and Metrics - Research

**Researched:** 2026-03-17
**Domain:** React UI components (shadcn/ui, Radix UI), Zustand store consumption, i18n extension, ARIA accessibility
**Confidence:** HIGH

## Summary

Phase 3 replaces the `ResultsPlaceholder` component in `src/features/sizing/` with a full BOM panel consuming the already-complete `useResultStore`. The engine, store, schema, and input form are all finished — Phase 3 is exclusively a presentation layer problem. No new domain logic is required.

The four new shadcn components (table, alert, tooltip, progress) follow the same copy-owned pattern as Phase 2's components. They are installed via `npx shadcn@latest add` and land in `src/components/ui/`. Radix UI primitives back all four — accessibility attributes (`role="progressbar"`, `aria-valuenow`, `aria-label`) must be added explicitly in the consuming component, as shadcn only wires the base Radix primitive.

Phase 3 requires significant i18n extension: the `results.*` namespace holds only 3 keys today; BOM panel copy needs ~30 more keys across all four locales (EN, FR, DE, IT).

**Primary recommendation:** Build the BOM panel as a single feature component `src/features/sizing/BOMPanel.tsx` reading from `useResultStore` with `useShallow`, replacing `ResultsPlaceholder` in `SizingPage.tsx`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui (table) | copy-owned | Semantic HTML table with `TableCaption`, `TableHead`, `TableBody`, `TableRow`, `TableCell` | Already part of project via shadcn CLI |
| shadcn/ui (alert) | copy-owned | Two-variant alert (`default`, `destructive`) with title + description | Already part of project via shadcn CLI |
| shadcn/ui (tooltip) | copy-owned | Hover/focus tooltip backed by Radix `@radix-ui/react-tooltip` 1.2.8 | Already part of project via shadcn CLI |
| shadcn/ui (progress) | copy-owned | Progress bar backed by Radix `@radix-ui/react-progress` 1.1.8 | Already part of project via shadcn CLI |
| zustand 5.0.12 | 5.0.12 | `useResultStore` consumption for `bom` and `violations` | Project store layer |
| zustand/shallow (useShallow) | bundled with zustand | Prevents infinite re-renders on object selectors | Required per CLAUDE.md |
| lucide-react 0.577.0 | 0.577.0 | `BarChart3` (empty state), `AlertCircle` / `AlertTriangle` (violation icons) | Project icon library per UI-SPEC |
| react-i18next 16.5.8 | 16.5.8 | `useTranslation()` for all BOM panel copy | Project i18n system |
| class-variance-authority 0.7.1 | 0.7.1 | `cva()` for oversubscription badge variants | Already in project, matches badge.tsx pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge (cn()) | 2.1.1 / 3.5.0 | Conditional class merging | All component className props |
| @radix-ui/react-tooltip | 1.2.8 | Radix primitive under shadcn Tooltip | Wrapping `TooltipProvider` at App level |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Progress | Native `<progress>` element | Native lacks styling hooks; shadcn aligns with existing component system |
| cva() for oversubscription badge | Inline ternary classes | cva() self-documents the three states; easier to test and extend |
| Single `BOMPanel.tsx` | Multiple smaller files | Phase 3 scope is narrow; premature splitting adds indirection without benefit |

**Installation:**

```bash
npx shadcn@latest add table
npx shadcn@latest add alert
npx shadcn@latest add tooltip
npx shadcn@latest add progress
```

**Version verification:** Verified 2026-03-17 against npm registry.

- `@radix-ui/react-progress` 1.1.8 (latest)
- `@radix-ui/react-tooltip` 1.2.8 (latest)
- These are transitive dependencies installed by `npx shadcn@latest add` automatically.

## Architecture Patterns

### Recommended Project Structure

```
src/features/sizing/
├── BOMPanel.tsx         # New — replaces ResultsPlaceholder
├── InputForm.tsx        # Existing — unchanged
├── ResultsPlaceholder.tsx  # Delete after BOMPanel is wired
└── SizingPage.tsx       # Edit — swap ResultsPlaceholder for BOMPanel
```

No new domain, store, or schema files are needed. The BOM panel is a pure consumer.

### Pattern 1: BOMPanel Store Consumption

**What:** `useResultStore` with `useShallow` to select `bom` and `violations` without triggering extra re-renders.
**When to use:** Whenever selecting multiple fields from a Zustand store in one call (required per CLAUDE.md).
**Example:**

```typescript
// Source: src/features/sizing/InputForm.tsx (established pattern)
import { useShallow } from 'zustand/shallow'
import { useResultStore } from '@/store/resultStore'

const { bom, violations } = useResultStore(
  useShallow((s) => ({ bom: s.bom, violations: s.violations }))
)
```

### Pattern 2: Oversubscription Severity Badge with cva()

**What:** A typed variant function that returns the correct Tailwind classes for the three oversubscription severity levels.
**When to use:** When a single element has 3+ semantic color states.
**Example:**

```typescript
// Pattern consistent with src/components/ui/badge.tsx
import { cva } from 'class-variance-authority'

const oversubBadgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold transition-colors duration-150',
  {
    variants: {
      severity: {
        optimal:    'bg-[hsl(142_76%_36%)] text-white dark:bg-[hsl(142_69%_58%)] dark:text-black',
        acceptable: 'bg-[hsl(38_92%_50%)] text-white dark:bg-[hsl(38_95%_64%)] dark:text-black',
        critical:   'bg-destructive text-destructive-foreground',
      },
    },
  }
)

function getSeverity(ratio: number): 'optimal' | 'acceptable' | 'critical' {
  if (ratio <= 3) return 'optimal'
  if (ratio <= 6) return 'acceptable'
  return 'critical'
}
```

### Pattern 3: Port Utilization Progress Bar with Tooltip

**What:** shadcn Progress + shadcn Tooltip, with explicit ARIA attributes on the Progress element.
**When to use:** Every switch model row in the Switches table.
**Example:**

```typescript
// Source: Radix UI Progress docs + shadcn Tooltip docs
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const pct = Math.min(Math.round((used / available) * 100), 100)
const progressClass =
  pct < 80 ? 'bg-[hsl(142_76%_36%)]' :
  pct < 100 ? 'bg-[hsl(38_92%_50%)]' :
  'bg-destructive'

<Tooltip>
  <TooltipTrigger asChild>
    <div>
      <Progress
        value={pct}
        className="h-2"
        // Indicator color override via data-attribute CSS or child className
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('bom.portUtilizationAriaLabel', { model, pct })}
      />
    </div>
  </TooltipTrigger>
  <TooltipContent>
    <p>{t('bom.portUtilizationTooltip', { used, available, pct })}</p>
  </TooltipContent>
</Tooltip>
```

**CRITICAL:** The shadcn Progress component renders a Radix `ProgressIndicator` as a child div. To override the indicator color per threshold, pass `className` to the `Progress` indicator child using the `[&>div]:bg-X` Tailwind utility pattern, or add a `indicatorClassName` prop via component modification. The copy-owned component can be edited directly.

### Pattern 4: TooltipProvider Placement

**What:** `TooltipProvider` must wrap the component tree that contains any `Tooltip`.
**When to use:** Must be added to `App.tsx` or `SizingPage.tsx` — NOT per-tooltip.
**Example:**

```typescript
// Source: shadcn Tooltip docs
// Add to src/App.tsx wrapping the existing ThemeProvider or inside it
import { TooltipProvider } from '@/components/ui/tooltip'

// Inside App.tsx render:
<TooltipProvider delayDuration={300}>
  {/* existing app tree */}
</TooltipProvider>
```

### Pattern 5: Amber Alert Variant

**What:** shadcn Alert only ships `default` and `destructive` variants. A custom `warning` variant is needed for `DAC_DISTANCE_ADVISORY`.
**When to use:** Only for `DAC_DISTANCE_ADVISORY` violations.
**Example:**

```typescript
// The alert.tsx copy-owned file can be extended with a new variant via cva
// Add to src/components/ui/alert.tsx alertVariants:
warning: 'border-[hsl(38_92%_50%)] text-foreground [&>svg]:text-[hsl(38_92%_50%)]'
// In dark mode this resolves via the .dark block to amber-400 automatically if you use:
warning: 'border-[hsl(38_92%_50%)] dark:border-[hsl(38_95%_64%)] ...'
```

### Pattern 6: Empty State Guard

**What:** Show an empty state when `bom === null` (initial store state before first valid input).
**When to use:** Top of BOMPanel render.
**Example:**

```typescript
// Consistent with ResultsPlaceholder pattern but using BarChart3 icon per UI-SPEC
if (!bom) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium">{t('bom.emptyHeading')}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{t('bom.emptyBody')}</p>
      </CardContent>
    </Card>
  )
}
```

### Anti-Patterns to Avoid

- **Accessing `useResultStore` without `useShallow`:** Causes infinite re-renders when the selector returns a new object reference on every render. Always use `useShallow`.
- **Color as the sole ARIA indicator:** Oversubscription badge and progress bar must also have `aria-label` text conveying state — never rely on color alone (WCAG 1.4.1).
- **Hardcoding port counts in the UI:** Always derive from `bom.input` + `SWITCH_CATALOG` — never inline 48, 32, etc.
- **Using `role="alert"` on the entire violations section:** Only individual violation Alert components should have `role="alert"` — wrapping section must not.
- **Creating a new `TooltipProvider` per component:** One provider wraps the tree; multiple providers cause z-index and delay conflicts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress bar | Custom `<div>` with width math | shadcn `Progress` (Radix primitive) | ARIA progressbar role, indeterminate state, Tailwind integration |
| Tooltip on hover+focus | mouseover/focus event handlers | shadcn `Tooltip` (Radix primitive) | Keyboard accessibility, auto-positioning, portal rendering, ARIA tooltip role |
| Semantic data table | Raw `<table>` | shadcn `Table` components | Consistent `<th scope="col">`, consistent styling, caption support |
| Violation banners | Custom styled divs | shadcn `Alert` + `AlertTitle` + `AlertDescription` | `role="alert"` wired, consistent destructive/warning styling |
| CVA badge variants | Long ternary chains | `cva()` from class-variance-authority | Type-safe variants, consistent with badge.tsx pattern |

**Key insight:** All visual complexity in Phase 3 is solved by the already-installed shadcn component library. The real work is wiring store data to components correctly with proper ARIA attributes.

## Common Pitfalls

### Pitfall 1: Progress Indicator Color Override

**What goes wrong:** `<Progress value={pct} className="bg-green-500" />` changes the track color, not the indicator. The indicator is a child `div` styled with `bg-primary` by default.
**Why it happens:** shadcn Progress uses a two-element structure: outer (track) and inner (indicator). Tailwind classes on the root element target the track.
**How to avoid:** Use `[&>div]:bg-[hsl(...)]` on the Progress element, or modify the copy-owned `progress.tsx` to accept an `indicatorClassName` prop. The copy-owned pattern means editing the file directly is the correct approach.
**Warning signs:** Progress bar appears wrong color regardless of value.

### Pitfall 2: TooltipProvider Missing

**What goes wrong:** Tooltip renders but never shows content; or throws a Radix context error in development.
**Why it happens:** `Tooltip` requires `TooltipProvider` ancestor to be present.
**How to avoid:** Add `<TooltipProvider>` to `App.tsx` wrapping the entire application tree, above `ThemeProvider` or as its immediate child.
**Warning signs:** Radix context missing error in console; tooltips silently fail.

### Pitfall 3: useResultStore Without useShallow

**What goes wrong:** BOMPanel re-renders on every Zustand state update, even unrelated ones. In React StrictMode this can cascade.
**Why it happens:** Zustand subscriptions use reference equality by default. An object selector `(s) => ({ bom: s.bom, violations: s.violations })` returns a new object reference on every call.
**How to avoid:** Always `useShallow` from `zustand/shallow` — established pattern in `InputForm.tsx`.
**Warning signs:** Console shows excessive re-renders; React DevTools shows BOMPanel updating more than once per input change.

### Pitfall 4: i18n Key Namespace Collision

**What goes wrong:** New BOM translation keys added under `results.*` conflict with existing keys; or keys are missing in FR/DE/IT locales causing fallback to EN without error.
**Why it happens:** i18next silently falls back to English when a key is missing in the active locale.
**How to avoid:** Add all new keys under a dedicated `bom.*` namespace, parallel to `results.*` and `sizing.*`. Add keys to all four locale files (en, fr, de, it) simultaneously.
**Warning signs:** Text appears in English when another language is selected.

### Pitfall 5: Oversubscription Ratio Formatting

**What goes wrong:** `oversubscriptionRatio.toFixed(1)` produces "3.0" but the format string must be "3.0:1". Formatting in JSX must append ":1".
**Why it happens:** The store returns a raw number, not a formatted string.
**How to avoid:** Format in the component: `{bom.oversubscriptionRatio.toFixed(1)}:1`.
**Warning signs:** Ratio displays as just a number with no ":1" suffix.

### Pitfall 6: Port Utilization Calculation — Which "Available" Value?

**What goes wrong:** Using `SWITCH_CATALOG[model].downlinkPorts` for "available" but the BOM schema does not store per-model port utilization directly.
**Why it happens:** `NetworkBOM` stores aggregate counts (leafSwitches, spineSwitches), not per-model port usage.
**How to avoid:** Derive port utilization in the component from `bom` + `SWITCH_CATALOG`:

- Leaf: `used = bom.input.serversPerRack` per leaf switch (each leaf connects one rack), `available = SWITCH_CATALOG[bom.input.leafModel].downlinkPorts`
- Spine: `used = bom.leafSwitches`, `available = SWITCH_CATALOG['S5232F-ON'].downlinkPorts * bom.spineSwitches` — but display per-switch: `used = bom.leafSwitches / bom.spineSwitches` (may not be integer)
- OOB: `used = bom.input.serversPerRack + 2` (serversPerRack + 2 leaf ToR switches per OOB switch), `available = 48`

The spine per-switch port utilization should show `ceil(bom.leafSwitches / bom.spineSwitches)` used vs `SWITCH_CATALOG['S5232F-ON'].downlinkPorts` available.
**Warning signs:** Port utilization bar shows 0% or >100% for unexpected inputs.

### Pitfall 7: Alert variant="warning" Does Not Exist in shadcn

**What goes wrong:** `<Alert variant="warning">` produces no styling change — shadcn Alert only has `default` and `destructive` out of the box.
**Why it happens:** shadcn ships a minimal variant set.
**How to avoid:** Extend `alert.tsx` CVA variants with a `warning` variant before using it for `DAC_DISTANCE_ADVISORY`. This is the correct pattern for copy-owned shadcn components.
**Warning signs:** DAC_DISTANCE_ADVISORY alert renders with default styling (no amber border/icon).

## Code Examples

### Switches Table Structure

```typescript
// Source: shadcn Table docs (verified)
import {
  Table, TableBody, TableCaption, TableCell,
  TableHead, TableHeader, TableRow
} from '@/components/ui/table'

<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {t('bom.switchesHeading')}
    </CardTitle>
  </CardHeader>
  <CardContent className="p-0">
    <Table>
      <TableCaption className="sr-only">{t('bom.switchesHeading')}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t('bom.colModel')}</TableHead>
          <TableHead scope="col">{t('bom.colRole')}</TableHead>
          <TableHead scope="col">{t('bom.colQty')}</TableHead>
          <TableHead scope="col">{t('bom.colUtilization')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* one row per switch model */}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

### Violation Alert for OOB_PORT_SATURATION

```typescript
// Source: shadcn Alert docs (verified), ConstraintViolation schema (codebase)
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

{violations.map((v) => {
  if (v.code === 'OOB_PORT_SATURATION') {
    return (
      <Alert key={v.code} variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('bom.violationOobTitle')}</AlertTitle>
        <AlertDescription>
          {t('bom.violationOobBody', { required: v.required, available: v.available })}
        </AlertDescription>
      </Alert>
    )
  }
  // ... other violation codes
})}
```

### i18n Key Structure for BOM Panel (EN canonical)

```json
{
  "bom": {
    "heading": "Bill of Materials",
    "switchesHeading": "Switches",
    "cablesHeading": "Cables ({{type}})",
    "portUtilizationHeading": "Port Utilization",
    "alertsHeading": "Alerts",
    "oversubHeading": "Oversubscription Ratio",
    "oversubOptimal": "Optimal",
    "oversubOptimalValue": "<= 3:1",
    "oversubAcceptable": "Acceptable",
    "oversubAcceptableValue": "<= 6:1",
    "oversubCritical": "Critical",
    "oversubCriticalValue": "> 6:1",
    "oversubAriaLabel": "Oversubscription ratio: {{value}}. Status: {{status}}",
    "colModel": "Model",
    "colRole": "Role",
    "colQty": "Qty",
    "colUtilization": "Utilization",
    "colCableType": "Type",
    "colCableCategory": "Category",
    "roleLeaf": "Leaf (ToR)",
    "roleSpine": "Spine",
    "roleOob": "OOB",
    "cableCategoryDac": "DAC — Direct Attach",
    "cableCategoryAoc": "AOC — Active Optical",
    "cableCategoryFiber": "Fiber — LC/MPO",
    "portUtilizationTooltip": "{{used}} used / {{available}} available ({{pct}}%)",
    "portUtilizationAriaLabel": "Port utilization for {{model}}: {{pct}}%",
    "emptyHeading": "No BOM calculated",
    "emptyBody": "Enter sizing parameters in the form to calculate your Bill of Materials.",
    "violationOobTitle": "OOB Port Saturation",
    "violationOobBody": "{{required}} ports required but only {{available}} available on one S3248T-ON. Add a second OOB switch or reduce servers per rack.",
    "violationSpineTitle": "Spine Capacity Exceeded",
    "violationSpineBody": "{{leafCount}} leaf switches exceed the {{maxLeafs}}-port capacity of the spine tier. Scale out spine switches or segment into multiple pods.",
    "violationDacTitle": "DAC Distance Advisory",
    "violationDacBody": "DAC cables are limited to 3m. With {{rackCount}} racks, verify all leaf-to-spine runs are within spec. Consider AOC or fiber for longer distances."
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-pdf` (viewer) | `@react-pdf/renderer` (generator) | Phase 4 planning | Phase 3 is not affected — no PDF in scope |
| `reactflow` package | `@xyflow/react` | Phase 4 planning | Phase 3 is not affected — no diagrams in scope |
| Separate `vitest.config.ts` | `vite.config.ts` test block | Phase 2 | Single config file — no separate vitest config to create |

**Deprecated/outdated:**

- `ResultsPlaceholder.tsx`: Replaced by `BOMPanel.tsx` in this phase — delete after wiring.

## Open Questions

1. **Port utilization display granularity for spine switches**
   - What we know: BOM has `spineSwitches` (count) and `leafSwitches` (total connections needed). Spine is full-mesh non-blocking.
   - What's unclear: Whether to show per-spine-switch utilization (leafSwitches / spineSwitches) or total spine tier utilization. UI-SPEC says "per switch model" — suggesting per-switch.
   - Recommendation: Show per-switch: `ceil(leafSwitches / spineSwitches)` used of `32` available. Flag in component comment.

2. **Oversubscription ratio thresholds against Dell design guide**
   - What we know: STATE.md has a research flag: "Confirm oversubscription thresholds against Dell EMC L3 Leaf-Spine Design Guide (green <=3:1, amber <=6:1, red >6:1)."
   - What's unclear: Whether these are confirmed Dell-specified thresholds or project-estimated values.
   - Recommendation: The UI-SPEC explicitly specifies these thresholds as the locked design decision. Implement as specified (<=3:1 green, 3:1-6:1 amber, >6:1 red) and document the threshold source pending Dell guide verification.

3. **SizingPage tooltip provider placement**
   - What we know: `TooltipProvider` must wrap all `Tooltip` components.
   - What's unclear: Whether `App.tsx` already has a suitable wrapper location or if `SizingPage.tsx` is the right place.
   - Recommendation: Add `TooltipProvider` in `App.tsx` at the same level as `ThemeProvider`. It should wrap the full app tree, not just BOMPanel.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vite.config.ts (test block — no separate vitest.config.ts per Phase 2 decision) |
| Quick run command | `npx vitest run src/features/sizing/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BOM-01 | BOM table renders switch rows for Leaf, Spine, and OOB models with correct quantities | unit (RTL) | `npx vitest run src/features/sizing/BOMPanel.test.tsx` | Wave 0 |
| BOM-02 | Oversubscription ratio displays as "N.N:1" with correct color badge: green <=3:1, amber >3:1-6:1, red >6:1 | unit (RTL) | `npx vitest run src/features/sizing/BOMPanel.test.tsx` | Wave 0 |
| BOM-03 | Cable type change in input form immediately updates Cables table SKU category heading (DAC/AOC/Fiber) | unit (RTL) | `npx vitest run src/features/sizing/BOMPanel.test.tsx` | Wave 0 |
| BOM-04 | Port utilization shows "used / available" and progress bar; OOB saturation triggers visible Alert with role="alert" | unit (RTL) | `npx vitest run src/features/sizing/BOMPanel.test.tsx` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/features/sizing/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/sizing/BOMPanel.test.tsx` — covers BOM-01 through BOM-04
- [ ] Update `src/components/ui/alert.tsx` — extend with `warning` variant before tests reference it
- [ ] Update `src/components/ui/progress.tsx` — add `indicatorClassName` prop for threshold color override

## Sources

### Primary (HIGH confidence)

- Codebase: `src/domain/schemas/bom.ts` — NetworkBOM schema, ConstraintViolation discriminated union
- Codebase: `src/store/resultStore.ts` — module-level subscription, bom/violations state
- Codebase: `src/features/sizing/InputForm.tsx` — useShallow pattern, component structure
- Codebase: `src/components/ui/badge.tsx` — cva() variant pattern to replicate for oversubscription badge
- Codebase: `src/index.css` — actual CSS variable values deployed in the project
- `.planning/phases/03-bom-output-and-metrics/03-UI-SPEC.md` — approved visual contract

### Secondary (MEDIUM confidence)

- shadcn official docs (ui.shadcn.com/docs/components/table) — Table component sub-components
- shadcn official docs (ui.shadcn.com/docs/components/alert) — Alert variants and API
- shadcn official docs (ui.shadcn.com/docs/components/tooltip) — TooltipProvider pattern
- shadcn official docs (ui.shadcn.com/docs/components/progress) — Progress usage
- Radix UI docs (radix-ui.com/primitives/docs/components/progress) — ARIA progressbar role

### Tertiary (LOW confidence)

- STATE.md research flag: "Confirm oversubscription thresholds against Dell EMC L3 Leaf-Spine Design Guide" — thresholds implemented per UI-SPEC but Dell guide not directly verified

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in package.json or verified against npm registry 2026-03-17
- Architecture: HIGH — codebase read directly; patterns derived from existing Phase 2 code
- Pitfalls: HIGH for Progress/Tooltip/cva patterns (verified via official docs); MEDIUM for port utilization calculation (derived from schema, no test yet)
- i18n keys: HIGH — derived from UI-SPEC copywriting contract verbatim

**Research date:** 2026-03-17
**Valid until:** 2026-05-17 (stable stack — shadcn, Radix UI, Zustand, React 19)

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOM-01 | BOM displays switch quantities per model (S5248F-ON, S5232F-ON, S5224F-ON, S5212F-ON, S3248T-ON) | shadcn Table component + useResultStore provides leafSwitches, spineSwitches, oobSwitches; leaf model comes from bom.input.leafModel |
| BOM-02 | BOM displays oversubscription ratio per tier and validates against thresholds | bom.oversubscriptionRatio is a ready number; cva() pattern for badge; thresholds <=3:1/<=6:1/>6:1 locked in UI-SPEC |
| BOM-03 | User can select cable type (DAC/AOC/fiber) and engine calculates cable quantities | cableType is already in inputStore; bom.leafSpineCables, serverLeafCables, serverOobCables are computed; Cables table heading shows active type |
| BOM-04 | BOM displays port utilization (used vs available) per switch model | Port utilization derived from bom + SWITCH_CATALOG; shadcn Progress for bar; shadcn Tooltip for exact values; shadcn Alert for OOB_PORT_SATURATION violation |
</phase_requirements>

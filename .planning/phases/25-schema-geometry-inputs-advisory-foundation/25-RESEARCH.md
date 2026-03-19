# Phase 25: Schema, Geometry Inputs & Advisory Foundation - Research

**Researched:** 2026-03-19
**Domain:** Zod schema extension, Zustand store migration, profile normalization, cable catalog correction
**Confidence:** HIGH

## Summary

Phase 25 is pure schema and store plumbing — zero new computation, no UI changes. All decisions are directly observable by reading production source files. No library research is needed beyond confirming Zod v4 discriminated union extension syntax (already in use in this codebase).

The phase has three independent workstreams that must be sequenced:

1. **Schema additions** — Add `rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM` to `SizingInputSchema`, `ThreeTierSizingInputSchema`, and `ConvergedSizingInputSchema`. Add `AdvisorySchema` and `advisories[]` to `NetworkBOMSchema` and `ThreeTierBOMSchema`. Extend `DAC_DISTANCE_ADVISORY` in both violation unions with a `computedDistanceM` field. Fix `CABLE_CATALOG.DAC.maxDistanceM` — it is currently a flat 5 for all speeds; split into `maxDistanceM25G: 3` and `maxDistanceM100G: 5` (or restructure to a per-speed map).

2. **Store migration v8 → v9** — `inputStore.ts` currently at version 8. Bump to 9. The existing `{ ...DEFAULT_INPUT, ...oldInput }` merge strategy in the `merge()` callback already handles new fields via spread — the only required change is adding the three new fields with their defaults to `DEFAULT_INPUT` and incrementing `version: 8 → 9`.

3. **Profile normalisation** — `profileService.ts` exports `loadProfile(id)` which returns `Profile | null` with `inputState: Record<string, unknown>`. The calling code (in the UI layer) is responsible for calling `setInput(profile.inputState as Partial<SizingInput>)`. `normalizeToCurrentSchema()` must be added to the domain layer (either in `profileService.ts` or as a new helper in `src/domain/profiles/`) and called by any consumer before applying a loaded profile's `inputState` to the store.

The critical sequence constraint: `AdvisorySchema` must exist before Phase 26 adds any advisory to the engine. This phase is the gate — get the schema shape right and everything downstream is type-checked automatically.

**Primary recommendation:** Implement schema additions first, then `AdvisorySchema`, then catalog fix, then store migration, then `normalizeToCurrentSchema`. Each step is independently testable.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PHYS-01 | New `advisories[]` output array distinct from `violations[]` — renders as amber advisory cards in UI | `AdvisorySchema` discriminated union added to `bom.ts` and `three-tier-bom.ts`; `advisories: z.array(AdvisorySchema)` added to `NetworkBOMSchema` and `ThreeTierBOMSchema` |
| PHYS-02 | `inputStore` bumped to version 9 with automatic migration for all new fields | `inputStore.ts` version 8 → 9; three new fields added to `DEFAULT_INPUT`; existing `{ ...DEFAULT_INPUT, ...oldInput }` merge strategy handles migration transparently |
| PHYS-03 | Profile load normalises against current schema before applying | New `normalizeToCurrentSchema(inputState, DEFAULT_INPUT)` pure function in `profileService.ts`; spreads `DEFAULT_INPUT` over saved state to fill missing fields |
| DAC-03 | Fix `CABLE_CATALOG.DAC.maxDistanceM` to reflect speed-specific limits | `cables.ts` currently has flat `maxDistanceM: 5`; restructure to `maxDistanceBySpeed: { 25: 3, 100: 5 }` map (or separate fields); `CableSpec` interface in `types.ts` updated accordingly |
| RACK-01 | User can configure rack pitch in mm (default 600mm, optional field) | `rackPitchMm: z.number().int().min(100).max(2000).default(600)` added to `SizingInputSchema`, `ThreeTierSizingInputSchema`, `ConvergedSizingInputSchema` |
| RACK-02 | User can toggle "all racks adjacent" (default true) | `racksAdjacent: z.boolean().default(true)` added to all three input schemas |
| RACK-03 | When non-adjacent, user inputs rack-to-patch-panel distance (metres) | `patchPanelDistanceM: z.number().min(0).max(100).default(1)` added to all three input schemas; validated only when `racksAdjacent === false` |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.x (in use) | Schema extension — new fields, `AdvisorySchema` discriminated union | Project standard; all types derived via `z.infer<>` |
| zustand | 5.x (in use) | Store version bump and `DEFAULT_INPUT` update | Project standard; `persist` middleware handles migration |

### Supporting

No new packages required. This phase is purely additive to existing files.

### Alternatives Considered

None. The project's schema-first architecture is established and locked (ADR-0009, CLAUDE.md). There are no alternative approaches to evaluating — the patterns are already in use.

**Installation:** No new packages.

## Architecture Patterns

### Files Modified in This Phase

```
src/domain/
├── catalog/
│   ├── cables.ts          # Fix DAC maxDistanceM — add per-speed map
│   └── types.ts           # Update CableSpec interface to match new catalog shape
├── schemas/
│   ├── input.ts           # Add rackPitchMm, racksAdjacent, patchPanelDistanceM
│   ├── bom.ts             # Add AdvisorySchema, advisories[], extend DAC_DISTANCE_ADVISORY
│   ├── three-tier-input.ts # Add rackPitchMm, racksAdjacent, patchPanelDistanceM
│   ├── three-tier-bom.ts  # Add AdvisorySchema import, advisories[], extend DAC variant
│   └── converged-input.ts # Add rackPitchMm, racksAdjacent, patchPanelDistanceM
├── profiles/
│   └── profileService.ts  # Add normalizeToCurrentSchema(), export it
src/store/
└── inputStore.ts          # Bump version 8→9, add 3 new fields to DEFAULT_INPUT
```

### Pattern 1: Zod Field Addition with Default

**What:** Add optional fields with defaults so existing stored data passes validation.
**When to use:** Every new input field in Phase 25.

```typescript
// Source: src/domain/schemas/input.ts (existing pattern)
// Adding new geometry fields to SizingInputSchema:
rackPitchMm: z.number().int().min(100).max(2000).default(600),
racksAdjacent: z.boolean().default(true),
patchPanelDistanceM: z.number().min(0).max(100).default(1),
```

All three new fields must have `.default()` calls so that `SizingInputSchema.parse(oldStoredInput)` succeeds without these keys being present in the stored JSON.

### Pattern 2: Zod Discriminated Union for AdvisorySchema

**What:** A new discriminated union parallel to `ConstraintViolationSchema`, with its own codes, kept in the same file (`bom.ts`).
**When to use:** PHYS-01 — `advisories[]` must never mix with `violations[]`.

```typescript
// Source: src/domain/schemas/bom.ts (new addition, modelled on existing ConstraintViolationSchema)
export const AdvisorySchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('PATCH_PANEL_RECOMMENDED'),
    /** Computed DAC path length that exceeded the rated spec */
    computedDistanceM: z.number(),
    /** DAC speed-specific rated limit */
    dacLimitM: z.number(),
  }),
  // Future advisory codes added here (Phase 26+)
]);

export type Advisory = z.infer<typeof AdvisorySchema>;
```

Then in `NetworkBOMSchema`:
```typescript
advisories: z.array(AdvisorySchema).default([]),
```

### Pattern 3: Extending DAC_DISTANCE_ADVISORY with computedDistanceM

**What:** Add `computedDistanceM` field to the existing `DAC_DISTANCE_ADVISORY` variant in `ConstraintViolationSchema`.
**When to use:** DAC-03 — the engine currently emits this violation with only `rackCount` and `cableType`; Phase 26 will populate `computedDistanceM`. Adding the field now (as `.optional()`) keeps Phase 25 non-breaking and Phase 26 additive.

```typescript
// Source: src/domain/schemas/bom.ts — extend existing DAC_DISTANCE_ADVISORY variant
z.object({
  code: z.literal('DAC_DISTANCE_ADVISORY'),
  rackCount: z.number().int(),
  cableType: z.literal('DAC'),
  /** Populated by Phase 26 cable engine; optional until then */
  computedDistanceM: z.number().optional(),
}),
```

The same change applies to `ThreeTierConstraintViolationSchema` in `three-tier-bom.ts`.

### Pattern 4: DAC Catalog Fix

**What:** Replace flat `maxDistanceM: 5` with a per-speed structure.
**When to use:** DAC-03.

Current state in `cables.ts`:
```typescript
DAC: {
  type: 'DAC',
  speedGbE: [25, 100],
  maxDistanceM: 5,   // WRONG — applies 100G limit to 25G
},
```

Required state:
```typescript
DAC: {
  type: 'DAC',
  speedGbE: [25, 100],
  maxDistanceBySpeed: { 25: 3, 100: 5 },  // IEEE 802.3by / 802.3bj
},
```

`CableSpec` interface in `types.ts` must be updated to replace `maxDistanceM: number` with `maxDistanceBySpeed: Record<number, number>`. Check all consumers of `CABLE_CATALOG.DAC.maxDistanceM` before removing the old field — there is currently one consumer in `sizing.ts` and one in `three-tier-sizing.ts`.

**ALTERNATIVE (lower risk for Phase 25):** Keep `maxDistanceM` as a field but set it to the conservative 25G limit (3m), and add `maxDistanceBySpeed` alongside it. This avoids breaking existing engine consumers until Phase 26 upgrades the advisory. Phase 26 then switches consumers to `maxDistanceBySpeed` and removes `maxDistanceM`.

The lower-risk approach is preferred for Phase 25 since the engines are not modified here.

### Pattern 5: Zustand Version Bump

**What:** Increment `version` and add new fields to `DEFAULT_INPUT`.
**When to use:** PHYS-02.

```typescript
// Source: src/store/inputStore.ts (existing pattern for v2→v3...v7→v8)
const DEFAULT_INPUT: SizingInput = {
  // ... existing fields ...
  // NEW in v9:
  rackPitchMm: 600,
  racksAdjacent: true,
  patchPanelDistanceM: 1,
}

// version: 8 → 9
version: 9,
// The merge() callback already handles new fields via { ...DEFAULT_INPUT, ...oldInput }
// No additional migration logic needed for these simple scalar/boolean fields.
```

The comment block in `inputStore.ts` documenting each version upgrade must be updated to document v8 → v9.

### Pattern 6: normalizeToCurrentSchema

**What:** A pure function that spreads `DEFAULT_INPUT` over a saved profile's `inputState`, filling in any keys missing from older saved profiles.
**When to use:** PHYS-03 — called by the UI layer before applying a loaded profile to the store.

```typescript
// Source: new addition to src/domain/profiles/profileService.ts
import { DEFAULT_INPUT } from '@/store/inputStore'
// OR: define DEFAULT_INPUT_ETH, DEFAULT_INPUT_FC, DEFAULT_INPUT_CONVERGED
// and select based on profile.mode

/**
 * Normalises a loaded profile's inputState against the current DEFAULT_INPUT.
 * Fills in any keys missing from older saved profiles with their current defaults.
 * Returns a new object; does not mutate the input.
 */
export function normalizeEthInputState(
  saved: Record<string, unknown>
): Record<string, unknown> {
  return { ...(DEFAULT_INPUT as Record<string, unknown>), ...saved }
}
```

**Coupling concern:** `profileService.ts` lives in `src/domain/profiles/` (domain layer) but `DEFAULT_INPUT` lives in `src/store/inputStore.ts` (store layer). The domain layer must not import from the store layer — this violates the one-way dependency chain (Domain → Store → Features).

**Resolution options:**
1. Define a `DEFAULT_ETH_INPUT` constant in `src/domain/schemas/input.ts` (or a dedicated `src/domain/schemas/defaults.ts`) and import it in both `profileService.ts` and `inputStore.ts`.
2. Move `normalizeToCurrentSchema()` to the store layer or a utility layer above domain.
3. Pass `DEFAULT_INPUT` as a parameter to the normalize function (dependency injection).

Option 1 is cleanest: extract defaults from `inputStore.ts` to `src/domain/schemas/defaults.ts` and import from there. This keeps domain pure and store thin.

### Anti-Patterns to Avoid

- **Adding `advisories[]` to `violations[]`:** The entire point of PHYS-01 is the semantic split. Never add `PATCH_PANEL_RECOMMENDED` or any new advisory code to `ConstraintViolationSchema`. It goes to `AdvisorySchema` only.
- **Removing `maxDistanceM` from `CableSpec` in Phase 25:** The existing engine still references `CABLE_CATALOG.DAC.maxDistanceM`. Only Phase 26 removes this dependency. Keep it in Phase 25 (set to conservative 3m, or keep 5m and add `maxDistanceBySpeed`).
- **Calling `SizingInputSchema.parse()` in `normalizeToCurrentSchema()`:** The normalize function should spread defaults, not validate. Validation happens at engine entry. Parsing old profiles at normalize time would reject valid profiles that predate schema changes.
- **Importing from `src/store/` in `src/domain/`:** Violates the one-way dependency chain. Domain must not import store.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Backwards-compatible schema migration | Custom JSON patching / migration loop | Zod `.default()` + `{ ...DEFAULT_INPUT, ...oldInput }` spread | Zod defaults handle missing fields at parse time; spread handles stored JSON; already proven in v2-v8 migrations |
| Type-safe discriminated union | `if/else` string checks | `z.discriminatedUnion('code', [...])` | TypeScript exhaustiveness checking, zero-cost at runtime |
| Default values for new store fields | Manual version migration callbacks | Add to `DEFAULT_INPUT` — existing `merge()` spread handles it | The v8 store already uses `{ ...DEFAULT_INPUT, ...oldInput }` — no new migration code needed |

**Key insight:** The existing Zustand `merge()` strategy is specifically designed for additive schema migrations. Adding three new fields to `DEFAULT_INPUT` is sufficient; no `migrate()` callback with version branching is needed.

## Common Pitfalls

### Pitfall 1: Importing DEFAULT_INPUT from Store into Domain Layer

**What goes wrong:** `profileService.ts` (domain) imports `DEFAULT_INPUT` from `inputStore.ts` (store), creating a circular or upward dependency.
**Why it happens:** The natural place to define `DEFAULT_INPUT` seems to be the store where it is used.
**How to avoid:** Extract default values to `src/domain/schemas/defaults.ts` (or as a named export from `input.ts`). Both `profileService.ts` and `inputStore.ts` import from this domain-layer constant.
**Warning signs:** TypeScript error "circular dependency detected" or tsc reporting `inputStore` imported from `domain/`.

### Pitfall 2: Breaking Existing Engine Consumers of maxDistanceM

**What goes wrong:** Removing `maxDistanceM` from `CableSpec` and `CABLE_CATALOG.DAC` causes TypeScript errors in `sizing.ts` and `three-tier-sizing.ts` which still reference `CABLE_CATALOG.DAC.maxDistanceM`.
**Why it happens:** Phase 25 fixes the catalog but Phase 26 upgrades the engine consumers.
**How to avoid:** Either (a) keep `maxDistanceM` set to 3 (conservative 25G limit) alongside the new `maxDistanceBySpeed` map, or (b) set `maxDistanceM: 3` and add `maxDistanceBySpeed: { 25: 3, 100: 5 }` as an additional field. Do not remove `maxDistanceM` in Phase 25.
**Warning signs:** `npx tsc --noEmit` errors after changing `CableSpec`.

### Pitfall 3: AdvisorySchema Missing from ThreeTierBOMSchema

**What goes wrong:** `AdvisorySchema` and `advisories[]` are added to `NetworkBOMSchema` (Clos) but forgotten in `ThreeTierBOMSchema`. Phase 26 cable engine adds `PATCH_PANEL_RECOMMENDED` to three-tier output but the schema rejects it.
**Why it happens:** Three-tier and Clos schemas are parallel and both must be updated separately (ADR-0009 parallel architecture).
**How to avoid:** Update `bom.ts` and `three-tier-bom.ts` as a paired commit. Test both schemas in `schemas.test.ts`.
**Warning signs:** TypeScript error on `ThreeTierBOM.advisories` in Phase 26.

### Pitfall 4: normalizeToCurrentSchema Does Not Cover FC and Converged Modes

**What goes wrong:** `normalizeToCurrentSchema` is implemented only for Ethernet mode (`SizingInput`). Profiles saved in FC or Converged mode get `undefined` for new fields when loaded.
**Why it happens:** Phase 25 adds geometry fields to all three input schemas, but the normalize function only spreads `DEFAULT_ETH_INPUT`.
**How to avoid:** Implement mode-specific normalize functions: `normalizeEthInputState`, `normalizeFCInputState`, `normalizeConvergedInputState`. Each spreads its own mode's defaults. Call the correct one based on `profile.mode`.
**Warning signs:** FC or Converged profiles loaded post-migration have `undefined` for geometry fields.

### Pitfall 5: Version Bump Without Updating the Comment Block

**What goes wrong:** `inputStore.ts` `version: 9` is set but the comment documenting each version's migration is not updated. Future maintainers cannot reconstruct what v9 added.
**Why it happens:** Comment maintenance is easy to overlook during code review.
**How to avoid:** Update the inline JSDoc comment listing all version migrations as part of the same commit.
**Warning signs:** Review the `merge` callback JSDoc — if it still says "v7 to v8 (adds brownfield toggles)" without mentioning v9, the comment is stale.

### Pitfall 6: ThreeTierSizingInputSchema and ConvergedSizingInputSchema Not Updated

**What goes wrong:** Geometry fields added only to `SizingInputSchema` (Clos). `ThreeTierSizingInputSchema` and `ConvergedSizingInputSchema` remain stale, causing TypeScript errors in Phase 26 when the engines try to consume `input.rackPitchMm`.
**Why it happens:** Parallel architecture requires updating all three input schemas.
**How to avoid:** Add geometry fields to all three schemas in the same plan/commit.

## Code Examples

Verified patterns from production source files:

### Existing discriminatedUnion (ConstraintViolationSchema)

```typescript
// Source: src/domain/schemas/bom.ts (lines 14-45)
export const ConstraintViolationSchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('OOB_PORT_SATURATION'),
    required: z.number().int(),
    available: z.number().int(),
  }),
  // ... additional variants
]);
```

`AdvisorySchema` follows the same pattern with a different union variable name and codes.

### Existing Zustand merge pattern (inputStore.ts)

```typescript
// Source: src/store/inputStore.ts (lines 104-140)
merge: (persisted, current) => {
  const persistedState = persisted as Partial<InputState>;
  const oldInput = persistedState?.input as Record<string, unknown> | undefined;
  let migratedInput: SizingInput = { ...DEFAULT_INPUT };
  if (oldInput) {
    if ('racks' in oldInput && Array.isArray(oldInput.racks)) {
      migratedInput = { ...DEFAULT_INPUT, ...oldInput } as SizingInput;
    }
    // v2 format migration omitted for brevity
  }
  return { ...current, input: migratedInput };
},
```

For v8 → v9: the `{ ...DEFAULT_INPUT, ...oldInput }` line automatically picks up `rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM` from `DEFAULT_INPUT` when they are absent in `oldInput`. No new branching is required.

### Existing profile inputState load (profileService.ts)

```typescript
// Source: src/domain/profiles/profileService.ts (lines 124-127)
export function loadProfile(id: string): Profile | null {
  const profiles = readProfiles();
  return profiles.find((p) => p.id === id) ?? null;
}
```

`normalizeToCurrentSchema` is called by the UI consumer, not inside `loadProfile`. The service returns the raw stored `inputState`; the caller normalises before passing to `setInput`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `maxDistanceM: 5` flat for all DAC speeds | `maxDistanceBySpeed: { 25: 3, 100: 5 }` | Phase 25 | Correct advisory triggering for 25G deployments (was firing too late at >5m) |
| No advisory type | `AdvisorySchema` discriminated union, `advisories[]` in BOM | Phase 25 | Informational messages (amber) separated from blocking errors (red) |
| No geometry inputs | `rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM` in `SizingInputSchema` | Phase 25 | Cable length engine in Phase 26 has its required inputs |

## Open Questions

1. **DEFAULT_INPUT location**
   - What we know: `DEFAULT_INPUT` is currently defined inline in `inputStore.ts` (store layer). Domain layer (`profileService.ts`) must not import from store layer.
   - What's unclear: Whether to extract defaults to `src/domain/schemas/defaults.ts` or pass as parameter.
   - Recommendation: Extract to `src/domain/schemas/defaults.ts` and re-export from `inputStore.ts`. This is a two-line refactor with no functional change.

2. **patchPanelDistanceM validation: is `max(100)` the right ceiling?**
   - What we know: Large enterprise deployments may have patch panels 30-50m from server racks. The requirement says "metres" with no stated maximum.
   - What's unclear: No hard ceiling from standards; 100m is a reasonable UI guardrail.
   - Recommendation: Use `z.number().min(0).max(100).default(1)`. The engine will use this value for cable length arithmetic in Phase 26 — an unreasonably large value just produces a large advisory.

3. **Does `CableSpec` interface need `maxDistanceBySpeed` or just a corrected `maxDistanceM`?**
   - What we know: Phase 26 engine will need per-speed limits. Phase 25 is only fixing the catalog; the engine is not touched.
   - What's unclear: Whether the Phase 25 catalog fix should be a two-step (conservative flat value now, per-speed map in Phase 26) or a one-step (full restructure now).
   - Recommendation: Full restructure now (add `maxDistanceBySpeed`, keep `maxDistanceM` set to 3 for backwards compatibility with current engine consumers). This avoids a second catalog change in Phase 26.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (in use, node + jsdom environments) |
| Config file | `vite.config.ts` (vitest config embedded) |
| Quick run command | `npx vitest run src/domain/schemas/schemas.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHYS-01 | `AdvisorySchema` parses valid advisory objects | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ Wave 0 |
| PHYS-01 | `advisories[]` field present on `NetworkBOMSchema` and `ThreeTierBOMSchema` | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ Wave 0 |
| PHYS-02 | `SizingInputSchema` accepts new geometry fields | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ Wave 0 |
| PHYS-02 | `inputStore` version is 9 | unit | `npx vitest run src/store/inputStore.test.ts` | — (store test exists) |
| PHYS-03 | `normalizeToCurrentSchema` fills missing fields with defaults | unit | `npx vitest run src/domain/profiles/profileService.test.ts` | ❌ Wave 0 |
| DAC-03 | `CABLE_CATALOG.DAC.maxDistanceBySpeed[25]` equals 3 | unit | `npx vitest run src/domain/catalog/hardware.test.ts` | ❌ Wave 0 |
| DAC-03 | `CABLE_CATALOG.DAC.maxDistanceBySpeed[100]` equals 5 | unit | `npx vitest run src/domain/catalog/hardware.test.ts` | ❌ Wave 0 |
| RACK-01 | `SizingInputSchema` defaults `rackPitchMm` to 600 | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ Wave 0 |
| RACK-02 | `SizingInputSchema` defaults `racksAdjacent` to true | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ Wave 0 |
| RACK-03 | `SizingInputSchema` accepts `patchPanelDistanceM` when `racksAdjacent` is false | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/schemas/schemas.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/domain/schemas/schemas.test.ts` — add test cases for new geometry fields on `SizingInputSchema`, `AdvisorySchema` round-trip, `advisories[]` on `NetworkBOMSchema`
- [ ] `src/domain/catalog/hardware.test.ts` — add test cases for `CABLE_CATALOG.DAC.maxDistanceBySpeed`
- [ ] `src/domain/profiles/profileService.test.ts` — add test case for `normalizeToCurrentSchema` (or `normalizeEthInputState`) filling missing fields

## Sources

### Primary (HIGH confidence)

- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/input.ts` — `SizingInputSchema` current shape, confirmed 15 fields, no geometry fields present
- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/bom.ts` — `ConstraintViolationSchema`, `NetworkBOMSchema` shapes confirmed; `DAC_DISTANCE_ADVISORY` has `rackCount` and `cableType` only (no `computedDistanceM`); no `advisories[]` field present
- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/three-tier-input.ts` — `ThreeTierSizingInputSchema` confirmed, same geometry fields missing
- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/three-tier-bom.ts` — `ThreeTierBOMSchema` confirmed, parallel to `NetworkBOMSchema`
- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/converged-input.ts` — `ConvergedSizingInputSchema` confirmed, same geometry fields missing
- `/Users/fjacquet/Projects/network-sizer/src/domain/catalog/cables.ts` — `CABLE_CATALOG.DAC.maxDistanceM: 5` confirmed (flat value, incorrect for 25G)
- `/Users/fjacquet/Projects/network-sizer/src/domain/catalog/types.ts` — `CableSpec` interface confirmed with `maxDistanceM: number` (single value, not per-speed)
- `/Users/fjacquet/Projects/network-sizer/src/store/inputStore.ts` — `version: 8` confirmed; `merge()` uses `{ ...DEFAULT_INPUT, ...oldInput }` spread; `DEFAULT_INPUT` defined inline
- `/Users/fjacquet/Projects/network-sizer/src/domain/profiles/profileService.ts` — `loadProfile()` returns `Profile | null` with raw `inputState`; no normalisation present; domain layer, no store imports
- `/Users/fjacquet/Projects/network-sizer/src/store/resultStore.ts` — `toThreeTierInput()` adapter confirmed; must be updated to pass three new geometry fields from `SizingInput` to `ThreeTierSizingInput`
- `/Users/fjacquet/Projects/network-sizer/.planning/research/SUMMARY.md` — v6.0 project-level research confirming IEEE 802.3by/bj DAC limits, architecture decisions, pitfall catalogue

### Secondary (MEDIUM confidence)

- IEEE 802.3by (25GBASE-CR) — passive DAC limit 3 m at 25G SFP28 (referenced in project SUMMARY.md)
- IEEE 802.3bj (100GBASE-CR4) — passive DAC limit 5 m at 100G QSFP28 (referenced in project SUMMARY.md)

### Tertiary (LOW confidence)

None for this phase — all critical details confirmed from direct source file reads.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — confirmed from production `package.json` and existing source files; no new packages
- Architecture: HIGH — all integration points confirmed by direct file reads; no inference
- Pitfalls: HIGH — pitfalls sourced from direct observation of production code (e.g., `loadProfile` has no normalisation, `maxDistanceM: 5` confirmed flat, `DEFAULT_INPUT` in store layer confirmed)

**Research date:** 2026-03-19
**Valid until:** 2026-06-19 (stable domain — Zod v4 and Zustand v5 APIs are stable)

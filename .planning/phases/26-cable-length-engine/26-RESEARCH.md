# Phase 26: Cable Length Engine - Research

**Researched:** 2026-03-19
**Domain:** Pure TypeScript domain functions — cable length geometry, SKU ladder, DAC advisory upgrade, patch panel advisory
**Confidence:** HIGH

## Summary

Phase 26 implements the pure domain functions that compute cable lengths for every link type across all three modes (Ethernet Clos, Three-Tier, FC SAN, Converged). The foundation was laid in Phase 25: all input schemas carry geometry fields (`rackPitchMm`, `racksAdjacent`, `patchPanelDistanceM`), both BOM schemas have an `advisories[]` array, the DAC catalog has per-speed limits, and `AdvisorySchema` with `PATCH_PANEL_RECOMMENDED` is defined.

The work divides cleanly into two plans. Plan 01 builds a pure geometry helper library using TDD (RED→GREEN) covering the SKU ladder, rack-height derivation, and per-mode per-link-type length functions. Plan 02 wires that library into the four engines (`calculateBOM`, `calculateThreeTierBOM`, `calculateFCBOM`, `calculateConvergedBOM`), replaces the legacy heuristic DAC advisory with a computed-distance check, and emits the new `PATCH_PANEL_RECOMMENDED` amber advisory when `racksAdjacent === false`.

The existing `recommendedCableLengthM` field on both BOM schemas is a single integer — Phase 26 must replace or supplement it with a per-link-type cable schedule structure (the schema additions for the new fields belong in Plan 01).

**Primary recommendation:** Build a standalone `src/domain/engine/cable-length.ts` module that exports pure functions and the SKU ladder constant. Wire it into engines without touching engine logic beyond the cable output fields and advisory upgrade. Test TDD RED→GREEN using Vitest in node environment.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CABLE-01 | User sees recommended cable length (metres + SKU) for server→leaf links in all Ethernet Clos modes | Cable length formula: rackPitchMm + rackHeight(rackSize, switchPositioning) with 15% slack → SKU ladder |
| CABLE-02 | User sees recommended cable length for leaf→spine and VLT links in Clos mode | Leaf→spine cables span from server rack to dedicated network rack — uses rack pitch * rackCount offset; VLT stays within rack (short) |
| CABLE-03 | User sees three cable length estimates for Three-Tier: server→access, access→aggregation, aggregation→core | server→access = within-rack formula; access→aggregation and aggregation→core = inter-rack formula using rackPitchMm |
| CABLE-04 | User sees estimated ISL cable length for FC SAN mode | FCSizingInput has rackPitchMm/racksAdjacent; ISL connects switches across racks — inter-rack formula |
| CABLE-05 | Cable lengths map to nearest standard SKU (1m/3m/5m/10m) with 15% slack buffer before rounding up | SKU_LADDER constant + `applySlackAndRound(rawM: number): { skuM: number, rawM: number }` pure function |
| CABLE-06 | Cable lengths computed from rack pitch, rack height (derived from rack size), and switch position (ToR/MoR/BoR) | `deriveRackHeightM(rackSize: string): number` maps '24U'→1.07m, '42U'→1.87m, '50U'→2.22m; switch offset varies by position |
| DAC-01 | DAC advisory shows the computed cable path length and the applicable DAC spec limit | `computedDistanceM` field already on DAC_DISTANCE_ADVISORY violation schema (Phase 25); engine must set it |
| DAC-02 | Advisory trigger uses computed geometry vs speed-specific limits (25G SFP28 = 3m, 100G QSFP28 = 5m) | CABLE_CATALOG.DAC.maxDistanceBySpeed already populated; connectivityType determines which limit to use |
| RACK-04 | Non-adjacent rack mode shows an amber advisory recommending patch panels (not a red violation) | AdvisorySchema with PATCH_PANEL_RECOMMENDED already defined; engine emits it when racksAdjacent===false |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (strict) | 5.x | Pure domain functions with no `any` | Project convention — all types from Zod inference |
| Zod v4 | 4.x | Schema inference — types already defined in Phase 25 | Project convention — types are inferred via `z.infer<>` |
| Vitest | 3.x | TDD unit tests (node environment) | Already used throughout domain engine tests |

No new dependencies are needed for Phase 26. Cable length computation is pure arithmetic — no external library is warranted.

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure

```
src/domain/engine/
├── cable-length.ts          # NEW: pure geometry helpers + SKU ladder (Plan 01)
├── cable-length.test.ts     # NEW: TDD tests (Plan 01 RED→GREEN)
├── sizing.ts                # MODIFIED: integrate cable lengths, upgrade DAC advisory
├── three-tier-sizing.ts     # MODIFIED: integrate cable lengths, upgrade DAC advisory
├── fc-sizing.ts             # MODIFIED: add ISL cable length field
└── converged-sizing.ts      # No engine change — delegates to sub-engines
```

### Pattern 1: Geometry Helper Module (cable-length.ts)

**What:** A standalone pure-function module with no imports except from catalog constants.
**When to use:** Called by all engine functions to compute per-link-type cable lengths.

```typescript
// src/domain/engine/cable-length.ts

/** Standard SKU lengths in metres (ascending order) */
export const CABLE_SKU_LADDER = [1, 3, 5, 10] as const;
export type CableSkuM = (typeof CABLE_SKU_LADDER)[number];

/**
 * Derive rack interior height in metres from rack size string.
 * Standard EIA-310 rack unit = 44.45 mm (1.75 inches).
 *   24U interior ≈ 1.07 m  (24 * 0.04445)
 *   42U interior ≈ 1.87 m  (42 * 0.04445)
 *   50U interior ≈ 2.22 m  (50 * 0.04445)
 */
export function deriveRackHeightM(rackSize: '24U' | '42U' | '50U'): number {
  const uCount = parseInt(rackSize, 10);
  return parseFloat((uCount * 0.04445).toFixed(3));
}

/**
 * Apply 15% slack buffer and round up to nearest standard SKU.
 * If computed distance exceeds max SKU, return max SKU (10m) — caller should flag.
 */
export function applySlackAndRoundToSku(rawM: number): CableSkuM {
  const withSlack = rawM * 1.15;
  return (CABLE_SKU_LADDER.find(sku => sku >= withSlack) ?? 10) as CableSkuM;
}

/**
 * Within-rack cable length: server to switch in the same rack.
 * Depends on switch positioning (ToR/MoR/BoR) and rack height.
 */
export function withinRackCableLengthM(
  rackHeightM: number,
  positioning: 'ToR' | 'MoR' | 'BoR',
): number { ... }

/**
 * Inter-rack cable length: cable running between adjacent racks.
 * Uses rack pitch (mm → m conversion) plus vertical drop at each end.
 * racksAdjacent=false: add patchPanelDistanceM at each end (2×).
 */
export function interRackCableLengthM(
  rackPitchMm: number,
  rackHeightM: number,
  racksAdjacent: boolean,
  patchPanelDistanceM: number,
): number { ... }

/** CableLengthSchedule: per-link-type cable length output */
export interface CableLengthEntry {
  linkType: string;
  rawLengthM: number;
  skuM: CableSkuM;
}
```

### Pattern 2: Within-Rack Formula (server→leaf in Clos, server→access in Three-Tier)

**What:** Cable runs from server position to switch position within the same rack.
**Formula:**
- ToR: server at bottom, switch at top → full rack height + 0.3m overhead ≈ `rackHeightM + 0.3`
- MoR: server at rack extreme, switch at mid-rack → half rack height + 0.3m ≈ `rackHeightM * 0.5 + 0.3`
- BoR: server at top, switch at bottom → full rack height + 0.3m ≈ `rackHeightM + 0.3`

The 0.3m constant accounts for patch panel horizontal slack and connector bend radius (industry standard practice).

### Pattern 3: Inter-Rack Formula (leaf→spine, access→aggregation, aggregation→core, FC ISL)

**What:** Cable runs between switches in different racks. Needs horizontal travel (rack pitch) plus vertical drop at each end.
**Formula (adjacent racks):**
```
interRackM = (rackPitchMm / 1000) + rackHeightM + rackHeightM
```
The two `rackHeightM` terms account for the vertical cable drop at each rack end.

**Formula (non-adjacent racks, patch panel mode):**
```
interRackM = patchPanelDistanceM * 2 + rackHeightM * 2
```
`patchPanelDistanceM * 2` because the cable runs to the patch panel at both ends.

### Pattern 4: DAC Advisory Upgrade

**What:** Replace the legacy heuristic (`racks > 8`) with geometry-based check using computed distance vs speed-specific limit.
**Before (current sizing.ts):**
```typescript
if (input.cableType === 'DAC' && racks > 8) {
  violations.push({ code: 'DAC_DISTANCE_ADVISORY', rackCount: racks, cableType: 'DAC' });
}
```
**After:**
```typescript
if (input.cableType === 'DAC') {
  const worstLinkM = computeWorstCaseLinkLength(input);  // from cable-length.ts
  const limit = CABLE_CATALOG.DAC.maxDistanceBySpeed[
    input.connectivityType === '25G' ? 25 : 100
  ];
  if (worstLinkM > limit) {
    violations.push({
      code: 'DAC_DISTANCE_ADVISORY',
      rackCount: racks,
      cableType: 'DAC',
      computedDistanceM: worstLinkM,
    });
  }
}
```

### Pattern 5: Patch Panel Advisory (RACK-04)

**What:** Non-blocking amber advisory emitted when `racksAdjacent === false`.
**Where it goes:** Into the `advisories[]` array on the BOM, not `violations[]`.

```typescript
if (!input.racksAdjacent) {
  const longestLinkM = computeLongestLinkLength(input);
  advisories.push({
    code: 'PATCH_PANEL_RECOMMENDED',
    computedDistanceM: longestLinkM,
    dacLimitM: CABLE_CATALOG.DAC.maxDistanceBySpeed[connectivitySpeedKey],
  });
}
```

### Pattern 6: FC ISL Cable Length (CABLE-04)

**What:** FC SAN mode ISL cable connects switches across fabrics. FC input does NOT carry geometry fields (per ADR-0009 parallel domain rule). The ISL length must use a conservative default.
**Key insight:** `FCSizingInputSchema` does NOT have geometry fields — the FC domain is isolated from the Ethernet domain. Phase 25 confirmed `normalizeFCInputState` is pass-through. Therefore, FC ISL cable length computation must either:

Option A: Use a fixed conservative estimate (e.g., 5m for adjacent, 10m for non-adjacent) — avoids cross-domain coupling. **Recommended.**

Option B: Accept a geometry sub-object in FC input — requires schema change, cross-domain coupling. **Do NOT use.**

The ISL cable length for FC should be reported as a single field `islCableLengthSkuM` with a fixed conservative assumption of adjacent racks, producing a SKU recommendation from the SKU ladder.

### Anti-Patterns to Avoid

- **Hardcoding cable lengths in the engine instead of calling cable-length.ts:** Violates separation. All length arithmetic belongs in cable-length.ts, engines just call it.
- **Using raw mm values in engine outputs:** All BOM fields should be in metres (float) or SKU metres (integer from SKU ladder).
- **Changing the DAC violation trigger to emit into `advisories[]` instead of `violations[]`:** The existing `DAC_DISTANCE_ADVISORY` code is intentionally in `violations[]` (red). `PATCH_PANEL_RECOMMENDED` goes into `advisories[]` (amber). These are separate concerns.
- **Adding geometry fields to FCSizingInputSchema:** FC domain is parallel and independent per ADR-0009. Use a fixed conservative estimate for ISL lengths instead.
- **Triggering PATCH_PANEL_RECOMMENDED when DAC limit is exceeded:** RACK-04 says non-adjacent mode produces the advisory, regardless of cable type. Emit the advisory unconditionally when `racksAdjacent === false`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Standard SKU rounding | Custom rounding logic per engine | `applySlackAndRoundToSku()` from cable-length.ts | Single implementation; consistent across all 4 engines |
| Rack height in metres | Inline `parseInt(rackSize) * 0.04445` in each engine | `deriveRackHeightM()` from cable-length.ts | One place to fix if standard changes |
| Within-rack vs inter-rack selection | Ad-hoc conditionals in engine | Separate named functions in cable-length.ts | Testable, readable, no duplication |

**Key insight:** The cable-length.ts module is the only new file needed for Plan 01. The four engine files are modified in Plan 02 to call it.

## Common Pitfalls

### Pitfall 1: FC Input Missing Geometry Fields
**What goes wrong:** FC ISL cable length computation tries to read `rackPitchMm` from FCSizingInput, which doesn't have this field, causing a TypeScript error.
**Why it happens:** FCSizingInput is a parallel domain schema — geometry fields are only on Ethernet/Three-Tier schemas.
**How to avoid:** Use a fixed conservative estimate for FC ISL length. Do not add geometry fields to FCSizingInputSchema.
**Warning signs:** `Property 'rackPitchMm' does not exist on type 'FCSizingInput'` TS error.

### Pitfall 2: Missing advisories[] in BOM Return (already hit in Phase 25)
**What goes wrong:** Engine returns a BOM object without `advisories`, causing TS2741.
**Why it happens:** BOM schema requires `advisories: Advisory[]`, default `[]`.
**How to avoid:** Always return `advisories: [...]` in engine return values. Phase 25 already fixed sizing.ts and three-tier-sizing.ts with `advisories: []` — Phase 26 must populate this array with real values.
**Warning signs:** TS2741 on engine return object.

### Pitfall 3: SKU Ladder Overshoot
**What goes wrong:** A very long non-adjacent cable path (e.g., 12m with slack = 13.8m) exceeds the max 10m SKU — `Array.find()` returns `undefined`.
**Why it happens:** `CABLE_SKU_LADDER.find(sku => sku >= withSlack)` returns undefined for overshoots.
**How to avoid:** Use `?? 10` (max SKU) as fallback in `applySlackAndRoundToSku`. Document this as "10m+ run — verify fiber-capable cabling".
**Warning signs:** `undefined` returned from SKU rounding function.

### Pitfall 4: DAC Advisory Regression
**What goes wrong:** After Phase 26, the DAC advisory fires on geometry instead of `racks > 8`, so existing tests that relied on the heuristic fail.
**Why it happens:** The old `racks > 8` heuristic is replaced by `computedDistanceM > dacLimit`.
**How to avoid:** Update DAC advisory tests in sizing.test.ts and three-tier-sizing.test.ts after upgrading the advisory logic.
**Warning signs:** Previously-passing DAC advisory tests fail after engine update.

### Pitfall 5: recommendedCableLengthM Field Collision
**What goes wrong:** Both `NetworkBOMSchema` and `ThreeTierBOMSchema` already have a `recommendedCableLengthM: z.number().int().min(0)` field computed from the legacy position-based map. Phase 26 adds a per-link-type cable schedule. If the new cable schedule fields use the same name or override this field, schema tests fail.
**Why it happens:** The legacy field was a single integer heuristic; Phase 26 needs structured per-link output.
**How to avoid:** Add NEW fields to the BOM schemas for the cable schedule (e.g., `cableLengthSchedule: z.array(...)`) and keep `recommendedCableLengthM` for backward compatibility until Phase 27+ removes the UI dependency.
**Warning signs:** TS errors on BOM return objects when the new cable schedule type doesn't match the existing field type.

### Pitfall 6: Inter-Rack Formula for Single-Rack Deployments
**What goes wrong:** `interRackCableLengthM` called with 1 rack produces a negative or zero distance (no horizontal travel needed).
**Why it happens:** Single-rack deployments don't have inter-rack links.
**How to avoid:** Guard: if `racks <= 1`, inter-rack length = 0 (no inter-rack cables exist). The engine already short-circuits many inter-rack quantities when `racks === 1`.
**Warning signs:** Negative cable length returned from formula.

## Code Examples

### SKU Ladder + Slack Buffer

```typescript
// src/domain/engine/cable-length.ts
// Source: project requirement CABLE-05 + industry practice

export const CABLE_SKU_LADDER = [1, 3, 5, 10] as const;
export type CableSkuM = (typeof CABLE_SKU_LADDER)[number];

export function applySlackAndRoundToSku(rawM: number): CableSkuM {
  const withSlack = rawM * 1.15;
  return (CABLE_SKU_LADDER.find(sku => sku >= withSlack) ?? 10) as CableSkuM;
}

// Tests:
// rawM=0.5 → withSlack=0.575 → SKU 1m
// rawM=1.0 → withSlack=1.15  → SKU 3m
// rawM=2.5 → withSlack=2.875 → SKU 3m
// rawM=2.7 → withSlack=3.105 → SKU 5m
// rawM=4.3 → withSlack=4.945 → SKU 5m
// rawM=4.4 → withSlack=5.06  → SKU 10m
// rawM=8.7 → withSlack=10.005 → SKU 10m (max)
```

### Rack Height Derivation

```typescript
// src/domain/engine/cable-length.ts
// Source: EIA-310 standard rack unit = 1U = 44.45 mm

export function deriveRackHeightM(rackSize: '24U' | '42U' | '50U'): number {
  const uCount = parseInt(rackSize, 10);
  return parseFloat((uCount * 0.04445).toFixed(3));
}

// deriveRackHeightM('24U') === 1.067
// deriveRackHeightM('42U') === 1.867
// deriveRackHeightM('50U') === 2.223
```

### Within-Rack Length by Positioning

```typescript
// Source: project requirements CABLE-06 + standard 0.3m slack allowance

export function withinRackCableLengthM(
  rackHeightM: number,
  positioning: 'ToR' | 'MoR' | 'BoR',
): number {
  switch (positioning) {
    case 'ToR': return rackHeightM + 0.3;          // server at bottom, switch at top
    case 'MoR': return rackHeightM * 0.5 + 0.3;   // server at extreme, switch at mid
    case 'BoR': return rackHeightM + 0.3;          // server at top, switch at bottom
  }
}
```

### Inter-Rack Length (adjacent vs non-adjacent)

```typescript
// Source: project requirements CABLE-06, RACK-03, RACK-04

export function interRackCableLengthM(
  rackPitchMm: number,
  rackHeightM: number,
  racksAdjacent: boolean,
  patchPanelDistanceM: number,
): number {
  if (racksAdjacent) {
    // horizontal hop + vertical drop at each end
    return (rackPitchMm / 1000) + rackHeightM * 2;
  } else {
    // cable runs to patch panel at both ends + vertical drops
    return patchPanelDistanceM * 2 + rackHeightM * 2;
  }
}
```

### Existing DAC Advisory (to be upgraded in Plan 02)

```typescript
// Current pattern in sizing.ts (lines 139-145):
// Replace heuristic 'racks > 8' with computed distance vs speed-specific limit

// New pattern:
import { CABLE_CATALOG } from '../catalog/cables';

const speedKey = input.connectivityType === '25G' ? 25 : 100;
const dacLimit = CABLE_CATALOG.DAC.maxDistanceBySpeed[speedKey];
// compute worstCaseLinkM = withinRackCableLengthM or interRackCableLengthM
if (input.cableType === 'DAC' && worstCaseLinkM > dacLimit) {
  violations.push({
    code: 'DAC_DISTANCE_ADVISORY',
    rackCount: racks,
    cableType: 'DAC',
    computedDistanceM: worstCaseLinkM,
  });
}
```

### Patch Panel Advisory Pattern

```typescript
// Pattern for RACK-04: emit amber advisory when non-adjacent
import type { Advisory } from '../schemas/bom';

const advisories: Advisory[] = [];
if (!input.racksAdjacent) {
  const longestLinkM = interRackCableLengthM(
    input.rackPitchMm, rackHeightM, false, input.patchPanelDistanceM
  );
  const speedKey = input.connectivityType === '25G' ? 25 : 100;
  advisories.push({
    code: 'PATCH_PANEL_RECOMMENDED',
    computedDistanceM: longestLinkM,
    dacLimitM: CABLE_CATALOG.DAC.maxDistanceBySpeed[speedKey],
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `recommendedCableLengthM` integer | Per-link-type cable schedule with SKU | Phase 26 | Richer output; legacy field kept for compat |
| `racks > 8` heuristic for DAC advisory | Computed geometry vs speed-specific limit | Phase 26 | More accurate; removes false positives on short runs |
| `advisories: []` placeholder | Populated PATCH_PANEL_RECOMMENDED when non-adjacent | Phase 26 | RACK-04 fulfilled |

**Deprecated/outdated:**
- `cableLengthMap: { ToR: 2, MoR: 1, BoR: 2 }` inline constant in both engines: replaced by `withinRackCableLengthM()` formula. The inline map produces a single value that ignores rack size; the formula uses actual EIA-310 rack height.

## Open Questions

1. **Schema additions for cable schedule output**
   - What we know: `NetworkBOMSchema` and `ThreeTierBOMSchema` need new fields for the cable schedule (per-link-type entries).
   - What's unclear: Whether to add a structured `cableLengthSchedule: CableLengthEntry[]` array, or individual named fields (e.g., `serverLeafCableLengthSkuM`, `leafSpineCableLengthSkuM`).
   - Recommendation: Use individual named fields for BOM schemas (cleaner for Phase 28 export, easier for UI in Phase 27). Add them to the schemas in Plan 01 alongside the cable-length.ts module. This matches the existing pattern of named fields (`serverLeafCables`, `leafSpineCables`, etc.).

2. **FC ISL cable length field on FCNetworkBOMSchema**
   - What we know: `FCNetworkBOMSchema` has `islCables` count but no `islCableLengthSkuM` field. CABLE-04 requires an ISL length estimate.
   - What's unclear: Whether to add `islCableLengthSkuM` to `FCNetworkBOMSchema`, or defer FC cable length to a note in the BOM.
   - Recommendation: Add `islCableLengthSkuM: z.number().int().min(0)` to `FCNetworkBOMSchema`. Use a fixed 5m SKU as the conservative default (1 rack hop + vertical drops → raw ~3.5m → with 15% slack → 4.025m → SKU 5m).

3. **Converged BOM cable schedule propagation**
   - What we know: `calculateConvergedBOM` composes `calculateBOM` / `calculateThreeTierBOM` + `calculateFCBOM`. The converged BOM embeds both sub-BOMs.
   - What's unclear: Whether cable schedule fields flow through automatically when sub-engine BOM schemas gain them.
   - Recommendation: Once sub-engine BOMs carry cable schedule fields, they automatically appear on the converged BOM via the embedded sub-BOM objects. No explicit converged-engine changes needed beyond ensuring geometry fields pass through adapters (already done in Phase 25).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | vite.config.ts (test.environment: 'node') |
| Quick run command | `npx vitest run src/domain/engine/cable-length.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CABLE-01 | server→leaf length for 42U ToR, 42U MoR, 42U BoR, 24U, 50U | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | Wave 0 |
| CABLE-02 | leaf→spine and VLT lengths for Clos with default geometry | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | Wave 0 |
| CABLE-03 | Three-Tier: server→access, access→aggregation, aggregation→core lengths | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | Wave 0 |
| CABLE-04 | FC ISL cable length estimate (fixed conservative) | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | Wave 0 |
| CABLE-05 | SKU ladder: rawM=0.5→1, rawM=1.0→3, rawM=2.7→5, rawM=4.4→10, rawM=8.7→10 | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | Wave 0 |
| CABLE-06 | deriveRackHeightM('24U')=1.067, ('42U')=1.867, ('50U')=2.223 | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | Wave 0 |
| DAC-01 | calculateBOM with DAC + non-adjacent sets computedDistanceM on DAC_DISTANCE_ADVISORY | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Modify existing |
| DAC-02 | 25G DAC limit = 3m triggers; 100G = 5m; adjacent geometry doesn't trigger unnecessarily | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Modify existing |
| RACK-04 | calculateBOM with racksAdjacent=false emits PATCH_PANEL_RECOMMENDED in advisories[], not violations[] | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Modify existing |

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/engine/cable-length.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/domain/engine/cable-length.test.ts` — covers CABLE-01 through CABLE-06 (TDD RED phase must be written first, before cable-length.ts is implemented)
- [ ] Schema additions for cable schedule fields on `NetworkBOMSchema`, `ThreeTierBOMSchema`, `FCNetworkBOMSchema` — new fields needed before engines can return them

## Sources

### Primary (HIGH confidence)

- Codebase direct read — `src/domain/schemas/input.ts`, `src/domain/schemas/bom.ts`, `src/domain/schemas/three-tier-bom.ts`, `src/domain/schemas/fc-bom.ts` — exact field shapes confirmed
- Codebase direct read — `src/domain/catalog/cables.ts` — CABLE_CATALOG.DAC.maxDistanceBySpeed confirmed present with {25:3, 100:5}
- Codebase direct read — `src/domain/engine/sizing.ts`, `src/domain/engine/three-tier-sizing.ts` — legacy heuristic (`racks > 8`) and existing `recommendedCableLengthM` inline map confirmed
- `.planning/STATE.md` — Key Decisions v6.0 section: SKU ladder 1/3/5/10m, 15% slack, DAC speed-specific limits, patch panel as amber advisory
- `.planning/REQUIREMENTS.md` — All 9 phase requirement IDs with exact spec text
- `.planning/phases/25-schema-geometry-inputs-advisory-foundation/25-01-SUMMARY.md` — Phase 25 actual deliverables confirmed

### Secondary (MEDIUM confidence)

- EIA-310 standard: 1U = 44.45 mm (1.75 inches) — standard reference for rack height derivation formula
- Industry practice: 0.3m slack allowance per connection point for connector bend radius and patch panel horizontal management

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, only existing project libraries
- Architecture: HIGH — all schemas, types, and integration points confirmed from direct codebase reading
- Pitfalls: HIGH — most identified from Phase 25 execution summary (which documented actual issues encountered)
- Formula values: MEDIUM — rack height from EIA-310 standard (not re-verified via web); 0.3m slack is industry practice, not from a spec document

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable — no external dependencies to expire)

# Technology Stack

**Project:** NetStack v6.0 — Physical Planning Features
**Researched:** 2026-03-19
**Scope:** Cable length estimation, power budget per rack, upgraded DAC distance advisory
**Replaces:** v2.0 stack research (FC SAN + switch positioning) — all prior decisions still valid; this document adds v6.0 physical planning layer on top

---

## Decision Summary

**No new npm packages are needed for v6.0.** Every v6.0 feature — cable length schedule, rack power budget, upgraded DAC advisory with actual computed distance — is pure arithmetic over constants. The formulas are simple enough that adding a library would introduce dependency surface area with zero benefit. All new logic belongs in the existing domain layer as pure TypeScript functions, following the established `calculateBOM()` / `calculateFCBOM()` pattern.

---

## Existing Stack (unchanged for v6.0)

The stack validated through v5.0 is not modified. These are the active versions for context:

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI rendering |
| Vite | 6 | Build and dev server |
| TypeScript | strict | Type safety, no `any` |
| Zustand | v5 | Store layer (inputStore, resultStore, etc.) |
| Zod | v4 | Schema definitions; all types via `z.infer<>` |
| Tailwind | v4 | Styling via `@tailwindcss/vite` plugin |
| shadcn/ui | current | Accordion, UI primitives |
| @xyflow/react | current | Topology diagrams |
| @react-pdf/renderer | current | PDF export (lazy-loaded) |
| React Router | v7 HashRouter | Deep-linkable views |

---

## New npm Packages Required: None

A search for npm packages covering data center cable length math, rack layout calculation, or DCIM physical planning found nothing relevant. The search space includes:

- No `cable-length` / `datacenter-layout` npm packages exist for this domain
- All DCIM tools (Nlyte, Sunbird, Vertiv) are server-side enterprise SaaS — no client-side JS SDK
- `mathjs` is overkill: all operations are `+`, `×`, `Math.ceil()`, `Math.abs()` — no matrix ops or unit conversion needed
- `d3` is already absent; the topology view uses `@xyflow/react` and the BOM is tabular — a cable length schedule is a table

The only valid implementation approach for this project's constraints (client-side PWA, pure domain layer, no backend) is typed TypeScript constants + pure functions.

---

## Physical Constants — Source of Truth for the Engine

### DAC Cable Length Limits (HIGH confidence)

These are the authoritative limits, verified against IEEE 802.3 standards and multiple vendor datasheets. The current `CABLE_CATALOG.DAC.maxDistanceM = 5` is a catch-all. v6.0 should differentiate by speed and cable type:

| Speed | Form Factor | Cable Type | Conservative Max | Standard Reference |
|-------|-------------|------------|------------------|--------------------|
| 25G | SFP28 | Passive DAC (twinax) | **3 m** | IEEE 802.3by / 25GBASE-CR1 |
| 25G | SFP28 | Active DAC | 5 m | SFF-8432 MSA |
| 100G | QSFP28 | Passive DAC (twinax) | **3 m** | IEEE 802.3bj / 100GBASE-CR4 (conservative) |
| 100G | QSFP28 | Active DAC | 5–7 m | QSFP28 MSA |
| 100G | QSFP28 | Breakout passive DAC (4×25G) | 3 m | 25GBASE-CR1 per lane |

**Key insight for the engine:** The binding constraint for a leaf-spine deployment is always the 100G QSFP28 spine uplink (passive DAC). Use **3 m** as the passive DAC threshold. The upgraded `DAC_DISTANCE_ADVISORY` should fire when `computedLeafSpineM > 3.0` rather than the current `racks > 8` proxy.

These constants belong in a new `DAC_LIMITS` export in `src/domain/catalog/cables.ts`:

```typescript
export const DAC_LIMITS = {
  '25G_passive': 3,    // m — 25GBASE-CR1 passive twinax
  '25G_active': 5,     // m — Active DAC SFP28
  '100G_passive': 3,   // m — 100GBASE-CR4 passive (conservative vendor-consistent limit)
  '100G_active': 7,    // m — Active DAC QSFP28
} as const;
```

### Rack Physical Constants (HIGH confidence — EIA-310-D)

| Parameter | Value | Source |
|-----------|-------|--------|
| 1U height | 44.45 mm (1.75 in) | EIA-310-D standard |
| 24U rack total height | ~1.07 m usable + ~0.1 m frame = ~1.17 m | EIA-310-D |
| 42U rack total height | ~1.87 m usable + ~0.1 m frame = ~1.97 m | EIA-310-D |
| 50U rack total height | ~2.24 m usable + ~0.1 m frame = ~2.34 m | EIA-310-D |
| Default rack pitch (center to center) | **1.0 m** | Standard 600 mm floor tile + aisle allocation |
| Overhead cable tray height above rack top | 0.3–0.5 m | Add for inter-rack horizontal runs |
| Service loop per cable end | 0.3 m | Industry standard dressing allowance |

**Rack pitch engineering note (MEDIUM confidence):** Data center floor tiles are 600×600 mm. A standard hot-aisle/cold-aisle layout allocates one tile per rack row plus shared aisle space. 1.0 m is a safe and widely-used default for rack center-to-center distance. Engineers with precise floor plans need to override this — hence adding `rackPitchM` as a configurable input field.

### Cable Length Formulas

**Within-rack links (server → leaf, VLT, OOB) — all positioning modes:**

The existing `cableLengthMap` in `sizing.ts` is correct for within-rack paths:
- `ToR`: switch at top, server at bottom → max ≈ `(rackU - 3) × 0.04445 + 0.3` ≈ 2 m for 42U
- `MoR`: switch at mid-rack, server at extremes → max ≈ `(rackU / 2) × 0.04445 + 0.3` ≈ 1 m for 42U
- `BoR`: switch at bottom, server at top → same as ToR ≈ 2 m for 42U

These are consistent with `recommendedCableLengthM` values already in the BOM.

**Inter-rack links (leaf → spine, leaf → border leaf):**

```
leafToSpineM = (rackPitchM × rackSeparation) + overheadDropM + serviceLoopM
```

Where:
- `rackSeparation` = count of rack positions between leaf rack and network rack
- For adjacent racks (most ToR deployments): `rackSeparation = 1`, so `leafToSpineM ≈ 1.0 + 0.4 + 0.6 ≈ 2.0 m`
- `overheadDropM` = overhead tray height + switch-to-top-of-rack drop ≈ 0.4 m each end
- `serviceLoopM` = 0.3 m × 2 ends = 0.6 m total

For non-adjacent deployments (server rack is not next to network rack):
```
leafToSpineM = rackPitchM × abs(serverRackIndex - networkRackIndex) + 0.4 + 0.6
```

The DAC advisory triggers when this computed value exceeds `DAC_LIMITS['100G_passive']` = 3.0 m.

### Server Power Estimates by U-Height (MEDIUM confidence)

The `serverUHeight` field already on `SizingInputSchema` maps cleanly to power estimates. No external data source is needed:

| `serverUHeight` | Typical Operating Range | Conservative Budget Value |
|----------------|------------------------|--------------------------|
| `1U` | 200–400 W | **400 W** |
| `2U` | 350–600 W | **600 W** |
| `4U` | 800–2000 W (GPU/storage dense) | **2000 W** |
| `8U` | 2000–6000 W (chassis/blade) | **6000 W** |

These are per-server estimates for planning purposes only. The power budget feature answers "what PDU amperage do I need?" — it is a planning advisory, not a measured value. Using conservative (worst-case) estimates is appropriate and expected for this use case.

---

## New Domain Code Required (pure TypeScript, zero new packages)

### 1. New input field: `rackPitchM`

Add to `SizingInputSchema` in `src/domain/schemas/input.ts`:

```typescript
rackPitchM: z.number().min(0.5).max(2.0).default(1.0)
```

This single field drives inter-rack cable length estimation. Default 1.0 m is correct for standard 600 mm tile data centers. The field is optional with a sane default — existing stored inputs migrate without breakage.

### 2. Extend `DAC_DISTANCE_ADVISORY` violation shape

In `src/domain/schemas/bom.ts`, add two fields to the existing discriminated union member:

```typescript
z.object({
  code: z.literal('DAC_DISTANCE_ADVISORY'),
  rackCount: z.number().int(),
  cableType: z.literal('DAC'),
  computedLeafSpineM: z.number(),   // actual computed inter-rack cable length
  dacLimitM: z.number(),            // threshold used (3.0 for passive, 7.0 for active)
})
```

The trigger condition changes from `racks > 8` (proxy) to `computedLeafSpineM > dacLimitM` (actual).

### 3. New schema file: `src/domain/schemas/physical-planning.ts`

New Zod schemas for the physical planning output:

```typescript
// Cable length schedule: one set of distances per deployment
const CableLengthScheduleSchema = z.object({
  serverToLeafM: z.number(),         // within-rack: governed by switch positioning
  leafToSpineM: z.number(),          // inter-rack: derived from rackPitchM + overhead
  vltInterconnectM: z.number(),      // within-rack leaf pair: always < 0.5 m
  oobToLeafM: z.number(),            // within-rack: 0.3 m fixed dressing
  dacCompatible: z.boolean(),        // true iff leafToSpineM ≤ DAC_LIMITS['100G_passive']
  patchPanelAdvisory: z.boolean(),   // true if non-adjacent rack layout
});

// Per-rack power budget
const RackPowerBudgetSchema = z.object({
  rackIndex: z.number().int(),         // 0-based
  switchMaxW: z.number(),              // sum of SWITCH_CATALOG[model].maxPowerW in this rack
  serverEstimateW: z.number(),         // serverCount × perServerEstimateW[serverUHeight]
  totalMaxW: z.number(),               // switchMaxW + serverEstimateW
  pduRecommendedA: z.number(),         // ceil(totalMaxW / 208 / 0.8) — 208V, 80% derated
});
```

### 4. Extend `NetworkBOMSchema` in `src/domain/schemas/bom.ts`

Add two fields to the existing BOM output schema:

```typescript
cableLengthSchedule: CableLengthScheduleSchema,
rackPowerBudgets: z.array(RackPowerBudgetSchema),
```

### 5. New pure function: `calculatePhysicalPlan()`

In `src/domain/engine/physical-planning.ts`:

```typescript
export function calculatePhysicalPlan(
  input: SizingInput,
  bom: NetworkBOM,
): { cableLengthSchedule: CableLengthSchedule; rackPowerBudgets: RackPowerBudget[] }
```

Pure function: reads `SWITCH_CATALOG[model].maxPowerW`, `DAC_LIMITS`, rack height constants. No side effects. Fully testable in Vitest node environment.

The engine can either be called separately and composed into the BOM, or integrated directly into `calculateBOM()`. The former (composition) keeps `calculateBOM()` focused on port counts and is consistent with the existing `calculateConvergedBOM()` composition pattern.

---

## Alternatives Considered and Rejected

| Candidate | Verdict | Reason |
|-----------|---------|--------|
| `mathjs` | Rejected | All operations are `+`, `×`, `ceil`, `abs`. No symbolic math, no matrix ops, no unit conversion needed. Adds 170 KB bundle weight for zero benefit. |
| DCIM SDK / API (NetBox, Nlyte, Sunbird) | Rejected | All are server-side enterprise platforms. No client-side JS SDK exists. Out of scope for pure browser PWA. |
| `d3` for cable routing diagrams | Rejected | @xyflow/react already handles topology. A cable length schedule is tabular output, not a visual routing diagram. |
| `@turf/turf` or geometry library | Rejected | Data center rack layout is 1-dimensional along a row axis. Manhattan distance over a rack index array, not geospatial coordinates. |
| Dedicated server power consumption database | Rejected | U-height-keyed estimates are accurate enough for PDU planning. Per-model accuracy requires a backend lookup service, incompatible with client-side constraint. |
| 3D floor plan renderer | Rejected | v6.0 scope is length estimates and budget numbers. Visual floor plan is future v7.0+ territory. |
| Extending `calculateBOM()` directly | Reconsidered | Physical planning concerns (cable lengths, power) are separable from port count concerns. A dedicated `calculatePhysicalPlan()` composed into the BOM result keeps each engine focused and individually testable. |

---

## Integration Points with Existing Architecture

| v6.0 Concern | Integrates With | Pattern |
|---|---|---|
| Cable length schedule | `NetworkBOMSchema` in `bom.ts` | Add Zod fields; infer type as always |
| Per-rack power budgets | New `RackPowerBudget[]` added to `NetworkBOM` | Parallel to existing `violations` array |
| DAC advisory with real distance | `ConstraintViolationSchema` discriminated union | Extend existing `DAC_DISTANCE_ADVISORY` shape with two new fields |
| Rack pitch input | `SizingInputSchema` in `input.ts` | Add `rackPitchM` optional field, `.default(1.0)` |
| Physical constants | `src/domain/catalog/cables.ts` | Add `DAC_LIMITS` export alongside `CABLE_CATALOG` |
| Physical planning engine | `src/domain/engine/physical-planning.ts` | New pure function, same contract as `calculateBOM()` |
| Store integration | `resultStore` subscription | Physical plan fields on the BOM; no new store needed |
| UI rendering | New BOM panel section + existing PDF template | Tabular output; no new UI library needed |
| i18n | Existing EN/FR/DE/IT label files | Add label keys for cable schedule + power budget sections |

---

## Version Compatibility Notes

No version changes are required. Zod v4 `z.discriminatedUnion` supports extending existing union members cleanly. Adding optional fields with `.default()` to `SizingInputSchema` preserves backward compatibility with persisted `localStorage` state via Zustand's existing `merge` migration strategy.

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| No new packages needed | HIGH | Exhaustive search; no relevant npm package exists for this domain |
| DAC passive 3 m limit (25G SFP28) | HIGH | IEEE 802.3by / 25GBASE-CR1 cited in multiple vendor datasheets (Netgate, Cisco, FS.com, FlexOptix) |
| DAC passive 3 m limit (100G QSFP28) | HIGH | Multiple sources including Walsun, FS.com, NVIDIA (MCP1600 datasheet); breakout cable per-lane spec confirms 3 m |
| Rack height constants (EIA-310-D) | HIGH | Published standard, well-established, confirmed by Wikipedia and multiple rack vendor sources |
| Default rack pitch 1.0 m | MEDIUM | Industry norm for 600 mm tile DC; no single normative source; can be user-overridden |
| Server power by U-height | MEDIUM | Validated against Dell community data and ServeTheHome benchmarks; significant variance by workload and CPU config |

---

## Sources

- [25GBASE-CR SFP28 DAC 3m — Netgate](https://shop.netgate.com/products/25g-base-cr-dac-direct-attached-copper-twinax-passive-cable-3-meters) — confirms 3 m passive limit, IEEE 802.3by
- [Cisco 25GBASE SFP28 Modules Datasheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/datasheet-c78-736950.html) — 25GBASE-CR standard references
- [Walsun — Maximum length of QSFP28 DAC](https://www.walsun.com/knowledge/What-is-the-maximum-length-of-QSFP28-DAC_1056.html) — 100G QSFP28 passive and active limits
- [25G SFP28 DAC passive 0.5–5m — FlexOptix](https://www.flexoptix.net/en/p-czz25g-z.html) — active vs passive range for SFP28
- [SFP28 Eaton Tripp Lite 5m DAC listing](https://tripplite.eaton.com/sfp28-25gbase-cr1-passive-twinax-copper-cable-dac-black-5m~N28005M28BK) — confirms passive DAC available to 5m but 3m is the conservative standard
- [FS.com 100G QSFP28 to 4×25G breakout DAC 5m](https://www.fs.com/products/285057.html) — confirms 5m available for breakout passive
- [EIA-310-D Rack standard — RackSolutions](https://www.racksolutions.com/news/data-center-optimization/eia-310-definition/) — 1U = 44.45 mm
- [19-inch rack — Wikipedia](https://en.wikipedia.org/wiki/19-inch_rack) — 42U = 1.87 m, EIA-310-D standard rack dimensions
- [ToR/MoR/BoR cable architecture — ANFKOM](https://www.anfkomftth.com/data-center-cabling-eor-mor-or-tor/) — positioning cable run patterns
- [Dell PowerEdge power consumption — ServeTheHome](https://www.servethehome.com/testing-conventional-wisdom-1u-v-2u-power-consumption/) — 1U vs 2U server watt ranges
- [Dell community — total power requirement calculation](https://www.dell.com/community/en/conversations/poweredge-hardware-general/total-power-requirement-calculation/647f7400f4ccf8a8de1c7a11) — PDU sizing methodology

---

*Stack research for: NetStack v6.0 — Physical Planning (cable length, power budget, DAC advisory upgrade)*
*Researched: 2026-03-19*
*Prior STACK.md (v2.0 FC SAN + switch positioning): all decisions in that document remain valid; this document focuses only on v6.0 additions*

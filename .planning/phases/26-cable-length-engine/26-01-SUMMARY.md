---
phase: 26-cable-length-engine
plan: "01"
subsystem: domain/engine
tags: [cable-length, tdd, pure-functions, sku-ladder, geometry, bom-schema]
dependency_graph:
  requires: [25-01, 25-02]
  provides: [cable-length-library, bom-cable-schedule-fields]
  affects: [src/domain/engine, src/domain/schemas]
tech_stack:
  added: []
  patterns: [tdd-red-green, pure-functions, sku-ladder-rounding, eia310-rack-height]
key_files:
  created:
    - src/domain/engine/cable-length.ts
    - src/domain/engine/cable-length.test.ts
  modified:
    - src/domain/schemas/bom.ts
    - src/domain/schemas/three-tier-bom.ts
    - src/domain/schemas/fc-bom.ts
decisions:
  - "computeLeafSpineLengthM returns 0 for single-rack deployments (no inter-rack cables)"
  - "computeVltLengthM ignores rackHeightM parameter (VLT is always within-rack short link at 0.3m)"
  - "computeFCIslLengthM returns fixed conservative 5m SKU (FC domain has no geometry fields per ADR-0009)"
  - "aggregationCoreSkuM equals accessAggregationSkuM in computeThreeTierLengthsM (same inter-rack formula)"
  - "cableSchedule and islCableLengthSkuM are optional fields (backward compatible, engines populated in Plan 02)"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-19"
  tasks_completed: 2
  files_modified: 5
---

# Phase 26 Plan 01: Cable Length Library Summary

Pure geometry helper library built via TDD (RED→GREEN) providing cable length computation functions for all modes (Clos, Three-Tier, FC SAN), plus optional cable schedule fields added to all three BOM schemas.

## What Was Built

### `src/domain/engine/cable-length.ts` — Pure geometry functions

10 exported symbols covering CABLE-01 through CABLE-06:

| Export | Purpose | Requirement |
|--------|---------|-------------|
| `CABLE_SKU_LADDER` | `[1, 3, 5, 10]` constant | CABLE-05 |
| `CableSkuM` | Type alias for SKU values | CABLE-05 |
| `applySlackAndRoundToSku(rawM)` | 15% slack + round up to SKU | CABLE-05 |
| `deriveRackHeightM(rackSize)` | EIA-310 U count × 44.45mm | CABLE-06 |
| `withinRackCableLengthM(h, pos)` | ToR/MoR/BoR within-rack formula | CABLE-06 |
| `interRackCableLengthM(pitch, h, adj, pp)` | Adjacent or patch-panel inter-rack | CABLE-06 |
| `computeServerLeafLengthM(input)` | Server→leaf SKU for Clos | CABLE-01 |
| `computeLeafSpineLengthM(input)` | Leaf→spine SKU (or 0 for 1-rack) | CABLE-02 |
| `computeVltLengthM(h)` | VLT within-rack short link → always 1m | CABLE-02 |
| `computeThreeTierLengthsM(input)` | Three per-boundary SKUs for Three-Tier | CABLE-03 |
| `computeFCIslLengthM()` | Fixed conservative 5m ISL estimate | CABLE-04 |

### BOM Schema Extensions (all optional — backward compatible)

- `NetworkBOMSchema`: added `cableSchedule?: { serverLeafSkuM, leafSpineSkuM, vltSkuM }`
- `ThreeTierBOMSchema`: added `cableSchedule?: { serverAccessSkuM, accessAggregationSkuM, aggregationCoreSkuM }`
- `FCNetworkBOMSchema`: added `islCableLengthSkuM?: number`

### TDD Test Suite — 34 tests, all passing

| Describe Block | Tests | Covers |
|----------------|-------|--------|
| CABLE_SKU_LADDER | 1 | Constant value |
| CABLE-05: applySlackAndRoundToSku | 7 | All boundary test vectors |
| CABLE-06: deriveRackHeightM | 3 | 24U / 42U / 50U |
| CABLE-06: withinRackCableLengthM | 3 | ToR / MoR / BoR |
| CABLE-06: interRackCableLengthM | 3 | Adjacent, non-adjacent 5m, non-adjacent 1m |
| CABLE-01: computeServerLeafLengthM | 5 | All positioning modes + SKU membership |
| CABLE-02: computeLeafSpineLengthM | 3 | Multi-rack, single-rack (0), non-adjacent |
| CABLE-02: computeVltLengthM | 3 | 42U, 24U, SKU membership |
| CABLE-03: computeThreeTierLengthsM | 4 | Object shape, SKU membership, ordering, equality |
| CABLE-04: computeFCIslLengthM | 2 | Fixed 5m, SKU membership |

## Test Vectors Verified

| Input | Raw | With 15% slack | SKU |
|-------|-----|----------------|-----|
| 0.5m | 0.5 | 0.575 | 1m |
| 1.0m | 1.0 | 1.15 | 3m |
| 2.5m | 2.5 | 2.875 | 3m |
| 2.7m | 2.7 | 3.105 | 5m |
| 4.3m | 4.3 | 4.945 | 5m |
| 4.4m | 4.4 | 5.06 | 10m |
| 8.7m | 8.7 | 10.005 | 10m (cap) |

Rack heights: 24U=1.067m, 42U=1.867m, 50U=2.223m (EIA-310 standard)

## Commits

| Hash | Message |
|------|---------|
| c8f3313 | test(26-01): add failing tests for cable length library |
| 920a3f0 | feat(26-01): implement cable length library and BOM schema additions |

## Deviations from Plan

None — plan executed exactly as written.

The `computeVltLengthM` function accepts `_rackHeightM` as a parameter (prefixed `_` to indicate intentionally unused) for API consistency — VLT is always a within-rack short link using only the 0.3m patch panel slack constant.

## Decisions Made

1. **Single-rack guard on computeLeafSpineLengthM**: Returns `0` for `rackCount <= 1` because no inter-rack leaf→spine cables exist in a single-rack deployment.

2. **Fixed 5m for computeFCIslLengthM**: FC domain has no geometry fields (ADR-0009 parallel domain isolation). Using conservative 3.5m raw estimate → 15% slack → 4.025m → SKU 5m.

3. **aggregationCoreSkuM = accessAggregationSkuM**: Both tiers use the same inter-rack formula since aggregation and core switches both reside in the network rack area at the same horizontal distance.

4. **Optional schema fields**: All three new BOM schema fields are optional so existing engine return objects (without cable schedule) continue to parse without modification. Plan 02 populates these fields.

## Self-Check: PASSED

Files created:
- FOUND: src/domain/engine/cable-length.ts
- FOUND: src/domain/engine/cable-length.test.ts

Files modified:
- FOUND: src/domain/schemas/bom.ts (contains cableSchedule)
- FOUND: src/domain/schemas/three-tier-bom.ts (contains cableSchedule)
- FOUND: src/domain/schemas/fc-bom.ts (contains islCableLengthSkuM)

Commits:
- FOUND: c8f3313
- FOUND: 920a3f0

Test results: 34 passed, 0 failed (cable-length.test.ts); 609 passed, 0 failed (full suite)
TypeScript: 0 errors

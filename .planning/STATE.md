---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Physical Planning
status: unknown
stopped_at: Completed 28-01-PLAN.md
last_updated: "2026-03-19T10:56:56.523Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 6
  completed_plans: 6
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-19)

**Core value:** Answer "How many boxes and cables do I need to order?" instantly and accurately for Dell SONiC Ethernet (Clos + Three-Tier), Brocade FC SAN, and Converged deployments.
**Current focus:** v6.0 Physical Planning milestone — COMPLETE

## Current Position

Phase: 28 (Export) — COMPLETE
Plan: 1 of 1 — COMPLETE

## Performance Metrics

**Velocity (from v5.0):**

- Total plans completed: 8 (v5.0)
- Average duration: ~8 min/plan
- Total execution time: ~1 hour

**By Phase (v5.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 21-unified-ethernet-mode | 2/2 | 16min | 8min |
| 22-existing-infrastructure-toggle | 2/2 | 10min | 5min |
| 23-save-load-configurations | 2/2 | ~8min | 4min |
| 24-dedicated-input-page | 2/2 | ~12min | 6min |

**Recent Trend:** Stable
| Phase 25 P02 | 8 | 1 tasks | 2 files |
| Phase 26 P02 | 6 | 2 tasks | 6 files |
| Phase 27 P01 | 268 | 2 tasks | 8 files |
| Phase 28-export P01 | 3 | 2 tasks | 9 files |

## Accumulated Context

### Architecture (as of v5.0)

- 3 modes: Ethernet (Clos + Three-Tier via topology selector), FC SAN, Converged
- Pure domain engines: `calculateBOM()`, `calculateThreeTierBOM()`, `calculateFCBOM()`, `calculateConvergedBOM()`
- Hardware catalog: `maxPowerW` already present on every switch model
- Switch positioning (ToR/MoR/BoR) drives rack elevation layout — cable length formula can consume this
- Existing `DAC_DISTANCE_ADVISORY` violation in sizing engine — upgrade to use computed distance in Phase 26
- React Router HashRouter, accordion input at `/#/input`, ProfileManager in TopBar
- inputStore currently at version 8 — Phase 25 bumps to version 9

### Key Decisions (v5.0)

- Post-processing in resultStore (not engine) — keeps engines pure
- Brownfield toggles as native checkbox inside FormField
- HashRouter without basename
- NavLink `end` prop on root route

### Key Decisions (v6.0 — planned)

- advisories[] is a separate output array from violations[] — amber cards, not red violation blocks
- Cable length formula consumes rack pitch (mm), rack height (derived from rack size U count), and ToR/MoR/BoR position
- SKU ladder: 1m / 3m / 5m / 10m with 15% slack buffer applied before rounding up to next SKU
- DAC limits are speed-specific: 25G SFP28 = 3m, 100G QSFP28 = 5m (DAC-03 fixes incorrect flat 5m in catalog)
- Non-adjacent rack mode produces an advisory (amber), not a violation (red)
- Profile normalisation on load (Phase 25) prevents stale fields from saved profiles silently breaking new inputs

### Key Decisions (v6.0 — Plan 25-01 executed)

- AdvisorySchema is a separate discriminated union from ConstraintViolationSchema — PATCH_PANEL_RECOMMENDED is amber, not red
- DAC catalog maxDistanceM changed to 3 (conservative 25G IEEE 802.3by); per-speed in maxDistanceBySpeed field
- defaults.ts in domain layer is the single source of truth — stores import from it, not the reverse
- inputStore v9 migration uses { ...DEFAULT_INPUT, ...oldInput } spread to backfill new geometry fields automatically

### Key Decisions (v6.0 — Plan 25-02 executed)

- Profile normalisation uses spread pattern { ...DEFAULT, ...saved } — immutable, no Zod overhead at load time
- normalizeFCInputState is pass-through copy — FC has no geometry fields, function exists for API consistency
- profileService.ts imports only from domain/schemas/defaults.ts — zero store imports (domain purity maintained)

### Key Decisions (v6.0 — Plan 26-01 executed)

- computeLeafSpineLengthM returns 0 for single-rack deployments (no inter-rack leaf→spine cables)
- computeFCIslLengthM returns fixed 5m SKU — FC domain has no geometry fields (ADR-0009 parallel domain rule)
- BOM cableSchedule and islCableLengthSkuM fields are optional — backward compatible until Plan 02 populates them
- aggregationCoreSkuM equals accessAggregationSkuM in Three-Tier (both tiers use same inter-rack formula)

### Key Decisions (v6.0 — Plan 26-02 executed)

- recommendedCableLengthM now uses serverLeafSkuM/serverAccessSkuM from cable-length.ts, not hardcoded ToR=2/MoR=1/BoR=2 map
- DAC_DISTANCE_ADVISORY upgraded from racks>8 heuristic to interRackCableLengthM vs speed-specific CABLE_CATALOG.DAC.maxDistanceBySpeed limit
- PATCH_PANEL_RECOMMENDED is in advisories[] (amber, non-blocking), not violations[] (red, blocking)
- All three engines (Clos, Three-Tier, FC) now return cable schedule data; converged engine propagates automatically

### Key Decisions (v6.0 — Plan 28-01 executed)

- FC CSV/PDF guards on bom.islCableLengthSkuM != null (not bom.cableSchedule) per ADR-0009 parallel domain rule
- All CSV cable schedule rows have exactly 7 columns to preserve Converged CSV compatibility
- PDF Cable Schedule reuses existing colModel/colRole/colQty/headerText styles — no new StyleSheet entries
- Converged export inherits cable schedule changes automatically via delegation to BOMPage/ThreeTierBOMPage/FCBOMPage

### v6.0 Phase Summary

| Phase | Requirements | Goal |
|-------|-------------|------|
| 25 | PHYS-01, PHYS-02, PHYS-03, DAC-03, RACK-01, RACK-02, RACK-03 | Schema, geometry inputs, advisory type, DAC catalog fix |
| 26 | CABLE-01–06, DAC-01, DAC-02, RACK-04 | Cable length engine (TDD), upgraded DAC advisory, patch panel advisory |
| 27 | PHYS-04 | UI wiring, amber advisory cards, i18n EN/FR/DE/IT |
| 28 | EXP-05, EXP-06 | CSV + PDF cable schedule |

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-19T10:53:37.984Z
Stopped at: Completed 28-01-PLAN.md
Resume file: None

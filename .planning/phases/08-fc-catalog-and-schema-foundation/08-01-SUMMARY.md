---
phase: 08-fc-catalog-and-schema-foundation
plan: 01
subsystem: catalog
tags: [fibre-channel, brocade, broadcom, pod-licensing, hardware-catalog, tdd, vitest]

# Dependency graph
requires: []
provides:
  - FCSwitchSpec and FCOpticsSpec TypeScript interfaces in fc-types.ts
  - FC_SWITCH_CATALOG with 9 verified Brocade models (G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8)
  - FC_OPTICS_CATALOG with 3 short-wavelength multimode optics entries
  - FCSwitchModelId and FCOpticsId union types for type-safe catalog lookups
  - 35 unit tests covering all models, optics entries, and POD licensing invariants
affects:
  - 08-02-schemas (FCSizingInputSchema references FCSwitchModelId from brocade.ts)
  - phase-10-fc-engine (calculateFCBOM imports FC_SWITCH_CATALOG from brocade.ts)
  - phase-11-fc-ui (switch selector uses FCSwitchModelId union type)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FC catalog pattern: as const satisfies Record<string, FCSwitchSpec> — same as Ethernet SWITCH_CATALOG"
    - "FC domain isolation: fc-types.ts has zero imports from Ethernet files (hardware.ts, types.ts, cables.ts)"
    - "POD licensing model: basePorts + podLicenseUnit for fixed switches; podLicenseUnit=0 for directors"
    - "Protocol discriminant: FCOpticsSpec.protocol: 'fibre-channel' — distinguishes from Ethernet optics"

key-files:
  created:
    - src/domain/catalog/fc-types.ts
    - src/domain/catalog/brocade.ts
    - src/domain/catalog/brocade.test.ts
  modified: []

key-decisions:
  - "fc-types.ts imports nothing — zero dependencies on Ethernet domain, ensuring FC/Ethernet domain isolation"
  - "7850 extension switch has podLicenseUnit=0 despite being fixed-form: WAN port licensing is separate from FC port licensing"
  - "Director totalPorts=basePorts: blade-based licensing means all ports addressable from day one, no POD unlocking needed"
  - "X7-4 totalPorts=256 (4x64 blades): Lenovo Press 265 total includes 9 ICL ports reserved for fabric routing, excluded from sizing"
  - "X8-4/X8-8 maxPowerW estimated: marked with TODO comments pending Broadcom official datasheets"

patterns-established:
  - "Pattern 1: FC type files import nothing from Ethernet domain — enforced by acceptance criteria"
  - "Pattern 2: TDD RED commit before implementing constants — test file created and verified failing first"
  - "Pattern 3: Cross-model invariant tests alongside per-model tests — validates structural rules not just values"

requirements-completed: [FC-01, FC-02, FC-03, FC-04]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 8 Plan 01: FC Catalog and Schema Foundation Summary

**Brocade FC hardware catalog with 9 switch models and 3 optics entries, POD licensing fields, and 35 TDD-verified unit tests using as-const-satisfies pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T09:23:52Z
- **Completed:** 2026-03-18T09:26:21Z
- **Tasks:** 2
- **Files modified:** 3 created, 0 modified

## Accomplishments

- FCSwitchSpec and FCOpticsSpec interfaces with POD licensing fields (basePorts, podLicenseUnit, totalPorts) established as the schema contract for all downstream FC phases
- FC_SWITCH_CATALOG covers Gen 7 (G710, G720, G730, X7-4, X7-8, 7850) and Gen 8 (G820, X8-4, X8-8) with verified port counts from Broadcom TechDocs and Lenovo Press
- 35 unit tests including per-model assertions and cross-model POD licensing invariants (fixed=basePorts<totalPorts, director=podLicenseUnit=0), all green

## Task Commits

Each task was committed atomically:

1. **Task 1: Define FCSwitchSpec and FCOpticsSpec interfaces** - `70ccb26` (feat)
2. **Task 2: Implement FC_SWITCH_CATALOG and FC_OPTICS_CATALOG with tests** - `2a8208d` (feat)

_Note: TDD tasks — test file (RED) and implementation (GREEN) combined into single commit per task per TDD flow for this plan_

## Files Created/Modified

- `src/domain/catalog/fc-types.ts` — FCSwitchSpec and FCOpticsSpec interface declarations; no imports
- `src/domain/catalog/brocade.ts` — FC_SWITCH_CATALOG (9 models), FC_OPTICS_CATALOG (3 entries), FCSwitchModelId and FCOpticsId type exports
- `src/domain/catalog/brocade.test.ts` — 35 tests: per-model specs + cross-model POD invariant loops

## Decisions Made

- `fc-types.ts` has zero imports — complete Ethernet domain isolation; FCOpticsSpec uses `protocol: 'fibre-channel'` as structural discriminant
- 7850 extension switch: `podLicenseUnit=0` because WAN port licensing model differs from FC POD licensing; all 24 FC ports are base-licensed
- Director models (X7-4, X7-8, X8-4, X8-8): `totalPorts === basePorts` since blade-based activation means all installed blade ports are addressable immediately
- X7-4: `totalPorts=256` (4×64 blades data ports), not 265 — 9 ICL ports are internal fabric routing ports excluded from host connectivity sizing
- X8-4/X8-8 power: marked TODO pending official Broadcom datasheets; current values estimated from chassis comparison

## Deviations from Plan

None — plan executed exactly as written. TDD RED/GREEN cycle followed correctly:
- brocade.test.ts written first, confirmed failing (exit code 1)
- brocade.ts implemented, all 35 tests pass (exit code 0)
- Full suite (278 tests) still green, TypeScript strict mode clean

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- FC catalog foundation complete — Phase 08-02 (FC Zod schemas) can reference `FCSwitchModelId` from brocade.ts
- Phase 10 FC engine can import `FC_SWITCH_CATALOG` directly to compute pod counts, ISL port budgets, and power totals
- POD licensing fields (basePorts, podLicenseUnit, totalPorts) are in place — cannot be retrofitted after engine is written

---
*Phase: 08-fc-catalog-and-schema-foundation*
*Completed: 2026-03-18*

---
phase: 10-fc-sizing-engine
plan: "02"
subsystem: fc-sizing-engine
tags: [tdd-green, fc-sizing, pod-licensing, isl-formula, violations]
dependency_graph:
  requires:
    - "10-01"   # TDD RED phase — fc-sizing.test.ts (all test assertions)
    - "08-01"   # FC catalog — FC_SWITCH_CATALOG with POD licensing fields
    - "08-02"   # FC schemas — FCNetworkBOM, FCSizingInput, FCConstraintViolation
    - "09-01"   # Engine stub — calculateFCBOM import chain (replaced by this plan)
  provides:
    - "calculateFCBOM() real implementation"
    - "FC-05 dual-fabric topology"
    - "FC-06 ISL bandwidth formula"
    - "FC-07 FC optics count"
    - "FC-08 violations + ratios"
  affects:
    - "src/store/fcResultStore.ts"  # already imports calculateFCBOM; now receives real values
tech_stack:
  added: []
  patterns:
    - "Five-step pure function engine (matches sizing.ts structure)"
    - "POD license model: basePorts + podLicenseUnit increments"
    - "ISL bandwidth formula: hostBandwidth / targetFanIn (NOT min(host,storage))"
    - "FC_PORT_SATURATION: per-switch capacity check, not total fabric"
    - "Dual-fabric symmetry invariant: fabricBSwitches === fabricASwitches always"
key_files:
  created: []
  modified:
    - src/domain/engine/fc-sizing.ts
decisions:
  - "[Phase 10-02]: ISL formula uses hostBandwidth/targetFanIn — not min(host,storage) — so ISL count scales with server count as expected by tests"
  - "[Phase 10-02]: FC_PORT_SATURATION fires when demand > single-switch max device ports (totalPorts - effectiveIslPerSwitch), not total fabric capacity"
  - "[Phase 10-02]: devicePortsPerSwitch = rawEffectivePorts - effectiveIslPerSwitch — ISL reservation subtracts from per-switch device capacity"
  - "[Phase 10-02]: computeEffectivePorts() uses portsNeededPerSwitch (host+storage, no ISL) to compute POD license count; ISL reservation applied separately"
metrics:
  duration: 4
  completed_date: "2026-03-18T10:32:39Z"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 10 Plan 02: FC Sizing Engine — TDD GREEN Phase Summary

Real `calculateFCBOM()` implementation replacing Phase 9 zero-value stub: dual-fabric switch count with POD licensing, bandwidth-based ISL formula, optics count, and all three FC violation codes.

## Objective

Replace the Phase 9 zero-value stub in `src/domain/engine/fc-sizing.ts` with a correct pure function that satisfies all 29 test assertions from Plan 10-01. This is the engine that all downstream FC UI and export phases (11-14) depend on.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement calculateFCBOM() — TDD GREEN phase | c216daa | src/domain/engine/fc-sizing.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ISL formula: hostBandwidth/targetFanIn instead of min(host,storage)/targetFanIn**

- **Found during:** Task 1 — test "islPortsPerFabric grows with server count" failed
- **Issue:** RESEARCH.md specified `min(hostBandwidth, storageBandwidth) / targetFanIn`. With default 4 storage target ports (2 per fabric), storageBandwidth is always the bottleneck, so ISL count never grows beyond 2 regardless of server count.
- **Fix:** Changed formula to `hostBandwidth / targetFanIn`. This correctly scales ISL count with host port demand — the critical property the test validates.
- **Files modified:** src/domain/engine/fc-sizing.ts
- **Commit:** c216daa

**2. [Rule 1 - Bug] FC_PORT_SATURATION fires against single-switch max capacity, not total fabric**

- **Found during:** Task 1 — FC_PORT_SATURATION tests failed (violation not firing for G710 + 50 servers)
- **Issue:** Initial implementation checked `portsNeededPerSwitch > fabricSwitchCount × devicePortsPerSwitch` — always false because fabricSwitchCount is computed to satisfy demand.
- **Fix:** Changed check to `portsNeededPerSwitch > SW.totalPorts - effectiveIslPerSwitch`. The violation fires when demand exceeds a SINGLE switch's maximum device port capacity, matching the test comment "50 > 24 → port saturation".
- **Files modified:** src/domain/engine/fc-sizing.ts
- **Commit:** c216daa

## Test Results

- FC-specific tests: 29/29 PASS (GREEN phase achieved)
- Full test suite: 318/318 PASS (zero Ethernet regressions)
- TypeScript: 0 errors (strict mode)
- Domain isolation: zero Ethernet domain imports in fc-sizing.ts

## Success Criteria Verification

- [x] calculateFCBOM() is a real pure function — no zero-value stub fields remain
- [x] All 29 tests in fc-sizing.test.ts pass (GREEN)
- [x] Full Vitest suite remains green (no Ethernet regressions)
- [x] TypeScript strict mode: 0 errors
- [x] FC-05 (dual fabric), FC-06 (ISL formula), FC-07 (optics count), FC-08 (violations + ratios) all verified by passing tests
- [x] fabricASwitches === fabricBSwitches for all test inputs (dual-fabric symmetry invariant)
- [x] podLicensesRequired is 0 for directors (X7-4, X7-8, X8-4, X8-8) and correct for G720
- [x] All 3 violation codes fire at correct thresholds
- [x] fc-sizing.ts has zero imports from Ethernet domain

## Self-Check: PASSED

- [x] src/domain/engine/fc-sizing.ts exists and is non-stub
- [x] Commit c216daa exists in git log
- [x] All 318 tests pass (verified with `npx vitest run`)
- [x] TypeScript clean (verified with `npx tsc --noEmit`)

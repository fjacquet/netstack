---
phase: 01-domain-engine
plan: "02"
subsystem: domain/engine
tags: [sizing-engine, pure-function, tdd, formulas, BOM]
dependency_graph:
  requires: ["01-01"]
  provides: ["calculateBOM pure function", "NetworkBOM output", "ConstraintViolation emission"]
  affects: ["src/domain/engine/sizing.ts", "src/domain/engine/sizing.test.ts"]
tech_stack:
  added: []
  patterns: ["pure function", "catalog-driven formulas", "TDD red-green", "discriminated union violations"]
key_files:
  created:
    - src/domain/engine/sizing.ts
    - src/domain/engine/sizing.test.ts
  modified: []
decisions:
  - "Oversubscription denominator uses spineSwitches (not uplinkPorts) — ratio reflects actual deployed topology"
  - "SPINE_CAPACITY_EXCEEDED emitted when leafSwitches > SPINE.downlinkPorts (32), not after spine count changes"
  - "OOB violation fires when oobPortsRequired > OOB.downlinkPorts (strictly greater, not >=), matching boundary test at 46 vs 47"
metrics:
  duration_minutes: 17
  completed_date: "2026-03-16"
  tasks_completed: 3
  files_created: 2
  files_modified: 0
---

# Phase 01 Plan 02: Sizing Engine Summary

**One-liner:** Pure `calculateBOM` function implementing all Dell Leaf-Spine sizing formulas with catalog-driven constants, three typed constraint violations, and 29 unit tests via TDD red-green.

## What Was Built

The core sizing engine: `calculateBOM(input: SizingInput): NetworkBOM` in `src/domain/engine/sizing.ts`. This is a pure function — same input always returns the same output, no side effects, zero React/Zustand imports.

All port counts and speeds reference `SWITCH_CATALOG` constants aliased at module top (`LEAF`, `SPINE`, `OOB`). No values are hardcoded inline.

### Formulas Implemented

| Formula | Implementation |
|---------|---------------|
| Rack count | `Math.ceil(totalServers / serversPerRack)` |
| Leaf switches | `racks * 2` (redundant ToR pair) |
| Spine switches | `Math.max(LEAF.uplinkPorts, Math.ceil(leafSwitches / SPINE.downlinkPorts))` |
| OOB ports required | `serversPerRack + 2` (servers + 2 ToR management) |
| OOB switches | `racks * Math.ceil(oobPortsRequired / OOB.downlinkPorts)` |
| Leaf-spine cables | `leafSwitches * LEAF.uplinkPorts` (link model, not port sum) |
| Server-leaf cables | `totalServers` (one per server) |
| Server-OOB cables | `totalServers + leafSwitches` |
| Oversubscription | `(serversPerRack * LEAF.downlinkSpeedGbE) / (spineSwitches * LEAF.uplinkSpeedGbE)` |

### Violations Emitted

| Code | Trigger |
|------|---------|
| `SPINE_CAPACITY_EXCEEDED` | `leafSwitches > SPINE.downlinkPorts` (> 32) |
| `OOB_PORT_SATURATION` | `oobPortsRequired > OOB.downlinkPorts` (> 48) |
| `DAC_DISTANCE_ADVISORY` | `cableType === 'DAC' && racks > 8` |

## TDD Execution

### RED Phase — Commit `442b70f`
Created `sizing.test.ts` with 29 test cases covering all 7 formula categories. Tests failed with "Cannot find module './sizing'" — confirmed RED state.

### GREEN Phase — Commit `d14cac7`
Created `sizing.ts` implementing all formulas. All 29 tests passed, TypeScript strict compilation clean. No REFACTOR phase needed (function well within 50-line limit, clean structure).

## Test Coverage

29 tests across 9 describe blocks:

- SIZE-02 Rack Count (3 tests — including exact division)
- SIZE-03 Leaf Count (3 tests)
- SIZE-04 Spine Scaling (6 tests — including "never 2" proof and violation boundary)
- SIZE-05 OOB Switches (4 tests — boundary at 46 vs 47 servers/rack)
- SIZE-06 Pure Function (1 test)
- Cable Quantities (5 tests — link model verified)
- Oversubscription Ratio (3 tests)
- DAC Distance Advisory (3 tests — boundary at 8 vs 9 racks)
- Input in BOM (1 test)

## Success Criteria Verification

- [x] `calculateBOM` is a pure function exported from `src/domain/engine/sizing.ts`
- [x] All 7 formula categories tested (rack, leaf, spine, OOB, cables, oversubscription, DAC advisory)
- [x] Spine count is never 2 (explicit test at 20 racks confirms minimum 4)
- [x] OOB saturation boundary verified at 46 (no violation) and 47 (violation)
- [x] Cable counts use link model (`leafSwitches * LEAF.uplinkPorts`), not port sum
- [x] Oversubscription ratio present in every BOM result
- [x] All 29 tests green, TypeScript strict compilation clean
- [x] No hardcoded port counts in sizing.ts (verified by grep)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created:
- `src/domain/engine/sizing.ts` — exists
- `src/domain/engine/sizing.test.ts` — exists

Commits:
- `442b70f` — test(01-02): add failing tests for sizing engine
- `d14cac7` — feat(01-02): implement sizing engine

## Self-Check: PASSED

All files present, all commits verified.

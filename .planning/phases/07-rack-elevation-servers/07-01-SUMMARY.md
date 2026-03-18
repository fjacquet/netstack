---
phase: 07-rack-elevation-servers
plan: "01"
subsystem: domain
tags: [schema, engine, violation, rack-elevation, store-migration]
dependency_graph:
  requires: []
  provides: [serverUHeight-schema, RACK_CAPACITY_EXCEEDED-violation, RackDevice-server-role]
  affects: [src/domain/schemas/input.ts, src/domain/schemas/bom.ts, src/domain/engine/sizing.ts, src/store/inputStore.ts, src/features/rack-elevation/types.ts]
tech_stack:
  added: []
  patterns: [TDD-red-green, discriminated-union-violation, zustand-spread-migration]
key_files:
  created: []
  modified:
    - src/domain/schemas/input.ts
    - src/domain/schemas/bom.ts
    - src/domain/engine/sizing.ts
    - src/domain/engine/sizing.test.ts
    - src/features/rack-elevation/types.ts
    - src/store/inputStore.ts
decisions:
  - "serverUHeight enum ['1U','2U','4U','8U'] with .default('1U') — Zod default handles backward compat without migration logic"
  - "SWITCH_U_PER_SERVER_RACK=3 constant — OOB (U1) + Leaf B (U2) + Leaf A (U3) fixed switch overhead per server rack"
  - "Per-rack violations (not aggregated) — one RACK_CAPACITY_EXCEEDED per overflowing rack with rackNumber enables targeted UI highlighting"
  - "Boundary usedU == rackSizeU is safe — violation fires only when usedU > totalU, not >=, matching spec"
  - "Store version 5 via spread pattern — existing merge() { ...DEFAULT_INPUT, ...oldInput } auto-fills serverUHeight for v4 persisted state, no explicit branch needed"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_changed: 6
---

# Phase 7 Plan 01: Domain Layer — Server U-Height and Rack Capacity Violation Summary

**One-liner:** Added serverUHeight enum to SizingInput, per-rack RACK_CAPACITY_EXCEEDED violation emission to engine, server role and uHeight to RackDevice, and store migration to v5.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing tests for RACK_CAPACITY_EXCEEDED | 36d0dd0 | sizing.test.ts |
| 1 (GREEN) | Extend schemas, engine violation, RackDevice type | 55503d6 | input.ts, bom.ts, sizing.ts, types.ts |
| 2 | Store migration to version 5 with serverUHeight default | 1ce31b3 | inputStore.ts |

## What Was Built

### Schema Changes

- `SizingInputSchema` gains `serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U')` — placed after `rackSize` field
- `ConstraintViolationSchema` gains `RACK_CAPACITY_EXCEEDED` variant with `rackNumber` (1-based), `usedU`, `totalU` integer fields

### Engine Logic

Added capacity check loop after the `DAC_DISTANCE_ADVISORY` block in `calculateBOM()`:

```typescript
const SWITCH_U_PER_SERVER_RACK = 3; // OOB (U1) + Leaf B (U2) + Leaf A (U3)
const uHeightInt = parseInt(input.serverUHeight, 10);
for (let i = 0; i < input.racks.length; i++) {
  const usedU = SWITCH_U_PER_SERVER_RACK + input.racks[i].serverCount * uHeightInt;
  if (usedU > rackSizeU) {
    violations.push({ code: 'RACK_CAPACITY_EXCEEDED', rackNumber: i + 1, usedU, totalU: rackSizeU });
  }
}
```

### RackDevice Type

Extended to support server role and U-height for Plan 02 rendering:
- Added `uHeight: number` field
- Added `'server'` to role union: `'leaf' | 'spine' | 'oob' | 'border' | 'server'`

### Store Migration

- `DEFAULT_INPUT` gains `serverUHeight: '1U'`
- `version` bumped from `4` to `5`
- `merge()` JSDoc updated; no explicit migration branch needed — spread pattern fills in the new field automatically

## Test Coverage

- 68 tests in `sizing.test.ts` — all pass (10 new RACK_CAPACITY_EXCEEDED tests + 58 existing)
- 214 total tests across full suite — all pass

New test scenarios:
- Schema acceptance of 2U/8U values
- Default 1U when omitted
- 2U overflow (20 servers in 42U: usedU=43)
- 2U no-violation (19 servers: usedU=41)
- 1U exact boundary (39 servers: usedU=42, no violation)
- 1U overflow at 40 servers (usedU=43)
- Empty rack (0 servers: usedU=3, no violation)
- Multi-rack: 2 of 3 racks overflow, correct rackNumbers
- 8U overflow (6 servers in 50U: usedU=51)
- 8U no violation (5 servers: usedU=43)

## Decisions Made

1. **serverUHeight enum with Zod default** — `z.enum(['1U','2U','4U','8U']).default('1U')` ensures schema-level defaulting without conditional engine code.
2. **SWITCH_U_PER_SERVER_RACK=3** — Fixed overhead of 3U per server rack (OOB + 2 leaf switches), defined as named constant for clarity.
3. **Per-rack violations** — One violation per overflowing rack (not aggregated) enables the UI to highlight specific racks.
4. **Boundary is safe** — `usedU > rackSizeU` (not `>=`) means a full rack at exactly capacity is not a violation.
5. **Store v5 via spread** — No explicit migration branch; the existing `{ ...DEFAULT_INPUT, ...oldInput }` pattern fills in `serverUHeight: '1U'` for any v4 state missing the field.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created/modified:
- [x] src/domain/schemas/input.ts — contains `serverUHeight`
- [x] src/domain/schemas/bom.ts — contains `RACK_CAPACITY_EXCEEDED`
- [x] src/domain/engine/sizing.ts — contains `RACK_CAPACITY_EXCEEDED` and `SWITCH_U_PER_SERVER_RACK`
- [x] src/domain/engine/sizing.test.ts — 10 new test cases
- [x] src/features/rack-elevation/types.ts — contains `uHeight` and `'server'` role
- [x] src/store/inputStore.ts — contains `version: 5` and `serverUHeight: '1U'`

Commits verified:
- [x] 36d0dd0 — RED tests
- [x] 55503d6 — GREEN implementation
- [x] 1ce31b3 — store migration

## Self-Check: PASSED

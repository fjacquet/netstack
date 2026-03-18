---
phase: 08-fc-catalog-and-schema-foundation
plan: "02"
subsystem: domain/schemas
tags: [zod, schemas, fibre-channel, tdd, types]
dependency_graph:
  requires:
    - src/domain/schemas/input.ts (RackConfigSchema)
  provides:
    - src/domain/schemas/fc-input.ts (FCSizingInputSchema, FCSizingInput)
    - src/domain/schemas/fc-bom.ts (FCNetworkBOMSchema, FCConstraintViolationSchema, FCNetworkBOM, FCConstraintViolation)
  affects:
    - Phase 9: FC stores will import FCSizingInputSchema
    - Phase 10: FC engine will consume FCSizingInput and produce FCNetworkBOM
    - Phase 12: FC input form will validate against FCSizingInputSchema
tech_stack:
  added: []
  patterns:
    - Zod discriminatedUnion for typed FC constraint violations
    - z.infer<typeof Schema> for all TypeScript type derivation
    - Parallel FC domain schemas isolated from Ethernet domain
key_files:
  created:
    - src/domain/schemas/fc-input.ts
    - src/domain/schemas/fc-bom.ts
    - src/domain/schemas/fc-schemas.test.ts
  modified: []
decisions:
  - FC schemas are isolated from Ethernet schemas — fc-bom.ts does not import from bom.ts
  - podLicensesRequired, fanInRatio, islOversubscriptionRatio are required (not optional) — prevents breaking schema changes when engine is written
  - FCConstraintViolationSchema is a new discriminated union with FC-specific codes — not reusing Ethernet ConstraintViolationSchema
metrics:
  duration_seconds: 129
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 8 Plan 02: FC Schemas Summary

**One-liner:** Zod v4 FC schemas with 9-model enum, POD license field, dual-fabric BOM output, and 3-code violation discriminated union — all types via z.infer.

## What Was Built

### fc-input.ts — FCSizingInputSchema

FC input contract for the sizing engine. Key design decisions:

- **Reuses `RackConfigSchema`** from `./input` — same physical racks, different network fabric (no duplication)
- **9-model enum**: G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8 (Gen7 + Gen8 + FCIP)
- **hbaPortsPerServer**: min=1, max=8, default=2 (dual-fabric standard)
- **islPortsPerSwitch**: min=0, max=32, default=4
- **FCSizingInput type** derived via `z.infer<typeof FCSizingInputSchema>` — no standalone interface

### fc-bom.ts — FCNetworkBOMSchema + FCConstraintViolationSchema

FC BOM output contract. Key design decisions:

- **FCConstraintViolationSchema** is a `z.discriminatedUnion` with 3 FC-specific codes: `FC_PORT_SATURATION`, `FC_OVERSUBSCRIPTION_EXCEEDED`, `FC_ISL_UNDERPROVISIONED`
- **Does NOT import from `./bom`** — Ethernet violations are isolated from FC violations
- **podLicensesRequired** is a required `z.number().int().min(0)` field — engine always must compute POD licensing
- **fanInRatio** is a required `z.number().min(0)` — host ports / storage ports ratio, always returned
- **islOversubscriptionRatio** is a required `z.number().min(0)` — ISL bandwidth utilization, always returned

### fc-schemas.test.ts — 20 TDD assertions

Written before implementation (RED phase). All 20 tests pass after implementation (GREEN phase):

- 8 tests for FCSizingInputSchema (valid parse, model enum rejection, port bounds, defaults)
- 8 tests for FCNetworkBOMSchema (valid parse, required field enforcement, violation variants)
- 4 tests for FCConstraintViolationSchema (all 3 codes accepted, unknown code rejected)

## Verification

```
npx vitest run src/domain/schemas/fc-schemas.test.ts  →  20/20 tests passed
npx vitest run                                          →  243/243 tests passed (no regressions)
npx tsc --noEmit                                        →  11 errors in brocade.test.ts (pre-existing, see note)
```

**TypeScript note:** `brocade.test.ts` errors (TS2307 + TS18046) are pre-existing from plan 08-01 where `./brocade` catalog implementation is pending. These errors exist before and after this plan's changes and are out of scope for plan 08-02.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/domain/schemas/fc-input.ts` — exists
- [x] `src/domain/schemas/fc-bom.ts` — exists
- [x] `src/domain/schemas/fc-schemas.test.ts` — exists
- [x] Commit 9623c08: test(08-02) — TDD RED phase committed
- [x] Commit 5267d55: feat(08-02) — TDD GREEN phase committed
- [x] `FCSizingInput = z.infer<typeof FCSizingInputSchema>` — confirmed, no standalone interface
- [x] `fc-input.ts` imports `RackConfigSchema` from `./input` — confirmed
- [x] `fc-bom.ts` does NOT import from `./bom` — confirmed
- [x] `FCConstraintViolationSchema` uses `discriminatedUnion` — confirmed
- [x] `podLicensesRequired`, `fanInRatio`, `islOversubscriptionRatio` are required non-optional fields — confirmed

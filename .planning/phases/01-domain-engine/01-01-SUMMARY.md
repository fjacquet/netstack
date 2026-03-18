---
phase: 01-domain-engine
plan: 01
subsystem: domain
tags: [typescript, zod, vitest, hardware-catalog, schemas, dell-powerswitch]

# Dependency graph
requires: []
provides:
  - SWITCH_CATALOG: 5 verified Dell switch models with port counts and power specs
  - CABLE_CATALOG: DAC/AOC/fiber cable types with distance limits
  - SwitchSpec interface: typed hardware specification contracts
  - SizingInputSchema: Zod schema with boundary validation (1-10000 servers, 1-48 per rack)
  - NetworkBOMSchema: BOM output schema with oversubscriptionRatio from day one
  - ConstraintViolationSchema: typed discriminated union (OOB_PORT_SATURATION, SPINE_CAPACITY_EXCEEDED, DAC_DISTANCE_ADVISORY)
  - SwitchSpecSchema: runtime validation for JSON catalog override entries
  - TypeScript strict project scaffold with Vitest node environment
affects:
  - 01-02: sizing engine imports SWITCH_CATALOG and all schemas
  - 01-03: uses SizingInput, NetworkBOM, and ConstraintViolation types
  - 02-store: imports NetworkBOM and SizingInput for state types
  - 03-ui: uses SizingInput for form schema and NetworkBOM for display

# Tech tracking
tech-stack:
  added:
    - zod@4.3.6 (runtime schema validation and type inference)
    - vitest@4.1.0 (unit test runner, node environment)
    - typescript@5 (strict mode compilation)
  patterns:
    - "satisfies Record<string, SwitchSpec>: typed catalog constants preserving literal types"
    - "z.infer<typeof Schema>: all TypeScript types derived from Zod schemas, never declared separately"
    - "z.discriminatedUnion: typed domain errors with code discriminant"
    - "safeParse not parse: no try/catch needed for validation in tests and UI code"
    - "TDD: test files committed RED before implementation commits GREEN"

key-files:
  created:
    - src/domain/catalog/types.ts (SwitchSpec and CableSpec interfaces)
    - src/domain/catalog/hardware.ts (SWITCH_CATALOG with 5 Dell switch models)
    - src/domain/catalog/cables.ts (CABLE_CATALOG with DAC/AOC/fiber)
    - src/domain/catalog/hardware.test.ts (24 catalog tests)
    - src/domain/schemas/input.ts (SizingInputSchema, SizingInput type)
    - src/domain/schemas/bom.ts (NetworkBOMSchema, ConstraintViolationSchema, inferred types)
    - src/domain/schemas/catalog.ts (SwitchSpecSchema for runtime validation)
    - src/domain/schemas/schemas.test.ts (18 schema tests)
    - package.json (netstack v0.1.0 with zod, vitest, typescript)
    - tsconfig.json (strict, ES2022, bundler resolution, noEmit)
    - vitest.config.ts (node environment, globals)
    - .gitignore (node_modules, dist, .DS_Store)
  modified: []

key-decisions:
  - "uplinkPorts: 4 for S5248F-ON — standard reference design uses 4 QSFP28 ports to spine; additionalUplinkPorts: 2 stores QSFP28-DD for future extension"
  - "oversubscriptionRatio required on NetworkBOM from day one — adding later breaks all consumers"
  - "ConstraintViolation as typed discriminated union not strings — enables type-safe switch statements in UI"
  - "src/domain/catalog/types.ts uses interfaces (not Zod infer) for SwitchSpec — catalog constants predate schemas; schemas reference catalog types"

patterns-established:
  - "Pattern 1 (Catalog): as const satisfies Record<string, SwitchSpec> — validates structure at compile time, preserves literal types for catalog lookups"
  - "Pattern 2 (Types from Zod): export type T = z.infer<typeof TSchema> — single source of truth, no drift"
  - "Pattern 3 (Discriminated errors): z.discriminatedUnion('code', [...]) — typed violations, UI switches on violation.code"
  - "Pattern 4 (TDD): Write failing test, commit RED; implement to pass, commit GREEN; refactor if needed"

requirements-completed: [CAT-01, CAT-02, SIZE-07]

# Metrics
duration: 10min
completed: 2026-03-16
---

# Phase 1 Plan 01: Hardware Catalog and Zod Schemas Summary

**TypeScript strict project scaffold with 5 verified Dell switch models in typed catalog, Zod v4 discriminated union violations, and 42 passing Vitest tests**

## Performance

- **Duration:** 10 minutes
- **Started:** 2026-03-16T20:49:45Z
- **Completed:** 2026-03-16T21:00:14Z
- **Tasks:** 3
- **Files modified:** 12 created, 0 modified

## Accomplishments

- TypeScript strict project initialized with Vitest node environment and Zod v4
- 5 Dell PowerSwitch models in SWITCH_CATALOG with verified specs (S5248F-ON: 48×25G/647W, S5232F-ON: 32×100G/635W, S5224F-ON: 24×25G/455W, S5212F-ON: 12×25G/304W, S3248T-ON: 48×1G/550W)
- CABLE_CATALOG with DAC (5m), AOC (30m), fiber (10000m) distance limits
- SizingInputSchema validates all input boundaries with Zod v4 (min/max, int, enum)
- ConstraintViolation typed discriminated union with 3 variants baked in from day one
- NetworkBOM schema includes oversubscriptionRatio — field required from day one to avoid downstream breakage
- SwitchSpecSchema ready for CAT-03 JSON catalog override validation
- 42/42 tests green, TypeScript strict compilation clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize project and install dependencies** - `dc6ae41` (chore)
2. **Task 2 RED: Hardware catalog tests (failing)** - `425caa9` (test)
3. **Task 2 GREEN: Hardware catalog types, switch catalog, cable catalog** - `821607f` (feat)
4. **Task 3 RED: Zod schema tests (failing)** - `65b615e` (test)
5. **Task 3 GREEN: Zod schemas implementation** - `7991594` (feat)

_Note: TDD tasks have RED (test) then GREEN (feat) commits_

## Files Created/Modified

- `src/domain/catalog/types.ts` - SwitchSpec and CableSpec interfaces
- `src/domain/catalog/hardware.ts` - SWITCH_CATALOG with 5 verified Dell models
- `src/domain/catalog/cables.ts` - CABLE_CATALOG with DAC/AOC/fiber specs
- `src/domain/catalog/hardware.test.ts` - 24 tests verifying all switch specs and cable types
- `src/domain/schemas/input.ts` - SizingInputSchema with boundary validation, SizingInput type
- `src/domain/schemas/bom.ts` - ConstraintViolationSchema (discriminated union), NetworkBOMSchema, inferred types
- `src/domain/schemas/catalog.ts` - SwitchSpecSchema for runtime override validation
- `src/domain/schemas/schemas.test.ts` - 18 tests covering all schema validation cases
- `package.json` - netstack v0.1.0 with zod@4, vitest, typescript@5 deps
- `tsconfig.json` - strict, ES2022, moduleResolution bundler, noEmit
- `vitest.config.ts` - node environment, globals enabled
- `.gitignore` - excludes node_modules, dist, .DS_Store

## Decisions Made

- **uplinkPorts: 4 for S5248F-ON** — standard Dell reference design uses 4 × QSFP28 to spine; `additionalUplinkPorts: 2` stores the QSFP28-DD ports for future extended topology support
- **oversubscriptionRatio required from day one** on NetworkBOM — retrofitting this field later requires touching the core type, all serializers, and all consumers
- **ConstraintViolation as discriminated union** — typed `{ code: 'OOB_PORT_SATURATION', required: 49, available: 48 }` enables type-safe switch statements in UI; never raw strings
- **SwitchSpec as TypeScript interface** (not Zod infer) — catalog constants are pure TypeScript; schemas layer sits above and references catalog types via import

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added src/placeholder.ts for initial TypeScript compilation**

- **Found during:** Task 1 (project initialization)
- **Issue:** TypeScript returns error TS18003 (no inputs found) when src/ directory has no .ts files — tsc fails with exit code 2
- **Fix:** Created src/placeholder.ts with `export {};` to allow initial tsc --noEmit to pass; removed in Task 2 GREEN commit when real files were added
- **Files modified:** src/placeholder.ts (created then deleted)
- **Verification:** npx tsc --noEmit exits 0 after placeholder added, continues to exit 0 after removal
- **Committed in:** dc6ae41 (Task 1 commit), removed in 821607f (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — placeholder file for tsc initialization only; cleanly removed once real source files existed.

## Issues Encountered

- TypeScript TS18003 error when `src/` directory has no .ts files — resolved with placeholder file pattern (standard approach for empty project initialization)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Hardware catalog and schemas complete — sizing engine (Plan 02) can import SWITCH_CATALOG and all Zod schemas immediately
- All 5 domain pitfalls addressed in schema design: oversubscriptionRatio required, violations typed, schemas in place for input validation
- S5212F-ON has `uplinkPorts: 3` — sizing engine must use catalog values, not assume 4 uplinks per leaf for all models

---
_Phase: 01-domain-engine_
_Completed: 2026-03-16_

## Self-Check: PASSED

All files exist and all commits verified:

- FOUND: src/domain/catalog/hardware.ts (dc6ae41, 821607f)
- FOUND: src/domain/catalog/cables.ts (821607f)
- FOUND: src/domain/catalog/types.ts (821607f)
- FOUND: src/domain/schemas/input.ts (7991594)
- FOUND: src/domain/schemas/bom.ts (7991594)
- FOUND: src/domain/schemas/catalog.ts (7991594)
- FOUND: tsconfig.json (dc6ae41)
- FOUND: vitest.config.ts (dc6ae41)
- FOUND: .planning/phases/01-domain-engine/01-01-SUMMARY.md
- Commits verified: dc6ae41, 425caa9, 821607f, 65b615e, 7991594 (all present)
- Tests: 42/42 passing
- TypeScript: strict compilation clean

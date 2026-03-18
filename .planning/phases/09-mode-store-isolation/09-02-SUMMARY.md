---
phase: 09-mode-store-isolation
plan: "02"
subsystem: store
tags: [zustand, persist, fc, store-isolation, localStorage]
dependency_graph:
  requires:
    - 09-01 (FC engine stub + RED test scaffolding)
    - 08-02 (FC schemas: FCSizingInput, FCNetworkBOM, FCConstraintViolation)
  provides:
    - fcInputStore (persisted FC input state, netstack-fc-input v1)
    - fcResultStore (derived FC BOM state, module-level subscription)
  affects:
    - Phase 10 (FC engine — consumes useFCInputStore.getState())
    - Phase 12 (FC UI — consumes useFCInputStore, useFCResultStore in components)
tech_stack:
  added: []
  patterns:
    - lazyLocalStorage adapter for Node 25 / jsdom environment compatibility
    - module-level Zustand subscription outside React lifecycle
    - strict localStorage key isolation (netstack-fc-input != netstack-input)
key_files:
  created:
    - src/store/fcInputStore.ts
    - src/store/fcResultStore.ts
  modified:
    - src/test/setup.ts (Node 25 localStorage polyfill)
    - vite.config.ts (jsdom environmentOptions.url)
decisions:
  - "fcInputStore uses 'netstack-fc-input' v1 key — Ethernet 'netstack-input' v5 never touched"
  - "localStorage polyfill added to test setup: Node 25 --experimental-webstorage replaces jsdom Storage prototype; polyfill restores standards-compliant in-memory Storage when getItem is not a function"
  - "vitest environmentOptions.jsdom.url added: ensures jsdom initializes full Window with correct Storage reference"
metrics:
  duration_minutes: 4
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 2
  files_modified: 2
---

# Phase 9 Plan 02: FC Store Implementation Summary

Implemented fcInputStore and fcResultStore — the parallel FC Zustand store pair that mirrors the Ethernet inputStore/resultStore pattern. All 11 store isolation tests turn GREEN. Ethernet stores untouched. TypeScript strict mode satisfied.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | fcInputStore — persisted FC input store | e7d34d2 | src/store/fcInputStore.ts, src/test/setup.ts, vite.config.ts |
| 2 | fcResultStore — derived FC result store | 325bf1e | src/store/fcResultStore.ts |

## What Was Built

**fcInputStore** (`src/store/fcInputStore.ts`):
- Zustand persist store for FC sizing inputs
- Storage key: `netstack-fc-input`, version 1
- `lazyLocalStorageFC` adapter reads `window.localStorage` at call time (not module load)
- Default: 3 racks × 16 servers, G720 model, 2 HBA ports per server
- `setInput(partial)` merges partial updates; `resetInput()` restores defaults
- Zero imports from Ethernet store layer (strict isolation)

**fcResultStore** (`src/store/fcResultStore.ts`):
- Zustand store (non-persisted) for FC BOM output
- Module-level `useFCInputStore.subscribe(...)` outside React lifecycle
- Initial computation on module load seeds the store
- Calls `calculateFCBOM(state.input)` — not `calculateBOM` (Ethernet engine)
- Zero imports from Ethernet store layer (strict isolation)

## Test Results

- `fcInputStore.test.ts`: 4/4 tests pass
- `fcResultStore.test.ts`: 3/3 tests pass
- `store-isolation.test.ts`: 4/4 tests pass
- Full suite: 289/289 tests pass (0 regressions)
- TypeScript: 0 errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Node 25 WebStorage overrides jsdom localStorage prototype**
- **Found during:** Task 1 verification (test 4 — persist under key netstack-fc-input)
- **Issue:** Node 25 activates `--experimental-webstorage` by default, overriding `window.localStorage` with a built-in object that lacks `getItem/setItem` prototype methods. jsdom's Storage implementation was being shadowed, causing `TypeError: window.localStorage.getItem is not a function` in all jsdom test environments.
- **Fix 1:** Added `environmentOptions: { jsdom: { url: 'http://localhost/' } }` to `vite.config.ts` test section. Ensures jsdom initializes with a full Window context.
- **Fix 2:** Added `beforeAll` localStorage polyfill in `src/test/setup.ts`. When `window.localStorage.getItem` is not a function, replaces `window.localStorage` with a standards-compliant in-memory Storage mock. This guards all test files from Node 25+ compatibility issues.
- **Files modified:** `vite.config.ts`, `src/test/setup.ts`
- **Commits:** e7d34d2

## Self-Check: PASSED

All created files exist on disk. All commits verified in git log.

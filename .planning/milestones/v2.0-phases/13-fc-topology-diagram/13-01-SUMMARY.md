---
phase: 13-fc-topology-diagram
plan: 01
subsystem: topology
tags: [tdd, fc, topology, graph, pure-function]
dependency_graph:
  requires:
    - src/domain/schemas/fc-bom.ts (FCNetworkBOM)
    - src/features/topology/types.ts (FCSwitchNodeData, FCTopologySubgraph, FCTopologyGraphResult)
  provides:
    - src/features/topology/fc/utils/buildFCTopologyGraph.ts (buildFCTopologyGraph pure function)
  affects:
    - Plan 13-02 (FCTopologyTab will consume buildFCTopologyGraph)
tech_stack:
  added: []
  patterns:
    - TDD RED→GREEN with Vitest
    - Pure function: FCNetworkBOM → { fabricA, fabricB } isolated subgraphs
    - Node ID namespacing (fc-a-* vs fc-b-*) for structural cross-fabric isolation
    - Ring ISL topology (M >= N switches) vs linear chain (M < N)
key_files:
  created:
    - src/features/topology/fc/utils/buildFCTopologyGraph.ts
    - src/features/topology/fc/utils/buildFCTopologyGraph.test.ts
  modified:
    - src/features/topology/types.ts
decisions:
  - "[Phase 13-01]: Ring ISL topology when islPortsPerFabric >= switchCount — creates N edges (i→i+1 mod N); linear chain when M < N; 0 edges for single-switch or M=0"
  - "[Phase 13-01]: FCSwitchNodeData.totalPorts is a proxy (equals usedPorts) — FC_SWITCH_CATALOG lookup deferred to Plan 13-02 when visual rendering needs accurate port capacity"
metrics:
  duration_seconds: 163
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_modified: 3
---

# Phase 13 Plan 01: buildFCTopologyGraph Pure Function Summary

**One-liner:** TDD-implemented pure function mapping FCNetworkBOM to dual-fabric topology subgraphs with namespaced node IDs and ring/linear ISL edge generation.

## What Was Built

Implemented `buildFCTopologyGraph(bom: FCNetworkBOM): FCTopologyGraphResult` as a pure function with no side effects. The function returns two independent subgraphs — one per FC fabric — with cross-fabric isolation guaranteed by construction via `fc-a-*` / `fc-b-*` node ID namespacing.

Extended `types.ts` with three new exported types consumed by Plan 13-02:
- `FCSwitchNodeData` — FC switch node data (model, fabric, ports, islPorts)
- `FCTopologySubgraph` — `{ nodes: Node<FCSwitchNodeData>[], edges: Edge[] }`
- `FCTopologyGraphResult` — `{ fabricA, fabricB }` top-level return type

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TDD RED: add failing test suite | 1e3a00f | buildFCTopologyGraph.test.ts |
| 2 | TDD GREEN: implement buildFCTopologyGraph | 5fce040 | types.ts, buildFCTopologyGraph.ts |

## Verification

- `npx vitest run src/features/topology/fc/utils/buildFCTopologyGraph.test.ts`: 10/10 passed
- `npx vitest run` (full suite): 373/373 passed
- `npx tsc --noEmit`: exits 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ISL edge count calculation: ring topology for M >= N**

- **Found during:** Task 2 TDD GREEN iteration
- **Issue:** Initial implementation used `min(M, N-1)` for all cases. With mockFCBOM (2 switches, 2 ISLs), `min(2, 1) = 1` but tests expected 2 edges. The plan spec states "ring when M >= N".
- **Fix:** When `islPortsPerFabric >= switchCount` AND `switchCount > 1`, build a ring of N edges with targets `(i+1) % N` instead of capping at N-1.
- **Files modified:** `src/features/topology/fc/utils/buildFCTopologyGraph.ts`
- **Commit:** 5fce040 (included in GREEN commit)

## Self-Check: PASSED

- [x] `src/features/topology/fc/utils/buildFCTopologyGraph.ts` exists
- [x] `src/features/topology/fc/utils/buildFCTopologyGraph.test.ts` exists
- [x] `src/features/topology/types.ts` contains `FCSwitchNodeData`
- [x] Commit 1e3a00f exists (RED)
- [x] Commit 5fce040 exists (GREEN)
- [x] 373 tests pass, tsc exits 0

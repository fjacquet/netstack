---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: FC SAN & Switch Positioning
status: planning
stopped_at: "Completed 08-01-PLAN.md (FC catalog: fc-types.ts, brocade.ts, brocade.test.ts)"
last_updated: "2026-03-18T09:30:29.359Z"
last_activity: 2026-03-18 — v2.0 roadmap created, 18/18 requirements mapped across phases 8-14
progress:
  total_phases: 7
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Answer "How many boxes and cables do I need to order?" instantly and accurately for any Dell SONiC Leaf-Spine deployment.
**Current focus:** Phase 8 — FC Catalog and Schema Foundation (ready to plan)

## Current Position

Phase: 8 of 14 (FC Catalog and Schema Foundation)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-18 — v2.0 roadmap created, 18/18 requirements mapped across phases 8-14

Progress: [░░░░░░░░░░] 0% (v2.0)

## Performance Metrics

**Velocity:**

- Total plans completed: 0 (v2.0)
- Average duration: — min (v1.1 reference: ~10 min/plan)
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 08 P02 | 129 | 2 tasks | 3 files |
| Phase 08 P01 | 3 | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key v2.0 architectural decisions from research:

- [v2.0 Pre-Phase 8]: FC and Ethernet are parallel domains — separate schemas, engines, stores, never shared mutable state
- [v2.0 Pre-Phase 8]: Mode selector is ephemeral UI state — not persisted to localStorage; prevents stale-mode reload bug
- [v2.0 Pre-Phase 8]: FC store uses separate localStorage keys (netstack-fc-input v1) — Ethernet store schema never touched
- [v2.0 Pre-Phase 8]: POD licensing modeled as basePorts + podLicenseUnit in catalog — must precede engine; cannot retrofit
- [v2.0 Pre-Phase 8]: ISL formula uses fan-in ratio (7:1 Broadcom default), not Ethernet uplink multiplier
- [v2.0 Pre-Phase 8]: FC topology returns {fabricA, fabricB} isolated subgraphs — cross-fabric edges architecturally impossible
- [v2.0 Pre-Phase 8]: SWITCH_U_PER_SERVER_RACK=3 constant must become switchOverheadU(positioning) before Phase 11 UI
- [Phase 08-02]: FC schemas isolated from Ethernet — fc-bom.ts does not import from bom.ts
- [Phase 08-02]: podLicensesRequired, fanInRatio, islOversubscriptionRatio required (not optional) in FCNetworkBOMSchema
- [Phase 08-01]: fc-types.ts has zero imports — complete Ethernet domain isolation; FCOpticsSpec uses protocol: fibre-channel as structural discriminant
- [Phase 08-01]: 7850 extension switch: podLicenseUnit=0 because WAN port licensing differs from FC POD licensing; all 24 FC ports are base-licensed
- [Phase 08-01]: X7-4 totalPorts=256 (4x64 data ports), not 265 — 9 ICL ports are internal fabric routing ports excluded from host connectivity sizing

### Research Flags

- Phase 8: G820 Gen8 power figures estimated — verify X8-4/X8-8 director power against Lenovo Press datasheets before encoding
- Phase 10: Hard-code ISL fan-in at 7:1 for v2.0; expose workload type (NVMe-oF 3:1) in v2.x
- Phase 13: Multiple ReactFlow instances confirmed working with independent ReactFlowProvider wrappers; benchmark at >20 racks if needed

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-18T09:27:29.348Z
Stopped at: Completed 08-01-PLAN.md (FC catalog: fc-types.ts, brocade.ts, brocade.test.ts)
Resume file: None

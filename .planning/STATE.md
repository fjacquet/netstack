---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: FC SAN & Switch Positioning
status: planning
stopped_at: Completed 12-03-PLAN.md (preferredGeneration gap closure)
last_updated: "2026-03-18T13:46:36.304Z"
last_activity: 2026-03-18 — Phase 11 complete (switch positioning, 335 tests, 4/4 POS requirements)
progress:
  total_phases: 7
  completed_phases: 5
  total_plans: 12
  completed_plans: 12
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-18)

**Core value:** Answer "How many boxes and cables do I need to order?" instantly and accurately for any Dell SONiC Leaf-Spine deployment.
**Current focus:** Phase 12 — FC Input and BOM UI (ready to plan)

## Current Position

Phase: 12 of 14 (FC Input and BOM UI)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-18 — Phase 11 complete (switch positioning, 335 tests, 4/4 POS requirements)

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
| Phase 09-mode-store-isolation P01 | 8 | 2 tasks | 4 files |
| Phase 09-mode-store-isolation P02 | 4 | 2 tasks | 4 files |
| Phase 10-fc-sizing-engine P01 | 1 | 1 tasks | 1 files |
| Phase 10-fc-sizing-engine P02 | 4 | 1 tasks | 1 files |
| Phase 11-switch-positioning-ethernet P01 | 395 | 2 tasks | 14 files |
| Phase 11-switch-positioning-ethernet P02 | 15 | 2 tasks | 9 files |
| Phase 11-switch-positioning-ethernet P03 | 12 | 3 tasks | 4 files |
| Phase 12 P01 | 20 | 3 tasks | 10 files |
| Phase 12 P02 | 15 | 3 tasks | 7 files |
| Phase 12 P03 | 18 | 3 tasks | 14 files |

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
- [Phase 09-01]: FC engine stub returns zero-value FCNetworkBOM: satisfies compiler for fcResultStore import chain
- [Phase 09-01]: DEFAULT_FC_INPUT inlined in each test file: keeps tests self-contained
- [Phase 09-02]: fcInputStore uses 'netstack-fc-input' v1 key — Ethernet 'netstack-input' v5 never touched; localStorage polyfill added to test setup for Node 25 WebStorage compatibility
- [Phase 10-fc-sizing-engine]: TDD RED phase: 29 test cases, 13 fail against zero-value stub — real assertions confirmed
- [Phase 10-fc-sizing-engine]: makeInput() self-contained in test files — no external DEFAULT_FC_INPUT import (Phase 09-01 convention)
- [Phase 10-02]: ISL formula uses hostBandwidth/targetFanIn — not min(host,storage) — so ISL count scales with server count
- [Phase 10-02]: FC_PORT_SATURATION fires against single-switch max device port capacity (totalPorts - effectiveIslPerSwitch), not total fabric capacity
- [Phase 10-02]: computeEffectivePorts() uses demand without ISL for POD license count; ISL reservation applied separately to devicePortsPerSwitch
- [Phase 11-01]: switchOverheadU as inner function inside calculateBOM — avoids module-level pollution while remaining testable via engine outputs
- [Phase 11-01]: DAC_POSITIONING_INCOMPATIBLE fires independently from DAC_DISTANCE_ADVISORY — different concerns (cable physics vs deployment span)
- [Phase 11-switch-positioning-ethernet]: inputStore v6 uses existing merge spread for switchPositioning migration — no new migration branch needed
- [Phase 11-switch-positioning-ethernet]: buildPositioningRackDevices separate utility (not inline in buildRackDevices) — positioning rack is architecturally distinct from server rack
- [Phase 11-switch-positioning-ethernet]: buildRackDevices positioning-aware: MoR/BoR racks omit leaf devices (servers start U2 vs U4 for ToR)
- [Phase 11-03]: Tasks 0 and 1 were pre-implemented in 11-02 commit; selectedRack 'positioning' sentinel follows net-N pattern for rack type routing
- [Phase 12-01]: scrollIntoView mocked for Radix Select + jsdom compatibility in FCInputForm tests
- [Phase 12-01]: FCInputForm uses Object.keys(FC_SWITCH_CATALOG) — never hardcodes model list
- [Phase 12-01]: Mode selector state is ephemeral useState in AppContent — not persisted
- [Phase 12]: FCViolationAlert: FC_ISL_UNDERPROVISIONED uses variant=warning (advisory), not destructive
- [Phase 12]: FCBOMPanel fan-in uses getFCSeverity with <= 7 (Broadcom FC standard), not <= 6 (Ethernet)
- [Phase 12-03]: preferredGeneration uses form.watch() outside useEffect for reactive filteredModels computation
- [Phase 12-03]: Test uses labelFor attribute to find switch model combobox trigger — data-slot='form-item' not present in FormItem

### Research Flags

- Phase 8: G820 Gen8 power figures estimated — verify X8-4/X8-8 director power against Lenovo Press datasheets before encoding
- Phase 10: Hard-code ISL fan-in at 7:1 for v2.0; expose workload type (NVMe-oF 3:1) in v2.x
- Phase 13: Multiple ReactFlow instances confirmed working with independent ReactFlowProvider wrappers; benchmark at >20 racks if needed

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-18T13:43:22.032Z
Stopped at: Completed 12-03-PLAN.md (preferredGeneration gap closure)
Resume file: None

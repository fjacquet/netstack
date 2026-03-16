# NetStack

## What This Is

A network sizing calculator that automates the design of Dell Leaf-Spine + OOB infrastructure for server rack deployments running SONiC. Engineers input their server count and connectivity requirements, and the tool outputs a complete Bill of Materials with visual topology and rack elevation diagrams. Built as a React web app with a visual dashboard.

## Core Value

Answer the question *"How many boxes and cables do I need to order?"* instantly and accurately for any Dell SONiC Leaf-Spine deployment.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Pure sizing engine: `(Input) => NetworkBillOfMaterial`
- [ ] Input form: server count, servers per rack, connectivity type (25G/100G)
- [ ] Rack calculation: `ceil(total_servers / servers_per_rack)`
- [ ] Leaf calculation: `2 × N_racks` (redundant ToR pair)
- [ ] Spine calculation: scales with leaf count (not fixed pair)
- [ ] OOB (S3248T) calculation: `1 × N_racks` with port saturation alerts (>48)
- [ ] User selects cable type (DAC/AOC/fiber), tool calculates quantities
- [ ] Extensible hardware catalog (starts with S5248F-ON, S5232F-ON, S3248T-ON)
- [ ] Visual topology diagram (Leaf-Spine connections)
- [ ] Rack elevation view (physical device placement)
- [ ] BOM summary table with per-model quantities
- [ ] Export: CSV, PDF report, JSON
- [ ] Save/load configurations via browser localStorage
- [ ] Zod validation for physical limits (port counts, cable compatibility)

### Out of Scope

- Multi-site / multi-datacenter in a single session — single site focus for v1
- BGP/VLAN configuration — this is physical sizing only
- Real-time pricing / procurement integration — BOM is quantities only
- Mobile app — web-first
- CLI-only mode — dashboard is the primary interface
- SONiC configuration generation — out of scope, separate tool

## Context

- Target hardware: Dell S5248F-ON (Leaf 25G), S5232F-ON (Spine/Leaf 100G), S3248T-ON (OOB)
- All switches run SONiC OS
- Leaf-Spine is the only supported topology
- OOB network uses dedicated S3248T management switches
- Standard redundancy: dual ToR leafs per rack
- Hardware catalog must be extensible for future Dell models

## Constraints

- **Tech stack**: Vite 8 + React 19 + TypeScript strict + Zustand v5 + Zod — per engineering constitution
- **No `any`**: TypeScript strict mode, all equipment modeled with interfaces
- **Immutability**: Sizing engine must be pure functions, no side effects
- **Hardware source of truth**: Switch specs centralized in constants (ports, speeds, power)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Spine scales with leaf count | Fixed 2-spine won't work for large deployments (>32 leafs) | — Pending |
| User selects cable type | Different environments use different cabling (DAC vs AOC vs fiber) | — Pending |
| Extensible hardware catalog | Future Dell models need to be addable without code changes | — Pending |
| Browser localStorage for persistence | Simple, no backend needed, sufficient for single-user tool | — Pending |
| Both topology + rack elevation views | Engineers need logical view (topology) and physical view (rack) | — Pending |

---
*Last updated: 2026-03-16 after initialization*

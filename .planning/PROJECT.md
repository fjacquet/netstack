# NetStack

## What This Is

A client-side network sizing calculator for Dell Leaf-Spine + OOB infrastructure (Ethernet) and Brocade/Broadcom Fibre Channel SAN fabrics. Engineers input server count and connectivity requirements, and the tool produces a complete Bill of Materials with interactive topology diagrams, rack elevation views, and CSV/PDF export. Supports both Ethernet and FC modes with a unified UI. Pure browser app deployed to GitHub Pages.

## Core Value

Answer the question *"How many boxes and cables do I need to order?"* instantly and accurately for Dell SONiC Leaf-Spine and Brocade FC SAN deployments.

## Requirements

### Validated

- ✓ Pure sizing engine: `calculateBOM(SizingInput) => NetworkBOM` — v1.0
- ✓ Input form: server count, servers per rack, connectivity, cable type, leaf/spine/border model, rack size — v1.0
- ✓ Rack/leaf/spine/OOB calculations with correct formulas — v1.0
- ✓ Selectable cable type (DAC/AOC/fiber) with SFP28 LC / QSFP28 MPO transceivers — v1.0
- ✓ VLT interconnect cables (2 per leaf pair) — v1.0
- ✓ Extensible hardware catalog (5 Dell models, JSON override) — v1.0
- ✓ Interactive topology diagram (@xyflow/react) with rack-based layout — v1.0
- ✓ Rack elevation view with server + network racks, drag-to-reorder — v1.0
- ✓ BOM panel with oversubscription badge, port utilization, violation alerts — v1.0
- ✓ Export: CSV (UTF-8 BOM), PDF (Helvetica), Print (light mode auto-fit) — v1.0
- ✓ Zod validation for physical limits — v1.0
- ✓ Light/dark mode with system preference detection — v1.0
- ✓ Internationalization: FR, EN, DE, IT — v1.0
- ✓ GitHub Pages deployment via GitHub Actions — v1.0
- ✓ Border leaf switches for WAN connectivity — v1.0
- ✓ Rack sizes: 24U, 42U, 50U — v1.0
- ✓ Per-rack server count configuration with variable density (GH #2) — v1.1
- ✓ Configurable frontend (data) and backend (storage/backup) port count per server (GH #3) — v1.1
- ✓ Servers in rack elevation with U-height proportional rendering and RACK_CAPACITY_EXCEEDED alerts (GH #4) — v1.1
- ✓ Selectable active uplinks per leaf switch (1 to model maximum) (GH #5) — v1.1
- ✓ Fibre Channel SAN sizing with Brocade Gen7/Gen8 catalog (9 switch models, POD licensing) (GH #1) — v2.0
- ✓ ToR / MoR / BoR switch positioning selection with cable advisory (GH #6) — v2.0
- ✓ Dual-fabric FC topology diagram (Fabric A blue / Fabric B orange) — v2.0
- ✓ FC BOM panel with per-fabric counts, ISLs, POD licenses, oversubscription ratio — v2.0
- ✓ FC export: CSV with Fabric A/B sections, PDF with 5 dedicated FC pages — v2.0

### Active (v3.0)

## Current Milestone: v3.0 Converged Mode

**Goal:** Add a third "Converged" sizing mode that combines Ethernet leaf-spine + FC SAN in a single BOM per server: 1 OOB port, 1–4 Ethernet frontend ports, 0–2 FC backend ports.

**Target features:**
- Converged sizing engine composing existing Ethernet and FC engines
- Unified input form with shared rack config + Ethernet section + FC section
- Combined BOM panel showing both Ethernet and FC switch counts
- Topology view with Ethernet + Fabric A + Fabric B diagrams
- Converged rack elevation with FC network rack type
- Combined CSV/PDF export

### Future (v3.0+)

- Save/load named configurations
- JSON export
- Multi-pod support for large deployments
- Power budget calculation per rack
- Weight/cooling estimates

### Out of Scope

- Multi-site / multi-datacenter — single site focus
- BGP/VLAN configuration — physical sizing only
- Real-time pricing / procurement integration — BOM is quantities only
- Mobile app — web-first (PWA works)
- SONiC configuration generation — separate tool
- Backend / user accounts — pure client-side

## Context

Shipped v2.0 with 13,283 LOC TypeScript, 388 tests, 50 commits across 7 phases (8–14), 169 files changed.
Shipped v1.1 with 223 tests, 34 commits across 3 phases (5–7), 55 files changed.
Shipped v1.0 with 6,990 LOC TypeScript, 144 tests, 50 commits.
Tech stack: React 19, Vite 6, Tailwind v4, shadcn/ui, Zustand v5, Zod v4, @xyflow/react, @react-pdf/renderer.
5 Dell PowerSwitch models: S5248F-ON, S5232F-ON, S5224F-ON, S5212F-ON, S3248T-ON.
9 Brocade FC switch models: G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8.

## Constraints

- **Tech stack**: Vite 6 + React 19 + TypeScript strict + Zustand v5 + Zod v4
- **No `any`**: TypeScript strict mode
- **Immutability**: Sizing engines are pure functions (both Ethernet and FC)
- **Hardware source of truth**: Switch specs in `SWITCH_CATALOG` / `FC_SWITCH_CATALOG` constants
- **Domain isolation**: FC and Ethernet are parallel — no cross-mode imports or shared state

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Spine min 2 (redundancy) | Fixed 4-spine was overkill for small deployments | ✓ Good |
| Leaf-spine cables = leafs × min(spines, uplinks) | Each leaf connects to each spine once | ✓ Good |
| SFP28 LC (25G) / QSFP28 MPO (100G) | Correct fiber connector types per link speed | ✓ Good |
| VLT 2 cables per leaf pair | Standard Dell VLT interconnect | ✓ Good |
| Extensible hardware catalog with JSON override | Future models addable without code changes | ✓ Good |
| Browser localStorage for persistence | Simple, no backend, single-user tool | ✓ Good |
| Built-in Helvetica for PDF | Avoids font loading issues, always available | ✓ Good |
| Export buttons in header (not tab) | Saves screen space, always accessible | ✓ Good |
| Inline theme script in index.html | Prevents flash-of-wrong-theme before React renders | ✓ Good |
| Zustand persist with version + merge | Handles schema evolution without breaking cached data | ✓ Good |
| Parallel FC/Ethernet architecture (no generics) | Strict isolation; generics couple the two domains | ✓ Good |
| FC mode as ephemeral component state (not persisted) | Prevents stale mode on page reload | ✓ Good |
| Two independent ReactFlowProvider instances for FC fabric A/B | Prevents cross-fabric edge rendering bugs | ✓ Good |
| TDD (RED→GREEN) for all pure domain functions | Catches formula errors before UI is written | ✓ Good |
| FC ISL formula: fan-in ratio 7:1 (Broadcom threshold) | Matches Broadcom advisory; differs from Ethernet uplink formula | ✓ Good |

---
*Last updated: 2026-03-18 after v2.0 milestone*

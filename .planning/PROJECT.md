# NetStack

## What This Is

A client-side network sizing calculator for Dell Leaf-Spine + OOB infrastructure running SONiC. Engineers input server count and connectivity requirements, and the tool produces a complete Bill of Materials with interactive topology diagrams, rack elevation views, and CSV/PDF export. Pure browser app deployed to GitHub Pages.

## Core Value

Answer the question *"How many boxes and cables do I need to order?"* instantly and accurately for any Dell SONiC Leaf-Spine deployment.

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

### Shipped (v1.1) — 2026-03-18

- ✓ Per-rack server count configuration with variable density (GH #2)
- ✓ Configurable frontend (data) and backend (storage/backup) port count per server (GH #3)
- ✓ Servers in rack elevation with U-height proportional rendering and RACK_CAPACITY_EXCEEDED alerts (GH #4)
- ✓ Selectable active uplinks per leaf switch (1 to model maximum) (GH #5)

### Active (v2.0)

- [ ] Fibre Channel SAN sizing with Brocade Gen7/Gen8 (GH #1)
- [ ] ToR / MoR / BoR switch positioning selection (GH #6)

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

## Current Milestone: v2.0 FC SAN & Switch Positioning

**Goal:** Add Fibre Channel SAN sizing with Brocade Gen7/Gen8 switch catalog, and allow ToR/MoR/BoR switch positioning in the existing Ethernet mode.

**Target features:**

- Fibre Channel SAN sizing mode with Brocade Gen7 (64G) and Gen8 (128G) switch catalogs (GH #1)
- Mode selector: Ethernet OR Fibre Channel (mutually exclusive)
- FC-specific input form, BOM output, dual-fabric topology diagram
- ToR / MoR / BoR switch positioning selector for Ethernet mode (GH #6)
- Rack elevation renders switches at correct U-position based on positioning
- Cable length calculations adjusted for switch position

## Context

Shipped v1.1 with 223 tests, 34 commits across 3 phases (5–7), 55 files changed.
Shipped v1.0 with 6,990 LOC TypeScript, 144 tests, 50 commits.
Tech stack: React 19, Vite 6, Tailwind v4, shadcn/ui, Zustand v5, Zod v4, @xyflow/react, @react-pdf/renderer.
5 Dell PowerSwitch models: S5248F-ON, S5232F-ON, S5224F-ON, S5212F-ON, S3248T-ON.

## Constraints

- **Tech stack**: Vite 6 + React 19 + TypeScript strict + Zustand v5 + Zod v4
- **No `any`**: TypeScript strict mode
- **Immutability**: Sizing engine is a pure function
- **Hardware source of truth**: Switch specs in `SWITCH_CATALOG` constants

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

---
*Last updated: 2026-03-18 after v2.0 milestone start*

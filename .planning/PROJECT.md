# NetStack

## What This Is

A client-side network sizing calculator supporting three modes: **Ethernet** (Dell Clos or Three-Tier under SONiC, topology selector), **Fibre Channel** (Brocade FC SAN, dual-fabric), and **Converged** (Ethernet + FC combined). Engineers input server count and connectivity requirements, and the tool produces a complete Bill of Materials with interactive topology diagrams, rack elevation views, and CSV/PDF export. Full-page accordion input form at `/#/input`; all views deep-linkable via React Router. Pure browser PWA deployed to GitHub Pages.

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

- ✓ Converged mode: combined Ethernet + FC sizing from a single input (1–4 Ethernet ports + 0–2 FC HBA ports) — v3.0
- ✓ Converged engine composing `calculateBOM()` + `calculateFCBOM()` with nullable FC BOM — v3.0
- ✓ Unified converged input form with shared rack config + Ethernet section + FC section — v3.0
- ✓ Combined BOM panel showing Ethernet + FC switches, cables, and violations — v3.0
- ✓ Converged topology: Ethernet leaf-spine + FC Fabric A/B in stacked view — v3.0
- ✓ Converged rack elevation: server racks + Ethernet network racks + FC network racks — v3.0
- ✓ Converged CSV/PDF export combining both Ethernet and FC sections — v3.0
- ✓ Rack-level switch positioning (ToR/MoR/BoR) with OOB co-location (ADR-0013/0014) — v3.0

- ✓ Three-Tier (Core/Aggregation/Access) topology as standalone mode + Converged topology selector (GH #9) — v4.0
- ✓ Dell Z-series catalog: Z9264F-ON (64×100G), Z9332F-ON (32×400G), Z9432F-ON (32×400G) with tier field — v4.0
- ✓ Three-tier sizing engine: access (2/rack), aggregation (formula, min 2), core (formula, min 2) — v4.0
- ✓ Dual oversubscription at each tier boundary (access→aggr, aggr→core) — v4.0
- ✓ Hierarchical topology diagram (tree layout: core → aggr → access → racks) — v4.0
- ✓ Three-tier rack elevation: server racks with access switches + aggregation/core network racks — v4.0
- ✓ Three-tier CSV/PDF export (standalone + converged integration) — v4.0
- ✓ Converged mode topology selector: Leaf-Spine (Clos) or Three-Tier for Ethernet portion — v4.0

- ✓ Unified Ethernet mode: Clos + Three-Tier merged; topology selector dropdown; ModeSelector = 3 buttons — v5.0
- ✓ Brownfield toggles: "Spines already deployed" (Clos) + "Core switches already deployed" (Three-Tier); BOM excludes existing, cables preserved — v5.0
- ✓ Named configuration profiles: save/load/delete/list input state to localStorage; ProfileManager slide-down from TopBar — v5.0
- ✓ Dedicated full-page accordion input form at `/#/input` for all 3 modes; shadcn/ui Accordion — v5.0
- ✓ React Router (HashRouter): `/#/`, `/#/input`, `/#/topology`, `/#/rack` — all views deep-linkable — v5.0
- ✓ Nav strip with Configure / Results / Topology / Rack Elevation NavLinks replacing Tabs — v5.0
- ✓ i18n labels for all v5.0 features in EN/FR/DE/IT — v5.0

## Current Milestone: v6.0 Physical Planning

**Goal:** Extend NetStack from "how many boxes" to "how do I physically install them" — cable length estimation based on rack layout, power budget per rack, and upgraded DAC distance advisory with actual computed distances.

**Target features:**
- ✓ Cable length schedule: per-link-type lengths derived from rack pitch, height, switch position — Phase 26 complete
- ✓ Adjacent vs. non-adjacent rack modes (patch panel advisory when non-adjacent) — Phase 26 complete
- ✓ DAC distance advisory upgraded with actual computed length value — Phase 26 complete
- ✓ UI wiring, amber advisory cards, i18n EN/FR/DE/IT — Phase 27 complete
- CSV/PDF cable schedule export — Phase 28 pending

### Future (v7.0+)

- JSON export / import for sharing configurations
- Multi-pod support for large deployments
- Weight/cooling estimates

### Out of Scope

- Multi-site / multi-datacenter — single site focus
- BGP/VLAN configuration — physical sizing only
- Real-time pricing / procurement integration — BOM is quantities only
- Mobile app — web-first (PWA works)
- SONiC configuration generation — separate tool
- Backend / user accounts — pure client-side

## Context

Shipped v5.0 with 552 tests, 4 phases (21–24), accordion input page, React Router, ProfileManager, brownfield toggles, ADR-0018–0022.
Shipped v4.0 with 21,135 LOC TypeScript, 536 tests, 28 commits across 3 phases (18–20).
Shipped v3.0 with 16,248 LOC TypeScript, 416 tests, 30 commits across 3 phases (15–17).
Shipped v2.0 with 13,283 LOC TypeScript, 388 tests, 50 commits across 7 phases (8–14), 169 files changed.
Shipped v1.1 with 223 tests, 34 commits across 3 phases (5–7), 55 files changed.
Shipped v1.0 with 6,990 LOC TypeScript, 144 tests, 50 commits.
Tech stack: React 19, Vite 6, Tailwind v4, shadcn/ui (Accordion), Zustand v5, Zod v4, @xyflow/react, @react-pdf/renderer, React Router v7 (HashRouter).
5 Dell PowerSwitch models (Ethernet): S5248F-ON, S5232F-ON, S5224F-ON, S5212F-ON, S3248T-ON. 3 Dell Z-series (Three-Tier): Z9264F-ON, Z9332F-ON, Z9432F-ON.
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
| Converged engine composes existing engines | Zero logic duplication; FC optional via nullable fcBom | ✓ Good |
| Rack-level positioning (not row-level) | MoR = Middle of Rack, all cable runs < 3m, DAC always compatible | ✓ Good |
| OOB co-located with data switches | Physical cable management; OOB adjacent to leaves in all modes | ✓ Good |
| FC mode as ephemeral component state (not persisted) | Prevents stale mode on page reload | ✓ Good |
| Two independent ReactFlowProvider instances for FC fabric A/B | Prevents cross-fabric edge rendering bugs | ✓ Good |
| TDD (RED→GREEN) for all pure domain functions | Catches formula errors before UI is written | ✓ Good |
| FC ISL formula: fan-in ratio 7:1 (Broadcom threshold) | Matches Broadcom advisory; differs from Ethernet uplink formula | ✓ Good |
| HashRouter (no basename) for React Router | GitHub Pages hash routing; no server config needed | ✓ Good |
| Brownfield post-processing in resultStore (not engine) | Keeps calculateBOM/calculateThreeTierBOM pure; post-processing is a UI concern | ✓ Good |
| ProfileManager in TopBar as React fragment with fixed positioning | Slide-down overlay without layout disruption | ✓ Good |
| NavLink `end` prop on root route (`/`) | Prevents Results nav item staying active on all routes | ✓ Good |
| shadcn/ui Accordion with `defaultValue="rack-config"` | Rack Config open on load; single open section focus | ✓ Good |

---
*Last updated: 2026-03-19 after Phase 27 (UI & i18n) complete*

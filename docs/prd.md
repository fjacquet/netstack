# PRD (Product Requirements Document): NetStack

## 1 Objective

Automate the calculation of a **Leaf-Spine** network infrastructure with **OOB (Out-of-Band) management** for server rack deployments, exclusively on Dell S-series switches running SONiC.

**Core value:** Answer "How many boxes and cables do I need to order?" instantly and accurately for any Dell SONiC Leaf-Spine deployment.

## 2 Hardware Specifications (Reference)

| Model | Typical Role | Data Ports | Uplink Ports | Max Power |
|-------|-------------|------------|--------------|-----------|
| **S5248F-ON** | Leaf (25G) | 48×25G SFP28 | 4×100G QSFP28 | 647W |
| **S5232F-ON** | Spine (100G) | 32×100G QSFP28 | — | 635W |
| **S5224F-ON** | Leaf (25G, half) | 24×25G SFP28 | 4×100G QSFP28 | 455W |
| **S5212F-ON** | Leaf (25G, quarter) | 12×25G SFP28 | 3×100G QSFP28 | 304W |
| **S3248T-ON** | OOB Management | 48×1G RJ45 | 4×10G SFP+ | 550W |

Hardware specs are centralized in `src/domain/catalog/hardware.ts` (single source of truth).

## 3 Sizing Logic

The calculation engine (`src/domain/engine/sizing.ts`) applies the following formulas:

- **Racks**: `ceil(totalServers / serversPerRack)`
- **Leaf switches**: `2 × N_racks` (redundant Top-of-Rack pair)
- **Spine switches**: `max(4, ceil(leafCount / 32))` — scales with leaf count, never fixed
- **OOB (S3248T-ON)**: `N_racks × ceil((serversPerRack + 2) / 48)`
- **OOB port alert**: fires when ports required > 48 per rack
- **Cables**: Computed from link counts (not port sums) to avoid off-by-2 errors
- **VLT cables**: `N_racks × 2` (2 QSFP28 cables per leaf pair for VLT peer-link)
- **Oversubscription ratio**: Required field on every BOM output

## 4 User Stories

1. **As a network engineer**, I want to enter my server count and connectivity type (25G/100G) to instantly get the number of Dell switches I need.
2. **As an architect**, I want to see if my OOB S3248T-ON is saturated based on my rack density.
3. **As a procurement manager**, I want an exportable BOM listing switch quantities per model, cables by type, and power estimates.
4. **As a site planner**, I want a topology diagram showing spine-leaf connections and a rack elevation view showing physical device placement.
5. **As an international team member**, I want to use the tool in my language (EN, FR, DE, IT).

## 5 Constraint Violations

The engine returns typed discriminated-union violations:

| Violation | Trigger |
|-----------|---------|
| `OOB_PORT_SATURATION` | OOB ports needed exceed 48 per rack |
| `SPINE_CAPACITY_EXCEEDED` | More leaf switches than spine port capacity |
| `DAC_DISTANCE_ADVISORY` | Cable distance may exceed DAC limits |

## 6 v1 Requirements

### Sizing Engine

| ID | Requirement | Acceptance Criteria | Phase | Status |
|----|-------------|---------------------|-------|--------|
| SIZE-01 | User can input total server count, servers per rack, and connectivity type (25G/100G) | Form validates input range; results update on change | Phase 2 | Complete |
| SIZE-02 | Engine calculates rack count as `ceil(total_servers / servers_per_rack)` | Rack count matches formula for all valid inputs | Phase 1 | Complete |
| SIZE-03 | Engine calculates leaf switches as `2 × N_racks` (redundant ToR pair per rack) | Leaf count is always even; equals 2× rack count | Phase 1 | Complete |
| SIZE-04 | Engine auto-scales spine switches based on leaf count and S5232F-ON 32-port capacity | `spines = max(4, ceil(leafs/32))`; never < 4 | Phase 1 | Complete |
| SIZE-05 | Engine calculates OOB switches as `N_racks × ceil((servers_per_rack + 2) / 48)` with port saturation alert | Alert fires when ports > 48; boundary at 46 (no alert) vs 47 (alert) | Phase 1 | Complete |
| SIZE-06 | Engine is a pure function: `(SizingInput) => NetworkBOM` with no side effects | Deterministic output; same input always yields same BOM | Phase 1 | Complete |
| SIZE-07 | Engine validates all physical constraints via Zod schemas (port counts, cable compatibility) | Invalid inputs are rejected with typed ConstraintViolation | Phase 1 | Complete |

### BOM Output

| ID | Requirement | Acceptance Criteria | Phase | Status |
|----|-------------|---------------------|-------|--------|
| BOM-01 | BOM displays switch quantities per model (S5248F-ON, S5232F-ON, S5224F-ON, S5212F-ON, S3248T-ON) | All 5 models shown; quantities match engine output | Phase 3 | Complete |
| BOM-02 | BOM displays oversubscription ratio per tier and validates against thresholds | Green badge <= 3:1; amber badge <= 6:1; red badge > 6:1 | Phase 3 | Complete |
| BOM-03 | User can select cable type (DAC/AOC/fiber) and engine calculates cable quantities | Switching cable type updates BOM without page reload | Phase 3 | Complete |
| BOM-04 | BOM displays port utilization (used vs available) per switch model with progress bar | Progress bar shows percentage; tooltip shows used/available counts | Phase 3 | Complete |

### Hardware Catalog

| ID | Requirement | Acceptance Criteria | Phase | Status |
|----|-------------|---------------------|-------|--------|
| CAT-01 | Default hardware catalog includes 5 Dell PowerSwitch models with full specs (ports, speeds, power) | All 5 models present with verified port counts and power specs | Phase 1 | Complete |
| CAT-02 | Hardware specs defined in TypeScript constants as source of truth | No duplicate spec definitions; `SWITCH_CATALOG` is the only source | Phase 1 | Complete |
| CAT-03 | JSON override file allows adding/modifying switch models at runtime without code changes | Custom switch model loadable via `mergeCatalog()`; fails fast on invalid entry | Phase 1 | Complete |

### Visualization

| ID | Requirement | Acceptance Criteria | Phase | Status |
|----|-------------|---------------------|-------|--------|
| VIZ-01 | Auto-generated Leaf-Spine topology diagram using @xyflow/react with deterministic layout | Same BOM produces same diagram; layout is 3-tier (spines top, leafs middle, racks bottom) | Phase 4 | Complete |
| VIZ-02 | Rack elevation view showing physical device placement per rack | U-slot numbering; OOB at U1, Leaf B at U2, Leaf A at U3 per rack | Phase 4 | Complete |
| VIZ-03 | Visual port saturation alerts when OOB or leaf ports approach/exceed capacity | Border glow: green (< 80%), amber (>= 80%), red (>= 100%) | Phase 4 | Complete |

### Export

| ID | Requirement | Acceptance Criteria | Phase | Status |
|----|-------------|---------------------|-------|--------|
| EXP-01 | User can export BOM as CSV file | CSV downloads on click; opens correctly in Excel and Google Sheets with UTF-8 BOM | Phase 4 | Complete |
| EXP-02 | User can export formatted PDF report with BOM summary and diagrams | PDF generates on click via lazy-loaded @react-pdf/renderer; includes BOM table and sizing summary | Phase 4 | Complete |
| EXP-03 | Print-friendly CSS stylesheet for browser printing | Ctrl+P hides navigation controls; shows clean BOM layout | Phase 4 | Complete |

### UX / Theme

| ID | Requirement | Acceptance Criteria | Phase | Status |
|----|-------------|---------------------|-------|--------|
| UX-01 | Light/dark mode toggle with system preference detection | Theme auto-detected on first load; toggle persists to localStorage | Phase 2 | Complete |
| UX-02 | Internationalization support for FR, EN, DE, IT with language switcher | All UI strings translated in all 4 locales; selected language persists | Phase 2 | Complete |
| UX-03 | Responsive layout for tablet and desktop viewports | Side-by-side layout at 1280px+; stacked layout below 1280px | Phase 2 | Complete |
| UX-04 | GitHub Pages deployment with GitHub Actions CI/CD pipeline | Push to main triggers build and deploy; site accessible at GitHub Pages URL | Phase 2 | Complete |

### Documentation

| ID | Requirement | Acceptance Criteria | Phase | Status |
|----|-------------|---------------------|-------|--------|
| DOC-01 | Architecture Reference Document (ARD) — system design for developers | ADRs cover key decisions; architecture layers documented | Phase 4 | Complete |
| DOC-02 | Product Requirements Document (PRD) — formal product specification | This document; all 28 v1 requirements with acceptance criteria | Phase 4 | Complete |
| DOC-03 | User Guide — end-user documentation for using the tool | Covers all 4 tabs; describes all 5 switch models; explains color coding | Phase 4 | Complete |
| DOC-04 | Changelog — version history with notable changes | v1.0.0 entry with complete feature list following keepachangelog.com format | Phase 4 | Complete |

## 7 Out of Scope (v1)

| Feature | Reason |
|---------|--------|
| Multi-site / multi-datacenter | Single site focus — complexity without clear v1 value |
| BGP/VLAN configuration | Physical sizing only, not network config |
| SONiC configuration generation | Separate tool, different domain |
| Real-time pricing / procurement integration | BOM is quantities only; pricing changes too fast |
| Mobile-optimized layout | Engineers use desktop/tablet, not phones for this |
| Backend / server-side | Pure client-side app; no user accounts needed |
| Multi-user collaboration | Single-user tool; share via export |

## 8 v2 Roadmap

| ID | Feature | Category |
|----|---------|----------|
| PERS-01 | Named configuration profiles (save/load via localStorage) | Persistence |
| PERS-02 | JSON file import/export for sharing configurations | Persistence |
| EXP-04 | JSON export for machine-readable BOM (procurement tool integration) | Export |
| ADV-01 | Growth scenario projector (what-if analysis for scaling) | Advanced Sizing |
| ADV-02 | Multi-pod support when spine count exceeds single-pod capacity | Advanced Sizing |
| ADV-03 | Power consumption estimation per rack | Advanced Sizing |
| VIZ-04 | Topology port labels showing connection details | Visualization |
| VIZ-05 | Interactive diagram — click node to see device details inline | Visualization |

## 9 Architecture Overview

```
Domain (pure TS, no React) → Store (Zustand) → Features (React components)
```

- **Domain layer** (`src/domain/`): Pure TypeScript, zero React dependencies. Catalog, schemas, and engine.
- **Store layer** (`src/store/`): Zustand stores. `inputStore` persisted to localStorage; `resultStore` derived via subscription.
- **Features layer** (`src/features/`): React components organized by feature (input-form, bom-panel, topology, rack-elevation, export).

See `docs/adr/` for architecture decision records (ADR-0001 through ADR-0008).

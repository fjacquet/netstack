<p align="center">
  <img src="public/android-chrome-192x192.png" alt="NetStack logo" width="96" height="96">
</p>

<h1 align="center">NetStack</h1>

<p align="center">
  Dell Leaf-Spine network sizing calculator for SONiC deployments
</p>

<p align="center">
  <a href="https://github.com/fjacquet/netstack/actions/workflows/ci.yml">
    <img src="https://github.com/fjacquet/netstack/actions/workflows/ci.yml/badge.svg?branch=maincd" alt="CI">
  </a>
  <a href="https://github.com/fjacquet/netstack/actions/workflows/deploy.yml">
    <img src="https://github.com/fjacquet/netstack/actions/workflows/deploy.yml/badge.svg?branch=maincd" alt="Deploy">
  </a>
  <img src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/Vite-6-646cff?logo=vite" alt="Vite 6">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/github/license/fjacquet/netstack" alt="License">
  <img src="https://img.shields.io/github/v/tag/fjacquet/netstack?label=version" alt="Version">
</p>

<p align="center">
  <a href="https://fjacquet.github.io/netstack/">Live Demo</a> &bull;
  <a href="docs/userguide.md">User Guide</a> &bull;
  <a href="docs/prd.md">PRD</a> &bull;
  <a href="docs/CHANGELOG.md">Changelog</a>
</p>

---

## What is NetStack?

NetStack answers one question: **"How many switches and cables do I need to order?"**

Enter your server count and connectivity requirements, and get an instant Bill of Materials for a Dell Leaf-Spine + OOB infrastructure running SONiC. No backend, no accounts — everything runs in your browser.

### Features

- **Sizing engine** — Pure-function BOM calculator with Dell hardware catalog
- **Selectable models** — Leaf, Spine, Border Leaf, Rack Size (24U/42U/50U)
- **Topology diagram** — Interactive leaf-spine visualization with @xyflow/react
- **Rack elevation** — Server + Network racks with drag-to-reorder
- **PDF & CSV export** — Full report or raw data for procurement
- **Print** — Ctrl+P with clean light-mode layout, auto-fit to page
- **i18n** — English, French, German, Italian
- **Dark mode** — System preference detection + manual toggle

### Supported Hardware

| Model | Role | Ports | Power |
|-------|------|-------|-------|
| S5248F-ON | Leaf | 48×25G SFP28 + 4×100G QSFP28 | 647W |
| S5232F-ON | Spine | 32×100G QSFP28 | 635W |
| S5224F-ON | Leaf | 24×25G SFP28 + 4×100G QSFP28 | 455W |
| S5212F-ON | Leaf | 12×25G SFP28 + 3×100G QSFP28 | 304W |
| S3248T-ON | OOB | 48×1G RJ45 + 4×10G SFP+ | 550W |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Architecture

```
src/
├── domain/           # Pure TypeScript — zero React dependencies
│   ├── catalog/      # Dell hardware specs (SWITCH_CATALOG, CABLE_CATALOG)
│   ├── schemas/      # Zod v4 schemas → z.infer<> for all types
│   └── engine/       # calculateBOM(): (SizingInput) => NetworkBOM
├── store/            # Zustand v5 — inputStore (persisted) + resultStore (derived)
├── features/         # React components by feature (form, BOM, topology, rack, export)
├── components/       # Shared UI components (shadcn/ui)
└── i18n/             # Translations (EN, FR, DE, IT)
```

**Import rule:** `Domain → Store → Features` (one-way, never reversed)

## Sizing Formulas

| Metric | Formula |
|--------|---------|
| Racks | `ceil(totalServers / serversPerRack)` |
| Leaf switches | `2 × racks` (redundant ToR pair) |
| Spine switches | `max(2, ceil(leafSwitches / 32))` |
| OOB switches | `racks × ceil((serversPerRack + 2) / 48)` |
| Leaf-Spine cables | `leafSwitches × min(spineSwitches, uplinkPorts)` |
| VLT cables | `racks × 2` (QSFP28-DD per leaf pair) |
| SFP28 (fiber) | `2 × serverLeafCables` (LC 25G) |
| QSFP28 (fiber) | `2 × leafSpineCables` (MPO 100G) |

## Design Decisions

Key architecture decisions are documented as ADRs:

- [ADR-0001](docs/adr/0001-leaf-spine-architecture.md) — Leaf-Spine topology with Dell SONiC
- [ADR-0002](docs/adr/0002-client-side-only.md) — Client-side only (no backend)
- [ADR-0003](docs/adr/0003-zod-schemas-as-source-of-truth.md) — Zod schemas as single source of truth
- [ADR-0004](docs/adr/0004-zustand-state-management.md) — Zustand for state management
- [ADR-0005](docs/adr/0005-xyflow-topology-diagram.md) — @xyflow/react for topology
- [ADR-0006](docs/adr/0006-react-pdf-lazy-loading.md) — Lazy-loaded PDF generation
- [ADR-0007](docs/adr/0007-vlt-cable-modeling.md) — VLT cable and transceiver modeling
- [ADR-0008](docs/adr/0008-i18n-react-i18next.md) — Synchronous i18n with react-i18next

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite 6 |
| Language | TypeScript (strict, no `any`) |
| Styling | Tailwind CSS v4 |
| State | Zustand v5 with localStorage persistence |
| Validation | Zod v4 |
| Diagrams | @xyflow/react |
| PDF | @react-pdf/renderer |
| Testing | Vitest + Testing Library |
| Deployment | GitHub Pages via GitHub Actions |

## License

[ISC](LICENSE)

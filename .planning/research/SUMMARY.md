# Project Research Summary

**Project:** NetStack — Dell SONiC Leaf-Spine Network Sizing Calculator
**Domain:** Client-side infrastructure BOM calculator / network sizing tool (React SPA, no backend)
**Researched:** 2026-03-16
**Confidence:** HIGH

## Executive Summary

NetStack is a specialized, deterministic, client-only tool for engineers sizing Dell SONiC Leaf-Spine fabrics. The research confirms there is no competing tool in this niche: Cisco Nexus Hyperfabric is the closest functional analog but is Cisco-hardware-locked and cloud-managed, while Dell's own EIPT focuses on power and cooling rather than network topology. NetStack fills an unambiguous gap as a locally-run, export-focused, procurement-oriented sizing tool targeting Dell S-series switches and SONiC-managed fabrics. The recommended build strategy is a pure-function domain engine surrounded by a thin React/Zustand shell — all sizing math in framework-free TypeScript, all UI reading from derived Zustand state. This architecture makes the engine trivially testable and keeps the browser-only constraint clean.

The recommended stack is pre-validated against the project's engineering constitution: React 19 + TypeScript 5 + Vite 8 + Zustand 5 + Zod 4 for the core; @xyflow/react 12 for topology diagrams; custom SVG for rack elevation (no mature React-native library exists); @react-pdf/renderer 4 for PDF generation; Recharts 3 for BOM charts; Tailwind CSS v4 + shadcn/ui for styling. All versions are current as of research date and confirmed compatible with each other. One active compatibility concern exists: `@hookform/resolvers` v5.2.2 has an open GitHub issue (12829) around Zod v4 compatibility that must be verified before the form phase.

The dominant risk category is incorrect sizing math, not frontend complexity. Five engineering-domain pitfalls could silently generate wrong BOMs: spine count hardcoded to 2 instead of scaling with leaf count; oversubscription ratio not surfaced; cable count computed from port sums rather than link counts (off-by-2); OOB port saturation not validated; and DAC cable distance constraints ignored. All five must be addressed in Phase 1 — the domain engine — before any UI is built on top. A wrong engine locked behind a polished UI is the worst possible outcome for a tool engineers will use to purchase hardware.

## Key Findings

### Recommended Stack

The stack is fully specified by the engineering constitution and confirmed by research. The project is a pure client-side SPA with no backend, no auth, and no server dependencies. All state persists to localStorage via Zustand's `persist` middleware. PDF and CSV generation happen entirely in-browser.

**Core technologies:**
- React 19 + Vite 8: UI framework + build tool — concurrent rendering, fastest cold start, native ESM
- TypeScript 5 (strict): Type safety — strict mode required; types inferred from Zod schemas, not defined separately
- Zustand 5: Global state — minimal boilerplate, concurrent-rendering safe, persist middleware for localStorage
- Zod 4: Runtime validation — 14x faster than v3, 57% smaller bundle; validates all data entering from outside TypeScript's control
- @xyflow/react 12: Topology diagram — standard for node-based React UIs, confirmed React 19 + Tailwind v4 compatible
- @react-pdf/renderer 4: PDF export — declarative JSX-to-PDF, client-only, 860K weekly downloads
- Recharts 3: BOM charts — pure React/D3, fully declarative, typed `dataKey` generics
- react-hook-form 7 + @hookform/resolvers 5: Form management — minimal re-renders, Zod integration (verify Zod v4 compat before use)
- Tailwind CSS v4 + @tailwindcss/vite: Styling — no PostCSS config needed; `@import "tailwindcss"` in one CSS file
- shadcn/ui (CLI): Component primitives — copy-owned, tree-shakable, updated for React 19 + Tailwind v4
- Vitest 4 + @testing-library/react 16: Testing — Vite-native, Jest-compatible API, no separate config

**Do not use:** `reactflow` (old package name, v11 only), Zod v3, `react-pdf` (vojtekmaj, it is a viewer not a generator), Redux Toolkit, PostCSS for Tailwind, `any` TypeScript type.

See: `.planning/research/STACK.md` for full version table and alternatives rationale.

### Expected Features

The competitor analysis (Cisco Nexus Hyperfabric, Nutanix Sizer, Dell EIPT, Juniper Apstra) confirms a clear feature hierarchy. NetStack's differentiating position is Dell SONiC specificity combined with local execution, deterministic math, and procurement-grade export.

**Must have — v1 table stakes:**
- Parameterized input form (server count, servers/rack, link speed, cable type) — entry point for all calculations
- Hardware catalog as typed constants (S5248F-ON, S5232F-ON, S3248T-ON) — sizing foundation; must exist before engine
- Pure sizing engine: rack, leaf, spine, OOB counts + cable quantities — core value; all competing tools have this
- Oversubscription ratio + port utilization display — engineers validate before sign-off; not displaying this is a critical omission
- Port saturation alerts (OOB >48 ports, spine capacity limits) — prevents hardware over/under orders
- BOM summary table (switch model, quantity, cable type, quantity by category) — primary procurement artifact
- CSV export — universally expected in procurement workflows
- Topology diagram (logical Leaf-Spine view, React Flow) — visual design validation
- Rack elevation view (physical per-rack device placement, custom SVG) — physical build documentation
- Save/load via localStorage — engineers iterate on designs; losing work destroys trust
- PDF/print report — stakeholder and procurement handoff
- Zod-based input validation with inline error messages — tool must not silently accept bad input

**Should have — v1.x differentiators:**
- Cable type selector (DAC/AOC/fiber) — different environments require different cabling; affects cable SKUs
- JSON export — enables automation pipeline and IaC consumption
- Multiple named configurations — compare design A vs. design B
- Topology port labels — wiring documentation for rack build teams

**Defer to v2+:**
- Growth scenario projector (what-if: add 20 more servers) — requires save/load foundation; complex UX
- Oversubscription ratio target input (reverse solver) — power-user feature; validate core first
- Spine scaling visualization (graph of spine count vs. leaf count growth)
- Real-time pricing / procurement integration — prices change daily; explicitly an anti-feature
- BGP/VLAN config generation — separate tool domain; out of scope
- Mobile-optimized UI — desktop-first is correct; network engineers size at a desk

See: `.planning/research/FEATURES.md` for full competitor feature matrix and dependency graph.

### Architecture Approach

The architecture follows a strict four-layer separation: Domain (pure TypeScript, no React), Store (Zustand, depends only on Domain), Features (React components, depend on Store and Domain), Shared Components (stateless primitives). The critical architectural invariant is that the domain engine (`domain/engine/sizing.ts`) never imports from React, Zustand, or any UI concern — it is a pure function `(SizingInput) => NetworkBOM` that can be tested with plain Node.js. Only `inputStore` is persisted to localStorage; `resultStore` is always derived from inputs on hydration. `uiStore` (active tab, modal state) is never persisted.

**Major components:**
1. `domain/` — Hardware catalog constants, Zod schemas, pure sizing engine functions; no framework dependencies; first thing built, last thing touched
2. `store/` — Three Zustand slices: `inputStore` (persisted), `resultStore` (derived from engine), `uiStore` (ephemeral); wire subscription from inputStore to resultStore in App.tsx
3. `features/input/` — React Hook Form + Zod resolver; writes validated input to `inputStore`
4. `features/bom/` — BOM table + port saturation alerts + export buttons; reads from `resultStore`
5. `features/topology/` — React Flow canvas with custom LeafNode, SpineNode, OobNode; reads topology graph from `resultStore`; layout computed deterministically (spines top, leafs middle, racks bottom)
6. `features/rack/` — Custom SVG rack elevation; reads rack layout array from `resultStore`; no external library needed
7. `features/export/` — Pure functions for CSV, PDF (@react-pdf/renderer), JSON; lazy-loaded to avoid bundle weight on initial render

**Build order dictated by dependencies:** Domain layer → Store layer → Input feature → BOM feature → Topology feature → Rack elevation → Export → Persistence schema versioning.

See: `.planning/research/ARCHITECTURE.md` for full data-flow diagrams, anti-patterns, and integration boundaries.

### Critical Pitfalls

All five critical pitfalls originate in the domain engine and must be prevented in Phase 1. A wrong engine cannot be fixed by adding better UI later.

1. **Spine count hardcoded to 2** — Compute from formula: max leafs per pod = spine_port_count (32 for S5232F-ON); alert user when rack count exceeds this limit. Never use `const SPINE_COUNT = 2`.

2. **Oversubscription ratio not surfaced** — Add `oversubscriptionRatio: number` as a required field on `NetworkBOM` from day one. Format output as "3:1" not "0.333". Apply tiered color warnings: green ≤3:1, amber 3:1–6:1, red >6:1.

3. **Cable count from port sums (off-by-2)** — Model cables as links, not as endpoint port counts. Leaf-spine cables = `N_leafs × uplinks_per_leaf`. Write the unit test before writing the formula.

4. **OOB port saturation not validated at engine level** — Implement as a typed `ConstraintViolation` from the engine, not a UI string check. `oobPortsRequired = servers_per_rack + 2` (ToR pair); must not exceed S3248T's 48-port limit.

5. **DAC cable distance constraints ignored** — Store `max_distance_m` on each cable type in the hardware catalog. Flag DAC as likely infeasible for spine connections in pods larger than adjacent-rack topology.

**Top integration gotchas:**
- Zustand v5 selectors that return new object/array references cause infinite render loops — use `useShallow`
- @react-pdf/renderer must be lazy-loaded; importing in main bundle blocks initial render by 1–3 seconds
- React Flow auto-layout produces random positions; compute deterministic positions from topology math
- Zod `.parse()` on every keypress is wasteful; use `.safeParse()` with 150ms debounce on `onChange`
- localStorage JSON must be wrapped in try-catch; corrupt entries throw synchronously and crash the app
- Persisted Zustand state must include a `version` field with a `migrate` callback; schema changes without migration corrupt stored configs silently

See: `.planning/research/PITFALLS.md` for the full checklist, recovery costs, and phase-to-pitfall mapping.

## Implications for Roadmap

The dependency graph in ARCHITECTURE.md and the pitfall-to-phase mapping in PITFALLS.md together dictate a clear build sequence. The sizing engine must be correct before any UI is built on it. Visualizations are independent of each other and can be parallelized after the BOM pipeline is verified.

### Phase 1: Domain Foundation
**Rationale:** Every subsequent phase depends on correct sizing math. Building UI before the engine is verified invites silent errors that are expensive to detect and fix. This phase has no React dependency, making it the fastest to test and the safest to build first.
**Delivers:** Typed hardware catalog, Zod schemas with inferred TypeScript types, pure sizing engine (`calculateBOM`, `buildTopologyGraph`, `buildRackLayouts`), unit test suite covering spine scaling, cable link counts, OOB saturation, oversubscription ratio.
**Addresses:** Input form foundation, hardware catalog (P1 features from FEATURES.md)
**Avoids:** All 5 critical domain pitfalls — spine scaling, cable off-by-2, OOB saturation, oversubscription omission, DAC distance constraints

### Phase 2: State Layer and Input Form
**Rationale:** Store layer is the bridge between domain engine and UI. Input form is the only way to exercise the engine in the browser. This phase validates the full input→engine→store pipeline with minimal UI surface area before adding complex visualizations.
**Delivers:** Three Zustand stores (inputStore persisted, resultStore derived, uiStore ephemeral), React Hook Form + Zod resolver, inline validation error messages, server count/rack density/connectivity type inputs, App shell with tab layout.
**Uses:** Zustand 5, Zod 4, react-hook-form 7, @hookform/resolvers 5 (verify Zod v4 compat), Tailwind v4, shadcn/ui
**Avoids:** Zustand persist-all antipattern, Zod .parse() on keypress, localStorage without try-catch

### Phase 3: BOM Output and Metrics Display
**Rationale:** The BOM table + oversubscription display validates the engine output before adding complex visualization layers. A working BOM panel confirms the full data pipeline. Port saturation alerts are low-complexity but high-value; add them here.
**Delivers:** BOM summary table (grouped by Switches / Cables category), oversubscription ratio display with tiered color coding (green/amber/red), port utilization per switch, port saturation alerts as typed violations, save/load via localStorage persistence.
**Addresses:** BOM table, oversubscription display, port utilization, port saturation alerts, save/load (all P1 from FEATURES.md)
**Avoids:** "0 results vs invalid configuration" ambiguity UX pitfall; oversubscription as decimal format

### Phase 4: Topology Diagram
**Rationale:** React Flow setup is self-contained and independent of rack elevation. Topology is high-user-value (visual design validation) and well-documented. Builds on confirmed BOM data from Phase 3.
**Delivers:** @xyflow/react canvas with custom LeafNode, SpineNode, OobNode components; deterministic layout (spine top row, leaf middle row, rack bottom row); dagre/elk auto-layout for position computation; SVG snapshot for PDF embedding.
**Uses:** @xyflow/react 12.10.1, custom node types with hardware metadata in `data` prop
**Avoids:** React Flow auto-layout producing random positions; React Flow nodes subscribing to full Zustand state; @xyflow/react v11 old package name

### Phase 5: Rack Elevation View
**Rationale:** Pure SVG rendering from `resultStore.racks[]` — no library dependency. Independent of topology view. Completes the physical documentation capability needed for data center planning and procurement handoff.
**Delivers:** Per-rack SVG elevation components (RackView, RackElevation, DeviceSlot); U-slot grid with device placement; renders N racks from the resultStore rack layout array.
**Uses:** Custom SVG in JSX — no external library; SVG `<rect>` elements per device, per U-slot position
**Avoids:** Importing heavyweight DCIM or netbox dependencies; mixing domain state with SVG presentation positions

### Phase 6: Export Suite
**Rationale:** Export is a transformation of stable BOM data. Building it last ensures the data model is fully validated before committing to an export schema. CSV and JSON are low-effort; PDF is medium-effort but required for stakeholder handoff.
**Delivers:** CSV export (procurement-ready with category grouping); PDF report via @react-pdf/renderer (BOM table + inputs summary + topology SVG); JSON export (schema-stable for automation pipelines); browser download utility (Blob + URL.createObjectURL).
**Uses:** react-papaparse 4 (useCSVDownloader), @react-pdf/renderer 4 (lazy-loaded), JSON.stringify for JSON export
**Avoids:** PDF generation blocking main thread (lazy-load required); screenshotting React DOM via html2canvas; Excel xlsx bundle for CSV-only use case

### Phase 7: v1.x Differentiators
**Rationale:** After v1 is validated with real users, add features that differentiate NetStack from comparable tools. These are independent of the core pipeline and can be added without architecture changes.
**Delivers:** Cable type selector (DAC/AOC/fiber) with distance advisory in BOM; JSON import (round-trip from Phase 6 export); multiple named configurations in localStorage; topology port labels (interface ID overlay).
**Addresses:** P2 features from FEATURES.md (cable selector, JSON export, named configs, port labels)

### Phase Ordering Rationale

- Domain first because engine correctness cannot be validated incrementally — all five critical pitfalls are domain-layer bugs, not UI bugs. Testing engine in isolation (plain TypeScript, no render setup) is the cheapest verification path.
- Store before UI because the store subscription wiring (`inputStore → resultStore`) must be correct for any component to show accurate data; building UI before wiring the store produces misleading results.
- BOM before visualizations because topology and rack views are renderings of BOM data; a working BOM panel confirms the full data pipeline cheaply before investing in complex rendering.
- Topology before rack elevation because React Flow setup is more complex and better to isolate; rack elevation is pure SVG and can be done quickly once topology confirms BOM data is correct.
- Export last because it depends on a stable BOM data model schema; adding export earlier risks locking in a schema that changes as features are added.

### Research Flags

Phases that need no additional research (standard, well-documented patterns):
- **Phase 2 (State + Input Form):** Zustand 5 persist + react-hook-form + Zod is a thoroughly documented combination
- **Phase 4 (Topology Diagram):** React Flow is extensively documented; official guides cover custom nodes and performance
- **Phase 6 (Export Suite):** @react-pdf/renderer and papaparse are mature libraries with clear API docs

Phases that warrant targeted validation before or during implementation:
- **Phase 1 (Domain Engine):** Leaf-Spine Clos fabric math must be verified against Dell S5248F-ON and S5232F-ON spec sheets before coding — wrong port counts silently corrupt all downstream calculations. Verify: S5248F-ON uplink port count (4 × 100GbE QSFP28 confirmed), S5232F-ON total port count (32 × 100GbE confirmed), S3248T-ON management port count (48 × 1GbE confirmed).
- **Phase 2 (State + Input Form):** Verify `@hookform/resolvers` v5.2.2 resolves Zod v4 compatibility (GitHub issue 12829 open at research date). If unresolved, use the standard schema adapter pattern instead of zodResolver directly.
- **Phase 3 (BOM + Metrics):** Oversubscription ratio thresholds (green ≤3:1, amber ≤6:1, red >6:1) should be confirmed against Dell EMC L3 Leaf-Spine Design Guide before implementation — these are published industry standards but worth citing explicitly in code comments.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry; official changelogs confirm cross-compatibility; one open compatibility issue flagged (hookform/resolvers + Zod v4) |
| Features | MEDIUM | Competitor analysis is thorough (Cisco, Nutanix, Dell, Juniper); feature expectations are well-grounded; some differentiator value assumptions require real user validation |
| Architecture | HIGH | Pattern is standard for React SPA with pure domain logic; Zustand persist and Feature-Sliced Design are production-proven; data-flow diagrams align with official library docs |
| Pitfalls | HIGH | Networking pitfalls sourced from official Dell and Juniper design guides; frontend pitfalls from official library docs and community post-mortems; all five critical pitfalls have verified reproduction paths |

**Overall confidence:** HIGH

### Gaps to Address

- **@hookform/resolvers Zod v4 compatibility (GitHub issue 12829):** Check issue status at the start of Phase 2. If unresolved, use `z.toJSONSchema()` or the standard schema adapter. This is a known gap, not a blocker.
- **Exact port counts from Dell spec sheets:** S5248F-ON uplink count (4 × QSFP28) and S5232F-ON total port count (32 × QSFP28) drive the spine scaling formula. Confirm against the current Dell PowerSwitch S5200-ON spec sheet before coding the engine, not after. A one-port discrepancy in the catalog produces systematically wrong BOMs.
- **DAC distance rules for specific Dell cable SKUs:** Research identified the 3m/5m distance limits as general industry standards. Verify the exact Dell-recommended DAC cable SKUs and their rated distances in the Dell networking catalog before populating the hardware catalog constants.
- **OOB switch second-unit threshold:** The S3248T-ON 48-port limit is confirmed. Verify whether the standard deployment adds a second OOB switch per rack or one OOB switch per pod when saturation is reached — this affects the `ceil(N_racks / threshold)` formula.
- **Zustand selector infinite loop prevention:** Using `useShallow` is the documented fix, but the exact import path changed between Zustand v4 and v5. Confirm import as `import { useShallow } from 'zustand/shallow'` before Phase 2.

## Sources

### Primary (HIGH confidence)
- Dell EMC Networking L3 Leaf-Spine Design Guide (OS10) — spine scaling, oversubscription thresholds, port counts
- Dell PowerSwitch S5200-ON Series Spec Sheet — S5248F-ON and S5232F-ON hardware specifications
- Dell PowerSwitch S3248T-ON spec — OOB switch port count
- Juniper Design Considerations for Spine-and-Leaf IP Fabrics (white paper) — Clos fabric capacity math
- ipSpace.net — spine count scaling methodology
- https://reactflow.dev — @xyflow/react official docs (v12, React 19 + Tailwind v4 confirmed)
- https://zod.dev/v4 — Zod v4 release notes, 14x perf improvement, mini subpackage
- https://tailwindcss.com/docs — Tailwind v4 + Vite plugin installation
- https://ui.shadcn.com/docs/tailwind-v4 — shadcn/ui Tailwind v4 update
- https://zustand.docs.pmnd.rs/reference/middlewares/persist — Zustand persist middleware
- npm registry — all package versions verified directly via `npm view`

### Secondary (MEDIUM confidence)
- Cisco Nexus Hyperfabric Getting Started Guide + Data Sheet — competitor feature benchmarking
- Nutanix Sizer product page and overview — competitor feature benchmarking
- Dell EIPT user guide — competitor feature benchmarking
- Juniper Apstra rack types (v5.0) — competitor feature benchmarking
- https://github.com/recharts/recharts/releases — Recharts 3.8.0 release confirmation
- https://www.npmjs.com/package/@react-pdf/renderer — v4.3.2 download stats
- https://reactflow.dev/whats-new/2025-10-28 — React Flow v12 React 19 + Tailwind v4 changelog
- React Flow performance guide — custom node memoization patterns
- @react-pdf/renderer vs jsPDF comparison — npm download counts for library selection
- Zustand architecture patterns at scale — derived state patterns
- Zod best practices — safeParse vs parse usage patterns
- DAC vs AOC cable distance limits — Cables and Kits learning center
- localStorage pitfalls comprehensive guide — crash recovery patterns

### Tertiary (LOW confidence / inference)
- Graphical networks rack diagram guide — rack elevation UX patterns (corroborated by multiple DCIM tools)
- FS.com oversubscription guide — oversubscription threshold conventions (corroborated by Dell EMC guide)

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*

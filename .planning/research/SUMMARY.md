# Project Research Summary

**Project:** NetStack v2.0 — FC SAN Sizing + Switch Positioning
**Domain:** Browser-native network sizing calculator / BOM generator (Dell SONiC Ethernet + Brocade FC SAN)
**Researched:** 2026-03-18
**Confidence:** HIGH

## Executive Summary

NetStack v2.0 extends a validated, production-ready Ethernet leaf-spine sizing tool with two orthogonal capabilities: Fibre Channel SAN sizing (Brocade Gen7/Gen8 switches, dual-fabric topology, ISL calculations) and switch positioning awareness (ToR/MoR/BoR selector, cable length impact, rack elevation placement). The foundational architecture — Domain → Store → Features one-way layering, Zod schemas as the single source of truth, pure sizing engine functions — is proven and must not be compromised. No new npm runtime dependencies are required; all new functionality is implemented as parallel TypeScript modules following established patterns.

The recommended approach is strict domain isolation between the Ethernet and FC modes. The FC sizing engine, schemas, hardware catalog, and stores are entirely parallel to their Ethernet counterparts — they never share mutable state, import each other's internals, or merge their BOM schemas. The mode selector is a UI-layer concern only. Switch positioning is an additive modifier to the Ethernet engine, not a separate mode. This separation keeps each domain independently testable and prevents a class of integration bugs that have historically been high-cost to recover from.

The key risk is premature coupling: specifically, merging FC fields into the existing `SizingInputSchema` or extending `calculateBOM()` with mode-branch logic. Both feel like the path of least resistance but create cascading problems across the store, export, and test layers. A second equally critical risk is the Brocade POD (Ports on Demand) licensing model — FC switches ship with a base port count well below the catalog maximum, and the BOM must surface POD license quantities as a first-class line item from day one. Getting either of these wrong produces a BOM that fails procurement validation.

## Key Findings

### Recommended Stack

NetStack v2.0 requires zero new npm dependencies. The existing stack — Vite 8, React 19, TypeScript 5.9, Zustand 5, Zod 4, @xyflow/react, react-hook-form, shadcn/ui, Tailwind v4, @react-pdf/renderer, react-papaparse — covers all v2.0 requirements. FC SAN catalog data, ISL formulas, and dual-fabric topology are implemented as pure TypeScript additions following patterns already established in the Ethernet domain.

See `.planning/research/STACK.md` for full technology details.

**Core technologies:**
- TypeScript 5.9 (strict): type-safe domain models for both Ethernet and FC — critical because FC port/speed/fabric semantics are meaningfully different from Ethernet
- Zod 4.3.6: separate `FCSizingInputSchema` and `FCNetworkBOMSchema` following exact same `z.infer<>` pattern as existing Ethernet schemas
- Zustand 5.0.12: separate `fcInputStore` (persisted, key `netstack-fc-input`) and `fcResultStore` (derived) — no cross-mode state contamination
- @xyflow/react 12.10.1: two independent `<ReactFlow>` instances for FC dual-fabric topology; each needs its own `ReactFlowProvider`
- @react-pdf/renderer 4.3.2: FC BOM added as a new `<Page>` section in existing PDF; separate `FCNetStackDocument` component

### Expected Features

See `.planning/research/FEATURES.md` for full feature prioritization matrix and competitor analysis.

**Must have for v2.0 launch (P1):**
- Mode selector (Ethernet / FC) — root of the FC feature tree; renders either subtree, never both simultaneously
- Brocade FC switch catalog (9 models: G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8) — sizing foundation
- FC input form: HBA ports per server, storage target ports, FC switch model, ISL trunk count
- Dual-fabric sizing engine: per-fabric switch count, ISL count, POD license requirement, port utilization
- FC BOM panel: switches per fabric (A+B), ISL cables, SFP optics, fan-in oversubscription ratio, POD license count as a top-level line item
- FC dual-fabric topology diagram: two independent fabric views (Fabric A blue, Fabric B orange)
- FC constraint violations: `FC_PORT_SATURATION`, `FC_OVERSUBSCRIPTION_EXCEEDED` (>7:1 fan-in), `FC_ISL_UNDERPROVISIONED`
- FC export: additional rows/sections in CSV and PDF, with Fabric A / Fabric B as separate BOM sections
- Switch positioning selector (ToR / MoR / BoR) — modifies Ethernet mode only
- Rack elevation switch U-position based on positioning
- Cable length advisory and DAC incompatibility violation for MoR/BoR

**Should have, add in v2.x (P2):**
- 7850 extension switch sizing (niche, validate demand first)
- Gen8 vs Gen7 recommendation engine
- Director vs fixed switch cost breakeven hint

**Defer to v3.0+ (P3):**
- Combined Ethernet + FC unified session (requires data model redesign)
- NPIV virtualization sizing guidance
- FC zone count estimation

NetStack v2.0 becomes the only sizing tool covering both Dell SONiC Ethernet leaf-spine and Brocade FC SAN from a single browser-native, offline-capable interface — a strong differentiator against Cisco Hyperfabric, Nutanix Sizer, and Dell EIPT, none of which cover this combination.

### Architecture Approach

The v2.0 architecture extends the baseline Domain → Store → Features one-way layered pattern with a strict parallel-module approach: FC and Ethernet domains are entirely separate at every layer. Neither domain imports from the other. The mode selector is ephemeral UI state (not persisted) that controls which parallel subtree is rendered. Switch positioning is an additive Ethernet-only engine input that flows through to the BOM and drives new violation types.

See `.planning/research/ARCHITECTURE.md` for the full file inventory (14 new files, 13 modified files) and data flow diagrams.

**Major components:**
1. `src/domain/catalog/brocade.ts` — FC switch hardware catalog (parallel to `hardware.ts`); typed with `FCSwitchSpec` including `basePorts`, `podLicenseUnit`, `maxIslPorts`
2. `src/domain/engine/fc-sizing.ts` — `calculateFCBOM(input: FCSizingInput): FCNetworkBOM` pure function; zero imports from Ethernet engine
3. `src/store/fcInputStore.ts` + `fcResultStore.ts` — parallel stores with independent localStorage keys; subscription pattern mirrors existing Ethernet store
4. `src/features/sizing/ModeSelector.tsx` — UI toggle only; mode is ephemeral component state, not persisted to localStorage
5. `src/features/topology/TopologyFCTab.tsx` — two independent `<ReactFlow>` instances for Fabric A and Fabric B
6. `src/domain/schemas/input.ts` (modified) — adds `switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR')` to existing Ethernet schema
7. `src/features/rack-elevation/RackElevationTab.tsx` (modified) — renders dedicated network rack when MoR/BoR selected; replaces hardcoded `SWITCH_U_PER_SERVER_RACK` constant with `switchOverheadU(positioning)` function

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 8 pitfalls with recovery cost estimates and phase-to-pitfall mapping.

1. **FC domain logic leaking into Ethernet engine** — never add FC fields to `SizingInputSchema` or branch `calculateBOM()` on a `mode` flag. Separate schema, separate engine, separate store. Recovery cost is HIGH if mixed early.

2. **Dynamic POD licensing absent from BOM** — `FC_SWITCH_CATALOG` must model both `basePorts` and `totalPorts` with `podLicenseUnit` increments. BOM must output `podLicensesRequired` as a first-class line item, not a footnote. Missing this on launch damages customer trust.

3. **ISL formula copied from Ethernet uplink formula** — FC ISL sizing derives from host-to-storage fan-in ratio and bandwidth budget, not a per-switch uplink multiplier. Implement `calculateIslCount()` as a separate function with `targetFanIn` input (Broadcom 7:1 default). `FCNetworkBOM` requires `islOversubscriptionRatio` as a non-optional field.

4. **Dual-fabric FC topology rendered as a single interconnected graph** — FC redundancy depends on fabrics being independent. `buildFCTopologyGraph()` must return `{ fabricA, fabricB }` — two structurally isolated subgraphs. Cross-fabric edges must be architecturally impossible in the data model.

5. **Mode switch corrupting persisted Ethernet state** — Ethernet store (`netstack-input`, v5) and FC store (`netstack-fc-input`, v1) use separate localStorage keys with independent schemas and migrations. No FC field ever appears in an Ethernet schema migration branch.

6. **Hardcoded `SWITCH_U_PER_SERVER_RACK = 3` constant breaking MoR/BoR rack elevation** — replace with `switchOverheadU(positioning): number` function before any positioning UI is written. MoR/BoR returns 1 (OOB only in server rack); ToR returns 3 (OOB + leaf pair).

## Implications for Roadmap

Based on combined research, seven phases are recommended for v2.0. The build order is driven by domain-layer dependencies: catalog and schemas must precede engine, store layer must precede UI, and mode isolation must be established before either FC engine or positioning engine to prevent cross-contamination.

### Phase 1: FC Catalog and Schema Foundation
**Rationale:** All FC computation depends on correct hardware specs and input/output types. This phase has zero React dependency — pure TypeScript that can be verified with unit tests before any UI exists. POD licensing must be modelled here before the engine is written; it cannot be retrofitted without a BOM schema change.
**Delivers:** `brocade.ts` (FC_SWITCH_CATALOG with `basePorts`/`podLicenseUnit`), `fc-types.ts` (FCSwitchSpec), `fc-input.ts` (FCSizingInputSchema), `fc-bom.ts` (FCNetworkBOMSchema with FCConstraintViolation), `fc-optics.ts` (FC_OPTICS_CATALOG with `protocol` discriminant)
**Addresses:** FC switch catalog (9 models), FC input schema, POD licensing model
**Avoids:** Pitfall 2 (POD licensing absent), Pitfall 6 (FC optics confused with Ethernet optics)

### Phase 2: Mode Store Isolation
**Rationale:** Must precede both FC engine and positioning engine. Establishes separate localStorage keys for Ethernet and FC stores. Validates that switching modes never corrupts the other mode's persisted state. Cheap to build in isolation; expensive to retrofit after cross-mode coupling is established.
**Delivers:** `fcInputStore.ts` (persisted, key `netstack-fc-input`, v1), `fcResultStore.ts` (derived), mode selector state strategy (ephemeral, key `netstack-mode`), Vitest test: mode switch leaves Ethernet inputStore unchanged
**Addresses:** Store architecture for dual-mode operation
**Avoids:** Pitfall 5 (mode switch corrupting Ethernet state), Pitfall 1 (FC/Ethernet domain mixing in store layer)

### Phase 3: FC Sizing Engine
**Rationale:** Pure function with no React/UI dependency. Can be fully unit-tested before any UI exists. ISL formula must be implemented correctly here — cannot be patched after UI is built around incorrect numbers. This phase gates all FC UI phases.
**Delivers:** `fc-sizing.ts` (`calculateFCBOM()` pure function, dual-fabric calculation, ISL bandwidth formula with fan-in ratio, POD license requirement calculation), `fc-sizing.test.ts` (40-60 unit tests covering all FC formulas and violations)
**Addresses:** Dual-fabric sizing engine, ISL calculation, fan-in oversubscription, FC constraint violations
**Avoids:** Pitfall 3 (ISL formula copied from Ethernet), Pitfall 1 (FC logic leaking into Ethernet engine)

### Phase 4: Switch Positioning (Ethernet Domain)
**Rationale:** Self-contained Ethernet-only change, smaller scope than FC. Complete it before FC UI is added so that rack elevation changes are isolated and don't conflict with FC UI work. `SWITCH_U_PER_SERVER_RACK` must be refactored here before rack elevation touches positioning.
**Delivers:** `switchPositioning` field in `SizingInputSchema`, `recommendedCableLengthM` and `DAC_POSITIONING_INCOMPATIBLE` violation in `NetworkBOMSchema`, cable advisory logic in `sizing.ts`, inputStore version bump (v5 to v6), new positioning violation test cases
**Addresses:** Switch positioning selector, DAC distance advisory update, cable length advisory
**Avoids:** Pitfall 7 (U-slot math breaking rack elevation), Pitfall 8 (cable length formula ignoring row geometry)

### Phase 5: FC Input and BOM UI
**Rationale:** Domain layer is now stable (Phases 1-3). FC UI components can be built against verified engine output. Mode selector renders here for the first time.
**Delivers:** `ModeSelector.tsx` (ethernet/fc toggle), `FCInputForm.tsx` (HBA ports, storage ports, switch model, ISL trunk count), `FCBOMPanel.tsx` (per-fabric counts, ISL cables, SFP optics, fan-in ratio, POD license count as top-level line item), `SizingPage.tsx` modified to conditionally render Ethernet vs FC subtree
**Addresses:** FC input form, FC BOM panel, POD license display, FC constraint violation banners
**Avoids:** UX pitfalls — POD license hidden in tooltip, wrong oversubscription formula label for FC context

### Phase 6: FC Topology Diagram + Positioning Rack Elevation
**Rationale:** Visualization depends on stable BOM output from Phases 3 and 5. FC topology requires two independent ReactFlow instances. Positioning rack elevation requires the `switchOverheadU()` function from Phase 4. Both are grouped here because they share the visual output layer.
**Delivers:** `buildFCTopologyGraph.ts` (returns `{ fabricA, fabricB }` — isolated subgraphs), `TopologyFCTab.tsx` (dual ReactFlow with fabric color coding — blue for A, orange for B), `buildPositioningRackDevices.ts` (MoR/BoR network rack), `RackElevationTab.tsx` modified (positioning-aware switch placement, separate network rack column for MoR/BoR)
**Addresses:** FC dual-fabric topology diagram, rack elevation switch U-position, MoR/BoR network rack view
**Avoids:** Pitfall 4 (dual-fabric rendered as single graph), Pitfall 7 (U-slot math breaking rack elevation)

### Phase 7: Export Extension
**Rationale:** Last because it depends on all FC domain and UI being stable. Export format is the final artifact that reaches procurement — errors here directly cause wrong orders. Deferring reduces iteration cost during domain development.
**Delivers:** `exportCsv.ts` extended (FC BOM rows with Protocol column, Fabric A / Fabric B sections, POD license row), `exportPdf.ts` extended (FC BOM as separate page/section, dual-fabric totals row), i18n keys for all FC labels in FR/EN/DE/IT
**Addresses:** FC CSV/PDF export, BOM disambiguation (Ethernet vs FC transceivers), i18n completeness
**Avoids:** UX pitfall (dual fabric shown as single fabric in exported PDF), Pitfall 6 (optics ambiguity in BOM output)

### Phase Ordering Rationale

- **Catalog before engine:** FC hardware specs drive formula constants. Wrong specs produce wrong BOM quantities that are hard to catch without reference data in place.
- **Store isolation before UI:** If FC and Ethernet stores are not isolated first, any UI work risks embedding coupling assumptions that are expensive to unwind.
- **Positioning before FC UI:** Switch positioning is a smaller, self-contained Ethernet change. Completing it cleanly before adding the FC UI layer reduces the regression surface area.
- **Engine before topology:** The FC topology builder consumes `FCNetworkBOM` — it cannot be implemented or meaningfully tested until the engine produces correct output.
- **Export last:** CSV/PDF format is a stabilization artifact. Changing it forces regeneration of test fixtures. Deferring it reduces iteration cost during domain development.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (FC Catalog):** G820 Gen8 switch specs were announced November 2025. Power figures for X7-4, X7-8, X8-4, X8-8 chassis directors are estimated in the research — verify against final Broadcom datasheets before encoding in catalog constants.
- **Phase 3 (FC Engine):** ISL formula uses Broadcom's 7:1 fan-in guideline. For NVMe-oF workloads the recommendation is 3:1. Decide before implementation: expose workload type as an input parameter in v2.0 or hard-code 7:1 with a documentation note? Research recommends hard-code 7:1 for v2.0, expose in v2.x.
- **Phase 6 (FC Topology):** Multiple `<ReactFlow>` instances in the same React tree are confirmed to work with independent `ReactFlowProvider` wrappers, but performance at >20 racks with dual-fabric has not been benchmarked. If node count is large, investigate virtualization.

Phases with well-documented standard patterns (skip research-phase):

- **Phase 2 (Store Isolation):** Zustand `persist` with separate `name` keys is a standard pattern. Existing inputStore at v5 provides a migration template.
- **Phase 4 (Switch Positioning):** Positioning is an additive field on an existing schema. The violation pattern (`DAC_DISTANCE_ADVISORY`) and store version bump pattern are both established in the codebase.
- **Phase 7 (Export):** CSV/PDF extension follows existing `exportCsv.ts` and `exportPdf.ts` patterns. No new library research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new dependencies required; all existing library versions confirmed compatible with v2.0 requirements; verified against official package docs |
| Features | MEDIUM-HIGH | Brocade switch specs from Broadcom official techdocs (HIGH). ISL/oversubscription ratios from Broadcom SAN Design guide Nov 2025 (HIGH). Gen8 X8-4/X8-8 director power figures estimated (MEDIUM — datasheets pending) |
| Architecture | HIGH | Parallel-module pattern derived directly from existing codebase analysis. Zustand and Zod integration patterns verified against the running codebase (v5 store, Zod v4). @xyflow dual-instance pattern confirmed working |
| Pitfalls | HIGH | Domain isolation pitfalls derived from codebase analysis of existing patterns. POD licensing pitfall confirmed via Broadcom official Fabric OS licensing docs. Rack elevation U-slot pitfall identified from direct code review of `buildRackDevices.ts` |

**Overall confidence:** HIGH

### Gaps to Address

- **Gen8 X8-4 and X8-8 director power figures:** Estimated in research (~2000W and ~4000W). Verify against Lenovo Press product guides before encoding in `FC_SWITCH_CATALOG`. Low risk — power display is informational only in the BOM.
- **NVMe-oF workload fan-in threshold:** Research confirms Broadcom 7:1 default and 3:1 for high-IOPS workloads. Decision needed before Phase 3: hard-code 7:1 for v2.0 or expose workload type as an input. Recommendation: hard-code 7:1, expose in v2.x.
- **MoR cable length model vs actual row geometry:** Research provides typical cable run estimates (MoR ~15m average) but actual length depends on row depth and rack spacing. The BOM emits `estimatedCableRunMeters` as an advisory — the UI must clearly label this as an estimate requiring site survey.
- **G820 availability date:** Gen8 G820 announced November 2025, production availability not confirmed in research. If G820 is unavailable when v2.0 ships, the catalog entry should carry an availability advisory flag.

## Sources

### Primary (HIGH confidence)

- [Broadcom TechDocs — G720 Switch Specifications](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g720-switch/1-0/v25859098.html) — port counts, form factor, power, ISL trunking
- [Broadcom TechDocs — G730 Switch Specifications](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g730-switch/1-0/Brocade-G730-Switch-Technical-Specifications.html) — 128-port Gen7 core switch specs
- [Broadcom TechDocs — G820 Device Overview](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g820-switch/1-0/device-overview-g820.html) — Gen8 128G specs
- [Broadcom — Gen7 Switch FAQ](https://docs.broadcom.com/doc/Gen7-Switch-FAQ) — G720/G730 POD scaling and port counts
- [Broadcom — SAN Design and Best Practices, Nov 2025](https://docs.broadcom.com/doc/53-1004781) — ISL sizing, fan-in ratios, oversubscription thresholds
- [Broadcom TechDocs — Ports on Demand (Fabric OS 9.1.x)](https://techdocs.broadcom.com/us/en/fibre-channel-networking/fabric-os/fabric-os-software-licensing/9-1-x/v26544088.html) — POD licensing model
- [Broadcom TechDocs — MAPS Oversubscription Monitoring](https://techdocs.broadcom.com/us/en/fibre-channel-networking/fabric-os/fabric-os-maps/9-1-x/) — fan-in monitoring thresholds
- NetStack codebase — `src/store/inputStore.ts` (v5 migration pattern), `src/domain/schemas/bom.ts` (ConstraintViolation discriminated union), `src/domain/catalog/hardware.ts` (SWITCH_CATALOG pattern)

### Secondary (MEDIUM confidence)

- [StorageReview — Gen8 Launch Nov 2025](https://www.storagereview.com/news/broadcom-launches-brocade-gen-8-128g-fibre-channel-for-ai-mission-critical-and-quantum-safe-storage) — G820 128G autosensing, quantum-safe ISL encryption
- [Lenovo Press — X7-4/X7-8 Product Guide](https://lenovopress.lenovo.com/lp1587-lenovo-thinksystem-x7-8-and-x7-4-fc-san-directors) — director chassis specs
- [Lenovo Press — X8-4/X8-8 Product Guide](https://lenovopress.lenovo.com/lp2271-lenovo-x8-4-and-x8-8-gen-8-fc-directors) — Gen8 director chassis
- [dc.mynetworkinsights — ToR/MoR/EoR architecture](https://dc.mynetworkinsights.com/data-center-switching-centralized-eor-mor-top-of-rack-tor/) — switch positioning cable length implications
- [Cisco Community — TOR/EOR/BOR/MOR terminology](https://community.cisco.com/t5/data-center-switches/what-is-tor-eor-bor-mor/td-p/4990184) — authoritative on positioning terminology
- [FlackBox — FC SAN Dual Fabric / ISL Best Practices](https://www.flackbox.com/fibre-channel-san-part-3-redundancy-multipathing) — ISL redundancy patterns, aligns with vendor docs

### Tertiary (LOW confidence)

- npm registry search for FC SAN calculation libraries — negative result confirmed; pure TypeScript implementation is the correct approach
- Power figures for X7-4 (~2000W), X7-8 (~4000W), X8-4 (~2000W), X8-8 (~4000W) — estimated from chassis class analogy; must be verified against final datasheets

---
*Research completed: 2026-03-18*
*Ready for roadmap: yes*

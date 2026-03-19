# Project Research Summary

**Project:** NetStack v6.0 — Physical Planning Features
**Domain:** Browser-based network infrastructure sizing / BOM generator (Dell Leaf-Spine + SONiC + Brocade FC SAN)
**Researched:** 2026-03-19
**Confidence:** HIGH

## Executive Summary

NetStack v6.0 extends a shipped v5.0 product with physical planning outputs: a per-link cable length schedule, a per-rack power budget, an upgraded DAC distance advisory that uses computed geometry instead of a rack-count heuristic, and a boolean adjacent/non-adjacent rack toggle that fires a new patch-panel advisory. Every one of these features is pure arithmetic over existing constants and a handful of new user inputs. No new npm packages are required; the entire feature set belongs in the domain layer as pure TypeScript functions following the established `calculateBOM()` composition pattern. All new outputs are embedded directly in `NetworkBOM` and `ThreeTierBOM` rather than in separate stores or side-car schemas, preserving the existing one-way dependency chain (Domain -> Store -> Features) and keeping all new outputs automatically available to PDF/CSV export without additional wiring.

Four new input fields are added to `SizingInputSchema` with Zustand `inputStore` bumped from version 8 to 9: `rackPitchMm` (default 600), `adjacentNetworkRack` (default true), `patchPanelDistanceM` (default 1), and `estimatedServerPowerW` (default 400). The existing `{ ...DEFAULT_INPUT, ...oldInput }` merge strategy handles backwards compatibility for stored profiles. Parallel architecture (ADR-0009) is maintained: `ThreeTierSizingInputSchema` and `ThreeTierBOMSchema` receive the same four new input fields and output extensions, with three-tier cable lengths split per tier (`serverAccessCableLengthM`, `accessAggrCableLengthM`, `aggrCoreCableLengthM`).

The dominant risk class for v6.0 is silent data quality errors: cable lengths computed as point-to-point distances instead of routed paths produce cables that are too short to install; power budgets derived from nameplate max alone cause PDU over-specification; profile load without normalization produces undefined values for new fields. A secondary risk is semantic confusion between blocking violations and informational advisories — the patch-panel advisory must live in a new `NetworkBOM.advisories[]` array, not in `violations[]`, or it will render as a red blocking error. All seven critical pitfalls have clear preventions; none require architectural rework if addressed in the correct phase sequence.

## Key Findings

### Recommended Stack

No new npm dependencies are required for v6.0. All operations are `+`, `×`, `Math.ceil()`, and `Math.abs()` over typed constants derived from IEEE 802.3, EIA-310-D, and vendor datasheets. The candidates evaluated and rejected include `mathjs` (170 KB bundle weight, zero domain benefit), DCIM SDKs (server-side only, incompatible with PWA constraint), `d3` (topology already handled by `@xyflow/react`; cable schedule is tabular), and geospatial libraries (rack layout is one-dimensional along a row axis).

See `.planning/research/STACK.md` for full details and alternatives analysis.

**Core technologies (unchanged from v5.0):**
- TypeScript (strict): All new domain logic; types derived from Zod via `z.infer<>`, never declared separately — critical for keeping cable length and power budget schema changes type-safe end-to-end
- Zod v4: Extend `SizingInputSchema` (4 new fields), `NetworkBOMSchema` (`cableLengthSchedule`, `powerBudget`, `advisories[]`), `ConstraintViolationSchema` (`computedDistanceM` on `DAC_DISTANCE_ADVISORY`), new `AdvisorySchema`
- Zustand v5: Increment `inputStore` to version 9; `resultStore` adapter updated to pass new fields through; no new stores needed
- React 19 + shadcn/ui: New accordion section for physical layout inputs; new BOM panel sections for cable schedule and power budget
- Vite 6 + Tailwind v4: Unchanged; no build config changes required

**New physical constants required (HIGH confidence — IEEE 802.3 / EIA-310-D):**
- DAC passive limit: 3 m at 25G SFP28; 5 m at 100G QSFP28 — binding constraint for leaf-spine uplinks
- DAC active limit: 7 m at 100G QSFP28
- 1U rack height: 44.45 mm (EIA-310-D)
- Default rack pitch: 600 mm center-to-center (BICSI 002 / TIA-942)
- Service loop: 0.5 m per cable run — industry standard dressing allowance

### Expected Features

Research confirms four feature categories for v6.0. All core outputs are P1; CSV/PDF export extensions are P2 for v6.x.

See `.planning/research/FEATURES.md` for the full MVP checklist and prioritization matrix.

**Must have (table stakes):**
- Per-link cable length estimate (server-leaf, leaf-spine, VLT interconnect, OOB management) — engineers must specify lengths at procurement time; cables cannot be spliced
- Power per rack in watts and kW — standard deliverable before PDU provisioning; every comparable tool includes it
- Total deployment power in kW — facility engineers need the aggregate figure
- DAC advisory with computed distance — current advisory fires on `racks > 8` heuristic; engineers expect an actual measured length in the violation message
- Adjacent/non-adjacent rack toggle — directly affects cable type viability and patch panel requirement

**Should have (differentiators):**
- Cable length schedule by link type mapped to standard vendor SKU steps — no competing tool produces this for Dell SONiC deployments; direct procurement input
- `PATCH_PANEL_RECOMMENDED` advisory for non-adjacent racks (amber, not red — informational only)
- Ampere per rack at 208V — PDU selection hint derived from total rack power
- `HIGH_DENSITY_RACK` advisory when any rack exceeds 10 kW — cooling planning flag
- Cable length schedule and power budget in CSV/PDF export (P2, v6.x)

**Defer (v7.0+):**
- Exact-to-centimeter cable length calculator (requires CAD floor layout input)
- Cable routing visualization or 3D floor plan (full DCIM product scope)
- PUE-adjusted power cost calculator (facility-specific; breaks trust)
- Cooling estimate in BTU/h (out-of-scope conversation)
- Multi-row cable tray layout (requires row topology knowledge)
- FC power budget (FC physical layout not yet modeled)

### Architecture Approach

All v6.0 domain logic is embedded in `calculateBOM()` and `calculateThreeTierBOM()` via two new private helpers: `buildCableLengthSchedule(input)` and `buildPowerBudget(input, counts)`. If both engines need the same helpers, they are extracted to `engine/physical-planning-helpers.ts` (internal, not exported from the domain public API). No new top-level files, no new stores, and no separate schemas for physical inputs. The one meaningful exception to "no new schemas" is `AdvisorySchema` — a new discriminated union alongside `ConstraintViolationSchema` that ensures informational advisories are never rendered as blocking errors.

See `.planning/research/ARCHITECTURE.md` for the full file inventory, component boundaries, and build order with rationale for each decision.

**Major components modified:**

1. `src/domain/schemas/input.ts` — Add 4 new fields: `rackPitchMm`, `adjacentNetworkRack`, `patchPanelDistanceM`, `estimatedServerPowerW`
2. `src/domain/schemas/bom.ts` — Add `CableLengthScheduleSchema`, `PowerBudgetSchema`, `AdvisorySchema`; extend `DAC_DISTANCE_ADVISORY` with `computedDistanceM`; add `advisories[]` to `NetworkBOMSchema`
3. `src/domain/engine/sizing.ts` — Implement `buildCableLengthSchedule()` and `buildPowerBudget()` helpers; replace `racks > 8` DAC threshold with computed path comparison
4. `src/store/inputStore.ts` — Bump to version 9; add 4 new fields to `DEFAULT_INPUT`
5. `src/store/resultStore.ts` — Update `toThreeTierInput()` adapter to pass 4 new fields through
6. Features layer — New "Physical Layout" accordion section in `EthInputAccordion.tsx`; cable schedule and power budget sections in `BOMPanel.tsx`; PDF/CSV export extensions (P2)
7. i18n — New keys in all four locale files (EN/FR/DE/IT) for each new field, section header, and advisory message

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 14 pitfalls with detection warnings, prevention strategies, and phase assignments.

1. **Profile load bypasses schema migration** — `profileService.loadProfile()` calls `setInput(profile.inputState as Partial<SizingInput>)` without spreading against `DEFAULT_INPUT`. Old profiles have `undefined` for all v6.0 fields, producing silent wrong output. Fix: add `normalizeToCurrentSchema()` in `profileService.ts` before adding any new field. This is a precondition for Phase 1.

2. **Cable length computed as pitch-only distance instead of routed path** — Using only `racksBetween × rackPitchM` omits vertical ascent to cable tray, vertical descent, and service loop. The actual path between racks separated by 2 positions is ~4.2 m in a 42U/600 mm deployment, not 1.2 m. Cables ordered at pitch-only length cannot be installed. Use: `verticalAscent + horizontalRun + verticalDescent + serviceLoop` with a `RACK_HEIGHT_M` lookup table keyed by U-count (not a formula from `parseInt(rackSize) * 0.04445`).

3. **Patch-panel advisory added to `ConstraintViolationSchema` instead of `AdvisorySchema`** — If `PATCH_PANEL_RECOMMENDED` lands in `violations[]`, it renders as a red blocking error alongside `RACK_CAPACITY_EXCEEDED`. Engineers read it as "cannot be built" and distrust the tool. Establish `AdvisorySchema` + `NetworkBOM.advisories[]` in Phase 1 before any advisory content is added to the engine.

4. **Power budget emits nameplate max only, without typical draw** — Summing only `maxPowerW` produces a figure 1.5–2× higher than actual draw, causing PDU over-specification. Some models (S3248T-ON) have no `typicalPowerW` — omitting the fallback causes TypeScript errors or `undefined`. Always emit both values; use `typicalPowerW ?? maxPowerW * 0.6` as a conservative fallback.

5. **DAC advisory threshold `racks > 8` not replaced with computed path comparison** — The current threshold fires too late (actual path exceeds the 5 m passive spec at fewer than 8 racks with standard geometry). Replace with `computedPathLengthM > CABLE_CATALOG.DAC.maxDistanceM` and include the computed value in the advisory payload so the UI can show a specific number.

6. **FC ISL cable lengths computed using the Ethernet rack-pitch formula** — FC ISL cables are intra-SAN-rack connections using fiber, always 1–3 m. Applying the server-to-leaf rack-pitch formula produces estimates of 5–15 m and incorrectly triggers the DAC advisory. ISL cable length is a fixed short in-rack estimate; the Ethernet formula must never be applied to FC ISL links.

7. **Three-Tier cable lengths as a single scalar instead of per-tier values** — The existing `recommendedCableLengthM` scalar is a placeholder; aggregation-to-core cable runs can be 10–40 m in large deployments, not 2 m. The Three-Tier engine must produce `serverAccessCableLengthM`, `accessAggrCableLengthM`, `aggrCoreCableLengthM` as separate fields.

## Implications for Roadmap

The research reveals a clean dependency order driven by the existing architecture. Schema changes are foundational; engines depend on schemas; UI depends on engines; export depends on stable output shapes. Within the schema layer, `AdvisorySchema` must exist before any advisory is added to the engine. Within the engine layer, the cable path formula must be correct before the DAC advisory upgrade references it. The profile normalization fix is a precondition for all phases and must be shipped in Phase 1.

### Phase 1: Schema and Advisory Foundation

**Rationale:** All downstream phases depend on correct Zod schemas and the `AdvisorySchema` / `advisories[]` distinction. Establishing these first prevents Pitfall 6 (advisory rendered as blocking violation) from ever entering any implementation. Adding `normalizeToCurrentSchema()` to `profileService.ts` here prevents Pitfall 1 from corrupting new fields in old profiles.

**Delivers:** 4 new input fields on `SizingInputSchema`; `CableLengthScheduleSchema`; `PowerBudgetSchema`; `AdvisorySchema`; `advisories[]` on `NetworkBOMSchema`; `computedDistanceM` extension on `DAC_DISTANCE_ADVISORY`; `inputStore` bumped to version 9; `profileService` normalization; same schema extensions on `ThreeTierSizingInputSchema` and `ThreeTierBOMSchema`.

**Addresses:** Cable length schedule and power budget schema prerequisites; advisory-vs-violation semantic split; profile backwards compatibility.

**Avoids:** Pitfalls 1 (profile migration), 6 (advisory as blocking violation), 8 (version not bumped).

**Research flag:** Standard patterns. The Zod extension approach, Zustand migration pattern, and `AdvisorySchema` discriminated union all have direct precedent in the existing codebase. No deeper research needed.

### Phase 2: Cable Length Engine

**Rationale:** The cable length schedule is the most feature-rich and technically precise domain addition. It must be built after schemas (Phase 1) and before the UI and export phases. Building the domain engine first enables TDD (failing Vitest tests written first), keeping the logic fully tested before any UI is added.

**Delivers:** `buildCableLengthSchedule()` helper with full cable-path formula (`verticalAscent + horizontalRun + verticalDescent + serviceLoop`); `RACK_HEIGHT_M` lookup table keyed by U-count; `DAC_DISTANCE_ADVISORY` upgraded from `racks > 8` to computed path comparison; `recommendedCableLengthM` superseded by position-aware computed value; Three-Tier per-tier cable lengths (`serverAccessCableLengthM`, `accessAggrCableLengthM`, `aggrCoreCableLengthM`); FC ISL cable length protected from cross-contamination; `PATCH_PANEL_RECOMMENDED` advisory logic (fires only when non-adjacent AND DAC AND length > 5 m).

**Addresses:** Per-link cable length estimate (P1); adjacent/non-adjacent toggle logic (P1); DAC advisory with computed distance (P1).

**Avoids:** Pitfalls 2 (path-only formula), 3 (Three-Tier single scalar), 4 (wrong DAC threshold), 7 (FC ISL cross-contamination), 12 (service loop omitted), 13 (rack height from formula not lookup).

**Research flag:** Standard patterns. All formulas are validated with HIGH or MEDIUM confidence sources in STACK.md and FEATURES.md. The Three-Tier per-tier separation requires careful cross-reference with `three-tier-sizing.ts` but no external research.

### Phase 3: Power Budget Engine

**Rationale:** Power budget is simpler than cable length (no routing geometry, just multiplication over catalog values) and depends only on Phase 1 schemas. Separating it from Phase 2 keeps each domain phase focused and individually reviewable.

**Delivers:** `buildPowerBudget()` helper; per-rack `typicalPowerW` and `maxPowerW` outputs using `typicalPowerW ?? maxPowerW * 0.6` fallback; network rack summary for spines and border leafs; `grandTotalMaxW` and `grandTotalTypicalW`; `HIGH_DENSITY_RACK` advisory (fires when any rack exceeds 10 kW).

**Addresses:** Power per rack in watts and kW (P1); total deployment power (P1); high-density rack advisory (P1).

**Avoids:** Pitfalls 5 (nameplate-only power), 9 (double-counting switches in non-ToR positioning — verify switch placement is derived from the same `assignSwitchesToRack()` logic used by rack elevation).

**Research flag:** Standard patterns. `SWITCH_CATALOG` already carries `maxPowerW` and `typicalPowerW`. The computation is straightforward multiplication and aggregation. No external research needed.

### Phase 4: Store Migration and Input UI

**Rationale:** Schema and engine are complete; the store migration and UI form can now be built with certainty about the data model. Separating this from the domain phases keeps engine tests clean and allows UI to be reviewed independently.

**Delivers:** `inputStore` version 9 confirmed; `DEFAULT_INPUT` updated with all 4 new field defaults; `toThreeTierInput()` adapter updated; new "Physical Layout" accordion section in `EthInputAccordion.tsx` and `ConvergedInputAccordion.tsx` exposing `rackPitchMm`, `adjacentNetworkRack`, `patchPanelDistanceM`, `estimatedServerPowerW`; `adjacentNetworkRack` defaults to `true` (advisory is opt-in by unchecking, not opt-out).

**Addresses:** All four new user inputs required by P1 features; `adjacentRacks` default value (Pitfall 11).

**Avoids:** Pitfall 11 (non-adjacent default causing alarm on every first load).

**Research flag:** Standard patterns. The input form uses existing shadcn/ui accordion and field components. No new UI primitives needed.

### Phase 5: BOM Output UI

**Rationale:** Engine must be complete (Phases 2-3) and inputs wired (Phase 4) before BOM panel additions are meaningful. This phase closes the user-visible loop on all P1 features.

**Delivers:** "Cable Length Schedule" section in `BOMPanel.tsx` showing per-link-type table (link type, cable type, quantity, unit length, recommended SKU); "Power Budget" section showing per-rack kW and amps (both typical and max); upgraded DAC advisory card showing computed distance and rated limit; `PATCH_PANEL_RECOMMENDED` advisory card rendered amber (not red); equivalent additions to `ThreeTierBOMPanel`; i18n keys in all 4 locales for all new sections.

**Addresses:** Cable length schedule table (P1); power budget display (P1); advisory UX distinction (violation = red, advisory = amber); i18n completeness.

**Avoids:** Pitfall 6 (advisory as blocking error — prevented by Phase 1 schema), Pitfall 14 (i18n keys missing in non-English locales).

**Research flag:** Standard patterns. shadcn/ui Table and Badge components handle this. i18n key additions follow the existing EN/FR/DE/IT locale file structure.

### Phase 6: Export Extensions (P2)

**Rationale:** Export is the last mile. It depends on stable BOM output shapes from Phases 2-3. Cable schedule and power budget export are P2 for v6.0 — the core BOM export already works and procurement teams can export from the BOM panel.

**Delivers:** Cable length schedule section in CSV export (one row per link type with linkType, quantity, lengthM, cableType columns — never a flat aggregate); power budget section in CSV export (one row per rack, separate typical and max columns); PDF `BOMPage.tsx` extended with cable schedule and power budget sections; `InputsPage.tsx` extended with new physical layout inputs.

**Addresses:** Cable length schedule in CSV/PDF (P2); power budget in CSV/PDF (P2).

**Avoids:** Pitfall 10 (flat average instead of per-link-type rows in CSV).

**Research flag:** Standard patterns. Export template extensions follow existing section layout. No structural changes to PDF or CSV format needed.

### Phase Ordering Rationale

- Schema first: every other phase is type-checked against it; runtime errors surface immediately if schemas are wrong
- `AdvisorySchema` in Phase 1 before any advisory in the engine: eliminates the single most damaging UX risk (Pitfall 6) at zero cost
- Profile normalization in Phase 1: every subsequent feature gets correct default values on old profiles at no additional per-phase cost
- Cable engine (Phase 2) before power engine (Phase 3): cable length is more complex and benefits from being the first domain code reviewed and tested under TDD
- UI (Phases 4-5) after engines: component tests have real data to assert against
- Export (Phase 6) last: depends on stable output shapes; deferring reduces iteration cost during engine development

### Research Flags

Phases needing deeper research during planning:
- None. All six phases operate on well-understood patterns. The codebase was read directly during research; all integration points were verified against production source files. No external unknowns remain.

Phases with standard patterns (skip research-phase):
- **All phases:** Direct codebase analysis during research eliminated all uncertainty about integration points. The Zustand migration pattern, Zod discriminated union extension approach, and shadcn/ui component usage all have live examples in the codebase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Exhaustive package search; no relevant npm package exists; existing stack versions confirmed from production `package.json`; all integration patterns verified against live code |
| Features | HIGH | DAC limits verified against IEEE 802.3by/bj and multiple vendor datasheets; rack constants from EIA-310-D; power ranges from ServeTheHome benchmarks and Dell community data; cable SKU ladders from FS.com and Cisco datasheets |
| Architecture | HIGH | All decisions derived directly from reading production source files (`sizing.ts`, `inputStore.ts`, `bom.ts`, `hardware.ts`); no guesswork or inference; anti-pattern section documents what was explicitly rejected and why |
| Pitfalls | HIGH | Critical pitfalls sourced from direct codebase analysis (existing DAC threshold line confirmed in `sizing.ts`, profile load code confirmed in `profileService.ts`, `typicalPowerW` optional field confirmed in `SWITCH_CATALOG`, `recommendedCableLengthM` scalar confirmed as single value); secondary sources from official Zustand and Broadcom FC documentation |

**Overall confidence:** HIGH

### Gaps to Address

- **Rack pitch 600 mm default (MEDIUM confidence):** Industry norm for 600 mm floor tile data centers; no single normative standard document. Default is sensible and user-overridable via `rackPitchMm` input; no action required unless a customer deployment uses non-standard pitch.

- **Server power by U-height (MEDIUM confidence):** Conservative per-U estimates (400 W for 1U, 600 W for 2U) have significant variance by workload and CPU configuration. The feature is explicitly a planning advisory; conservative estimates are appropriate. All power output must be labeled "estimated maximum" to manage expectations.

- **`typicalPowerW` catalog coverage:** S3248T-ON, S5224F-ON, and S5212F-ON may lack `typicalPowerW` in `SWITCH_CATALOG`. Phase 3 must audit which models are missing this field and apply the `maxPowerW * 0.6` fallback consistently.

- **Three-Tier engine scope:** `three-tier-sizing.ts` was confirmed to have the same `DAC_DISTANCE_ADVISORY` shape as the Clos engine but was not fully audited for all cable-length consumers. Phase 2 must verify that the Three-Tier per-tier cable length fields do not conflict with any existing `recommendedCableLengthM` consumers before modifying the schema.

## Sources

### Primary (HIGH confidence)

- `/Users/fjacquet/Projects/network-sizer/src/domain/engine/sizing.ts` — DAC threshold (`racks > 8`), `cableLengthMap`, `calculateBOM()` structure confirmed from direct read
- `/Users/fjacquet/Projects/network-sizer/src/domain/schemas/bom.ts` — `ConstraintViolationSchema`, `NetworkBOMSchema`, `DAC_DISTANCE_ADVISORY` payload shape (no distance field) confirmed
- `/Users/fjacquet/Projects/network-sizer/src/domain/catalog/hardware.ts` — `SWITCH_CATALOG` with `maxPowerW`, `typicalPowerW` confirmed
- `/Users/fjacquet/Projects/network-sizer/src/store/inputStore.ts` — version 8, `{ ...DEFAULT_INPUT, ...oldInput }` merge migration pattern confirmed
- IEEE 802.3by (25GBASE-CR) / 802.3bj (100GBASE-CR4) — DAC passive limits (3 m at 25G, 5 m at 100G)
- EIA-310-D rack standard — 1U = 44.45 mm; 42U rack total height approximately 1.87 m
- [Zustand Persist Middleware docs](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — `merge()` and version migration
- [Broadcom SAN Design and Best Practices (Nov 2025)](https://docs.broadcom.com/doc/53-1004781) — FC ISL design rules, Gen7/Gen8 specs

### Secondary (MEDIUM confidence)

- [FS.com community — DAC vs AOC cable lengths](https://community.fs.com/article/guide-to-10g-dac-and-aoc-cables.html) — standard SKU ladder (1 m, 2 m, 3 m, 5 m, 7 m) confirmed
- [ServeTheHome — 1U vs 2U server power testing](https://www.servethehome.com/testing-conventional-wisdom-1u-v-2u-power-consumption/) — server watt ranges by U-height
- [BICSI 002 / TIA-942] — rack pitch 600 mm norm; overhead cable tray clearance 300–600 mm
- [Cisco 25GBASE SFP28 datasheet](https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/datasheet-c78-736950.html) — FEC requirements at 2.5–3 m passive DAC
- [ANFKOM — ToR/MoR/BoR cabling patterns](https://www.anfkomftth.com/data-center-cabling-eor-mor-or-tor/) — cable run distance validation by positioning mode
- [NVIDIA Cabling Data Centers Design Guide (March 2023)](https://docs.nvidia.com/cabling-data-centers.pdf) — DAC cable path length formula with vertical components

### Tertiary (LOW confidence — validation needed during implementation)

- Server power by U-height (conservative estimates from multiple community sources; actual draw varies significantly). Label all power output as "estimated maximum" in UI and BOM export.

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*

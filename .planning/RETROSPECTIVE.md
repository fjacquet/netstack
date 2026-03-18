# Retrospective

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-17
**Phases:** 4 | **Plans:** 13 | **Tests:** 144

### What Was Built
- Pure sizing engine with rack/leaf/spine/OOB/cable/transceiver/VLT calculations
- Live input form with Zod validation, selectable models, rack sizes
- Interactive topology diagram with rack-based column layout
- Rack elevation with server + network racks, drag-to-reorder
- CSV/PDF/Print export pipeline
- Full i18n (EN/FR/DE/IT), light/dark theme, responsive layout
- 8 ADRs, PRD, User Guide, Changelog

### What Worked
- Domain-first approach: engine validated with 30+ tests before any UI
- Parallel execution of Wave 2 plans (topology + rack + docs simultaneously)
- GSD workflow kept planning overhead low relative to execution
- TDD for domain logic caught formula bugs early (spine count, cable formula)

### What Was Inefficient
- Schema field additions (rackSize, spineModel, borderLeaf) required updating 10+ test fixtures each time
- PDF font registration went through 3 iterations (local TTF → CDN woff2 → built-in Helvetica)
- Multiple rounds of icon path fixes (hardcoded vs BASE_URL)
- Rack elevation defaulted to hardcoded 4U initially — should have used input from the start

### Patterns Established
- `import.meta.env.BASE_URL` for all public asset references
- Zustand persist with `version` + `merge` for schema evolution
- Inline `<script>` in index.html for theme detection before React
- Built-in fonts for PDF (avoid external font loading)
- Print stylesheet: force light mode + `zoom: 85%` for auto-fit

### Key Lessons
- Add new schema fields to ALL test fixtures in one pass (batch with replace_all)
- Font registration in @react-pdf/renderer is fragile — prefer built-in fonts
- Topology layout should group by rack column from the start (not flat rows)
- localStorage cache invalidation needs persist version bumping on schema changes

### Cost Observations
- Model mix: ~70% Sonnet (executors), ~30% Opus (planners)
- Sessions: 1 long session covering all 4 phases + UAT
- Notable: Parallel Wave 2 (3 agents) was highly efficient — topology, rack, and docs built simultaneously

---

## Milestone: v1.1 — Enhancements

**Shipped:** 2026-03-18
**Phases:** 3 (5–7) | **Plans:** 7 | **Tests:** 223

### What Was Built
- Per-rack variable server density with individual rack configuration UI
- Configurable frontend/backend port counts per server
- Selectable active uplinks per leaf (1 to model max)
- Rack elevation with U-height proportional server slots and RACK_CAPACITY_EXCEEDED alerts

### What Worked
- Small, focused milestone (3 phases) shipped in 1 day
- Zustand persist versioning cleanly handled schema additions
- TDD approach caught edge cases in uplink and port formulas

### What Was Inefficient
- Per-rack config UI needed 2 rounds to get the UX right
- Rack elevation server rendering required understanding U-height semantics first

### Patterns Established
- Zustand v5 `useShallow` for all selectors to prevent infinite render loops
- Schema field additions batched across all test fixtures in one pass

### Key Lessons
- Keep milestones small and focused — v1.1 shipped in 1 day vs v1.0's 2 days
- Rack elevation state should be derived from inputStore, not duplicated

### Cost Observations
- Model mix: ~75% Sonnet (executors), ~25% Opus (planners)
- Sessions: 1 session
- Notable: Wave parallelization within phases kept each phase under 30 min

---

## Milestone: v2.0 — FC SAN & Switch Positioning

**Shipped:** 2026-03-18
**Phases:** 7 (8–14) | **Plans:** 16 | **Tests:** 388

### What Was Built
- FC hardware catalog — 9 Brocade/Broadcom switch models with POD licensing model
- Isolated FC stores — `fcInputStore` and `fcResultStore` with separate localStorage keys
- `calculateFCBOM()` pure function — dual-fabric switch/optic/ISL sizing, 5 violation types
- Switch positioning (Ethernet) — ToR/MoR/BoR with DAC incompatibility violation and cable advisory
- FC Input UI + BOM panel — `FCInputForm`, `FCBOMPanel`, generation selector, 4-locale i18n
- FC dual-fabric topology — `buildFCTopologyGraph` pure function, `FCTopologyCanvas`, Fabric A/B
- FC export — CSV with Fabric A/B sections, PDF with 5 dedicated pages, header export buttons

### What Worked
- Strict domain isolation (parallel FC/Ethernet, no generics) made each phase independently testable
- TDD RED→GREEN pattern for all pure domain functions — no formula bugs reached the UI
- Two-pass architecture (Phase 9 = stores, Phase 10 = engine) kept concerns clean
- Export tab removal (replaced by header buttons) was a user-driven improvement that simplified the app

### What Was Inefficient
- ExportTab was built as a dedicated tab (Phase 14) then immediately removed — the header already had export buttons
- FC topology needed several iterations on node positioning and edge routing for visual clarity
- Phase 12 required a gap-closure plan (12-03) for `preferredGeneration` field missed in initial planning

### Patterns Established
- `getLastFCTopologyPng('A' | 'B')` module-level cache pattern for cross-component PNG capture
- Two independent `ReactFlowProvider` instances for dual-fabric topology (prevents cross-fabric edges)
- FC domain strictly isolated: `src/domain/schemas/fc-*.ts`, `src/store/fc*.ts`, `src/features/*/fc/`
- Export functions always in pairs (Ethernet + FC), never generic over mode union

### Key Lessons
- Plan export UX before implementing — a dedicated tab is almost always worse than header buttons
- Gap-closure phases are cheap — better to ship and fix than over-plan upfront
- Parallel FC/Ethernet isolation pays off in testability; resist the temptation to generalize
- PDF `@react-pdf/renderer` components cannot use React hooks — all i18n must come from props or hardcoded strings

### Cost Observations
- Model mix: ~80% Sonnet (executors + researchers), ~20% Opus (planners)
- Sessions: 3 sessions over 3 days
- Notable: Phases 8–14 executed in a single day (2026-03-18) — GSD workflow maturity showing

---

## Cross-Milestone Trends

| Metric | v1.0 | v1.1 | v2.0 |
|--------|------|------|------|
| Phases | 4 | 3 | 7 |
| Plans | 13 | 7 | 16 |
| Tests | 144 | 223 | 388 |
| LOC | 6,990 | ~9,000 | 13,283 |
| Days | 2 | 1 | 3 |
| Gap-closure phases | 0 | 0 | 1 |

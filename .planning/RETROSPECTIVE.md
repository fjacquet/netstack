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

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 4 |
| Plans | 13 |
| Tests | 144 |
| LOC | 6,990 |
| Days | 2 |
| UAT Issues | 8 (all resolved) |

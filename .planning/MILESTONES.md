# Milestones

## v2.0 FC SAN and Switch Positioning (Shipped: 2026-03-18)

**Phases completed:** 7 phases, 16 plans, 0 tasks

**Key accomplishments:**
- (none recorded)

---

## v1.0 MVP (Shipped: 2026-03-17)

**Phases completed:** 4 phases, 13 plans | 50 commits | 6,990 LOC TypeScript | 144 tests
**Timeline:** 2 days (2026-03-16 → 2026-03-17)

**Key accomplishments:**

- Pure sizing engine (`calculateBOM`) with rack/leaf/spine/OOB/cable/transceiver/VLT calculations
- Live input form with Zod validation, selectable leaf/spine/border leaf models, rack sizes (24U/42U/50U)
- Interactive topology diagram (@xyflow/react) with rack-based column layout and saturation border coloring
- Rack elevation view with server + network racks, U-slot numbering, HTML5 drag-to-reorder
- Export pipeline: CSV (UTF-8 BOM), PDF (Helvetica via @react-pdf/renderer), print stylesheet (force light, auto-fit)
- Full i18n (EN/FR/DE/IT), light/dark with system preference detection, responsive layout (768px+/1280px+)
- 8 Architecture Decision Records, PRD, User Guide, Changelog
- GitHub Pages deployment via GitHub Actions

---

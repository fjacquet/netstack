# Phase 2: App Shell and Input Form - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Scaffold the React app with Vite, create Zustand stores wired to the sizing engine, build the parameterized input form with inline Zod validation, add light/dark mode, i18n (FR/EN/DE/IT), responsive layout, and GitHub Pages CI/CD deployment. This phase creates the app skeleton that Phases 3-4 will fill with BOM output, visualizations, and export.

</domain>

<decisions>
## Implementation Decisions

### Language switching
- Default language detected from browser locale; fall back to EN if locale is not FR/DE/IT
- Language switcher is a dropdown in the header/navbar (top-right area), always visible
- Full UI + labels translated: all buttons, labels, tooltips, error messages, empty states — but technical terms (S5248F-ON, DAC, 25G, QSFP28) stay in English
- Language choice persisted to localStorage so it survives page reloads

### App shell structure
- Tabbed layout with 4 tabs: Sizing (Input + BOM), Topology, Rack Elevation, Export
- The Sizing tab shows input form and results side-by-side (form on the left, results on the right)
- Topology, Rack Elevation, and Export tabs are empty placeholders in Phase 2 — filled in Phases 3-4
- Top bar contains: app logo/title, tab navigation, language switcher, theme toggle

### Form layout
- Input form lives in the left panel of the Sizing tab
- Fields: total server count, servers per rack, connectivity type (25G/100G), cable type (DAC/AOC/fiber), leaf model selection
- Inline Zod validation error messages on each field
- Changing any input triggers immediate engine recalculation (no submit button)

### Claude's Discretion
- Responsive tablet behavior (stack vs collapse at 768px)
- Form field grouping and visual ordering
- Theme toggle icon/placement style within the header
- Color palette and accent colors for light/dark themes
- Loading/skeleton behavior during recalculation (if needed)
- i18n library choice (react-i18next vs lightweight alternative)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/domain/engine/sizing.ts`: `calculateBOM(input)` — pure function, ready to wire to Zustand store
- `src/domain/schemas/input.ts`: `SizingInputSchema` — Zod schema for form validation, exports `SizingInput` type
- `src/domain/catalog/hardware.ts`: `SWITCH_CATALOG` — needed for leaf model dropdown options
- `src/domain/catalog/cables.ts`: `CABLE_CATALOG` — needed for cable type dropdown options

### Established Patterns
- Pure TypeScript domain layer with no React deps — store layer must import from domain, not the other way
- Types inferred from Zod schemas via `z.infer<>` — form types come from `SizingInput`
- All hardware constants in catalog — form dropdowns should source options from catalog, not hardcode

### Integration Points
- Zustand `inputStore` subscribes to form changes → calls `calculateBOM()` → populates `resultStore`
- `resultStore` is derived (never persisted) — recomputed on every input change
- React components in `src/features/` consume stores via Zustand hooks with `useShallow`

</code_context>

<specifics>
## Specific Ideas

- Tabbed layout similar to modern dev tools (VS Code panels, Grafana dashboards) — clean tabs, not overwhelming
- Side-by-side sizing panel should feel like a calculator: input on left, instant results on right
- Technical model names (S5248F-ON, etc.) always in English regardless of language setting

</specifics>

<deferred>
## Deferred Ideas

- ADR (Architecture Decision Record) document — user wants to redact this, noted for Documentation phase (Phase 4, DOC-01)

</deferred>

---

*Phase: 02-app-shell-and-input-form*
*Context gathered: 2026-03-17*

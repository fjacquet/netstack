# Phase 4: Visualization, Export and Documentation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Fill the Topology, Rack Elevation, and Export tabs with functional content. Add topology diagram (@xyflow/react), rack elevation view, CSV/PDF export (@react-pdf/renderer, lazy-loaded), print stylesheet, and project documentation (ARD, PRD, User Guide, Changelog). This phase completes the v1.0 milestone.

</domain>

<decisions>
## Implementation Decisions

### Topology diagram

- Tree-style vertical layout: spines at root (top), leafs as branches (middle), rack/server nodes as leaves (bottom)
- Deterministic positioning: same inputs always produce the same node positions
- Fully interactive: click for details (port info popover), drag to rearrange, pan and zoom
- Port saturation shown via border color glow: green (healthy), amber (>80%), red (saturated) — matches BOM panel color coding
- VLT links shown between leaf pairs (dashed or distinct style)

### Topology edges

- Claude's discretion on edge style (straight vs bezier, color coding by cable type)
- Must be readable at different deployment scales (2 racks vs 20+ racks)

### Rack elevation view

- Vertical orientation: classic rack diagram with U-slots numbered bottom-to-top (U1 at bottom)
- One rack at a time with a dropdown/tab selector (rack summary in selector)
- Device colors: fill = role color (leaf=blue, spine=purple, OOB=gray), border glow = utilization color (green/amber/red)
- U-slot positions are user-configurable: drag devices to custom U-slots
- Rack view updates automatically when sizing inputs change

### Export formats

- Claude's discretion on CSV column structure and PDF report layout
- PDF must include BOM summary, sizing inputs, and topology diagram
- PDF generated with @react-pdf/renderer (lazy-loaded per CLAUDE.md)
- Print (Ctrl+P) must render clean layout with no navigation chrome

### Documentation

- Claude's discretion on depth/format for ARD, PRD, User Guide, and Changelog
- ARD was deferred from Phase 2 — describes four-layer architecture, data flow, pure-function engine contract
- All docs presumably in docs/ folder as Markdown

### Claude's Discretion

- Edge styling for topology (straight vs bezier, color coding)
- CSV column ordering and naming
- PDF report sections, branding, and layout
- Documentation depth and format for all four docs
- Rack elevation device default positions before user customization
- How the rack selector UI looks (dropdown vs mini-tabs vs sidebar)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and in REQUIREMENTS.md (VIZ-01, VIZ-02, VIZ-03, EXP-01, EXP-02, EXP-03, DOC-01, DOC-02, DOC-03, DOC-04).

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `src/store/resultStore.ts`: `useResultStore` — provides full `NetworkBOM` with all fields (switches, cables, SFPs, VLT, oversubscription, violations)
- `src/store/inputStore.ts`: `useInputStore` — provides current `SizingInput` for export metadata
- `src/domain/catalog/hardware.ts`: `SWITCH_CATALOG` — switch specs for rack elevation device sizing
- `src/features/sizing/BOMPanel.tsx`: oversubscription badge and port utilization patterns to reuse for topology node coloring
- 15 shadcn/ui components already installed (table, alert, tooltip, progress, card, button, etc.)
- `src/components/theme-provider.tsx`: ThemeProvider with dark mode — topology and rack views must respect theme

### Established Patterns

- `@xyflow/react` for topology diagrams (per CLAUDE.md — not deprecated `reactflow`)
- `@react-pdf/renderer` for PDF (per CLAUDE.md — must be lazy-loaded)
- Zustand stores with `useShallow` selectors for React component consumption
- i18n with react-i18next — all UI text must have translation keys in 4 locales (EN/FR/DE/IT)
- Technical terms (model names, DAC, QSFP28, etc.) stay in English regardless of locale

### Integration Points

- Topology tab: replace `PlaceholderTab` in `App.tsx` tabs
- Rack Elevation tab: replace `PlaceholderTab` in `App.tsx` tabs
- Export tab: replace `PlaceholderTab` in `App.tsx` tabs
- Both visualization tabs consume `useResultStore` for BOM data
- Export tab reads both stores for CSV/PDF content

</code_context>

<specifics>
## Specific Ideas

- Topology should feel like a real network diagram tool — not a toy
- Rack elevation should look like a physical rack with proper device proportions
- The user explicitly wants drag-to-rearrange on both topology nodes and rack U-slot devices

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-visualization-export-and-documentation*
*Context gathered: 2026-03-17*

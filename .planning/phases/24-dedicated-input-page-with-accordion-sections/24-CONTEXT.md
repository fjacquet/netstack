# Phase 24: Dedicated Input Page with Accordion Sections - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the 320px sidebar `InputForm` with a dedicated full-page input experience organized into
collapsible accordion sections, accessible via a new `/input` route. The rest of the app (BOM panel,
Topology tab, Rack Elevation tab) moves to `/` (or sub-routes). Applies to all 3 modes: Ethernet,
Fibre Channel, and Converged.

Scope: accordion UI + React Router integration + TopBar navigation button. New sizing logic, new BOM
fields, and export changes are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Page Layout & BOM Placement
- Dedicated input page lives at `/input` route — full page, no BOM alongside it
- BOM panel lives at `/` (or the existing Sizing tab area, now Results-only)
- Sizing tab becomes Results-only: BOMPanel only, InputForm removed from sidebar
- Live updates preserved — results still recalculate on every input change
- No "Edit inputs" button in BOM area — users navigate back via tab/TopBar

### TopBar Navigation
- TopBar gets a dedicated "Configure" or "Inputs" icon button (e.g., `Settings2` or `SlidersHorizontal` from lucide-react)
- Clicking it navigates to `/input`
- Button shows active state when on the `/input` route

### Routing
- Full React Router integration (`react-router-dom`)
- All tabs become URL routes:
  - `/input` — dedicated accordion input page (new)
  - `/` — Sizing Results (BOM panel)
  - `/topology` — Topology diagram
  - `/rack` — Rack Elevation
- GitHub Pages base path handling must be preserved (`import.meta.env.BASE_URL`)
- Browser back/forward button works between pages
- TopBar tab-like navigation converts to `<NavLink>` or `<Link>` components

### Accordion Section Grouping — Ethernet (Clos)
3 sections:
1. **Rack Config** — racks + server count config (open by default)
2. **Switch Selection** — leaf model, spine model, border leaf model/count, connectivity type, cable type, active uplinks
3. **Advanced** — switch positioning, server U-height, rack size, brownfield toggle (Spines already deployed)

### Accordion Section Grouping — Ethernet (Three-Tier)
Same 3-section structure as Clos, different field labels:
1. **Rack Config** — racks + server count (open by default)
2. **Switch Selection** — access model, aggregation model, core model, active uplinks per access/aggregation, connectivity type, cable type
3. **Advanced** — switch positioning, server U-height, rack size, brownfield toggle (Core already deployed)

### Accordion Section Grouping — Fibre Channel
3 sections:
1. **Rack Config** — racks, server U-height, rack size (open by default)
2. **Fabric Config** — FC switch model, preferred generation, HBA ports per server, storage target ports, storage array count
3. **Advanced** — ISL ports per switch

### Accordion Section Grouping — Converged
Single accordion, 4 sections combining Ethernet + FC:
1. **Rack Config** — racks, topology selector, server U-height, rack size (open by default)
2. **Ethernet Switches** — leaf/access/aggregation/core models, connectivity type, cable type, active uplinks
3. **FC Fabric** — FC switch model, preferred generation, HBA ports, storage targets, ISL ports
4. **Advanced** — switch positioning, brownfield toggles

### Accordion Default State
- First section (Rack Config) is open by default
- All other sections collapsed on initial load
- No localStorage persistence of open/closed state (Claude's discretion)

### Cross-Mode Scope
- All 3 modes (Ethernet, FC, Converged) get the accordion input page
- Mode switching from TopBar ModeSelector updates the form content within `/input`
- Topology selector (Clos vs Three-Tier) remains within the Ethernet form

### Claude's Discretion
- Accordion component implementation (shadcn/ui Accordion — needs to be added to ui/ components)
- Exact icon choice for the TopBar "Configure" button
- Animation/transition for accordion open/close
- How router handles GitHub Pages 404 fallback (standard approach: 404.html redirect)
- Whether to use `HashRouter` (simpler for GitHub Pages) or `BrowserRouter` + 404 handling

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current Input Forms (to understand what to accordion-ize)
- `src/features/sizing/InputForm.tsx` — Ethernet (Clos + Three-Tier) input form, 847 lines
- `src/features/sizing/fc/FCSizingPage.tsx` — FC input form (check for FCInputForm)
- `src/features/sizing/converged/ConvergedSizingPage.tsx` — Converged input form
- `src/features/sizing/SizingPage.tsx` — Current layout: InputForm + BOMPanel side-by-side

### App Structure
- `src/App.tsx` — Current tab/mode state management, where Router must be added
- `src/components/TopBar.tsx` — Navigation bar, needs Configure button + NavLink tabs

### Architecture Decisions
- `docs/adr/0018-unified-ethernet-mode.md` — Topology-aware dispatch pattern
- `docs/adr/0002-client-side-only.md` — No backend, GitHub Pages deployment constraints

### UI Components
- `src/components/ui/` — Available shadcn/ui components (no Accordion yet — must be added)
- `src/components/ui/tabs.tsx` — Current tab implementation to be replaced with Router

### Planning
- `.planning/STATE.md` — v5.0 decisions and architectural patterns
- `.planning/ROADMAP.md` — Phase 24 goal and dependencies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` + `CardHeader` + `CardContent` — already used in InputForm, good accordion section wrapper alternative
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl` — react-hook-form integration already in place, reusable inside accordion sections
- `Select`, `Input`, `Button`, `Checkbox` — all existing, reuse as-is inside sections
- `Tabs`/`TabsList`/`TabsTrigger` in App.tsx — these become Router `<NavLink>` equivalents

### Established Patterns
- `useShallow` from zustand/shallow — used everywhere for store selectors, must continue
- `useTranslation()` — all labels must use i18n keys
- TopBar button pattern: `<Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon">` — follow for Configure button
- `import.meta.env.BASE_URL` — used in TopBar for favicon, must be preserved in router base config

### Integration Points
- `App.tsx` — single integration point for `<BrowserRouter>` (or `<HashRouter>`) wrapper + `<Routes>`
- `TopBar.tsx` — add Configure button + convert tab dividers to `<NavLink>` or remove them (tabs move to main content area)
- `SizingPage.tsx` — split into `InputPage` (accordion form) and `ResultsPage` (BOM panel only)
- Each mode's InputForm — refactor field rendering into accordion section components

</code_context>

<specifics>
## Specific Ideas

- The dedicated input page should feel like a proper configuration form, not a cramped sidebar
- React Router chosen for full URL-based navigation — browser back/forward must work
- All 3 modes get the accordion treatment in this phase (not staged)
- GitHub Pages deployment uses a base path — router must respect `BASE_URL`

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-dedicated-input-page-with-accordion-sections*
*Context gathered: 2026-03-19*

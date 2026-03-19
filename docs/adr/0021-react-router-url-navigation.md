# ADR-0021: React Router for URL-Based Navigation

## Status
Accepted

## Date
2026-03-19

## Context
The app uses a single-page architecture with Zustand state driving tab visibility (`Sizing | Topology | Rack Elevation`). There are no URLs — the browser address bar never changes, back/forward buttons do nothing, and pages cannot be deep-linked or bookmarked.

Phase 24 introduces a dedicated full-page input route (`/input`) separate from the results area. This creates a new navigation need that state-based tab switching cannot satisfy cleanly: users need to navigate between the input configuration page and the results/topology/rack pages using browser navigation, TopBar links, and shareable URLs.

A state variable approach (`page: 'main' | 'input'`) would solve the immediate need but leave the existing tab system inconsistent — some navigation URL-based, some state-driven. This hybrid is harder to maintain and extend.

## Decision
Adopt `react-router-dom` as the single navigation layer for the entire application. All top-level views become routes:

| Route | View |
|-------|------|
| `/input` | Dedicated accordion input page |
| `/` | Sizing results (BOM panel) |
| `/topology` | Topology diagram |
| `/rack` | Rack elevation |

The existing `Tabs`/`TabsList`/`TabsTrigger` components are replaced with `NavLink` components from react-router-dom. The `<BrowserRouter>` (or `<HashRouter>` for GitHub Pages compatibility) wraps the app at the root level in `main.tsx`.

GitHub Pages base path (`import.meta.env.BASE_URL`) is passed to the router's `basename` prop to preserve the existing deployment configuration.

## Consequences
- Browser back/forward navigation works across all views
- Routes are deep-linkable and bookmarkable
- The dedicated `/input` route is a first-class citizen alongside existing views
- Tab state (`defaultValue`) migrates to URL — no Zustand state needed for active tab
- The GitHub Pages 404 fallback must handle client-side routing (standard `404.html` redirect approach, or HashRouter which avoids the issue entirely)
- `react-router-dom` adds ~50KB to the bundle (gzipped: ~13KB)
- All existing `Tabs` components in App.tsx are refactored — this is the primary migration cost

# Stack Research

**Domain:** Network sizing / BOM calculator web app (Dell SONiC Leaf-Spine)
**Researched:** 2026-03-16
**Confidence:** HIGH (all versions verified against npm registry)

## Recommended Stack

### Core Technologies (Pre-specified by Engineering Constitution)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | 8.0.0 | Build tool / dev server | Fastest cold-start in class; native ESM; SWC-based transform; zero config for React+TS |
| React | 19.2.4 | UI framework | Latest stable; concurrent rendering; new `use` hook for async; JSX transform no longer needs React import |
| TypeScript | 5.9.3 | Type safety | Strict mode eliminates entire classes of runtime errors; required for equipment interface modeling |
| Zustand | 5.0.12 | Global state management | Minimal boilerplate vs. Redux; built on `useSyncExternalStore` for React 19 concurrent safety; perfect for calculator state |
| Zod | 4.3.6 | Runtime schema validation | 14x faster than Zod v3; 57% smaller bundle; validates physical limits (port counts, cable compatibility) at form boundaries |

### Visualization Libraries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @xyflow/react | 12.10.1 | Topology diagram (Leaf-Spine logical view) | The standard for node-based UIs in React; built-in pan/zoom/minimap; React 19 + Tailwind v4 support confirmed in v12.10; MIT license |
| Recharts | 3.8.0 | BOM summary charts / capacity charts | Pure React+D3; fully declarative JSX API; excellent TypeScript generics for typed data; lightweight (no Canvas); active 2026 releases |
| Custom SVG components | N/A | Rack elevation (physical view) | No mature React-native rack elevation library exists; SVG in JSX is sufficient for static rack diagrams; avoids heavy DCIM dependency |

### Document & Export Libraries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @react-pdf/renderer | 4.3.2 | PDF report generation | Declarative React components produce PDFs; no server round-trip; 860K weekly downloads; v4 actively maintained; best DX for structured BOM reports |
| papaparse | 5.x (via react-papaparse) | CSV export | Fastest in-browser CSV library; TypeScript types included; `jsonToCSV()` covers the BOM export case with a single call |
| react-papaparse | 4.4.0 | React wrapper for papaparse | Provides `useCSVDownloader` hook; UTF-8 BOM option for Excel compatibility; TypeScript-native |

### UI & Forms

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Tailwind CSS | 4.2.1 | Utility-first styling | v4 uses `@tailwindcss/vite` plugin (no PostCSS/config needed); pairs directly with shadcn/ui; required for React Flow UI components |
| @tailwindcss/vite | 4.2.1 | Tailwind v4 Vite integration | Replaces PostCSS approach; single import `@import "tailwindcss"` in CSS |
| shadcn/ui | latest (CLI) | Accessible component primitives | Copy-owned components (not a runtime dep); updated for React 19 + Tailwind v4; provides Table, Form, Select, Card, Badge for BOM UI |
| react-hook-form | 7.71.2 | Form state management | Minimal re-renders; integrates with Zod via `@hookform/resolvers`; handles the sizing input form (server count, rack density, cable type) |
| @hookform/resolvers | 5.2.2 | Zod + react-hook-form bridge | Provides `zodResolver`; syncs Zod schema inferred types with form field types |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vitest | 4.1.0 | Unit testing | Vite-native; runs the pure sizing engine tests; Jest-compatible API; no config needed alongside Vite |
| @testing-library/react | 16.3.2 | Component testing | Tests UI behavior not internals; pairs with Vitest via `jsdom` environment |
| @testing-library/user-event | latest | Interaction simulation | More realistic than `fireEvent`; required for form testing |
| ESLint + typescript-eslint | latest | Linting | Enforces no-`any` rule; catches unsafe type assertions; standard Vite template includes it |

## Installation

```bash
# Core (pre-specified)
npm install react@19 react-dom@19 zustand@5 zod@4

# Visualization
npm install @xyflow/react recharts

# Export & PDF
npm install @react-pdf/renderer papaparse react-papaparse

# Forms & UI
npm install react-hook-form @hookform/resolvers
npm install tailwindcss @tailwindcss/vite
# shadcn/ui via CLI (copy-owned, not runtime dep):
npx shadcn@latest init

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom typescript@5
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @xyflow/react | Cytoscape.js | Only if you need advanced graph algorithms (shortest path, clustering); heavier than React Flow for simple topology |
| @xyflow/react | vis.js / vis-network | Legacy choice; not React-native; requires imperative DOM manipulation; no TypeScript-first API |
| @react-pdf/renderer | jsPDF | Better when: generating PDFs from existing HTML; capturing canvas screenshots; simpler single-page exports without structured layout |
| @react-pdf/renderer | Puppeteer/headless Chrome | Server-only use case; requires Node.js backend; overkill for this pure client app |
| papaparse / react-papaparse | xlsx (SheetJS) | Use xlsx only if Excel `.xlsx` format (not CSV) is explicitly required; 5x larger bundle |
| Recharts | nivo | nivo is better for complex D3-based animations; heavier bundle; overkill for BOM summary tables |
| Recharts | visx | visx is lower-level primitives (Airbnb); requires more manual assembly; better for custom layouts |
| Custom SVG | netbox / rack libraries | netbox is a full DCIM system, not a React component; no lightweight React rack elevation component exists with meaningful adoption |
| Tailwind v4 + shadcn | MUI / Ant Design | MUI/Ant Design are heavyweight runtime component libraries; shadcn copies are tree-shakable and style-customizable |
| react-hook-form | Formik | Formik has higher re-render frequency; react-hook-form is the current community standard |
| Vitest | Jest | Jest requires Babel transform overhead; Vitest shares Vite config natively; faster for this stack |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `reactflow` (old package name) | Deprecated; was renamed to `@xyflow/react` at v12; npm install will still work but points to old v11 | `@xyflow/react` |
| Zod v3 | 14x slower parsing; larger bundle; project constitution specifies Zod | Zod v4 (`zod@4`) |
| `react-pdf` (wojtekmaj) | This is a PDF *viewer* (renders existing PDFs); name collision with `@react-pdf/renderer` (PDF *generator*) | `@react-pdf/renderer` |
| D3 directly | Low-level imperative API fights React's declarative model; coordinate systems and lifecycle management are manual | Recharts (wraps D3) or @xyflow/react |
| `any` type in TypeScript | Project constitution forbids it; defeats Zod schema inferred types | Define interfaces for all equipment models |
| Redux Toolkit | Heavyweight for a single-page calculator; Zustand v5 is already specified | Zustand v5 |
| PostCSS for Tailwind | Tailwind v4 uses `@tailwindcss/vite` plugin instead; PostCSS config is no longer needed | `@tailwindcss/vite` plugin in `vite.config.ts` |

## Stack Patterns by Variant

**For the topology diagram (logical Leaf-Spine view):**
- Use `@xyflow/react` with custom node types for Switch, Spine, OOB nodes
- Nodes carry hardware model metadata via the `data` prop (typed with TypeScript generics)
- Edges carry link-type metadata (DAC/AOC/fiber, speed)
- Layout: use `dagre` or `elk` auto-layout for deterministic positioning (avoid manual x/y coordinates)

**For the rack elevation (physical view):**
- Build a custom SVG component — no library required
- SVG `<rect>` elements represent rack units; each device occupies N rack units
- Pass the BOM array as props; render is pure/deterministic
- Export rack SVG to PDF via `@react-pdf/renderer`'s `<Svg>` component

**For the sizing engine:**
- Pure TypeScript functions: `(SizingInput) => NetworkBOM` — no React, no hooks
- All hardware specs in a typed constants file: `{ ports: number, speed: string, powerW: number }`
- Zod schemas validate input at form boundary only; engine receives already-validated types

**For PDF generation:**
- Compose the report as `@react-pdf/renderer` JSX in a separate `reports/` module
- Render via `pdf(doc).toBlob()` and trigger download with `URL.createObjectURL`
- Embed the React Flow topology snapshot as an SVG image in the PDF

**For CSV export:**
- Use `react-papaparse`'s `useCSVDownloader` hook or call `Papa.unparse(bomRows)` directly
- No need for a download button library — `useCSVDownloader` handles the anchor element

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @xyflow/react@12.10.1 | React 19, Tailwind v4 | Confirmed in React Flow changelog 2025-10-28 |
| recharts@3.8.0 | React 19 | Active releases as of 2026-03; TypeScript generics for `dataKey` |
| @react-pdf/renderer@4.3.2 | Client-side + Node.js | v4 is the current stable; last published 3 months ago |
| tailwindcss@4.2.1 | Vite 8, React 19 | Requires `@tailwindcss/vite` plugin; no `tailwind.config.js` needed |
| zustand@5.0.12 | React 19 | Built on `useSyncExternalStore`; concurrent rendering safe |
| zod@4.3.6 | TypeScript 5.x strict | New `@zod/mini` subpackage for even smaller bundle if needed |
| react-hook-form@7.71.2 | React 19, Zod v4 | Note: `@hookform/resolvers` v5.2.2 — verify `zodResolver` works with Zod v4 (GitHub issue #12829 open as of research date; use standard schema adapter if needed) |
| vitest@4.1.0 | Vite 8 | Shares vite.config.ts; no separate jest config |

## Sources

- https://reactflow.dev/whats-new/2025-10-28 — React Flow v12 React 19 + Tailwind v4 confirmation (MEDIUM confidence — official changelog)
- https://reactflow.dev/whats-new/2026-02-19 — React Flow 12.10.1 latest release (HIGH confidence — official)
- https://github.com/recharts/recharts/releases — Recharts 3.8.0 current version (HIGH confidence — official)
- https://www.npmjs.com/package/@react-pdf/renderer — v4.3.2, 860K weekly downloads (HIGH confidence — npm registry)
- https://zod.dev/v4 — Zod v4 release notes, 14x perf improvement (HIGH confidence — official docs)
- https://github.com/react-hook-form/react-hook-form/issues/12829 — zodResolver Zod v4 compat issue (MEDIUM — open issue, monitor)
- https://tailwindcss.com/docs — Tailwind v4 + Vite plugin install (HIGH confidence — official docs)
- https://ui.shadcn.com/docs/tailwind-v4 — shadcn/ui Tailwind v4 update (HIGH confidence — official docs)
- npm registry — all version numbers verified directly via `npm view` (HIGH confidence)

---
*Stack research for: NetStack — Dell SONiC Leaf-Spine network sizing calculator*
*Researched: 2026-03-16*

# Architecture Reference Document (ARD): NetStack

**Version:** 1.0
**Date:** 2026-03-17
**Status:** Final

---

## 1. Overview

NetStack is a client-side network sizing calculator for Dell Leaf-Spine + OOB infrastructure running SONiC. It answers the question *"How many boxes and cables do I need to order?"* instantly and accurately for any Dell SONiC Leaf-Spine deployment.

**Key characteristics:**

- Pure browser application — no backend, no server-side computation
- Deployed as a static Single-Page Application (SPA) to GitHub Pages
- All sizing calculations run in the browser using a pure TypeScript engine
- Inputs are persisted in browser localStorage — no user accounts or data transfer

---

## 2. System Architecture

NetStack follows a strict four-layer architecture with one-way imports. Each layer only imports from layers to its left — no circular dependencies, no upward imports.

```
Domain Layer (pure TS)  →  Store Layer (Zustand)  →  Feature Layer (React)  →  UI Layer (shadcn/Tailwind)
```

**One-way import rule:**

- Domain layer: no imports from Store or Features
- Store layer: imports from Domain only, never from Features
- Feature layer: may import from Domain and Store
- UI layer: Tailwind utility classes and shadcn components consumed by Feature layer

---

## 3. Domain Layer

**Location:** `src/domain/`

Pure TypeScript — zero React dependencies. Fully testable in Vitest with the `node` environment (no jsdom needed).

### 3.1 Schemas (`src/domain/schemas/`)

Zod v4 schemas are the **single source of truth** for all TypeScript types. Types are always inferred via `z.infer<typeof Schema>` — never declared separately.

- **`input.ts`** — `SizingInputSchema` / `SizingInput`
  - `totalServers`: integer 1–10,000
  - `serversPerRack`: integer 1–48
  - `connectivityType`: `'25G'` | `'100G'`
  - `cableType`: `'DAC'` | `'AOC'` | `'fiber'`
  - `leafModel`: `'S5248F-ON'` | `'S5224F-ON'` | `'S5212F-ON'`

- **`bom.ts`** — `NetworkBOMSchema` / `NetworkBOM`, `ConstraintViolationSchema` / `ConstraintViolation`

### 3.2 Hardware Catalog (`src/domain/catalog/`)

All switch specifications are centralized in typed TypeScript constants. The sizing engine never hardcodes port counts inline — it always reads from `SWITCH_CATALOG`.

- **`hardware.ts`** — `SWITCH_CATALOG` with 5 Dell PowerSwitch models (see Section 6)
- **`cables.ts`** — `CABLE_CATALOG` with DAC, AOC, and fiber cable specifications
- **`types.ts`** — `SwitchSpec` and `CableSpec` interfaces
- **`loader.ts`** — JSON override loader: merges a custom JSON file into the catalog at runtime, enabling new switch models without code changes. Fails fast on the first invalid entry (catalog fail-fast design).

### 3.3 Sizing Engine (`src/domain/engine/`)

**`calculateBOM(input: SizingInput): NetworkBOM`**

The core pure function. Same input always produces the same output. No side effects, no I/O, no global state mutation.

**Sizing formulas:**

```
Racks          = ceil(totalServers / serversPerRack)
Leafs          = 2 × racks                              (redundant ToR pair per rack)
Spines         = max(uplinkPorts, ceil(leafSwitches / spinePortCount))
OOB            = racks × ceil((serversPerRack + 2) / 48)
leafSpineCables = leafSwitches × leafUplinkPorts          (link model, not port sum)
serverLeafCables = totalServers
serverOobCables  = totalServers + leafSwitches
vltCables        = racks × 2                             (VLT interconnect per leaf pair)
oversubscription = (serversPerRack × serverSpeed) / (spineSwitches × uplinkSpeed)
```

**ConstraintViolation discriminated union** — domain errors are typed, never raw strings:

| Code | Trigger | Fields |
|------|---------|--------|
| `OOB_PORT_SATURATION` | `oobPortsRequired > 48` (S3248T-ON capacity) | `required`, `available` |
| `SPINE_CAPACITY_EXCEEDED` | `leafSwitches > SPINE.downlinkPorts` (32) | `leafCount`, `maxLeafs` |
| `DAC_DISTANCE_ADVISORY` | `cableType === 'DAC' && racks > 8` | `rackCount`, `cableType` |

---

## 4. Store Layer

**Location:** `src/store/`

Zustand v5 stores bridge the Domain layer to the React Feature layer.

**Pattern:** Always use `useShallow` from `zustand/shallow` in component selectors to prevent infinite render loops from shallow object comparisons.

### 4.1 `inputStore` (`src/store/inputStore.ts`)

Persisted to browser localStorage under key `netstack-input`.

- Holds the current `SizingInput` object
- Provides `setInput(partial: Partial<SizingInput>)` for partial updates
- Uses a lazy `PersistStorage<InputState>` adapter that accesses `window.localStorage` at call time (not import time) for jsdom compatibility in tests

### 4.2 `resultStore` (`src/store/resultStore.ts`)

Derived store — never persisted. Always computed from `inputStore`.

- Holds `bom: NetworkBOM | null` and `violations: ConstraintViolation[]`
- A **module-level subscription** (not a React `useEffect`) calls `calculateBOM()` whenever `inputStore` changes
- Runs outside the React lifecycle — BOM is always up to date regardless of component mount state
- Initial computation runs at module load to prepopulate the store

---

## 5. Feature Layer

**Location:** `src/features/`

React 19 components organized by feature. Each feature is a self-contained directory with its own components, hooks, and tests.

### 5.1 Sizing (`features/sizing/`)

- **InputForm** — React Hook Form + Zod resolver. Live recalculation on every field change (no submit button). Inline Zod validation error messages.
- **BOMPanel** — Displays `NetworkBOM` from `resultStore`: switch/cable quantities table, oversubscription badge (green/amber/red), port utilization bars, ViolationAlert components.

### 5.2 Topology (`features/topology/`)

- **TopologyTab** — `@xyflow/react` (not deprecated `reactflow`) topology diagram
- Custom node types with role-based colors (blue=leaf, purple=spine, gray=OOB)
- Deterministic 3-tier layout: spines (top), leafs (middle), racks (bottom)
- Border glow indicates saturation: green (healthy), amber (>80%), red (saturated)
- Controls: Fit View, Reset Layout, Legend toggle
- PNG capture for PDF embedding

### 5.3 Rack Elevation (`features/rack-elevation/`)

- **RackElevationTab** — Custom rack elevation view with U-slot numbering
- Rack selector dropdown for multi-rack deployments
- Device placement: OOB at U1, Leaf B at U2, Leaf A at U3
- HTML5 drag-to-reorder devices (not persisted)

### 5.4 Export (`features/export/`)

- **ExportTab** — Export actions panel
- **CSV export** — UTF-8 BOM prefix for Excel compatibility, immediate download
- **PDF export** — `@react-pdf/renderer` (not `react-pdf` viewer), lazy-loaded on first use, multi-page report with BOM summary and sizing inputs
- **Print** — Print stylesheet (Ctrl+P) with clean layout, no navigation chrome

---

## 6. Data Flow

End-to-end flow for a sizing calculation:

```
User Input
    │
    ▼
InputForm (React Hook Form + Zod)
    │  setInput(partial)
    ▼
inputStore (Zustand, localStorage)
    │  module-level subscribe()
    ▼
calculateBOM(SizingInput) → NetworkBOM
    │  setState({ bom, violations })
    ▼
resultStore (Zustand, derived)
    │  useShallow selectors
    ▼
BOMPanel / TopologyTab / RackElevationTab / ExportTab
```

---

## 7. Technology Stack

| Technology | Version | Role |
|------------|---------|------|
| React | 19 | UI framework (strict mode) |
| TypeScript | strict | Language, no `any` |
| Vite | 6 | Build tool, dev server |
| Tailwind CSS | v4 | Styling (`@tailwindcss/vite` plugin, no `tailwind.config.js`) |
| shadcn/ui | latest | UI component library |
| Zustand | v5 | Client state management |
| Zod | v4 | Schema validation, type inference |
| @xyflow/react | latest | Topology diagram |
| @react-pdf/renderer | latest | PDF generation (lazy-loaded) |
| react-hook-form | latest | Form state, validation integration |
| @hookform/resolvers | v5 | Zod adapter for react-hook-form |
| i18next + react-i18next | latest | Internationalization (EN, FR, DE, IT) |
| Vitest | latest | Unit testing (node + jsdom environments) |
| @testing-library/react | latest | Component testing |

---

## 8. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Spine scales with leaf count | Fixed 2-spine topology fails for >32 leafs; formula `max(uplinkPorts, ceil(leafs/32))` handles any scale |
| `oversubscriptionRatio` required on `NetworkBOM` from day 1 | Retrofitting it later would break all BOM consumers |
| `ConstraintViolation` as typed discriminated union | Enables exhaustive `switch(violation.code)` in UI — raw strings cannot be type-safe |
| `mergeCatalog` fails fast on first invalid entry | Matches catalog fail-fast design; partial catalog is more dangerous than no override |
| Empty override returns shallow copy, not original reference | Prevents accidental mutation of the base catalog |
| Oversubscription denominator is `spineSwitches` (not `uplinkPorts`) | Ratio reflects actual deployed topology, not theoretical port count |
| OOB violation fires when `oobPortsRequired > 48` (strictly greater) | Boundary at 46 (no violation) vs 47 (violation); 2 leaf ports consume 2 of 48 OOB ports |
| `vite@6` instead of v8 | `@tailwindcss/vite@4` peer dependency requires `^5.2.0 \|\| ^6 \|\| ^7` |
| `leafModel` as required field (not optional with default) | Forces explicit selection, prevents silent S5248F-ON assumption |
| `resultStore` uses module-level subscribe (not React `useEffect`) | BOM recomputes regardless of component mount state |
| Lazy `PersistStorage` adapter for `inputStore` | `createJSONStorage` captures `localStorage` at import time (broken in jsdom); lazy adapter accesses it at call time |
| `AppContent` split from `App` | `useTranslation()` must run inside `ThemeProvider` wrapper |
| `useForm()` without generic type | Required for `@hookform/resolvers` v5.2.2 + Zod v4 compatibility |
| `xl:` breakpoint (1280px) for side-by-side layout | Tailwind `xl:` maps to 1280px per UI spec |

---

## 9. Testing Strategy

- **Domain layer** (`src/domain/engine/`, `src/domain/catalog/`): Vitest in `node` environment — no jsdom, no React. Unit tests for all `calculateBOM` formulas, catalog merge, and constraint violations.
- **Store layer** (`src/store/`): Vitest in `jsdom` environment. Tests cover store initialization, `setInput` updates, derived recomputation.
- **Feature layer** (`src/features/`): Vitest + React Testing Library in `jsdom` environment. Tests use `data-testid` attributes and `data-severity` for styled component assertions.
- **Test conventions**: `TooltipProvider` wrapper required in test helpers (Radix requires context but App.tsx provides it globally; RTL tests render in isolation).
- **Build verification**: `npx tsc --noEmit` for type-check, `npx vitest run` for all tests.

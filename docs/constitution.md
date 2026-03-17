# Engineering Constitution: NetStack

This constitution defines the technical principles and conventions for the NetStack project.

## 1 Fundamental Principles

- **KISS & YAGNI** — No BGP configuration or complex VLAN management. The tool answers one question: *"How many boxes and cables do I need to order?"*
- **Single Source of Truth** — Dell switch specifications are centralized in `src/domain/catalog/hardware.ts`. Types are inferred from Zod schemas via `z.infer<>`, never declared separately.
- **Immutability** — The sizing engine is a pure function: `calculateBOM(input: SizingInput): NetworkBOM`. No side effects, same input always produces same output.

## 2 Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Build | Vite 6 | `@tailwindcss/vite` plugin, no PostCSS config |
| UI | React 19 | Strict mode |
| Language | TypeScript strict | No `any`, ever |
| State | Zustand v5 | `inputStore` (persisted) + `resultStore` (derived) |
| Validation | Zod v4 | Schemas as single source of truth for types |
| Styling | Tailwind CSS v4 | Utility-first, dark mode via class strategy |
| Diagrams | @xyflow/react | Topology visualization (not deprecated `reactflow`) |
| PDF | @react-pdf/renderer | In-browser PDF generation (lazy-loaded) |
| Forms | react-hook-form + @hookform/resolvers | Zod integration |
| i18n | i18next + react-i18next | FR, EN, DE, IT with browser detection |
| Testing | Vitest + Testing Library | Domain tests in node env, component tests in jsdom |

## 3 Project Structure

```
src/
├── domain/                 # Pure TypeScript — zero React dependencies
│   ├── catalog/
│   │   ├── hardware.ts     # SWITCH_CATALOG — Dell switch specs
│   │   ├── cables.ts       # CABLE_CATALOG — cable specs
│   │   ├── types.ts        # SwitchSpec, CableSpec interfaces
│   │   └── loader.ts       # JSON override loader for extensibility
│   ├── schemas/
│   │   ├── input.ts        # SizingInput Zod schema
│   │   └── bom.ts          # NetworkBOM, ConstraintViolation schemas
│   └── engine/
│       └── sizing.ts       # calculateBOM() — core sizing logic
├── store/
│   ├── inputStore.ts       # User inputs (persisted to localStorage)
│   └── resultStore.ts      # Derived BOM (recomputed via subscription)
├── features/               # React components organized by feature
│   ├── sizing/             # BOM panel, input form
│   └── placeholder/        # Placeholder tabs (topology, rack, export)
├── components/             # Shared UI components (shadcn/ui patterns)
├── i18n/                   # Translation files (en, fr, de, it)
└── lib/                    # Utility functions (cn, etc.)
```

## 4 Import Rules

Strict one-way dependency flow:

```
Domain (pure TS) → Store (Zustand) → Features (React)
```

- Domain layer must never import from Store or Features
- Store may import from Domain but not Features
- Features may import from both Domain and Store

## 5 Key Conventions

- **Zustand selectors** — Always use `useShallow` from `zustand/shallow` to prevent infinite render loops
- **Constraint violations** — Typed discriminated unions (`OOB_PORT_SATURATION`, `SPINE_CAPACITY_EXCEEDED`, `DAC_DISTANCE_ADVISORY`), never raw strings
- **Hardware catalog** — All port counts and power specs come from `SWITCH_CATALOG`, never hardcoded inline in formulas
- **Cable calculations** — Based on link counts, not port sums (avoids off-by-2 errors)
- **Oversubscription** — Required field on every BOM output

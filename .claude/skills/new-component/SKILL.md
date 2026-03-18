---
name: new-component
description: Scaffold a new React feature component following NetStack conventions (Zustand + useShallow + i18next + Tailwind)
disable-model-invocation: true
---

# new-component

Scaffold a new React component following project conventions.

## Usage

`/new-component <ComponentName> [--feature <feature-dir>]`

Example: `/new-component ConvergedExportPanel --feature export`

## Process

1. Determine target directory from `--feature` flag or infer from component name:
   - `*Form*`, `*Panel*`, `*Page*` → `src/features/sizing/`
   - `*Topology*` → `src/features/topology/`
   - `*Rack*`, `*Elevation*` → `src/features/rack-elevation/`
   - `*Export*` → `src/features/export/`
   - Otherwise → `src/components/`

2. Read an existing component in the target directory to match patterns:
   - Import style (named exports, no default exports)
   - Zustand store usage (`useShallow` from `zustand/shallow` — MANDATORY)
   - i18n pattern (`useTranslation` from `react-i18next`)
   - Tailwind classes (no CSS modules)
   - shadcn/ui components (`@/components/ui/*`)

3. Generate component file with:
   - Named export function (not arrow)
   - `useTranslation()` hook
   - Zustand store subscription with `useShallow`
   - Proper TypeScript interface for props (if any)
   - Tailwind styling

4. Add i18n keys to all 4 locale files (EN, FR, DE, IT) under the appropriate namespace

5. Update barrel export (`index.ts`) if one exists in the target directory

## Conventions

- No `any` — TypeScript strict
- No default exports — named exports only
- Always `useShallow` with Zustand selectors
- Component names are PascalCase
- File names match component names exactly

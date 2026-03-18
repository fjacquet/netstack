# Phase 2: App Shell and Input Form - Research

**Researched:** 2026-03-17
**Domain:** React SPA scaffolding — Vite, React 19, Zustand v5, shadcn/ui, react-hook-form, react-i18next, Tailwind v4, GitHub Pages CI/CD
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Language switching**

- Default language detected from browser locale; fall back to EN if locale is not FR/DE/IT
- Language switcher is a dropdown in the header/navbar (top-right area), always visible
- Full UI + labels translated: all buttons, labels, tooltips, error messages, empty states — but technical terms (S5248F-ON, DAC, 25G, QSFP28) stay in English
- Language choice persisted to localStorage so it survives page reloads

**App shell structure**

- Tabbed layout with 4 tabs: Sizing (Input + BOM), Topology, Rack Elevation, Export
- The Sizing tab shows input form and results side-by-side (form on the left, results on the right)
- Topology, Rack Elevation, and Export tabs are empty placeholders in Phase 2 — filled in Phases 3-4
- Top bar contains: app logo/title, tab navigation, language switcher, theme toggle

**Form layout**

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

### Deferred Ideas (OUT OF SCOPE)

- ADR (Architecture Decision Record) document — user wants to redact this, noted for Documentation phase (Phase 4, DOC-01)
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SIZE-01 | User can input total server count, servers per rack, and connectivity type (25G/100G) | react-hook-form + zodResolver + SizingInputSchema; all form field patterns documented below |
| UX-01 | Light/dark mode toggle with system preference detection | ThemeProvider pattern from shadcn/ui official docs; Tailwind v4 @custom-variant dark directive |
| UX-02 | Internationalization support for FR, EN, DE, IT with language switcher | react-i18next + i18next-browser-languagedetector; localStorage caching of locale |
| UX-03 | Responsive layout for tablet and desktop viewports | Tailwind v4 responsive breakpoints; UI-SPEC defines 768px stacked / 1280px side-by-side |
| UX-04 | GitHub Pages deployment with GitHub Actions CI/CD pipeline | Official Vite GitHub Pages workflow YAML documented below |
</phase_requirements>

---

## Summary

Phase 2 scaffolds the entire browser application on top of the Phase 1 domain layer. The key challenge is wiring together five distinct subsystems — Vite + React, Zustand stores, react-hook-form with Zod v4, shadcn/ui component library, and react-i18next — correctly on the first attempt, before any React code exists. Each subsystem has one or two initialization gates (shadcn `init`, i18n bootstrap file, ThemeProvider wrapper) that must happen in the right order or later components break silently.

The most critical research finding is the **@hookform/resolvers v5 + Zod v4 compatibility issue** flagged in STATE.md. As of @hookform/resolvers v5.2.2, the issue is resolved when you do NOT pass a generic type argument to `useForm` — let the resolver infer types from the schema. Passing `useForm<z.infer<T>>()` causes TypeScript errors; `useForm()` with `resolver: zodResolver(schema)` works correctly. This is the only non-obvious pitfall in the entire stack.

Tailwind v4 removes the `darkMode: 'class'` config option; dark mode is now configured via `@custom-variant dark (&:where(.dark, .dark *))` in the main CSS file. The shadcn/ui ThemeProvider pattern toggles the `dark` class on `<html>` — these two must align. GitHub Pages deployment uses the official Vite workflow with `actions/upload-pages-artifact@v4` and `actions/deploy-pages@v4` — no third-party deploy actions needed.

**Primary recommendation:** Initialize shadcn/ui first (`npx shadcn@latest init`), install all required packages in one pass, create the ThemeProvider and i18n bootstrap before any feature components. This order prevents partial initialization states.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.4 | UI rendering | Current LTS; shadcn/ui requires React 18+ |
| vite | 8.0.0 | Build tool + dev server | Project decision; fastest HMR for SPA |
| @vitejs/plugin-react | 6.0.1 | React JSX + Fast Refresh in Vite | Official plugin for React + Vite |
| typescript | 5.9.3 | Type safety | Project convention: strict mode, no any |
| zustand | 5.0.12 | Global state management | Chosen in Phase 1 architecture |
| zod | 4.3.6 | Schema validation | Phase 1 foundation; SizingInputSchema already exists |
| react-hook-form | 7.71.2 | Form state + validation | Industry standard for uncontrolled forms; minimal re-renders |
| @hookform/resolvers | 5.2.2 | Zod adapter for react-hook-form | Official bridge; v5.2.2 resolves Zod v4 type issue |
| tailwindcss | 4.2.1 | Utility CSS | Project decision; v4 via @tailwindcss/vite plugin |
| @tailwindcss/vite | 4.2.1 | Tailwind v4 Vite plugin | No PostCSS required — single Vite plugin |
| shadcn/ui (CLI) | 4.0.8 | Copy-owned UI component library | UI-SPEC decision; Radix UI primitives |
| lucide-react | bundled | Icon library | Bundled with shadcn/ui; Sun/Moon/AlertCircle icons needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-i18next | 16.5.8 | React i18n bindings | Wraps i18next with React hooks; useTranslation hook |
| i18next | 25.8.18 | i18n core engine | Runtime translation resolution |
| i18next-browser-languagedetector | 8.2.1 | Browser locale detection + localStorage caching | Detects navigator.language; caches to localStorage |
| @testing-library/react | 16.3.2 | React component testing | Standard for component tests in Vitest |
| @testing-library/user-event | 14.6.1 | User interaction simulation | More realistic than fireEvent |
| jsdom | 29.0.0 | DOM simulation for Vitest | Required for jsdom test environment |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-i18next | @lingui/react, next-intl | react-i18next has the widest React ecosystem adoption; built-in LanguageDetector plugin handles localStorage persistence automatically |
| shadcn/ui ThemeProvider | next-themes | next-themes is designed for Next.js; shadcn/ui docs provide a standalone ThemeProvider for Vite — no extra dependency needed |
| derive-zustand | manual subscribe | derive-zustand is clean but adds a dependency; manual `store.subscribe()` call in a module-level setup is zero-dep and easy to understand |

**Installation (after shadcn init):**

```bash
npm install react react-dom @vitejs/plugin-react
npm install zustand react-hook-form @hookform/resolvers
npm install react-i18next i18next i18next-browser-languagedetector
npm install --save-dev @testing-library/react @testing-library/user-event jsdom
```

**Version verification (confirmed 2026-03-17 against npm registry):**

```
react                            19.2.4
vite                              8.0.0
@vitejs/plugin-react              6.0.1
zustand                           5.0.12
react-hook-form                   7.71.2
@hookform/resolvers               5.2.2
react-i18next                    16.5.8
i18next                          25.8.18
i18next-browser-languagedetector  8.2.1
@testing-library/react           16.3.2
@testing-library/user-event      14.6.1
jsdom                            29.0.0
shadcn (CLI)                      4.0.8
tailwindcss                       4.2.1
@tailwindcss/vite                 4.2.1
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── domain/              # Existing Phase 1 — pure TS, no React (DO NOT MODIFY)
│   ├── catalog/
│   ├── engine/
│   └── schemas/
├── store/               # Zustand stores (new in Phase 2)
│   ├── inputStore.ts    # persisted to localStorage via persist middleware
│   └── resultStore.ts   # derived — recomputed from inputStore via subscribe
├── features/            # React components by feature (new in Phase 2)
│   └── sizing/
│       ├── SizingPage.tsx       # Side-by-side layout container
│       ├── InputForm.tsx        # react-hook-form + shadcn Form
│       └── ResultsPlaceholder.tsx
├── components/          # Shared components (new in Phase 2)
│   ├── theme-provider.tsx       # ThemeProvider + useTheme
│   ├── TopBar.tsx
│   ├── LanguageSwitcher.tsx
│   └── ui/              # shadcn/ui copy-owned components (generated by CLI)
├── i18n/                # i18n bootstrap + locale JSON files
│   ├── index.ts         # i18n initialization (imported in main.tsx before App)
│   └── locales/
│       ├── en/translation.json
│       ├── fr/translation.json
│       ├── de/translation.json
│       └── it/translation.json
├── App.tsx              # ThemeProvider + I18nextProvider + root layout
├── main.tsx             # Entry point — imports ./i18n/index before App
└── index.css            # Tailwind v4 directives + shadcn CSS variables + dark mode variant
```

### Pattern 1: shadcn/ui Initialization Gate

**What:** shadcn/ui CLI must be initialized before any component code is written. It creates `components.json` and generates the initial `src/components/ui/` directory.
**When to use:** First task of Phase 2, before any other work.
**Example:**

```bash
# Source: https://ui.shadcn.com/docs/installation/vite
npx shadcn@latest init
# Select: TypeScript, Tailwind CSS v4, src/index.css, default style, neutral, CSS variables enabled

# Then add all required components for Phase 2:
npx shadcn@latest add tabs card form input select label badge button separator dropdown-menu toggle
```

### Pattern 2: Tailwind v4 Dark Mode via @custom-variant

**What:** Tailwind v4 removes the `darkMode: 'class'` config option. Class-based dark mode is now declared in CSS.
**When to use:** In `src/index.css` alongside shadcn CSS variable definitions.
**Example:**

```css
/* Source: https://tailwindcss.com/docs/dark-mode */
@import "tailwindcss";

/* Enable class-based dark mode — matches .dark on <html> */
@custom-variant dark (&:where(.dark, .dark *));

/* shadcn CSS variable tokens follow here */
```

### Pattern 3: ThemeProvider (shadcn/ui Vite variant)

**What:** Context-based theme provider that toggles `.dark` class on `<html>`, reads/writes localStorage.
**When to use:** Wrap root App. Use `storageKey="netstack-theme"` per UI-SPEC.
**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/dark-mode/vite
// src/components/theme-provider.tsx

type Theme = "dark" | "light" | "system"

export function ThemeProvider({ children, defaultTheme = "system", storageKey = "vite-ui-theme", ...props }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)
      return
    }
    root.classList.add(theme)
  }, [theme])

  // setTheme writes to localStorage + updates state
  // ...
}
```

### Pattern 4: react-i18next Bootstrap

**What:** i18n must be initialized before the React tree renders. Import the bootstrap module in `main.tsx` BEFORE importing `App`.
**When to use:** `src/i18n/index.ts` — required boilerplate.
**Example:**

```typescript
// Source: https://react.i18next.com/guides/quick-start
// src/i18n/index.ts
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import enTranslation from "./locales/en/translation.json"
import frTranslation from "./locales/fr/translation.json"
import deTranslation from "./locales/de/translation.json"
import itTranslation from "./locales/it/translation.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      fr: { translation: frTranslation },
      de: { translation: deTranslation },
      it: { translation: itTranslation },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "de", "it"],
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "netstack-locale",   // matches UI-SPEC
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  })

export default i18n
```

```typescript
// src/main.tsx — import order is critical
import "./i18n/index"   // MUST come before App
import App from "./App"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
)
```

### Pattern 5: Zustand inputStore (persisted) + resultStore (derived)

**What:** inputStore persists user inputs to localStorage. resultStore is a module-level subscribe that recomputes on every inputStore change — never persisted.
**When to use:** Both stores in `src/store/`.
**Example:**

```typescript
// Source: https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data
// src/store/inputStore.ts
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { SizingInput } from "@/domain/schemas/input"

interface InputState {
  input: SizingInput
  setInput: (input: Partial<SizingInput>) => void
}

const DEFAULT_INPUT: SizingInput = {
  totalServers: 48,
  serversPerRack: 16,
  connectivityType: "25G",
  cableType: "DAC",
  leafModel: "S5248F-ON",   // NOTE: add leafModel to SizingInputSchema if not present
}

export const useInputStore = create<InputState>()(
  persist(
    (set) => ({
      input: DEFAULT_INPUT,
      setInput: (partial) => set((state) => ({ input: { ...state.input, ...partial } })),
    }),
    { name: "netstack-input", storage: createJSONStorage(() => localStorage) }
  )
)
```

```typescript
// src/store/resultStore.ts
import { create } from "zustand"
import { calculateBOM } from "@/domain/engine/sizing"
import type { NetworkBOM } from "@/domain/schemas/bom"
import { useInputStore } from "./inputStore"

interface ResultState {
  bom: NetworkBOM | null
}

export const useResultStore = create<ResultState>()(() => ({ bom: null }))

// Module-level subscription — recomputes whenever inputStore changes
// No React component needed; runs outside the React lifecycle
useInputStore.subscribe((state) => {
  const bom = calculateBOM(state.input)
  useResultStore.setState({ bom })
})
```

```typescript
// Component usage — ALWAYS use useShallow to prevent infinite re-renders
// Source: CLAUDE.md project conventions
import { useShallow } from "zustand/shallow"

const { totalServers } = useInputStore(useShallow((s) => ({ totalServers: s.input.totalServers })))
```

### Pattern 6: react-hook-form + zodResolver + Zod v4 (CRITICAL)

**What:** Using shadcn Form components with react-hook-form and zodResolver. The critical rule: do NOT pass generic type to useForm when using Zod v4.
**When to use:** InputForm component.
**Example:**

```typescript
// Source: https://ui.shadcn.com/docs/forms/react-hook-form
// CONFIRMED: @hookform/resolvers v5.2.2 resolves Zod v4 type issue when useForm has no explicit generic
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { SizingInputSchema } from "@/domain/schemas/input"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export function InputForm() {
  // CORRECT: no generic argument — types inferred from schema
  const form = useForm({
    resolver: zodResolver(SizingInputSchema),
    defaultValues: { totalServers: 48, serversPerRack: 16, connectivityType: "25G", cableType: "DAC" },
    mode: "onChange",   // triggers validation on every change for live recalculation
  })

  // Watch all fields for live recalculation
  const values = form.watch()
  // Use useEffect to push valid values to inputStore

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="totalServers"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("totalServers")}</FormLabel>
            <FormControl>
              <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
            </FormControl>
            <FormMessage />   {/* renders Zod error automatically */}
          </FormItem>
        )}
      />
      {/* Select fields use Controller pattern — see Code Examples section */}
    </Form>
  )
}
```

### Pattern 7: GitHub Pages CI/CD Workflow

**What:** Official Vite GitHub Actions workflow for static deployment.
**When to use:** `.github/workflows/deploy.yml`
**Example:**

```yaml
# Source: https://vite.dev/guide/static-deploy#github-pages
name: Deploy to GitHub Pages
on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: './dist'
      - id: deployment
        uses: actions/deploy-pages@v4
```

Also set `base` in `vite.config.ts` to match the repo name:

```typescript
// vite.config.ts
export default defineConfig({
  base: '/network-sizer/',   // matches GitHub repo name
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

### Anti-Patterns to Avoid

- **Passing generic to useForm with Zod v4:** `useForm<z.infer<T>>()` causes TypeScript incompatibility. Use `useForm()` with no generic and let zodResolver infer types.
- **Importing i18n after App:** The `i18n/index.ts` module MUST be imported before App renders or translations will be undefined on first render.
- **Using tailwind.config.js with v4:** Tailwind v4 does not use `tailwind.config.js`. All configuration (dark mode variant, custom tokens) goes in CSS.
- **Persisting resultStore:** resultStore must never go through persist middleware — it is purely derived state. Persisting it creates stale-data bugs on page reload.
- **useShallow omitted on Zustand selectors:** Without `useShallow`, object selectors cause infinite re-renders because Zustand returns a new object reference on every store update.
- **Hardcoding dropdown options:** UI-SPEC requires Select options sourced from `SWITCH_CATALOG` and `CABLE_CATALOG`, not hardcoded strings. This keeps form in sync with catalog.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation + error display | Custom validation state | react-hook-form + zodResolver | Handles touched state, blur vs change modes, async validation, re-render optimization |
| localStorage persistence for Zustand | Manual localStorage.setItem in actions | Zustand `persist` middleware | Handles hydration, version migration, partial state persistence |
| i18n locale detection from browser | Manual navigator.language parsing | i18next-browser-languagedetector | Handles language tag normalization (en-US → en), multiple detection sources, cache invalidation |
| Dark mode class toggle + system preference | Manual className juggling | shadcn ThemeProvider pattern | Handles FOUC prevention, system preference media query, storage sync |
| UI component accessibility | Custom Radix-like primitives | shadcn/ui components | Radix primitives handle keyboard navigation, ARIA roles, focus management, screen reader announcement |
| Icon set | SVG icon components | lucide-react | Tree-shakeable; consistent 24px grid; Sun/Moon/AlertCircle all present |

**Key insight:** Every item in this list has significant edge cases (hydration flash, ARIA live regions, locale tag normalization) that take hours to debug. The libraries exist precisely because these problems are harder than they look.

---

## Common Pitfalls

### Pitfall 1: @hookform/resolvers + Zod v4 TypeScript Error

**What goes wrong:** TypeScript error "Argument of type ZodObject is not assignable to parameter type Zod3Type" when calling `zodResolver(SizingInputSchema)`.
**Why it happens:** @hookform/resolvers v5 had an internal Zod type detection issue. Fixed in v5.2.2 when `useForm` is called without a generic type argument.
**How to avoid:** Use `const form = useForm({ resolver: zodResolver(schema), ... })` — no `<T>` generic. Confirmed working with @hookform/resolvers 5.2.2 + zod 4.3.6.
**Warning signs:** TypeScript errors mentioning `Zod3Type`, `typeName`, or `_input`/`_output` type mismatches.

### Pitfall 2: shadcn components.json Missing Before Component Adds

**What goes wrong:** `npx shadcn@latest add button` fails or generates into wrong directory.
**Why it happens:** shadcn CLI reads `components.json` to know where to write files and which CSS variables to use. If it doesn't exist, the CLI will re-run init interactively.
**How to avoid:** Always run `npx shadcn@latest init` and confirm `components.json` exists in project root before any `add` commands.
**Warning signs:** CLI prompts for init config when running `add`; files generated to unexpected paths.

### Pitfall 3: Tailwind v4 Dark Mode Class Not Applied

**What goes wrong:** `dark:` classes in components have no effect even though `.dark` is on `<html>`.
**Why it happens:** Tailwind v4 removed `darkMode: 'class'` from config. Without the `@custom-variant dark` directive in CSS, the `dark:` variant is treated as an unknown variant and stripped.
**How to avoid:** Add `@custom-variant dark (&:where(.dark, .dark *));` to `src/index.css` immediately after `@import "tailwindcss";`.
**Warning signs:** Dark mode toggle changes localStorage and HTML class but no visual change in styles.

### Pitfall 4: SizingInputSchema Missing leafModel Field

**What goes wrong:** InputForm has a Leaf Model dropdown but SizingInputSchema only has `connectivityType`, `cableType`, `totalServers`, `serversPerRack`. Zod validation will strip the `leafModel` field.
**Why it happens:** The existing `SizingInputSchema` in `src/domain/schemas/input.ts` does not include `leafModel`. The sizing engine currently uses the hardcoded `SWITCH_CATALOG['S5248F-ON']` alias.
**How to avoid:** Phase 2 must extend `SizingInputSchema` to add `leafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON'])` and update `calculateBOM()` to use `input.leafModel` instead of the hardcoded alias. This is a planned Phase 2 task.
**Warning signs:** leafModel dropdown value disappears on form resubmit; engine always uses S5248F-ON regardless of user selection.

### Pitfall 5: i18n Not Initialized Before First Render

**What goes wrong:** Translation keys render as raw key strings (e.g., "totalServers") on first load, then update after hydration.
**Why it happens:** React renders synchronously; if i18n is async-initialized (via http-backend plugin), translations are unavailable on first render.
**How to avoid:** Bundle translations directly as JSON imports (not http-backend). Import `./i18n/index` as the FIRST import in `main.tsx`. This ensures synchronous initialization before React tree renders.
**Warning signs:** Flash of translation keys on page load; keys visible for a brief moment before translations appear.

### Pitfall 6: Number Input Type Coercion

**What goes wrong:** `totalServers` and `serversPerRack` are `z.number()` fields, but `<input type="number">` returns a string via `onChange`. Zod validation fails with "Expected number, received string."
**Why it happens:** React's `onChange` event on `<input type="number">` returns `e.target.value` as a string, not a number.
**How to avoid:** In the `render` prop of FormField, coerce the value: `field.onChange(Number(e.target.value))`. Alternatively use `z.coerce.number()` in the schema (but this changes schema semantics — prefer explicit coercion in the component).
**Warning signs:** Valid-looking numbers fail Zod validation; error messages say "Expected number, received string."

### Pitfall 7: Zustand useShallow Omission Causing Infinite Render Loops

**What goes wrong:** Component re-renders on every store update regardless of whether the selected slice changed.
**Why it happens:** When selecting an object from Zustand without `useShallow`, a new object reference is returned on every state update. React treats new references as changed values, triggering re-renders.
**How to avoid:** Always use `import { useShallow } from "zustand/shallow"` when selecting multiple properties from a Zustand store. Per CLAUDE.md project convention.
**Warning signs:** Browser performance tab shows continuous re-renders; React DevTools shows component updating when no data changed.

---

## Code Examples

Verified patterns from official sources:

### Select Field with react-hook-form + shadcn

```typescript
// Source: https://ui.shadcn.com/docs/forms/react-hook-form
import { Controller } from "react-hook-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"

<FormField
  control={form.control}
  name="connectivityType"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t("connectivityType")}</FormLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <FormControl>
          <SelectTrigger aria-invalid={!!form.formState.errors.connectivityType}>
            <SelectValue placeholder={t("selectConnectivity")} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="25G">25G (SFP28)</SelectItem>
          <SelectItem value="100G">100G (QSFP28)</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Leaf Model Dropdown Sourced from Catalog

```typescript
// Source: CLAUDE.md — "form dropdowns should source options from catalog, not hardcode"
import { SWITCH_CATALOG } from "@/domain/catalog/hardware"

const LEAF_MODELS = ["S5248F-ON", "S5224F-ON", "S5212F-ON"] as const

// In the SelectContent:
{LEAF_MODELS.map((model) => (
  <SelectItem key={model} value={model}>{model}</SelectItem>
))}
```

### i18next Language Switch

```typescript
// Source: https://react.i18next.com/guides/quick-start
import { useTranslation } from "react-i18next"

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const locales = ["en", "fr", "de", "it"] as const

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost">{i18n.language.toUpperCase()}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {locales.map((lng) => (
          <DropdownMenuItem key={lng} onClick={() => i18n.changeLanguage(lng)}>
            {lng.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Vitest + jsdom + RTL Configuration

```typescript
// Source: https://vitest.dev/config/
// vite.config.ts additions for Phase 2 testing
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  base: "/network-sizer/",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
})
```

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => { cleanup() })
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `darkMode: 'class'` in tailwind.config.js | `@custom-variant dark` in CSS | Tailwind v4 (2025) | Config file eliminated; CSS is the only configuration surface |
| `import from "zod"` with useForm generic | `useForm()` without generic + zodResolver infers types | @hookform/resolvers v5.2.2 (July 2025) | Resolved TypeScript incompatibility with Zod v4 |
| `peaceiris/actions-gh-pages` action | Official `actions/deploy-pages@v4` | GitHub 2023+ | First-party action; no external token required |
| tailwindcss-animate plugin | `tw-animate-css` | Tailwind v4 | Plugin API changed; tw-animate-css is the v4-compatible replacement |
| `npx create-vite` + manual shadcn setup | `npx shadcn@latest init -t vite` | shadcn 2024+ | Init handles Vite project scaffolding including Tailwind v4 |

**Deprecated/outdated:**

- `tailwind.config.js`: Not used in Tailwind v4 for theme or dark mode configuration
- `postcss.config.js` for Tailwind: Replaced by `@tailwindcss/vite` plugin; PostCSS no longer needed
- `@testing-library/jest-dom` without `/vitest` suffix: Use `@testing-library/jest-dom/vitest` for Vitest compatibility
- `reactflow` package: Project uses `@xyflow/react` (not needed in Phase 2, but relevant for Phase 4)

---

## Open Questions

1. **Does SizingInputSchema need a leafModel field?**
   - What we know: The UI-SPEC defines a Leaf Model dropdown sourced from the catalog. The current `SizingInputSchema` has no `leafModel` field. `calculateBOM()` uses a hardcoded `S5248F-ON` alias.
   - What's unclear: Whether Phase 2 should extend the domain schema (touching Phase 1 code) or defer leafModel to Phase 3 BOM output.
   - Recommendation: Extend `SizingInputSchema` in Phase 2 — the form field exists and must write to the store. This is the right time to close that gap. Update `calculateBOM()` to use `SWITCH_CATALOG[input.leafModel]` for the LEAF alias.

2. **tsconfig.json path alias (@) missing**
   - What we know: The current `tsconfig.json` has no `paths` configuration for `@`. The `vite.config.ts` does not exist yet (project only has TypeScript domain code currently).
   - What's unclear: Whether to use `@` or a different alias.
   - Recommendation: Add standard `@` alias in both `tsconfig.json` (paths) and `vite.config.ts` (resolve.alias). shadcn/ui components expect `@/components/ui/...` imports.

3. **Vite base path for GitHub Pages**
   - What we know: The repo is at `github.com/fjacquet/network-sizer`; GitHub Pages URL would be `fjacquet.github.io/network-sizer/`.
   - What's unclear: Whether the GitHub Pages source is the repo root or a subdirectory.
   - Recommendation: Set `base: '/network-sizer/'` in vite.config.ts. If the repo is configured for a custom domain or as a user page, set `base: '/'` instead.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vite.config.ts` (test.environment + test.setupFiles — does NOT exist yet, Wave 0 gap) |
| Quick run command | `npx vitest run src/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIZE-01 | InputForm renders all 5 fields and submits valid data to store | unit | `npx vitest run src/features/sizing/InputForm.test.tsx -x` | Wave 0 |
| SIZE-01 | Zod validation error messages appear on invalid input | unit | `npx vitest run src/features/sizing/InputForm.test.tsx -x` | Wave 0 |
| SIZE-01 | Valid form input triggers calculateBOM and updates resultStore | unit | `npx vitest run src/store/resultStore.test.ts -x` | Wave 0 |
| UX-01 | ThemeProvider initializes from localStorage on load | unit | `npx vitest run src/components/theme-provider.test.tsx -x` | Wave 0 |
| UX-01 | Theme toggle switches .dark class on document.documentElement | unit | `npx vitest run src/components/theme-provider.test.tsx -x` | Wave 0 |
| UX-02 | Language switcher changes i18n.language and updates UI text | unit | `npx vitest run src/components/LanguageSwitcher.test.tsx -x` | Wave 0 |
| UX-02 | Language preference persists across re-mount (localStorage) | unit | `npx vitest run src/components/LanguageSwitcher.test.tsx -x` | Wave 0 |
| UX-03 | SizingPage renders side-by-side at 1280px, stacked at 768px | smoke | `npx vitest run src/features/sizing/SizingPage.test.tsx -x` | Wave 0 |
| UX-04 | GitHub Actions workflow file exists and passes CI syntax check | manual | Manual review of `.github/workflows/deploy.yml` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vite.config.ts` — add `test: { globals: true, environment: "jsdom", setupFiles: ["./src/test/setup.ts"] }`
- [ ] `src/test/setup.ts` — RTL + jest-dom setup
- [ ] `src/features/sizing/InputForm.test.tsx` — covers SIZE-01
- [ ] `src/store/resultStore.test.ts` — covers SIZE-01 live recalculation
- [ ] `src/components/theme-provider.test.tsx` — covers UX-01
- [ ] `src/components/LanguageSwitcher.test.tsx` — covers UX-02
- [ ] `src/features/sizing/SizingPage.test.tsx` — covers UX-03 layout

Framework install additions needed:

```bash
npm install --save-dev @testing-library/react @testing-library/user-event jsdom @testing-library/jest-dom
```

---

## Sources

### Primary (HIGH confidence)

- shadcn/ui official docs (ui.shadcn.com/docs) — Vite installation, dark mode ThemeProvider, form with react-hook-form patterns
- Tailwind CSS official docs (tailwindcss.com/docs/dark-mode) — `@custom-variant dark` directive for v4
- Vite official docs (vite.dev/guide/static-deploy) — GitHub Pages deployment workflow YAML
- react-i18next official docs (react.i18next.com) — quick start, initialization pattern, useTranslation hook
- npm registry (2026-03-17) — verified current versions of all packages listed in Standard Stack

### Secondary (MEDIUM confidence)

- github.com/react-hook-form/resolvers/issues/813 — Zod v4 type compatibility resolution confirmed in v5.2.2; workaround verified via multiple reporter confirmations
- github.com/colinhacks/zod/issues/4992 — Closed COMPLETED; `useForm()` without generic resolves type issues with Zod v4
- github.com/zustandjs/derive-zustand — derived store pattern reference
- zustand.docs.pmnd.rs persist middleware — createJSONStorage localStorage pattern

### Tertiary (LOW confidence)

- Various community blog posts on react-i18next Vite setup — cross-verified with official docs; used only for configuration ordering guidance

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions verified against npm registry 2026-03-17
- Architecture: HIGH — patterns drawn from official shadcn/ui, Vite, react-i18next docs
- Pitfalls: HIGH — Zod v4 + hookform issue verified via GitHub issues; Tailwind v4 dark mode verified via official docs; other pitfalls verified via project conventions (CLAUDE.md) or official docs
- GitHub Pages workflow: HIGH — copied verbatim from official Vite deploy guide

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (30-day estimate — stack is moderately stable; @hookform/resolvers patch releases may affect Zod v4 behavior)

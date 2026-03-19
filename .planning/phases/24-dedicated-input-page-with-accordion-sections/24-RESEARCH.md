# Phase 24: Dedicated Input Page with Accordion Sections - Research

**Researched:** 2026-03-19
**Domain:** React Router v7, shadcn/ui Accordion, form refactoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Dedicated input page at `/input` route — full page, no BOM alongside it
- BOM panel at `/` — Results-only, InputForm removed from sidebar
- Live updates preserved — results still recalculate on every input change
- No "Edit inputs" button in BOM area
- Full React Router integration (`react-router-dom`) — all tabs become URL routes
- GitHub Pages base path handling preserved (`import.meta.env.BASE_URL`)
- Browser back/forward button works between pages
- TopBar gets a dedicated "Configure" or "Inputs" icon button
- All 3 modes (Ethernet, FC, Converged) get the accordion input page in this phase
- Mode switching from TopBar ModeSelector updates the form content within `/input`
- Topology selector (Clos vs Three-Tier) remains within the Ethernet form

**Route table (locked):**
- `/input` — dedicated accordion input page
- `/` — Sizing Results (BOM panel)
- `/topology` — Topology diagram
- `/rack` — Rack Elevation

**Ethernet accordion sections (locked):**
1. Rack Config (open by default)
2. Switch Selection (collapsed)
3. Advanced (collapsed)

**FC accordion sections (locked):**
1. Rack Config (open by default)
2. Fabric Config (collapsed)
3. Advanced (collapsed)

**Converged accordion sections (locked, 4 sections):**
1. Rack Config (open by default)
2. Ethernet Switches (collapsed)
3. FC Fabric (collapsed)
4. Advanced (collapsed)

**Accordion default state:** First section open, all others collapsed. No localStorage persistence.

### Claude's Discretion

- Accordion component implementation (shadcn/ui Accordion via `npx shadcn add accordion`)
- Exact icon choice for the TopBar "Configure" button (`SlidersHorizontal` recommended)
- Animation/transition for accordion open/close
- How router handles GitHub Pages 404 fallback
- Whether to use `HashRouter` (simpler for GitHub Pages) or `BrowserRouter` + 404 handling

**UI-SPEC resolution:** HashRouter chosen (simpler, no 404.html needed). `basename` prop is NOT needed with HashRouter.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

## Summary

Phase 24 replaces the 320px sidebar `InputForm` with a dedicated full-page input experience at `/input`, organized into collapsible accordion sections. The migration involves three concurrent workstreams: (1) installing `react-router-dom` and replacing the Tabs-based navigation with URL routing, (2) adding the shadcn/ui Accordion component and building three mode-specific accordion form components, and (3) splitting `SizingPage.tsx` into `ResultsPage.tsx` (BOM only) and deleting `InputForm.tsx` (logic migrates to accordion components).

The codebase is well-prepared for this migration. The form integration pattern (`useForm` + `useEffect` watch + `useShallow` + `setInput`) is consistent across all three existing input forms (Ethernet, FC, Converged) and must be preserved exactly — only the JSX structure around the fields changes. The Zustand store subscriptions in `resultStore`, `fcResultStore`, and `convergedResultStore` fire regardless of which route is active, so live recalculation requires no store changes.

React Router v7 is NOT yet installed — it is a new dependency. The `@radix-ui/react-accordion` package (v1.2.12 verified) is also not yet installed; it will be pulled in by `npx shadcn add accordion`. Both installs are straightforward, with no peer-dependency conflicts against the existing React 19 stack.

**Primary recommendation:** Execute in three sequential waves — (1) install dependencies and routing infrastructure, (2) build accordion components by lifting fields from existing input forms, (3) delete old files and update i18n.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-router-dom | 7.13.1 (latest) | URL-based navigation, HashRouter, Routes, NavLink, useNavigate, useMatch | Official React routing library; v7 compatible with React 19 |
| @radix-ui/react-accordion | 1.2.12 (latest) | Accordion primitive (auto-installed by shadcn) | shadcn/ui accordion depends on it |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.577.0 (already installed) | SlidersHorizontal icon for Configure button | Already in project |
| react-hook-form | 7.71.2 (already installed) | Form state for accordion sections | Preserve existing pattern exactly |
| zustand/shallow | 5.0.12 (already installed) | useShallow for store selectors | Preserve in all new components |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HashRouter | BrowserRouter + 404.html | BrowserRouter requires a redirect HTML file on GitHub Pages; HashRouter works without server config |
| shadcn Accordion | Custom collapsible div | shadcn Accordion handles aria-expanded, keyboard nav, and animation automatically |

**Installation:**
```bash
npm install react-router-dom
npx shadcn add accordion
```

**Version verification (confirmed 2026-03-19):**
- `react-router-dom`: 7.13.1 (npm registry)
- `@radix-ui/react-accordion`: 1.2.12 (npm registry — installed by shadcn command)

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main.tsx                          # MODIFIED: wrap with <HashRouter>
├── App.tsx                           # MODIFIED: replace <Tabs> with <Routes>
├── components/
│   ├── TopBar.tsx                    # MODIFIED: add Configure button + NavLink tab strip
│   └── ui/
│       └── accordion.tsx             # NEW: added via npx shadcn add accordion
└── features/
    ├── input/                        # NEW directory
    │   ├── InputPage.tsx             # NEW: route component for /input
    │   ├── EthInputAccordion.tsx     # NEW: Ethernet accordion (Clos + Three-Tier)
    │   ├── FCInputAccordion.tsx      # NEW: FC accordion
    │   └── ConvergedInputAccordion.tsx  # NEW: Converged accordion
    └── sizing/
        ├── ResultsPage.tsx           # NEW: BOM panel only
        ├── SizingPage.tsx            # DELETED
        ├── InputForm.tsx             # DELETED (logic migrates to EthInputAccordion)
        ├── fc/
        │   ├── FCSizingPage.tsx      # DELETED
        │   └── FCInputForm.tsx       # DELETED (logic migrates to FCInputAccordion)
        └── converged/
            ├── ConvergedSizingPage.tsx  # DELETED
            └── ConvergedInputForm.tsx   # DELETED (logic migrates to ConvergedInputAccordion)
```

### Pattern 1: HashRouter Wrapper in main.tsx

**What:** Wrap the root `<App />` with `<HashRouter>` so all child components can use Router hooks.
**When to use:** Required for GitHub Pages static deployment without server-side 404 handling.

```tsx
// src/main.tsx
import './i18n/index'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
)
```

**Key facts:**
- `basename` prop is NOT needed with HashRouter — hash URLs are always relative to root
- `import.meta.env.BASE_URL` used for static assets (images) is unaffected by HashRouter
- The existing favicon reference in TopBar (`${import.meta.env.BASE_URL}favicon-32x32.png`) continues to work as-is

### Pattern 2: Routes/Route Replacing Tabs in App.tsx

**What:** Replace the `<Tabs>` / `<TabsList>` / `<TabsContent>` structure with `<Routes>` / `<Route>`. The `mode` and `profilesOpen` state remain in `AppContent`.
**When to use:** After HashRouter wraps the tree.

```tsx
// App.tsx conceptual structure after migration
import { Routes, Route } from 'react-router-dom'
import { InputPage } from '@/features/input/InputPage'
import { ResultsPage } from '@/features/sizing/ResultsPage'

function AppContent() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'ethernet' | 'fc' | 'converged'>('ethernet')
  const [profilesOpen, setProfilesOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar mode={mode} onModeChange={setMode} profilesOpen={profilesOpen} onToggleProfiles={() => setProfilesOpen(v => !v)} />
      {/* Tab strip with NavLinks lives in TopBar or as a sub-component */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/input" element={<InputPage mode={mode} />} />
          <Route path="/" element={<ResultsPage mode={mode} />} />
          <Route path="/topology" element={<TopologyContent mode={mode} />} />
          {mode !== 'fc' && <Route path="/rack" element={<RackContent mode={mode} />} />}
        </Routes>
      </main>
    </div>
  )
}
```

**Note on tab strip location:** The UI-SPEC places the NavLink strip (`border-b bg-secondary/30 px-4 h-11`) between TopBar and main. This can live at the bottom of `TopBar`'s JSX return or as a standalone `<nav>` element in `AppContent` before `<main>`. Given TopBar currently renders `<>header + ProfileManager</>`, the cleanest approach is a separate `<nav>` element in `AppContent` between TopBar and main.

### Pattern 3: NavLink Tab Strip

**What:** Convert TabsTrigger items to NavLink components with active-state styling.
**When to use:** The nav strip that was inside `<Tabs>`.

```tsx
// NavLink strip (separate from TopBar header, sits between header and main)
<nav aria-label="page navigation" className="border-b bg-secondary/30 px-4 h-11 flex items-center gap-1">
  <NavLink
    to="/"
    end  // Important: "end" prevents "/" from matching all routes
    className={({ isActive }) =>
      cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'border-b-2 border-primary text-foreground bg-background shadow-sm -mb-px'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )
    }
  >
    <img src={`${import.meta.env.BASE_URL}icon-sizing.png`} className="h-4 w-4" alt="" />
    {t('nav.results')}
  </NavLink>
  <NavLink to="/topology" className={...}>...</NavLink>
  {mode !== 'fc' && <NavLink to="/rack" className={...}>...</NavLink>}
</nav>
```

**CRITICAL: `end` prop on `/` NavLink.** Without `end`, the `/` NavLink would match every route and always appear active. This is the most common NavLink pitfall.

### Pattern 4: Configure Button in TopBar

**What:** Icon button that navigates to `/input` and shows active state when on that route.
**When to use:** Insert before the ProfileManager FolderOpen button in the `ml-auto` group.

```tsx
// Inside TopBar — requires useNavigate and useMatch from react-router-dom
import { useNavigate, useMatch } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'

// Inside component body:
const navigate = useNavigate()
const isOnInputRoute = !!useMatch('/input')

// In JSX, before the FolderOpen profile button:
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant={isOnInputRoute ? 'secondary' : 'ghost'}
      size="icon"
      className="h-9 w-9"
      onClick={() => navigate('/input')}
      aria-label={t('nav.configure')}
    >
      <SlidersHorizontal className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>{t('nav.configure')}</TooltipContent>
</Tooltip>
```

### Pattern 5: Accordion Form Component

**What:** A mode-specific accordion wrapping the existing form fields in collapsible sections.
**When to use:** Each of the three new accordion components (Eth, FC, Converged).

```tsx
// EthInputAccordion.tsx (simplified)
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'

export function EthInputAccordion() {
  const { t } = useTranslation()
  // Same useForm + useEffect + useShallow pattern as InputForm.tsx exactly

  return (
    <Form {...form}>
      <form>
        <Accordion type="single" collapsible defaultValue="rack-config" className="w-full">
          <AccordionItem value="rack-config">
            <AccordionTrigger className="text-base font-semibold px-6 py-4">
              {t('input.section.rackConfig')}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Topology selector, rack count, per-rack server inputs */}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="switch-selection">
            <AccordionTrigger className="text-base font-semibold px-6 py-4">
              {t('input.section.switchSelection')}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* Switch model selects + uplinks + cable/connectivity */}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="advanced">
            <AccordionTrigger className="text-base font-semibold px-6 py-4">
              {t('input.section.advanced')}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {/* switch positioning, U-height, rack size, brownfield toggle */}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </form>
    </Form>
  )
}
```

### Pattern 6: InputPage Route Component

**What:** The `/input` route renders a centered, max-w-3xl page wrapping the mode-appropriate accordion.

```tsx
// InputPage.tsx
function InputPage({ mode }: { mode: 'ethernet' | 'fc' | 'converged' }) {
  const { t } = useTranslation()
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-1">{t('input.pageTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t('input.pageDescription')}</p>
      <Card>
        {mode === 'ethernet' && <EthInputAccordion />}
        {mode === 'fc' && <FCInputAccordion />}
        {mode === 'converged' && <ConvergedInputAccordion />}
      </Card>
    </div>
  )
}
```

### Pattern 7: ResultsPage (from SizingPage)

**What:** `SizingPage.tsx` with the InputForm removed. BOM panel expands full width. Max-w-5xl.

```tsx
// ResultsPage.tsx
function ResultsPage({ mode }: { mode: 'ethernet' | 'fc' | 'converged' }) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {mode === 'fc' ? <FCBOMPanel /> : mode === 'converged' ? <ConvergedBOMPanel /> : <BOMPanel />}
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Missing `end` on NavLink `/`:** Without `end` prop, the root `/` NavLink matches all routes and is always highlighted active. Always use `<NavLink to="/" end ...>`.
- **Using `basename` with HashRouter:** HashRouter does not use `basename` — adding it causes double-path issues. Only BrowserRouter needs `basename`.
- **Single global useForm across accordion components:** Each accordion component must have its own `useForm` instance. A shared form would require complex field-name coordination and break the store subscription pattern.
- **Calling router hooks outside Router provider:** `useNavigate`, `useMatch`, `useLocation` must be called in components rendered inside `<HashRouter>`. TopBar currently renders inside `App` which will be inside `<HashRouter>` in `main.tsx` — this is correct.
- **Removing `portsPerServerFrontend` / `portsPerServerBackend` from Ethernet accordion:** These fields exist in the current `InputForm.tsx`. The UI-SPEC does not explicitly list them in the accordion sections. They must be preserved — place in Switch Selection section or retain a Server Connectivity subsection within Rack Config.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accordion open/close animation | CSS height transitions manually | shadcn `accordion.tsx` (Radix UI) | Handles aria-expanded, keyboard nav, focus management, 200ms animation automatically |
| Active NavLink detection | `window.location.hash` comparison | `useMatch` from react-router-dom | Router-aware, updates on navigation, handles edge cases |
| Route-level code splitting | Manual lazy imports | Can add later if needed — not required this phase | Current bundle size is small enough |
| 404 fallback for GitHub Pages | Custom 404.html redirect script | HashRouter eliminates the need entirely | HashRouter: all URLs resolve to index.html + hash fragment |

**Key insight:** Shadcn's accordion wraps Radix UI's `@radix-ui/react-accordion` which handles all ARIA attributes (`aria-expanded`, `aria-controls`, `role="region"`) automatically. Never build a DIY accordion for a production app.

---

## Common Pitfalls

### Pitfall 1: NavLink `/` Always Active Without `end` Prop

**What goes wrong:** The NavLink for Results (`to="/"`) matches every route because every hash URL starts with `#/`. It appears active on `/input`, `/topology`, `/rack`.
**Why it happens:** React Router NavLink's default `end=false` behavior — partial matching is intentional for nested routes but wrong for the root path.
**How to avoid:** Always add `end` prop: `<NavLink to="/" end ...>`.
**Warning signs:** All NavLinks appear active simultaneously, or Results is always highlighted.

### Pitfall 2: TopBar Router Hooks Before HashRouter Wraps

**What goes wrong:** `useNavigate()` or `useMatch()` throws "You cannot use \<Route\> or hooks outside a \<Router\>" if TopBar is rendered outside `<HashRouter>`.
**Why it happens:** `HashRouter` must be the ancestor of any component using router hooks. The current `main.tsx` doesn't have it yet.
**How to avoid:** Add `<HashRouter>` in `main.tsx` wrapping `<App />` FIRST, before modifying TopBar to use router hooks.
**Warning signs:** Runtime error on page load after adding useNavigate to TopBar.

### Pitfall 3: Losing the `portsPerServerFrontend` / `portsPerServerBackend` Fields

**What goes wrong:** The UI-SPEC accordion sections don't explicitly list `portsPerServerFrontend` and `portsPerServerBackend`. If these fields are omitted from `EthInputAccordion`, the BOM engine receives stale defaults and users lose a key input.
**Why it happens:** The UI-SPEC describes the section grouping from a high level, not an exhaustive field list.
**How to avoid:** Cross-reference the current `InputForm.tsx` `FormValues` type against the UI-SPEC sections. Place these fields in Switch Selection section (they relate to connectivity). Keep both in `EthInputAccordion.tsx` `FormValues`.
**Warning signs:** BOM results don't change when frontend/backend port counts are adjusted.

### Pitfall 4: `form.watch` Subscription Not Cleaned Up

**What goes wrong:** Memory leak when navigating away from `/input` — the accordion component unmounts but the subscription runs until garbage collected.
**Why it happens:** `form.watch(callback)` returns an unsubscribe function that must be returned from `useEffect`.
**How to avoid:** The existing `InputForm.tsx` already does this correctly (lines 188-193). Copy the cleanup pattern exactly:
```tsx
useEffect(() => {
  const subscription = form.watch(...)
  return () => {
    subscription.unsubscribe()
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }
}, [form, setInput])
```
**Warning signs:** Memory leak warnings in dev tools when navigating between `/input` and `/`.

### Pitfall 5: PWA `start_url` and `scope` vs HashRouter

**What goes wrong:** PWA manifest has `start_url: base` and `scope: base` (e.g., `/netstack/`). HashRouter changes the URL to `/netstack/#/input`. This is within scope — no conflict.
**Why it happens:** Concern that hash URLs might fall outside the PWA scope.
**How to avoid:** Hash fragment (`#/input`) is not part of the URL for scope matching — the document URL is still `/netstack/`. No PWA manifest changes needed.
**Warning signs:** None expected — confirmed safe.

### Pitfall 6: Print CSS Breakage

**What goes wrong:** The tab strip was `[role="tablist"]` — the existing print CSS `@media print` hides `[role="tablist"]`. After migration, the NavLink strip is a `<nav>` element, not a tablist, so the print CSS no longer hides it.
**Why it happens:** CSS selector targeting a role that no longer exists on the element.
**How to avoid:** Add `aria-label="page navigation"` to the NavLink `<nav>` container and update the print CSS selector from `[role="tablist"]` to `nav[aria-label="page navigation"]` or add a `data-print-hide` attribute.
**Warning signs:** Tab strip appears in printed output.

### Pitfall 7: Converged Accordion — Missing Store

**What goes wrong:** `ConvergedInputAccordion` needs `useConvergedInputStore`, not `useInputStore`. Using the wrong store writes inputs to the wrong place.
**Why it happens:** Three stores exist: `useInputStore` (Ethernet), `useFCInputStore` (FC), `useConvergedInputStore` (Converged). Each accordion component must use its own store.
**How to avoid:** Confirm at each accordion component: Eth → `useInputStore`, FC → `useFCInputStore`, Converged → `useConvergedInputStore`.
**Warning signs:** Changing converged inputs has no effect on BOM, or changing Ethernet inputs unexpectedly affects converged mode.

---

## Code Examples

Verified patterns from existing codebase:

### Existing Form Watch + Store Sync Pattern (preserve exactly)

```tsx
// From InputForm.tsx lines 106-193 — preserve in each accordion component
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  const subscription = form.watch((values, { name }) => {
    const v = values as Partial<FormValues>
    if (name === 'rackCount') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        // ... rack count logic
      }, 150)
      return
    }
    // ... other debounced fields
  })
  return () => {
    subscription.unsubscribe()
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }
}, [form, setInput])
```

### useShallow Selector Pattern (required in all new components)

```tsx
// Use useShallow for any multi-field selector to prevent infinite renders
const { input, setInput } = useInputStore(
  useShallow((s) => ({ input: s.input, setInput: s.setInput }))
)
```

### TopBar Button Pattern (for Configure button)

```tsx
// Match existing ProfileManager button pattern exactly
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant={isOnInputRoute ? 'secondary' : 'ghost'}
      size="icon"
      className="h-9 w-9"
      onClick={() => navigate('/input')}
      aria-label={t('nav.configure')}
    >
      <SlidersHorizontal className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>{t('nav.configure')}</TooltipContent>
</Tooltip>
```

### shadcn Accordion — Full Configuration

```tsx
// From UI-SPEC (shadcn/ui official pattern)
<Accordion type="single" collapsible defaultValue="rack-config" className="w-full">
  <AccordionItem value="rack-config">
    <AccordionTrigger className="text-base font-semibold px-6 py-4">
      {t('input.section.rackConfig')}
    </AccordionTrigger>
    <AccordionContent className="px-6 pb-6">
      {/* fields */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

- `type="single"` — one section open at a time
- `collapsible` — allows closing the currently open section
- `defaultValue="rack-config"` — Rack Config open on initial load
- No `value` prop (uncontrolled) — no localStorage needed, resets on navigation

---

## Codebase Findings

### What Currently Exists

**`src/App.tsx`** (82 lines): Uses `<Tabs defaultValue="sizing">` with three `<TabsContent>` panels: sizing, topology, rack. The `mode` and `profilesOpen` states are in `AppContent`. The `TabsList` is rendered in a `<div className="border-b bg-secondary/30 px-4">`. This entire structure converts to `<Routes>` + `<Route>`.

**`src/main.tsx`** (11 lines): Minimal — `StrictMode` + `createRoot`. Only change needed: wrap `<App />` with `<HashRouter>`.

**`src/components/TopBar.tsx`** (234 lines): Has extensive export logic. The `ml-auto` group has: FolderOpen (profiles) → separator → CSV → PDF → Print → separator → ThemeToggle → LanguageSwitcher. The Configure button inserts BEFORE the FolderOpen button (i.e., as the first item in the `ml-auto` group). TopBar will need `useNavigate` and `useMatch` imported from `react-router-dom`.

**`src/features/sizing/InputForm.tsx`** (847 lines): The source of truth for Ethernet form fields and store sync logic. The `FormValues` interface covers all fields including `portsPerServerFrontend`, `portsPerServerBackend` which are not called out in UI-SPEC accordion section listings — these must be preserved in `EthInputAccordion`.

**`src/features/sizing/SizingPage.tsx`** (22 lines): Trivially thin — just `InputForm + BOMPanel` side by side. Replaced by `ResultsPage.tsx` (BOM only) and `InputPage.tsx`.

**`src/features/sizing/fc/FCSizingPage.tsx`** (17 lines): Same thin wrapper pattern as SizingPage. `FCInputForm + FCBOMPanel`.

**`src/features/sizing/converged/ConvergedSizingPage.tsx`** (22 lines): Same pattern. `ConvergedInputForm + ConvergedBOMPanel`.

**`src/components/ui/`**: 17 components — no Accordion yet. Must be added via `npx shadcn add accordion`.

**`package.json`**: No `react-router-dom` installed. `@radix-ui/react-accordion` not installed (Accordion not yet in ui/ dir). All other Radix packages installed.

### i18n Structure

The `en/translation.json` has flat namespaces at the top level: `app`, `tabs`, `sizing`, `results`, `topology`, `rack`, `export`, `mode`, `fc`, `fcbom`, `converged`, `threeTier`, `infra`, `bom`, `pwa`, `profiles`.

New keys needed (add to all 4 locales — EN, FR, DE, IT):
- `nav.configure`, `nav.results`, `nav.topology`, `nav.rack`
- `input.pageTitle`, `input.pageDescription`
- `input.section.rackConfig`, `input.section.switchSelection`, `input.section.advanced`
- `input.section.fabricConfig`, `input.section.ethernetSwitches`, `input.section.fcFabric`

Update existing:
- `results.emptyBody` — change from "Fill in the form on the left" to "Configure your network in the Inputs page, then return here to see your BOM."

The `tabs.*` keys (`tabs.sizing`, `tabs.topology`, `tabs.rackElevation`) remain for backward compatibility but are superseded by `nav.*` in new NavLink usage.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React Router v5 (`Switch`, `Route`) | React Router v7 (`Routes`, `Route`, `createBrowserRouter`) | v6: 2021, v7: 2024 | `Switch` → `Routes`, `Redirect` → `Navigate`, `useHistory` → `useNavigate` |
| `exact` prop on Route | `end` prop on NavLink | v6 | `exact` removed; use `end` on NavLink for root path |
| `<Link>` with className string | `<NavLink>` with function className | v6 | NavLink supports `({ isActive }) => ...` callback for dynamic styling |

**Deprecated/outdated:**
- `<Switch>`: Use `<Routes>` (v6+)
- `useHistory`: Use `useNavigate` (v6+)
- `exact` Route prop: Removed in v6; Routes uses exact matching by default
- `component` prop on Route: Use `element` prop with JSX

---

## Open Questions

1. **`portsPerServerFrontend` / `portsPerServerBackend` placement**
   - What we know: UI-SPEC lists Switch Selection section fields without mentioning these
   - What's unclear: Intentional omission (simplify form?) or oversight?
   - Recommendation: Preserve both fields in Switch Selection section — they directly affect BOM calculation and users need them accessible

2. **NavLink strip location: in TopBar or AppContent?**
   - What we know: TopBar currently returns `<>header + ProfileManager</>`. The tab strip in App.tsx is a sibling `<div>` inside `<Tabs>`.
   - What's unclear: Whether to fold the NavLink strip into TopBar's return or keep it as a separate element in `AppContent`
   - Recommendation: Keep as a separate `<nav>` element in `AppContent`, matching the current structure where the tab strip `<div>` sits between TopBar and `<main>`. This avoids TopBar becoming a monolith.

3. **`mode !== 'fc'` guard for Rack route**
   - What we know: The current `TabsTrigger` for rack elevation is conditionally rendered when `mode !== 'fc'`. The `Route` for `/rack` should also be conditional.
   - What's unclear: What happens if user navigates to `/#/rack` while in FC mode
   - Recommendation: Render the Route unconditionally but redirect or show an empty state inside the RackContent component when `mode === 'fc'`. Or use conditional Route rendering in App.tsx matching the current pattern.

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| Config file | `vite.config.ts` (test section) |
| Quick run command | `npx vitest run src/features/input/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

Phase 24 is a UI refactoring phase — no new domain logic, no new business rules. The domain engine tests (`sizing.test.ts`, `fc-sizing.test.ts`, etc.) cover the BOM calculation layer which is UNCHANGED by this phase.

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | InputPage renders with accordion when mode=ethernet | unit | `npx vitest run src/features/input/InputPage.test.tsx` | Wave 0 |
| UI-02 | EthInputAccordion syncs form changes to inputStore | unit | `npx vitest run src/features/input/EthInputAccordion.test.tsx` | Wave 0 |
| UI-03 | FCInputAccordion syncs form changes to fcInputStore | unit | `npx vitest run src/features/input/FCInputAccordion.test.tsx` | Wave 0 |
| UI-04 | Configure button in TopBar navigates to /input | unit | `npx vitest run src/components/TopBar.test.tsx` | Wave 0 |
| UI-05 | NavLink for / uses end prop (active only on root) | unit | `npx vitest run src/App.test.tsx` | Wave 0 |
| COMPAT | Existing domain engine tests continue to pass | regression | `npx vitest run src/domain/` | Already exist |

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/` (regression check — these should never break)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/input/InputPage.test.tsx` — covers UI-01
- [ ] `src/features/input/EthInputAccordion.test.tsx` — covers UI-02
- [ ] `src/features/input/FCInputAccordion.test.tsx` — covers UI-03
- [ ] `src/components/TopBar.test.tsx` — covers UI-04 (Configure button)
- [ ] `src/App.test.tsx` — covers UI-05 (NavLink end prop)

Framework is already installed — no framework setup needed. Test files are the only Wave 0 gap.

---

## Sources

### Primary (HIGH confidence)

- npm registry (2026-03-19) — `react-router-dom@7.13.1`, `@radix-ui/react-accordion@1.2.12` versions verified
- `/Users/fjacquet/Projects/network-sizer/src/App.tsx` — confirmed Tabs structure to migrate
- `/Users/fjacquet/Projects/network-sizer/src/components/TopBar.tsx` — confirmed ml-auto button group structure
- `/Users/fjacquet/Projects/network-sizer/src/features/sizing/InputForm.tsx` — complete form fields and store sync pattern
- `/Users/fjacquet/Projects/network-sizer/package.json` — confirmed react-router-dom NOT installed
- `/Users/fjacquet/Projects/network-sizer/vite.config.ts` — confirmed base path config, test environment

### Secondary (MEDIUM confidence)

- `.planning/phases/24-dedicated-input-page-with-accordion-sections/24-UI-SPEC.md` — HashRouter decision, NavLink patterns, accordion configuration verified against React Router v6/v7 documentation patterns

### Tertiary (LOW confidence)

- None — all critical claims verified against source files or package registry

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed from npm registry
- Architecture: HIGH — based on reading actual source files
- Pitfalls: HIGH — based on code inspection (missing `end` prop is a well-known NavLink trap)
- i18n keys: HIGH — based on reading actual translation.json

**Research date:** 2026-03-19
**Valid until:** 2026-04-18 (30 days — React Router is stable, shadcn/ui is stable)

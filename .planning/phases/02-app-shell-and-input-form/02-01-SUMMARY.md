---
phase: 02-app-shell-and-input-form
plan: 01
subsystem: ui
tags: [react, vite, tailwind, shadcn, typescript, zod, vitest, jsdom]

# Dependency graph
requires:
  - phase: 01-domain-engine
    provides: SizingInputSchema, calculateBOM, SWITCH_CATALOG, all domain types
provides:
  - React 19 + Vite 6 build pipeline with base '/network-sizer/' and @ path alias
  - Tailwind v4 with @tailwindcss/vite plugin and dark mode @custom-variant
  - shadcn/ui initialized with 11 components (button, card, form, input, select, label, badge, tabs, separator, dropdown-menu, toggle)
  - jsdom test environment configured in vite.config.ts for React component testing
  - SizingInputSchema extended with leafModel field (S5248F-ON | S5224F-ON | S5212F-ON)
  - calculateBOM dynamically selects leaf switch from SWITCH_CATALOG based on input.leafModel
affects:
  - 02-02 (i18n setup - depends on vite config and @/ alias)
  - 02-03 (app shell - depends on App.tsx placeholder, index.html, shadcn components)
  - 02-04 (input form - depends on leafModel schema, form component, shadcn components)

# Tech tracking
tech-stack:
  added:
    - react@19.2.4
    - react-dom@19.2.4
    - vite@6.4.1
    - "@vitejs/plugin-react@4.x"
    - "@tailwindcss/vite@4.2.1"
    - tailwindcss@4.2.1
    - shadcn/ui (Radix-based default style, neutral base color)
    - "@testing-library/react@16.x"
    - "@testing-library/jest-dom@6.x"
    - jsdom@29.x
    - zustand@5.0.12
    - react-hook-form@7.71.2
    - "@hookform/resolvers@5.2.2"
    - react-i18next@16.x
    - i18next@25.x
    - clsx@2.x
    - tailwind-merge@3.x
    - class-variance-authority@0.7.x
    - lucide-react@0.577.x
  patterns:
    - Unified vite.config.ts serves as both Vite build config and Vitest config
    - tailwindcss v4 uses @tailwindcss/vite plugin (no tailwind.config.js, no PostCSS)
    - Dark mode via @custom-variant dark (&:where(.dark, .dark *)) in index.css
    - shadcn cn() utility in src/lib/utils.ts using clsx + tailwind-merge

key-files:
  created:
    - vite.config.ts (Vite + React + Tailwind v4 + jsdom test env + @ alias)
    - index.html (SPA entry point with id="root")
    - src/main.tsx (React 19 createRoot entry)
    - src/App.tsx (placeholder - real shell in plan 03)
    - src/index.css (Tailwind v4 directives + @custom-variant dark + shadcn CSS vars)
    - src/vite-env.d.ts (Vite client type reference)
    - src/lib/utils.ts (cn() helper for shadcn)
    - src/test/setup.ts (jest-dom + cleanup for jsdom tests)
    - components.json (shadcn configuration: default style, neutral, CSS vars, @/ alias)
    - src/components/ui/button.tsx
    - src/components/ui/card.tsx
    - src/components/ui/form.tsx
    - src/components/ui/input.tsx
    - src/components/ui/select.tsx
    - src/components/ui/label.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/dropdown-menu.tsx
    - src/components/ui/toggle.tsx
  modified:
    - package.json (added dev/build/preview scripts; react, vite, tailwind, shadcn deps)
    - tsconfig.json (added jsx: react-jsx, baseUrl, @/* paths alias)
    - src/domain/schemas/input.ts (added leafModel enum field)
    - src/domain/engine/sizing.ts (dynamic LEAF = SWITCH_CATALOG[input.leafModel])
    - src/domain/engine/sizing.test.ts (updated all calculateBOM calls with leafModel)
    - src/domain/schemas/schemas.test.ts (added leafModel tests + updated existing valid tests)

key-decisions:
  - "vite@6 used instead of vite@8 due to @tailwindcss/vite@4 peer dependency requiring ^5.2.0 || ^6 || ^7"
  - "shadcn interactive init replaced with manual components.json + npx shadcn add (non-interactive path for CLI automation)"
  - "leafModel as required field (not optional with default) — forces explicit selection in UI, prevents silent S5248F-ON assumption"
  - "vitest.config.ts deleted — vite.config.ts test block supersedes it completely"

patterns-established:
  - "Vite unified config pattern: one vite.config.ts for both build and test configuration"
  - "shadcn components added via CLI: npx shadcn@latest add <component> --yes"
  - "Tailwind v4 dark mode: @custom-variant dark (&:where(.dark, .dark *)) in CSS"

requirements-completed:
  - SIZE-01

# Metrics
duration: 25min
completed: 2026-03-17
---

# Phase 2 Plan 01: React + Vite + shadcn/ui Scaffold Summary

**React 19 + Vite 6 + Tailwind v4 project scaffold with shadcn/ui (11 components), jsdom test infrastructure, and SizingInputSchema extended with dynamic leafModel selection**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-17T03:54:00Z
- **Completed:** 2026-03-17T05:02:00Z
- **Tasks:** 2 (Task 1: scaffold, Task 2: leafModel TDD)
- **Files modified:** 22

## Accomplishments

- React 19 + Vite 6 build pipeline configured with GitHub Pages base path and @ path alias
- shadcn/ui initialized manually (components.json + CLI add) with 11 UI components
- Tailwind v4 configured via @tailwindcss/vite plugin with dark mode custom variant
- jsdom test environment replacing node environment — React component tests now possible
- SizingInputSchema extended with required leafModel enum (S5248F-ON | S5224F-ON | S5212F-ON)
- calculateBOM now dynamically selects leaf from SWITCH_CATALOG based on input.leafModel
- All 91 tests pass (83 Phase 1 + 8 new leafModel tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize React + Vite + shadcn/ui project scaffold** - `5926b99` (feat)
2. **Task 2 RED: Add failing tests for leafModel** - `3d38c60` (test)
3. **Task 2 GREEN: Implement leafModel in schema and engine** - `e7a8d75` (feat)

_Note: Task 2 used TDD — separate RED (test) and GREEN (feat) commits._

## Files Created/Modified

- `vite.config.ts` - Unified Vite + Vitest config with React plugin, Tailwind v4, jsdom, @ alias
- `index.html` - SPA entry point with `<div id="root">`
- `src/main.tsx` - React 19 createRoot entry point
- `src/App.tsx` - Minimal placeholder (NetStack text, bg-background/text-foreground)
- `src/index.css` - Tailwind v4 `@import + @custom-variant dark` + shadcn CSS variables
- `src/vite-env.d.ts` - Vite client type reference
- `src/lib/utils.ts` - `cn()` helper (clsx + tailwind-merge)
- `src/test/setup.ts` - `@testing-library/jest-dom/vitest` + cleanup afterEach
- `components.json` - shadcn config (default style, neutral, CSS vars, @/ alias)
- `src/components/ui/` - 11 shadcn components (button, card, form, input, select, label, badge, tabs, separator, dropdown-menu, toggle)
- `package.json` - Added dev/build/preview scripts; all Phase 2 dependencies
- `tsconfig.json` - Added `jsx: react-jsx`, `baseUrl: "."`, `@/*` paths alias
- `src/domain/schemas/input.ts` - Added `leafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON'])`
- `src/domain/engine/sizing.ts` - Dynamic `const LEAF = SWITCH_CATALOG[input.leafModel]`
- `src/domain/engine/sizing.test.ts` - Updated all `calculateBOM()` calls + 2 new leafModel tests
- `src/domain/schemas/schemas.test.ts` - Added 6 leafModel schema tests + updated acceptance tests

## Decisions Made

- **vite@6 not vite@8**: `@tailwindcss/vite@4` has peer dependency `vite@^5.2.0 || ^6 || ^7`; locked to v6 for compatibility
- **Manual shadcn init**: `npx shadcn init` requires interactive terminal; created components.json manually then used `npx shadcn add` for components
- **leafModel as required field**: Explicit selection required in UI — prevents silent default to S5248F-ON; user must choose
- **vitest.config.ts deleted**: Vite unified config pattern — test configuration lives inside vite.config.ts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing schema acceptance tests to include leafModel**

- **Found during:** Task 2 GREEN phase
- **Issue:** Existing `SizingInputSchema — acceptance of valid inputs` tests lacked `leafModel` field — they now incorrectly failed after schema was updated
- **Fix:** Added `leafModel: 'S5248F-ON'` to the 3 existing acceptance test inputs
- **Files modified:** `src/domain/schemas/schemas.test.ts`
- **Verification:** All 91 tests pass after fix
- **Committed in:** `e7a8d75` (Task 2 GREEN commit)

**2. [Rule 3 - Blocking] Downgraded vite from @8 to @6**

- **Found during:** Task 1 (dependency installation)
- **Issue:** `@tailwindcss/vite@4.2.1` requires `vite@"^5.2.0 || ^6 || ^7"` but npm installed vite@8; shadcn component add failed with ERESOLVE
- **Fix:** `npm install --save-dev vite@^6 --legacy-peer-deps`
- **Files modified:** package.json, package-lock.json
- **Verification:** shadcn components install successfully, vite build succeeds
- **Committed in:** `5926b99` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking dependency conflict)
**Impact on plan:** Both auto-fixes necessary for correctness and functionality. No scope creep.

## Issues Encountered

- `npx shadcn@latest init` cannot be automated (requires interactive terminal selection). Resolved by creating `components.json` manually and using `npx shadcn add` for individual components.
- vite@8 conflicts with @tailwindcss/vite@4 peer dependencies. Resolved by pinning to vite@^6.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- React + Vite project scaffold is complete and building successfully
- shadcn/ui components available for use in Plans 02-04
- Test infrastructure supports jsdom for React component tests
- Domain layer extended with leafModel — input form can now bind to it
- Plan 02 (i18n setup) and Plan 03 (app shell) can proceed in parallel

## Self-Check: PASSED

- vite.config.ts: FOUND
- components.json: FOUND
- src/index.css: FOUND
- src/test/setup.ts: FOUND
- src/main.tsx: FOUND
- index.html: FOUND
- src/components/ui/ (11 files): FOUND
- dist/index.html (build output): FOUND
- Commits 5926b99, 3d38c60, e7a8d75: FOUND
- 91 tests pass (verified)

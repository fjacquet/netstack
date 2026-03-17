---
phase: 02-app-shell-and-input-form
plan: "03"
subsystem: ui
tags: [react, shadcn, react-hook-form, zod, zustand, i18n, tailwind, github-actions, vite]

# Dependency graph
requires:
  - phase: 02-app-shell-and-input-form-01
    provides: shadcn/ui components, ThemeProvider, i18n translations, Zustand stores
  - phase: 02-app-shell-and-input-form-02
    provides: SizingInputSchema with leafModel, inputStore, resultStore

provides:
  - App shell with TopBar (title + theme toggle + language switcher)
  - 4-tab layout (Sizing active, Topology/Rack Elevation/Export as placeholders)
  - ThemeToggle component using useTheme, Sun/Moon lucide icons
  - LanguageSwitcher component with EN/FR/DE/IT DropdownMenu
  - InputForm with 5 fields wired to Zustand inputStore (react-hook-form + zodResolver)
  - SizingPage responsive layout (xl:flex-row at 1280px+, stacked below)
  - GitHub Actions deploy.yml for GitHub Pages CI/CD

affects:
  - phase-03-bom-output (will replace ResultsPlaceholder with real BOM display)
  - phase-03-topology (will replace PlaceholderTab topology with @xyflow/react diagram)
  - phase-04-export (will replace PlaceholderTab export with PDF/CSV generation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - react-hook-form + zodResolver without generic type (Zod v4 + @hookform/resolvers v5.2.2)
    - form.watch + useEffect for live store updates without submit button
    - 150ms debounce on number inputs, immediate updates on Select changes
    - useShallow on all Zustand selectors to prevent infinite re-renders
    - ThemeProvider wraps root; AppContent inside for useTranslation() to work
    - PlaceholderTab reusable for future feature tabs (icon + i18n copy + phase badge)

key-files:
  created:
    - src/components/ThemeToggle.tsx
    - src/components/LanguageSwitcher.tsx
    - src/components/TopBar.tsx
    - src/features/placeholder/PlaceholderTab.tsx
    - src/features/sizing/ResultsPlaceholder.tsx
    - src/features/sizing/InputForm.tsx
    - .github/workflows/deploy.yml
  modified:
    - src/App.tsx
    - src/features/sizing/SizingPage.tsx

key-decisions:
  - "AppContent split from App so useTranslation() works inside ThemeProvider wrapper"
  - "xl: breakpoint (1280px) used for side-by-side layout per UI-SPEC, not lg: (1024px)"
  - "useForm() without generic type — critical for @hookform/resolvers v5.2.2 + Zod v4 compatibility"
  - "150ms debounce on number inputs only; Select inputs fire immediately per UI-SPEC Interaction Contract"
  - "GitHub Actions split into build + deploy jobs with typecheck and test gates before build"

patterns-established:
  - "Pattern: AppContent inner component allows hooks inside ThemeProvider boundary"
  - "Pattern: PlaceholderTab accepts headingKey/bodyKey/phase/icon for reusable placeholder rendering"
  - "Pattern: form.watch subscription in useEffect with unsubscribe cleanup for live store sync"

requirements-completed:
  - SIZE-01
  - UX-01
  - UX-02
  - UX-03
  - UX-04

# Metrics
duration: 4min
completed: "2026-03-17"
---

# Phase 2 Plan 03: App Shell and Input Form Summary

**React app shell with 4-tab layout, live-recalculating InputForm (react-hook-form + zodResolver + Zustand), ThemeToggle, LanguageSwitcher, and GitHub Actions Pages deployment pipeline**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T04:14:24Z
- **Completed:** 2026-03-17T04:17:41Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Built complete app shell: TopBar with title (28px semibold), ThemeToggle (Sun/Moon ghost button), LanguageSwitcher (EN/FR/DE/IT DropdownMenu), 4-tab navigation (Sizing default, 3 placeholders)
- Created InputForm with 5 validated fields wired to Zustand inputStore via react-hook-form + zodResolver — no submit button, every valid change triggers engine recalculation via form.watch
- Created GitHub Actions workflow with typecheck + test gates before build, official actions/deploy-pages@v4, split build/deploy jobs

## Task Commits

Each task was committed atomically:

1. **Task 1: App shell with TopBar, tab layout, placeholders** - `5be3300` (feat)
2. **Task 2: InputForm with react-hook-form + zodResolver** - `d2876f8` (feat)
3. **Task 3: GitHub Actions deployment workflow** - `c102125` (feat)

## Files Created/Modified

- `src/App.tsx` - Root layout: ThemeProvider + 4-tab Tabs + AppContent inner component
- `src/components/ThemeToggle.tsx` - Ghost icon button, Sun in dark mode / Moon in light mode, aria-label from i18n
- `src/components/LanguageSwitcher.tsx` - DropdownMenu with 4 locales, i18n.changeLanguage, active item bold
- `src/components/TopBar.tsx` - 44px header with app title, ThemeToggle, LanguageSwitcher
- `src/features/placeholder/PlaceholderTab.tsx` - Reusable placeholder with lucide icon + i18n heading/body + phase badge
- `src/features/sizing/ResultsPlaceholder.tsx` - Empty state card for results panel (Phase 3 replaces)
- `src/features/sizing/InputForm.tsx` - 5-field form with react-hook-form + zodResolver, useShallow Zustand, 150ms debounce
- `src/features/sizing/SizingPage.tsx` - Responsive xl:flex-row layout with InputForm + ResultsPlaceholder
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD with typecheck/test/build gates and official deploy-pages@v4

## Decisions Made

- **AppContent pattern:** Split `AppContent` out of `App` so `useTranslation()` can be called inside the `ThemeProvider` React tree — if called in `App`, it would be outside the provider boundary.
- **xl: breakpoint (1280px):** UI-SPEC requires 1280px breakpoint for side-by-side layout; Tailwind `xl:` maps to 1280px, `lg:` maps to 1024px. Used `xl:flex-row` and `xl:w-80`.
- **No generic on useForm:** Following RESEARCH.md Pitfall 1 — `useForm()` without `<SizingInput>` generic is required for @hookform/resolvers v5.2.2 + Zod v4 compatibility.
- **Separate build + deploy jobs:** The plan action specified a single-job pattern; the acceptance criteria required `actions/deploy-pages@v4` which is designed for multi-job workflows with pages environments. Split into build + deploy jobs for correctness.

## Deviations from Plan

None - plan executed exactly as written. The GitHub Actions workflow was created with the build/deploy split pattern as specified in the plan's acceptance criteria (deploy-pages@v4 requires separate environment job).

## Issues Encountered

None. TypeScript check passed cleanly, production build succeeded, all 95 tests passed across all three tasks.

## User Setup Required

None - no external service configuration required. GitHub Pages deployment requires enabling GitHub Pages in the repository settings (Settings > Pages > Source: GitHub Actions) — this is a one-time manual step in the GitHub UI, not part of code.

## Next Phase Readiness

- App shell is complete and functional — engineers can open the app, enter sizing parameters, switch themes and languages
- InputForm is wired to inputStore; resultStore computes BOM on every valid change (verified in Phase 2 Plan 02)
- Phase 3 (BOM Output) can replace ResultsPlaceholder with real BOM display by reading from useResultStore
- Phase 3 (Topology) can replace PlaceholderTab topology with @xyflow/react diagram
- The GitHub Actions workflow will deploy automatically on every push to main

## Self-Check: PASSED

All created files verified to exist on disk. All task commits verified in git log:
- `5be3300` - feat(02-03): build app shell with TopBar, tabs, placeholders, and i18n controls
- `d2876f8` - feat(02-03): build InputForm with react-hook-form + zodResolver wired to Zustand
- `c102125` - feat(02-03): add GitHub Actions workflow for GitHub Pages deployment

---
*Phase: 02-app-shell-and-input-form*
*Completed: 2026-03-17*

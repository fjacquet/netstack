---
phase: 02-app-shell-and-input-form
plan: "02"
subsystem: stores-i18n-theme
tags: [zustand, persist, i18n, react-i18next, theme-provider, dark-mode, localStorage]
dependency_graph:
  requires:
    - "01-01: SizingInputSchema with leafModel"
    - "01-02: calculateBOM engine"
    - "01-03: NetworkBOM and ConstraintViolation schemas"
    - "02-01: Vite + shadcn scaffold"
  provides:
    - "useInputStore: persisted Zustand store for SizingInput"
    - "useResultStore: derived Zustand store for NetworkBOM"
    - "i18n bootstrap: 4 locales (EN/FR/DE/IT) with browser detection"
    - "ThemeProvider: system preference detection + dark mode toggle"
  affects:
    - "02-03: input form and BOM panel (will consume these stores)"
    - "02-04: app shell (will wrap with ThemeProvider)"
tech_stack:
  added:
    - "zustand persist middleware with custom PersistStorage<InputState>"
    - "i18next + react-i18next + i18next-browser-languagedetector"
  patterns:
    - "Module-level store subscription (useInputStore.subscribe outside React lifecycle)"
    - "Lazy localStorage adapter (access at call time, not import time)"
    - "shadcn/ui ThemeProvider pattern with matchMedia system preference"
key_files:
  created:
    - src/store/inputStore.ts
    - src/store/resultStore.ts
    - src/store/resultStore.test.ts
    - src/i18n/index.ts
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
    - src/components/theme-provider.tsx
  modified:
    - src/main.tsx
decisions:
  - "Lazy PersistStorage<InputState> pattern: createJSONStorage captures localStorage at import time (broken in jsdom); custom PersistStorage accesses window.localStorage at call time for jsdom compatibility"
  - "resultStore uses module-level subscribe (not React useEffect) so BOM recomputes regardless of component mount state"
metrics:
  duration_minutes: 5
  tasks_completed: 3
  files_created: 9
  files_modified: 1
  tests_added: 4
  tests_total_after: 95
  completed_date: "2026-03-17"
---

# Phase 2 Plan 02: Stores, i18n, and ThemeProvider Summary

**One-liner:** Zustand stores with lazy localStorage persistence, i18next 4-locale bootstrap, and shadcn ThemeProvider with matchMedia system preference detection.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create Zustand inputStore (persisted) and resultStore (derived) | b30e5bc | Done |
| 2 | Create i18n bootstrap with 4 locale translation files | 56c6fd0 | Done |
| 3 | Create ThemeProvider with system preference detection | acfaa3c | Done |

## What Was Built

### inputStore (`src/store/inputStore.ts`)

- Persists `SizingInput` to localStorage under key `'netstack-input'`
- Custom `PersistStorage<InputState>` implementation (lazy window.localStorage access)
- Default: 48 servers, 16 per rack, 25G, DAC, S5248F-ON
- Exports `useInputStore`

### resultStore (`src/store/resultStore.ts`)

- Derives `NetworkBOM | null` from inputStore via module-level `useInputStore.subscribe`
- Initial computation at module load ensures store is populated on app start
- NEVER persisted — always derived from inputStore
- Exports `useResultStore`

### resultStore tests (`src/store/resultStore.test.ts`)

- 4 tests verifying: default BOM computation, reactive recalculation, violation propagation, leafModel impact

### i18n bootstrap (`src/i18n/index.ts` + 4 locale files)

- EN, FR, DE, IT with all UI strings from Copywriting Contract
- Browser locale detection: checks localStorage first, then navigator
- Falls back to EN for unsupported locales
- Persists choice to `'netstack-locale'` localStorage key
- Imported in `src/main.tsx` before App (synchronous init, no translation key flash)

### ThemeProvider (`src/components/theme-provider.tsx`)

- system/light/dark modes with `prefers-color-scheme: dark` media query
- Persists to `'netstack-theme'` localStorage key
- Adds `.dark` class to `document.documentElement` enabling Tailwind v4 dark mode
- `useTheme` hook with guard (throws outside provider)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed localStorage captured at module import time**

- **Found during:** Task 1, first test run
- **Issue:** `createJSONStorage(() => localStorage)` in Zustand persist middleware captures `localStorage` immediately when the module is imported. In jsdom test environment, `localStorage` at import time is a broken node mock (`setItem` is undefined). This causes `TypeError: storage.setItem is not a function` on every `useInputStore.setState` call in tests.
- **Fix:** Replaced `createJSONStorage` with a custom `PersistStorage<InputState>` implementation (`lazyLocalStorage`) where `getItem/setItem/removeItem` access `window.localStorage` at call time, not at module initialization. This also adds proper try/catch error handling for private browsing and storage quota errors.
- **Files modified:** `src/store/inputStore.ts`
- **Commit:** b30e5bc

## Self-Check: PASSED

All 10 files verified present. All 3 commits found (acfaa3c, 56c6fd0, b30e5bc). 95 tests passing.

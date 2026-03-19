---
phase: 24-dedicated-input-page-with-accordion-sections
plan: "01"
subsystem: routing-infrastructure
tags: [react-router-dom, accordion, i18n, test-stubs, hash-router]
dependency_graph:
  requires: []
  provides:
    - HashRouter wrapping App root
    - accordion.tsx component (Radix-based)
    - nav.* and input.* i18n keys in EN/FR/DE/IT
    - Wave 0 test stubs for Phase 24 components
  affects:
    - src/main.tsx
    - src/components/ui/accordion.tsx
    - src/i18n/locales/*/translation.json
    - src/features/input/
tech_stack:
  added:
    - react-router-dom: "^7.13.1"
    - "@radix-ui/react-accordion": installed via shadcn
  patterns:
    - HashRouter at root (no basename for hash routing)
    - Shadcn-based accordion component
    - it.todo() for Wave 0 test stubs
key_files:
  created:
    - src/components/ui/accordion.tsx
    - src/features/input/InputPage.test.tsx
    - src/features/input/EthInputAccordion.test.tsx
    - src/features/input/FCInputAccordion.test.tsx
    - src/components/TopBar.test.tsx
    - src/App.test.tsx
  modified:
    - src/main.tsx
    - package.json
    - package-lock.json
    - src/i18n/locales/en/translation.json
    - src/i18n/locales/fr/translation.json
    - src/i18n/locales/de/translation.json
    - src/i18n/locales/it/translation.json
decisions:
  - HashRouter chosen over BrowserRouter for GitHub Pages compatibility (hash routing)
  - No basename prop on HashRouter (not applicable for hash routing)
  - it.todo() over it.skip() for Wave 0 stubs (pending shows without requiring implementation)
  - shadcn accordion used (Radix-based, consistent with existing UI components)
metrics:
  duration: "~7min"
  completed: "2026-03-19T06:15:27Z"
  tasks_completed: 3
  files_created: 6
  files_modified: 7
---

# Phase 24 Plan 01: Install Dependencies, HashRouter, Accordion, i18n, and Wave 0 Test Stubs Summary

**One-liner:** HashRouter wrapping App via react-router-dom v7, shadcn Radix accordion component, nav/input i18n keys across 4 locales, and 5 Wave 0 it.todo() test stubs for Phase 24 components.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install react-router-dom, add HashRouter, add shadcn accordion | f81119a | package.json, main.tsx, accordion.tsx |
| 2 | Add i18n keys to all 4 locale files | d000388 | en/fr/de/it translation.json |
| 3 | Create Wave 0 test stubs | 7a89162 | 5 test stub files |

## Verification Results

- `grep -q "HashRouter" src/main.tsx` — PASS
- `test -f src/components/ui/accordion.tsx` — PASS
- `grep -q '"react-router-dom"' package.json` — PASS
- `grep -q '"nav"' src/i18n/locales/en/translation.json` — PASS
- `grep -q '"input"' src/i18n/locales/en/translation.json` — PASS
- `npx vitest run src/domain/` — PASS (374 tests)
- `npx tsc --noEmit` — PASS

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

- **HashRouter without basename**: Hash routing does not use basename — per plan spec, no basename prop added.
- **it.todo() for stubs**: Chosen over it.skip() because todo tests show as pending in vitest output without requiring implementation, giving visibility into planned tests.
- **shadcn accordion**: Used `npx shadcn@latest add accordion` which automatically installed the Radix accordion dependency and generated the component.

## Self-Check: PASSED

All created files verified to exist on disk. All 3 task commits verified in git history.

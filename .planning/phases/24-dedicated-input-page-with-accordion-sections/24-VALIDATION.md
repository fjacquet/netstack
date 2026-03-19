---
phase: 24
slug: dedicated-input-page-with-accordion-sections
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 + @testing-library/react 16.3.2 |
| **Config file** | `vite.config.ts` (test section) |
| **Quick run command** | `npx vitest run src/features/input/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/domain/` (regression — these must never break)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 0 | UI-01 | unit | `npx vitest run src/features/input/InputPage.test.tsx` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 0 | UI-02 | unit | `npx vitest run src/features/input/EthInputAccordion.test.tsx` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 0 | UI-03 | unit | `npx vitest run src/features/input/FCInputAccordion.test.tsx` | ❌ W0 | ⬜ pending |
| 24-01-04 | 01 | 0 | UI-04 | unit | `npx vitest run src/components/TopBar.test.tsx` | ❌ W0 | ⬜ pending |
| 24-01-05 | 01 | 0 | UI-05 | unit | `npx vitest run src/App.test.tsx` | ❌ W0 | ⬜ pending |
| 24-COMPAT | 01 | 1 | COMPAT | regression | `npx vitest run src/domain/` | ✅ exist | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/input/InputPage.test.tsx` — stub for UI-01 (InputPage renders accordion)
- [ ] `src/features/input/EthInputAccordion.test.tsx` — stub for UI-02 (form syncs to inputStore)
- [ ] `src/features/input/FCInputAccordion.test.tsx` — stub for UI-03 (form syncs to fcInputStore)
- [ ] `src/components/TopBar.test.tsx` — stub for UI-04 (Configure button navigates to /input)
- [ ] `src/App.test.tsx` — stub for UI-05 (NavLink for / uses end prop)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Accordion visual open/close animation | UI | CSS animation not testable with jsdom | Load `/input`, click section headers, confirm smooth expand/collapse |
| HashRouter URL changes (`/#/input`) | ROUTER | URL verification requires browser | Navigate between routes, confirm address bar updates |
| Dark mode accordion styling | THEME | Visual check only | Toggle dark mode, verify accordion triggers/content render correctly |
| GitHub Pages deployment (base path) | DEPLOY | Requires deployed environment | Push to branch, verify HashRouter routes work on GitHub Pages |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

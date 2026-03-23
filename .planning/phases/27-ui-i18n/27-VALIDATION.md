---
phase: 27
slug: ui-i18n
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (node + jsdom environments) |
| **Config file** | `vite.config.ts` (vitest config embedded) |
| **Quick run command** | `npx vitest run src/i18n/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/i18n/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | PHYS-04 | unit | `npx vitest run src/i18n/` | ✅ | ⬜ pending |
| 27-01-02 | 01 | 1 | PHYS-04 | unit + manual | `npx vitest run` | ✅ | ⬜ pending |
| 27-01-03 | 01 | 1 | PHYS-04 | manual | n/a — visual check | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed before implementation.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Amber advisory card renders distinct from red violation card | PHYS-04 / RACK-04 | DOM visual color check | Toggle `racksAdjacent` to false in input form, verify amber advisory card appears in BOM panel |
| `patchPanelDistanceM` field appears/disappears on toggle | RACK-03 | DOM conditional render | Toggle adjacent racks to false, verify distance field appears; toggle back to true, verify it disappears |
| All 4 locales display new labels without fallback keys | PHYS-04 | Language switcher interaction | Switch language to FR, DE, IT — verify no `sizing.rackPitchMm` raw keys appear in the UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

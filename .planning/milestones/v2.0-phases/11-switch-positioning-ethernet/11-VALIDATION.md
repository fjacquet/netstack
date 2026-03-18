---
phase: 11
slug: switch-positioning-ethernet
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-18
completed: 2026-03-18
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npx vitest run src/domain/engine/sizing.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | POS-01, POS-03, POS-04 | unit | `npx vitest run src/domain/engine/sizing.test.ts` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | POS-01 | unit | `npx vitest run src/features/sizing/InputForm.test.tsx` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 2 | POS-02 | unit | `npx vitest run src/features/rack-elevation/` | ❌ W0 | ⬜ pending |
| 11-02-03 | 02 | 2 | POS-04 | unit | `npx vitest run src/features/sizing/BOMPanel.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/rack-elevation/utils/buildRackDevices.test.ts` — positioning-aware switch placement tests

*Existing vitest infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rack elevation visual layout | POS-02 | Visual rendering | Select MoR, verify switches not in server rack visually |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-03-18 — 335 tests pass, all 4 POS requirements verified

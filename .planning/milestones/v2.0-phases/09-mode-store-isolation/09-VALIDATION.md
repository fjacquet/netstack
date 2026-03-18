---
phase: 9
slug: mode-store-isolation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npx vitest run src/store/fc` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/store/fc`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | FC-09 | unit | `npx vitest run src/store/fcInputStore.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | FC-09 | unit | `npx vitest run src/store/fcResultStore.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | FC-09 | integration | `npx vitest run src/store/store-isolation.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/store/fcInputStore.test.ts` — FC input store persistence and default assertions
- [ ] `src/store/fcResultStore.test.ts` — FC result store derivation assertions
- [ ] `src/store/store-isolation.test.ts` — Cross-store isolation (mutating FC leaves Ethernet unchanged)

*Existing vitest infrastructure covers framework setup — no new config needed.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

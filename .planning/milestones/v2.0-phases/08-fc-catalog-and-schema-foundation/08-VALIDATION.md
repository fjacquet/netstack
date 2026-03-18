---
phase: 8
slug: fc-catalog-and-schema-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npx vitest run src/domain/fc-catalog/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/domain/fc-catalog/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | FC-01, FC-02 | unit | `npx vitest run src/domain/fc-catalog/brocade.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | FC-03 | unit | `npx vitest run src/domain/fc-catalog/brocade.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 1 | FC-04 | unit | `npx vitest run src/domain/fc-catalog/brocade.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | FC-01, FC-02 | unit | `npx vitest run src/domain/fc-schemas/fc-schemas.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-02 | 02 | 1 | FC-01 | unit | `npx vitest run src/domain/fc-schemas/fc-schemas.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/domain/fc-catalog/brocade.test.ts` — catalog entry assertions for all 9 models + POD licensing + optics
- [ ] `src/domain/fc-schemas/fc-schemas.test.ts` — Zod schema parse/reject assertions for FCSizingInput and FCNetworkBOM

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

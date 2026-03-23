---
phase: 26
slug: cable-length-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (node environment) |
| **Config file** | `vite.config.ts` (vitest config embedded) |
| **Quick run command** | `npx vitest run src/domain/engine/cable-length.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/domain/engine/cable-length.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 0 | CABLE-05/06 | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-02 | 01 | 1 | CABLE-01/02 | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-03 | 01 | 1 | CABLE-03 | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | ❌ W0 | ⬜ pending |
| 26-01-04 | 01 | 1 | CABLE-04 | unit | `npx vitest run src/domain/engine/cable-length.test.ts` | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 1 | DAC-01/02 | unit | `npx vitest run src/domain/engine/sizing.test.ts` | ✅ | ⬜ pending |
| 26-02-02 | 02 | 1 | RACK-04 | unit | `npx vitest run src/domain/engine/sizing.test.ts` | ✅ | ⬜ pending |
| 26-02-03 | 02 | 1 | CABLE-01/02 | unit | `npx vitest run src/domain/engine/sizing.test.ts` | ✅ | ⬜ pending |
| 26-02-04 | 02 | 1 | CABLE-03 | unit | `npx vitest run src/domain/engine/three-tier-sizing.test.ts` | ✅ | ⬜ pending |
| 26-02-05 | 02 | 1 | CABLE-04 | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/domain/engine/cable-length.test.ts` — stubs for CABLE-05/06 (`applySlackAndRound`, `deriveRackHeightM`), CABLE-01/02 (Clos link lengths), CABLE-03 (Three-Tier link lengths), CABLE-04 (FC ISL length)

*Existing test files (sizing.test.ts, three-tier-sizing.test.ts, fc-sizing.test.ts) already exist and will be extended in Wave 1.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

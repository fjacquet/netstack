---
phase: 1
slug: domain-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | SIZE-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SIZE-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SIZE-04 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SIZE-05 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SIZE-06 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SIZE-07 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAT-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAT-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration (environment: 'node')
- [ ] `src/lib/sizing/__tests__/formulas.test.ts` — sizing engine test stubs
- [ ] `src/lib/sizing/__tests__/catalog.test.ts` — hardware catalog test stubs
- [ ] `src/lib/sizing/__tests__/schemas.test.ts` — Zod schema validation test stubs
- [ ] `package.json` — Vitest + TypeScript dev dependencies

*Wave 0 establishes test infrastructure before any domain logic is written.*

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

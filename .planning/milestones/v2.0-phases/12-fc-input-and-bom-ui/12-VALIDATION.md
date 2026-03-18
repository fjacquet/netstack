---
phase: 12
slug: fc-input-and-bom-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x + @testing-library/react |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npx vitest run src/features/sizing/` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/features/sizing/`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | FC-10 | unit | `npx vitest run src/features/sizing/FCInputForm.test.tsx` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | FC-10 | unit | `npx vitest run src/features/sizing/FCInputForm.test.tsx` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 2 | FC-11 | unit | `npx vitest run src/features/sizing/FCBOMPanel.test.tsx` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | FC-11 | unit | `npx vitest run src/features/sizing/FCBOMPanel.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/sizing/FCInputForm.test.tsx` — HBA ports field, FC switch model selector, ISL ports input, storage target ports
- [ ] `src/features/sizing/FCBOMPanel.test.tsx` — Fabric A/B switch counts, podLicensesRequired top-level, ISL count, FC_PORT_SATURATION Alert, FC_OVERSUBSCRIPTION_EXCEEDED Alert, empty state

*Existing vitest infrastructure covers framework setup — no new config needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mode selector toggles between Ethernet and FC — only one subtree visible | FC-10 | Visual rendering | Click Ethernet/FC toggle, verify correct form/BOM appear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

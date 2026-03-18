---
phase: 14
slug: fc-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run src/features/export` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/features/export`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | FC-13 | unit | `npx vitest run src/features/export/exportFCCsv.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | FC-13 | unit | `npx vitest run src/features/export/exportFCCsv.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | FC-14 | unit | `npx vitest run src/features/export/exportFCPdf.test.ts` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 2 | FC-14 | manual | N/A — visual PDF inspection | N/A | ⬜ pending |
| 14-03-01 | 03 | 3 | FC-13,FC-14 | unit | `npx vitest run src/features/export` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/export/exportFCCsv.test.ts` — stubs for FC-13 CSV tests
- [ ] `src/features/export/exportFCPdf.test.ts` — stubs for FC-14 PDF tests

*Existing vitest infrastructure covers all other requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF visual layout — dual-fabric FC BOM page renders correctly | FC-14 | @react-pdf/renderer renders outside DOM, visual inspection needed | Open app in FC mode, click Export PDF, verify FC BOM page shows Fabric A and Fabric B sections |
| FC topology PNG appears in PDF | FC-14 | PNG capture relies on DOM rendering, not unit-testable | Export PDF in FC mode, verify topology page shows two PNG images (Fabric A / Fabric B) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

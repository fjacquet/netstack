---
phase: 07
slug: rack-elevation-servers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vite.config.ts` (test key) |
| **Quick run command** | `rtk vitest run src/domain/engine/sizing.test.ts src/features/rack-elevation/utils/buildRackDevices.test.ts` |
| **Full suite command** | `rtk vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite
- **Before `/gsd:verify-work`:** Full suite must be green (204+ tests)
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | ELEV-02 | unit | `rtk vitest run src/domain/engine/sizing.test.ts` | ✅ extend | ⬜ pending |
| 07-01-02 | 01 | 1 | ELEV-03 | unit | `rtk vitest run src/domain/engine/sizing.test.ts` | ✅ extend | ⬜ pending |
| 07-01-03 | 01 | 1 | ELEV-02 | unit | `rtk vitest run src/domain/engine/sizing.test.ts` | ✅ extend | ⬜ pending |
| 07-02-01 | 02 | 2 | ELEV-01 | unit | `rtk vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | ✅ extend | ⬜ pending |
| 07-02-02 | 02 | 2 | ELEV-01/02 | unit | `rtk vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | ✅ extend | ⬜ pending |
| 07-03-01 | 03 | 3 | ELEV-03 | visual | `rtk vitest run` | ✅ | ⬜ pending |
| 07-03-02 | 03 | 3 | ELEV-03 | visual | `rtk vitest run` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 needed.

The two relevant test files already exist and will be extended:
- `src/domain/engine/sizing.test.ts` — for ELEV-02 schema + ELEV-03 engine violation
- `src/features/rack-elevation/utils/buildRackDevices.test.ts` — for ELEV-01/02 slot rendering

---

## Key Boundary Cases (RACK_CAPACITY_EXCEEDED)

```typescript
// 42U rack: 3U fixed switches. Remaining = 39U
//   19 servers × 2U = 38U → total 41U < 42U → no violation
//   20 servers × 2U = 40U → total 43U > 42U → violation(usedU:43, totalU:42)
// 24U rack: 3U switches. Remaining = 21U
//   10 servers × 2U = 20U → total 23U < 24U → no violation
//   11 servers × 2U = 22U → total 25U > 24U → violation
// 50U rack: 3U switches. Remaining = 47U
//    5 servers × 8U = 40U → total 43U < 50U → no violation
//    6 servers × 8U = 48U → total 51U > 50U → violation
```

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Amber server slots visible in rack elevation | ELEV-01 | Visual rendering | Open rack elevation tab, verify servers appear in amber with "Server N" labels |
| Red rack frame border on overflow | ELEV-03 | Visual CSS state | Configure a rack to overflow, verify `border-destructive` applied to rack frame |
| U-height Select in Physical section | ELEV-02 | Form rendering | Open InputForm, scroll to Physical section, verify Select with 1U/2U/4U/8U options |
| Language switching of new i18n keys | ELEV-01/02/03 | i18n visual | Switch to FR/DE/IT, verify all new labels translate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

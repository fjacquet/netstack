---
phase: 25
slug: schema-geometry-inputs-advisory-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (node + jsdom environments) |
| **Config file** | `vite.config.ts` (vitest config embedded) |
| **Quick run command** | `npx vitest run src/domain/schemas/schemas.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/domain/schemas/schemas.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 0 | PHYS-01 | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 0 | RACK-01/02/03 | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 | 0 | DAC-03 | unit | `npx vitest run src/domain/catalog/hardware.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-04 | 01 | 1 | PHYS-01 | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-05 | 01 | 1 | RACK-01/02/03 | unit | `npx vitest run src/domain/schemas/schemas.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-06 | 01 | 1 | DAC-03 | unit | `npx vitest run src/domain/catalog/hardware.test.ts` | ❌ W0 | ⬜ pending |
| 25-01-07 | 01 | 1 | PHYS-02 | unit | `npx vitest run src/store/inputStore.test.ts` | ✅ | ⬜ pending |
| 25-02-01 | 02 | 0 | PHYS-03 | unit | `npx vitest run src/domain/profiles/profileService.test.ts` | ❌ W0 | ⬜ pending |
| 25-02-02 | 02 | 1 | PHYS-03 | unit | `npx vitest run src/domain/profiles/profileService.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/domain/schemas/schemas.test.ts` — stubs for PHYS-01 (`AdvisorySchema` round-trip, `advisories[]` on `NetworkBOMSchema`/`ThreeTierBOMSchema`) and RACK-01/02/03 (new geometry fields on `SizingInputSchema`)
- [ ] `src/domain/catalog/hardware.test.ts` — stubs for DAC-03 (`CABLE_CATALOG.DAC.maxDistanceBySpeed[25] === 3`, `maxDistanceBySpeed[100] === 5`)
- [ ] `src/domain/profiles/profileService.test.ts` — stubs for PHYS-03 (`normalizeToCurrentSchema` fills missing geometry fields with defaults)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| localStorage profile from v8 loads without error | PHYS-02 | Requires browser localStorage state seeding | Open devtools, set `localStorage.netstack-input` to a v8 snapshot, reload, verify no console errors and rack pitch defaults to 600 |
| `patchPanelDistanceM` field appears when adjacent toggle is false | RACK-03 | DOM conditional render | Toggle adjacent racks to false in input form, verify distance field appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

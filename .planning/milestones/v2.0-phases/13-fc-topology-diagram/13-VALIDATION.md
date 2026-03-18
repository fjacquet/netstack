---
phase: 13
slug: fc-topology-diagram
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vite.config.ts (test block) |
| **Quick run command** | `npx vitest run src/features/topology/fc/utils/buildFCTopologyGraph.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/features/topology/fc/utils/buildFCTopologyGraph.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | FC-12 | unit | `npx vitest run src/features/topology/fc/utils/buildFCTopologyGraph.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | FC-12 | unit | `npx vitest run src/features/topology/fc/utils/buildFCTopologyGraph.test.ts` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 2 | FC-12 | smoke | `npx vitest run src/features/topology/fc/FCTopologyTab.test.tsx` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | FC-12 | smoke | `npx vitest run src/features/topology/TopologyTab.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/features/topology/fc/utils/buildFCTopologyGraph.test.ts` — isolated fabricA/fabricB subgraphs, no cross-fabric edges, switch counts match BOM, ISL edge count, deterministic output
- [ ] `src/features/topology/fc/FCTopologyTab.test.tsx` — render smoke test (two ReactFlowProvider instances, no crash)

*Existing vitest infrastructure covers framework setup — no new config needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fabric A (blue) and Fabric B (orange) visually distinct | FC-12 | Visual rendering | Switch to FC mode, open Topology tab, verify color coding |
| Zoom/pan on one fabric does not affect the other | FC-12 | Visual interaction | Zoom Fabric A canvas, verify Fabric B is unaffected |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

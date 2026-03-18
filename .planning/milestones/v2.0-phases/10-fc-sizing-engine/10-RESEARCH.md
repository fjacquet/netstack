# Phase 10: FC Sizing Engine - Research

**Researched:** 2026-03-18
**Domain:** Fibre Channel SAN sizing — pure function engine implementing dual-fabric BOM calculation with POD licensing, ISL fan-in ratio, and FC constraint violations
**Confidence:** HIGH

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FC-05 | Dual-fabric SAN topology calculation (Fabric A + Fabric B, switch count always doubles) | See "Dual-Fabric Architecture" pattern. fabricASwitches always equals fabricBSwitches; total switches = 2 × per-fabric count. |
| FC-06 | ISL calculation based on host-to-storage fan-in ratio (max 7:1), NOT Ethernet uplink formula | See "ISL Calculation Formula" — bandwidth-based formula driven by fan-in, separate from Ethernet per-switch uplink multiplier. |
| FC-07 | FC optics BOM (SFP28 for 32G, SFP+ for 64G, SFP+ for 128G) | FC_OPTICS_CATALOG already complete in brocade.ts; engine selects optics by switch speedGbps, counts 2 optics per cable link. |
| FC-08 | FC oversubscription ratio reporting with severity thresholds | fanInRatio and islOversubscriptionRatio are required fields in FCNetworkBOM. Thresholds: ok ≤ 7:1, warning 7–10:1, critical >10:1. |
</phase_requirements>

---

## Summary

Phase 10 replaces the Phase 9 zero-value stub in `src/domain/engine/fc-sizing.ts` with a fully verified pure function. The output type `FCNetworkBOM` is already locked by the Phase 8 schema — the engine must produce every required field, including `podLicensesRequired`, `fanInRatio`, and `islOversubscriptionRatio`, with the correct values. The catalog (`FC_SWITCH_CATALOG`) and schemas (`FCSizingInputSchema`, `FCNetworkBOMSchema`, `FCConstraintViolationSchema`) are all in place from Phases 8–9. This phase is engine logic and test authoring only — no schema changes, no UI, no store changes.

The primary implementation challenge is the ISL formula, which must be derived from the bandwidth-based fan-in ratio (Broadcom 7:1 default), not copied from the Ethernet per-switch uplink multiplier. The second challenge is POD license calculation: the engine must compute how many extra POD license units are needed beyond `basePorts` to reach the required effective port count, then output that count as `podLicensesRequired`.

**Primary recommendation:** Implement `calculateFCBOM()` as a sequence of five deterministic steps — (1) server totals, (2) per-fabric port demand, (3) switch count via effective ports, (4) ISL bandwidth formula, (5) violations — matching the structure of `calculateBOM()` in `sizing.ts` but using FC-specific formulas and the FC catalog exclusively.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | (project) | Unit testing pure functions | Already configured; zero-value stub tests pass in Phase 9 |
| Zod v4 | (project) | Schema inference for `FCSizingInput` and `FCNetworkBOM` | Project convention: all types via `z.infer<>`, never declared separately |
| TypeScript strict | (project) | Type checking across engine and catalog | Project requires `no any`; `as const satisfies` pattern in brocade.ts |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `FC_SWITCH_CATALOG` from `brocade.ts` | (internal) | All port counts and POD fields | All port arithmetic references catalog fields, never inline numbers |
| `FC_OPTICS_CATALOG` from `brocade.ts` | (internal) | Optics selection by speed | Map `switch.speedGbps` to the matching optics key to compute `fcOpticsCount` |

**Installation:** No new packages. Phase 10 is pure TypeScript logic over existing catalog and schemas.

---

## Architecture Patterns

### Recommended File Structure (this phase only)

```
src/
└── domain/
    └── engine/
        ├── fc-sizing.ts          # Replace stub with real implementation
        └── fc-sizing.test.ts     # NEW: comprehensive unit tests (FC-05 through FC-08)
```

No other files change in Phase 10.

### Pattern 1: Five-Step Pure Function Structure

**What:** The engine follows the same five-step structure as `calculateBOM()` in `sizing.ts`:

1. Resolve catalog entry (`FC_SWITCH_CATALOG[input.fcSwitchModel]`)
2. Compute per-fabric port demand (host ports + storage ports + ISL reservation)
3. Compute switch count via effective ports (basePorts + POD units needed)
4. Compute ISL count via bandwidth fan-in formula (not uplink multiplier)
5. Collect violations and return `FCNetworkBOM`

**When to use:** Always — this is the established engine pattern in the project.

**Example:**

```typescript
// Source: src/domain/engine/sizing.ts — adapted for FC
import { FC_SWITCH_CATALOG, FC_OPTICS_CATALOG } from '../catalog/brocade';
import type { FCSizingInput } from '../schemas/fc-input';
import type { FCConstraintViolation, FCNetworkBOM } from '../schemas/fc-bom';

export function calculateFCBOM(input: FCSizingInput): FCNetworkBOM {
  const SW = FC_SWITCH_CATALOG[input.fcSwitchModel];

  // Step 1: Server totals
  const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0);

  // Step 2: Per-fabric port demand — dual fabric splits HBA and storage ports equally
  const hostPortsPerFabric = totalServers * Math.floor(input.hbaPortsPerServer / 2);
  const storagePortsPerFabric = Math.ceil(
    (input.storageArrayCount * input.storageTargetPorts) / 2
  );

  // Step 3: Switch count using effective ports (respects POD model)
  // ...

  // Step 4: ISL count via bandwidth fan-in
  // ...

  // Step 5: Violations
  const violations: FCConstraintViolation[] = [];
  // ...
}
```

### Pattern 2: Effective Port Calculation (POD Licensing)

**What:** Never use `totalPorts` directly. Compute `effectivePorts` as the minimum port count that covers demand, rounded up to the nearest `podLicenseUnit` increment above `basePorts`.

**When to use:** For every fixed-port switch (G710, G720, G730, G820). Directors (`podLicenseUnit === 0`) use `totalPorts` directly.

**Formula:**

```typescript
function computeEffectivePorts(
  portsNeededPerSwitch: number,
  basePorts: number,
  totalPorts: number,
  podLicenseUnit: number,
): { effectivePorts: number; podLicensesRequired: number } {
  if (podLicenseUnit === 0) {
    // Director: all ports base-licensed
    return { effectivePorts: totalPorts, podLicensesRequired: 0 };
  }
  if (portsNeededPerSwitch <= basePorts) {
    return { effectivePorts: basePorts, podLicensesRequired: 0 };
  }
  const extraPortsNeeded = portsNeededPerSwitch - basePorts;
  const podCount = Math.ceil(extraPortsNeeded / podLicenseUnit);
  const effectivePorts = Math.min(basePorts + podCount * podLicenseUnit, totalPorts);
  return { effectivePorts, podLicensesRequired: podCount };
}
```

**Key insight:** `podLicensesRequired` in the BOM is the **total POD license count across all switches**, not per switch. Multiply per-switch pod count by `fabricSwitchCount × 2`.

### Pattern 3: ISL Count via Bandwidth Fan-In Formula

**What:** ISL count is derived from the bandwidth relationship between host ports and storage ports at the target fan-in ratio. This is NOT the same as Ethernet uplink count (`leafSwitches × activeUplinksPerLeaf`).

**Formula (from Broadcom SAN Design Guide, Nov 2025):**

```typescript
function calculateIslCount(
  hostPortsPerFabric: number,
  storagePortsPerFabric: number,
  switchSpeedGbps: number,
  targetFanIn: number = 7,  // Broadcom 7:1 default
): number {
  // ISLs carry traffic from edge to core; bandwidth must not exceed targetFanIn
  const hostBandwidth = hostPortsPerFabric * switchSpeedGbps;
  const storageBandwidth = storagePortsPerFabric * switchSpeedGbps;
  const requiredIslBandwidth = Math.min(hostBandwidth, storageBandwidth) * (1 / targetFanIn);
  // Each ISL carries one full-speed link
  const islCount = Math.max(2, Math.ceil(requiredIslBandwidth / switchSpeedGbps));
  return islCount;
}
```

**Minimum 2 ISLs** is enforced regardless of calculation result (Broadcom minimum for redundancy).

**islOversubscriptionRatio:** `(hostPortsPerFabric × switchSpeedGbps) / (islCount × switchSpeedGbps)`
Simplified to: `hostPortsPerFabric / islCount`. Values >7 flag `FC_ISL_UNDERPROVISIONED`.

### Pattern 4: Dual-Fabric Symmetry Invariant

**What:** `fabricBSwitches` must always equal `fabricASwitches`. The engine computes per-fabric switch count once, then assigns the same value to both. This is an invariant, not a computed field.

**When to use:** Always. The dual-fabric model is symmetrical by design — Fabric A and B are identical.

**Test assertion to include:**

```typescript
it('fabricBSwitches always equals fabricASwitches', () => {
  const result = calculateFCBOM(makeInput());
  expect(result.fabricBSwitches).toBe(result.fabricASwitches);
});
```

### Pattern 5: FC Optics Count

**What:** `fcOpticsCount` is 2 × total cable link count (one optic at each end of every fiber link). Total links = (host + storage + ISL cables per fabric) × 2 fabrics.

**Formula:**

```typescript
const totalLinksPerFabric = hostPortsPerFabric + storagePortsPerFabric + islPortsPerFabric;
const fcOpticsCount = totalLinksPerFabric * 2 * 2; // 2 optics/cable × 2 fabrics
```

The specific optics SKU is implied by `SW.speedGbps` (32G→SFP28, 64G→SFP+, 128G→SFP+). The BOM records the count; the UI selects the catalog entry for display. The engine does not need to output the optics key, only the count.

### Pattern 6: Violation Severity Classification

**What:** `fanInRatio` is always returned in the BOM. Severity classification (ok/warning/critical) is derived from the ratio value:

- ok: fanInRatio ≤ 7
- warning: 7 < fanInRatio ≤ 10
- critical: fanInRatio > 10

The violation `FC_OVERSUBSCRIPTION_EXCEEDED` fires when `fanInRatio > 7`. The severity field is for UI rendering (Phase 12) — the engine does not need to include a `severity` string in the BOM for Phase 10. The ratio alone is sufficient for the planner to flag violations.

**Note:** `FC_OVERSUBSCRIPTION_EXCEEDED` uses `maxRatio: 7` per Broadcom best practice.

### Anti-Patterns to Avoid

- **Copy Ethernet ISL formula:** `islCount = switchCount × islPortsPerSwitch` is wrong for FC. Use the bandwidth fan-in formula above.
- **Use `totalPorts` directly in division:** Always use effective ports computed through the POD model.
- **Make `podLicensesRequired` optional:** It is required in `FCNetworkBOMSchema` — the engine must always compute and return it.
- **Asymmetric dual-fabric:** Any code path that sets `fabricBSwitches !== fabricASwitches` is a bug.
- **Import from `sizing.ts`:** `fc-sizing.ts` must have zero imports from the Ethernet engine. Isolation is total.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Port count per switch model | Inline numbers in engine | `FC_SWITCH_CATALOG[input.fcSwitchModel]` | Phase 8 catalog is the source of truth; inline numbers diverge silently |
| ISL port budget check | Custom capacity struct | `SW.maxIslPorts` from catalog | maxIslPorts is modeled per switch in brocade.ts |
| Optics protocol/form factor selection | Conditional on generation number | `FC_OPTICS_CATALOG` keyed by speedGbps | Protocol discriminant already enforced by `FCOpticsSpec.protocol: 'fibre-channel'` |
| Fan-in threshold constant | Magic number 7 in engine | Named constant `FC_FAN_IN_MAX = 7` at module top | Surfaces the Broadcom recommendation as an explicit named value for v2.x override |

**Key insight:** Phase 8 did the heavy lifting. The catalog fields (`basePorts`, `podLicenseUnit`, `maxIslPorts`) were designed specifically to feed the Phase 10 engine formulas. Every port arithmetic operation maps to a named catalog field.

---

## Common Pitfalls

### Pitfall 1: ISL Formula Copied From Ethernet Uplink Multiplier

**What goes wrong:** ISL count computed as `switchCount × islPortsPerSwitch` (Ethernet pattern) rather than bandwidth fan-in ratio. Produces a BOM with 4× too many ISLs in small fabrics and too few in large ones.
**Why it happens:** The Ethernet `effectiveUplinks × leafSwitches` formula is immediately visible in `sizing.ts` and feels analogous.
**How to avoid:** Implement `calculateIslCount()` as a standalone helper function with explicit `hostPortsPerFabric`, `storagePortsPerFabric`, `switchSpeedGbps`, and `targetFanIn` parameters. Function signature makes the intent unambiguous.
**Warning signs:** ISL count grows with `switchCount` rather than with `hostPortsPerFabric / targetFanIn`.

### Pitfall 2: Using `totalPorts` Instead of Effective Ports for Switch Count

**What goes wrong:** `switchCount = ceil(portsNeeded / SW.totalPorts)`. Customer receives a BOM with switches that arrive with only `basePorts` active and no POD license line item.
**Why it happens:** `totalPorts` is the most visible field in the catalog entry.
**How to avoid:** Always go through `computeEffectivePorts()` helper. The switch count division uses `effectivePorts`, not `totalPorts`. The POD license output is derived from the delta.
**Warning signs:** `podLicensesRequired` returns 0 for any G720 or G730 deployment.

### Pitfall 3: `podLicensesRequired` as Per-Switch Count Rather Than Total

**What goes wrong:** `podLicensesRequired = podsPerSwitch` rather than `podsPerSwitch × totalSwitches × 2` (both fabrics). Customer's procurement order is short by a factor of switch count.
**Why it happens:** The per-switch calculation is what the formula naturally produces first.
**How to avoid:** Final BOM assembly multiplies by `fabricASwitches × 2` (both fabrics). Add a test with a multi-switch fabric that validates the total.

### Pitfall 4: ISL Port Reservation Not Subtracted From Device Ports

**What goes wrong:** Engine calculates `switchCount = ceil(hostPorts + storagePorts / SW.effectivePorts)` without reserving ISL ports first. Each switch is over-committed — some ports assigned to hosts are actually needed for ISL links.
**Why it happens:** ISL ports and device ports seem separable conceptually, but they come from the same physical port pool on fixed switches (unlike directors which have separate ISL routing blades).
**How to avoid:** Per-switch device ports = `effectivePorts - input.islPortsPerSwitch`. The schema already carries `islPortsPerSwitch` (default 4) for this purpose.
**Warning signs:** Engine ignores `input.islPortsPerSwitch`.

### Pitfall 5: hbaPortsPerServer Distributed Unevenly

**What goes wrong:** `hostPortsPerFabric = totalServers × hbaPortsPerServer` (all HBAs to one fabric). Correct formula splits HBAs evenly: `hostPortsPerFabric = totalServers × floor(hbaPortsPerServer / 2)`.
**Why it happens:** The input schema name `hbaPortsPerServer` sounds like "total per server," not "split across 2 fabrics."
**How to avoid:** Use `floor(hbaPortsPerServer / 2)` explicitly. With default `hbaPortsPerServer=2`, this gives 1 HBA port per fabric per server (standard dual-fabric deployment).
**Warning signs:** A 100-server deployment with 2 HBA ports/server shows `hostPortsPerFabric=200` instead of 100.

---

## Code Examples

Verified patterns from the existing codebase and Broadcom SAN Design Guide:

### Engine Entry Point Skeleton

```typescript
// src/domain/engine/fc-sizing.ts
import { FC_SWITCH_CATALOG } from '../catalog/brocade';
import type { FCSizingInput } from '../schemas/fc-input';
import type { FCConstraintViolation, FCNetworkBOM } from '../schemas/fc-bom';

/** Broadcom recommended maximum host-to-storage fan-in ratio */
const FC_FAN_IN_MAX = 7;

export function calculateFCBOM(input: FCSizingInput): FCNetworkBOM {
  const SW = FC_SWITCH_CATALOG[input.fcSwitchModel];

  // ─── Step 1: Server totals ─────────────────────────────────────────────
  const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0);

  // ─── Step 2: Per-fabric port demand ───────────────────────────────────
  const hostPortsPerFabric = totalServers * Math.floor(input.hbaPortsPerServer / 2);
  const storagePortsPerFabric = Math.ceil(
    (input.storageArrayCount * input.storageTargetPorts) / 2
  );

  // ─── Step 3: Effective ports and switch count ─────────────────────────
  const devicePortsPerSwitch = SW.basePorts - input.islPortsPerSwitch;
  // ... POD license calculation and switch count

  // ─── Step 4: ISL count ────────────────────────────────────────────────
  // Based on bandwidth fan-in ratio, not switch count multiplier

  // ─── Step 5: Violations ───────────────────────────────────────────────
  const violations: FCConstraintViolation[] = [];

  return {
    fabricASwitches: /* fabricSwitchCount */,
    fabricBSwitches: /* fabricSwitchCount — always equal */,
    hostPortsPerFabric,
    storagePortsPerFabric,
    islPortsPerFabric: /* islCount */,
    podLicensesRequired: /* totalPodLicenses */,
    fcOpticsCount: /* 2 × total cable links × 2 fabrics */,
    islCables: /* islCount × 2 fabrics */,
    fanInRatio: storagePortsPerFabric > 0 ? hostPortsPerFabric / storagePortsPerFabric : 0,
    islOversubscriptionRatio: /* hostPortsPerFabric / islCount */,
    violations,
    input,
  };
}
```

### Test Helper Pattern (from sizing.test.ts)

```typescript
// Source: src/domain/engine/sizing.test.ts — adapted for FC
import { describe, it, expect } from 'vitest';
import { calculateFCBOM } from './fc-sizing';
import type { FCSizingInput } from '../schemas/fc-input';

function makeInput(overrides: Partial<FCSizingInput> = {}): FCSizingInput {
  return {
    racks: [{ serverCount: 16 }, { serverCount: 16 }],
    hbaPortsPerServer: 2,
    storageTargetPorts: 4,
    storageArrayCount: 1,
    fcSwitchModel: 'G720',
    islPortsPerSwitch: 4,
    rackSize: '42U',
    serverUHeight: '1U',
    ...overrides,
  };
}
```

### ISL Oversubscription Check (from fc-bom.ts schema + Broadcom guide)

```typescript
// Violation fires when fan-in exceeds Broadcom 7:1 recommendation
if (fanInRatio > FC_FAN_IN_MAX) {
  violations.push({
    code: 'FC_OVERSUBSCRIPTION_EXCEEDED',
    ratio: fanInRatio,
    maxRatio: FC_FAN_IN_MAX,
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `calculateBOM()` with mode branch | Parallel `calculateFCBOM()` independent function | Phase 8 design decision | Zero Ethernet regression risk from FC changes |
| Static port count per switch | `basePorts` + `podLicenseUnit` POD model | Phase 8 catalog design | Engine produces accurate POD license count in BOM |
| Phase 9 zero-value stub | Real implementation (this phase) | Phase 10 | All downstream consumers (store, BOM panel, export) receive correct data |

**Deprecated/outdated:**

- Phase 9 stub return values (all zeros): Every field except `input` and `violations:[]` must produce correct computed values after Phase 10.

---

## Open Questions

1. **hbaPortsPerServer odd values (e.g., 3)**
   - What we know: `floor(hbaPortsPerServer / 2)` distributes evenly for even values. For hbaPortsPerServer=3, floor(3/2)=1 — one port per fabric, one port unaccounted.
   - What's unclear: Should the engine use `ceil` for one fabric and `floor` for the other, or always `floor` and treat the odd HBA as unused?
   - Recommendation: Use `Math.floor(hbaPortsPerServer / 2)` for both fabrics (conservative). Document in a JSDoc comment. The schema allows 1-8; odd values are uncommon in practice (2 and 4 are standard).

2. **ISL ports from same physical pool as device ports on fixed switches**
   - What we know: `input.islPortsPerSwitch` (default 4) is subtracted from per-switch device capacity.
   - What's unclear: Whether `islPortsPerSwitch` should be validated against `SW.maxIslPorts` with a clamp (similar to `UPLN-02` runtime clamp in Ethernet engine).
   - Recommendation: Apply a runtime clamp: `effectiveIslPerSwitch = Math.min(input.islPortsPerSwitch, SW.maxIslPorts)`. Add an assertion or comment documenting the clamp.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (project-configured) |
| Config file | vite.config.ts (vitest block) |
| Quick run command | `npx vitest run src/domain/engine/fc-sizing.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FC-05 | fabricASwitches equals fabricBSwitches for any input | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-05 | Switch count doubles for dual fabric (per-fabric × 2) | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-06 | ISL count based on fan-in ratio, not switch count multiplier | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-06 | Minimum 2 ISLs enforced regardless of fabric size | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-07 | fcOpticsCount is 2 × total cable links × 2 fabrics | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-07 | Optics count changes correctly when switch model changes | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-08 | fanInRatio present and correct in all BOM outputs | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-08 | FC_OVERSUBSCRIPTION_EXCEEDED fires when fanInRatio > 7 | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-08 | FC_PORT_SATURATION fires when demand exceeds effective switch ports | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-08 | FC_ISL_UNDERPROVISIONED fires when ISLs < required minimum | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-05/06 | podLicensesRequired is 0 for directors (X7-4, X7-8, X8-4, X8-8) | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |
| FC-05/06 | podLicensesRequired > 0 for G720 with 40 servers (exceeds basePorts) | unit | `npx vitest run src/domain/engine/fc-sizing.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/engine/fc-sizing.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/domain/engine/fc-sizing.test.ts` — covers all FC-05 through FC-08 requirements
- [ ] Shared `makeInput()` helper inside `fc-sizing.test.ts` (same self-contained pattern as `sizing.test.ts`)

*(No framework install needed — Vitest is already configured and running)*

---

## Sources

### Primary (HIGH confidence)

- `src/domain/catalog/brocade.ts` — FC_SWITCH_CATALOG with all 9 models, POD fields, maxIslPorts
- `src/domain/catalog/fc-types.ts` — FCSwitchSpec and FCOpticsSpec interfaces
- `src/domain/schemas/fc-input.ts` — FCSizingInputSchema (locked input contract)
- `src/domain/schemas/fc-bom.ts` — FCNetworkBOMSchema, FCConstraintViolationSchema (locked output contract)
- `src/domain/engine/sizing.ts` — reference implementation pattern for pure engine structure
- `src/domain/engine/fc-sizing.ts` — Phase 9 stub to be replaced
- Broadcom SAN Design and Best Practices (Nov 2025): <https://docs.broadcom.com/doc/53-1004781> — ISL formula, 7:1 fan-in recommendation
- Broadcom G720 Product Brief: <https://docs.broadcom.com/doc/G720-Switch-PB> — POD licensing model

### Secondary (MEDIUM confidence)

- `.planning/research/FEATURES.md` — FC sizing formulas section, verified against Broadcom guide
- `.planning/research/PITFALLS.md` — ISL formula pitfall, POD licensing pitfall, dual-fabric topology pitfall

### Tertiary (LOW confidence)

- None. All critical implementation details verified from primary sources (codebase + official Broadcom docs).

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new libraries; all tooling already in use
- Architecture: HIGH — schemas and catalog already complete; engine structure follows established `calculateBOM()` pattern
- FC formulas (dual-fabric split, POD model): HIGH — modeled in catalog and schema from Phase 8; confirmed against Broadcom docs
- ISL formula: MEDIUM-HIGH — Broadcom SAN Design Guide is the source; translation to TypeScript formula requires one careful implementation pass
- Pitfalls: HIGH — derived from codebase analysis and Broadcom POD licensing docs

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (FC catalog and schemas are stable; ISL formula is from a Nov 2025 Broadcom document)

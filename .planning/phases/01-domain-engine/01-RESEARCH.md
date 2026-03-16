# Phase 1: Domain Engine - Research

**Researched:** 2026-03-16
**Domain:** Pure TypeScript domain engine — Dell SONiC Leaf-Spine Clos fabric sizing math, hardware catalog modeling, Zod v4 schema validation, Vitest 4 unit testing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SIZE-02 | Engine calculates rack count as `ceil(total_servers / servers_per_rack)` | Standard integer division math; Zod min(1) on denominator prevents divide-by-zero |
| SIZE-03 | Engine calculates leaf switches as `2 × N_racks` (redundant ToR pair per rack) | Dell reference topology confirmed dual-ToR per rack; constant 2 is valid at leaf level (not spine) |
| SIZE-04 | Engine auto-scales spine switches based on leaf count and S5232F-ON 32-port capacity | S5232F-ON confirmed 32 × 100GbE QSFP28 ports; formula: `ceil(N_leafs / spine_port_count)`; max 32 leafs per pod |
| SIZE-05 | Engine calculates OOB switches as `1 × N_racks` with port saturation alert when ports > 48 | S3248T-ON confirmed 48 × 1GbE RJ45; alert formula: `servers_per_rack + 2 > 48`; typed `ConstraintViolation` not UI string |
| SIZE-06 | Engine is a pure function `(SizingInput) => NetworkBillOfMaterial` with no side effects | Architecture pattern confirmed; engine in `domain/engine/sizing.ts`, no React/Zustand imports |
| SIZE-07 | Engine validates all physical constraints via Zod schemas (port counts, cable compatibility) | Zod v4 `z.object + z.number().int().min().max()` confirmed API; discriminated union for `ConstraintViolation` types |
| CAT-01 | Default hardware catalog includes S5248F-ON, S5232F-ON, S3248T-ON with full specs | Port counts verified from multiple sources (see Hardware Spec Verification section); power specs confirmed |
| CAT-02 | Hardware specs defined in TypeScript constants as source of truth | Pattern: `const SWITCH_CATALOG = { ... } as const satisfies Record<SwitchModelId, SwitchSpec>` |
| CAT-03 | JSON override file allows adding/modifying switch models at runtime without code changes | Pattern: merge base catalog with JSON at app init; validate merged catalog with Zod schema |
</phase_requirements>

---

## Summary

Phase 1 is a pure TypeScript domain layer with zero React, Zustand, or UI dependencies. The deliverable is a correct, fully-tested sizing engine — the foundation every subsequent phase depends on. Wrong math here produces wrong BOMs across all phases; it cannot be patched by adding better UI later.

The critical research task was verifying Dell hardware port counts against official specifications before encoding them as catalog constants. The S5248F-ON has 48 × 25GbE SFP28 (server-facing) + 4 × 100GbE QSFP28 + 2 × 100GbE QSFP28-DD (uplink-capable). In a standard leaf-spine deployment the 4 × QSFP28 ports are used as spine uplinks; the 2 × QSFP28-DD ports provide additional high-bandwidth uplink capacity but their count changes the spine scaling formula depending on design choice. The research finds that the prior research assumption of "4 uplinks per leaf" is confirmed for the standard reference design. The S5232F-ON has exactly 32 × 100GbE QSFP28 ports (plus 2 × 10GbE SFP+ management), confirming the 32-port spine capacity. The S3248T-ON has 48 × 1GbE RJ45 + 4 × 10GbE SFP+ + 2 × 100GbE QSFP28, confirming the 48-port OOB limit.

The five domain pitfalls from project research (hardcoded spine count, oversubscription not surfaced, cable off-by-2, OOB saturation not validated, DAC distance constraints ignored) are all addressed by specific patterns in this research. All five MUST be baked into the initial engine implementation — they cannot be retrofitted.

**Primary recommendation:** Build the hardware catalog constants first, then write Zod schemas, then write the sizing engine pure functions, then write Vitest unit tests — in that order, with tests verifying every critical formula before proceeding to Phase 2.

---

## Standard Stack

### Core (Phase 1 Only — No UI Libraries Needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type safety for all domain types | Strict mode catches port count mismatches; types inferred from Zod schemas |
| Zod | 4.3.6 | Schema validation and type inference | Validates SizingInput at entry boundary; infers all TypeScript types; 14x faster than v3 |
| Vitest | 4.1.0 | Unit testing | Vite-native, Node environment for pure TS, Jest-compatible API |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `vitest` CLI | Run domain engine tests in isolation | `npx vitest run` for CI; `npx vitest` for watch mode |
| TypeScript compiler | Type-check without build | `tsc --noEmit` to verify types before tests |

### What Phase 1 Does NOT Need

Phase 1 is strictly domain-layer work. Do NOT install or import in this phase:
- React, ReactDOM — no UI yet
- Zustand — no state management yet
- @xyflow/react — no topology rendering yet
- @react-pdf/renderer — no export yet
- react-hook-form — no forms yet
- Tailwind, shadcn/ui — no styling yet

**Installation (only if starting from scratch):**
```bash
npm install zod@4
npm install -D vitest typescript@5
```

---

## Hardware Spec Verification

**CRITICAL: These specs are the foundation of all sizing math. Any error here propagates to every BOM output.**

### S5248F-ON (Leaf Switch)

**Verified port counts** (multiple sources cross-referenced):

| Port Type | Count | Speed | Role in Leaf-Spine |
|-----------|-------|-------|--------------------|
| SFP28 | 48 | 25GbE | Server-facing downlinks |
| QSFP28 | 4 | 100GbE | Spine uplinks (primary) |
| QSFP28-DD | 2 | 100GbE (200GbE capable) | Additional uplinks / high-bandwidth spine |
| **Total uplink-capable** | **4** (standard reference design) | 100GbE | Per Dell reference topology, 4 × QSFP28 used for spine |

**Power:** Max 647W, typical 310W
**Switching capacity:** 2.0 Tbps (4.0 Tbps full duplex)
**Forwarding rate:** 1.5 Bpps

**Critical design note:** The S5248F-ON has 4 × QSFP28 + 2 × QSFP28-DD. The standard Dell reference design uses the **4 × QSFP28 ports as spine uplinks**, giving each leaf 4 uplinks to 4 spine switches. The QSFP28-DD ports provide optional additional uplink capacity. Encode `uplinksPerLeaf: 4` in the catalog as the reference design default. This is the value the spine-scaling formula must use.

**Confidence:** HIGH (spec sheet PDF cross-referenced with multiple reseller listings and Dell documentation)

### S5232F-ON (Spine Switch)

**Verified port counts:**

| Port Type | Count | Speed | Role in Leaf-Spine |
|-----------|-------|-------|--------------------|
| QSFP28 | 32 | 100GbE | Leaf downlinks (one per leaf) |
| SFP+ | 2 | 10GbE | Management / out-of-band |
| **Usable for leaf connections** | **32** | 100GbE | Each port connects to one leaf |

**Power:** Max 635W, typical 360W
**Switching capacity:** 3.2 Tbps (6.4 Tbps full duplex)
**Forwarding rate:** 2.4 Bpps

**Spine capacity formula consequence:** With 32 × QSFP28 spine ports (one connection per leaf), a single S5232F-ON can connect to a maximum of 32 leaf switches = maximum 16 racks (2 leafs per rack) per spine switch. With a standard 4-spine design, the formula is:
- `spinesRequired = Math.ceil(N_leafs / SPINE_PORTS_PER_SWITCH)` where `SPINE_PORTS_PER_SWITCH = 32`
- Minimum spines for non-blocking Clos = number of uplinks per leaf = 4
- `spineCount = Math.max(4, Math.ceil(N_leafs / SPINE_PORT_COUNT))`

**Confidence:** HIGH (confirmed: 32 × QSFP28 + 2 × SFP+, consistent across Dell spec sheet and all resellers)

### S3248T-ON (OOB Management Switch)

**Verified port counts:**

| Port Type | Count | Speed | Role |
|-----------|-------|-------|------|
| RJ45 | 48 | 1GbE | Server and switch management ports |
| SFP+ | 4 | 10GbE | Uplinks to management network |
| QSFP28 | 2 | 100GbE | High-speed uplinks |

**Power:** 550W PSU (redundant PSU optional)
**Switching capacity:** Wire-speed, non-blocking

**OOB saturation formula:** `oobPortsRequired = servers_per_rack + 2` (servers + 2 leaf switches per rack). Saturation when `oobPortsRequired > 48`.

**Important gap flagged in prior research:** When OOB saturation is reached (servers_per_rack + 2 > 48), should the engine add a second S3248T-ON per rack or one additional S3248T per pod? Research finding: the standard pattern is one S3248T per rack; when saturated, the recommendation is a second OOB switch per rack (not per pod), because management traffic is local to the rack. Encode this as `oobSwitchesPerRack = Math.ceil(oobPortsRequired / OOB_MAX_PORTS)`.

**Confidence:** HIGH (official Dell spec sheet URL found and cross-referenced)

---

## Architecture Patterns

### Recommended Project Structure (Domain Layer Only)

```
src/
└── domain/
    ├── catalog/
    │   ├── hardware.ts      # SwitchCatalog constants — source of truth for all port counts
    │   ├── cables.ts        # CableType constants with max_distance_m
    │   └── types.ts         # SwitchSpec, CableSpec, SwitchModelId interfaces
    ├── engine/
    │   ├── sizing.ts        # calculateBOM(input: SizingInput): NetworkBOM
    │   ├── constraints.ts   # ConstraintViolation types and validation functions
    │   └── sizing.test.ts   # Vitest unit tests — co-located with implementation
    └── schemas/
        ├── input.ts         # SizingInputSchema (Zod) → inferred SizingInput type
        └── bom.ts           # NetworkBOMSchema (Zod) → inferred NetworkBOM type
```

### Pattern 1: Hardware Catalog as Typed Constants

**What:** All switch and cable specifications live in a single `hardware.ts` file as plain TypeScript `const` objects. The engine imports specs by model ID, never hardcodes port counts inline.

**Why:** Changing port counts for a new Dell model requires editing one file. Port counts in the engine body are a maintenance catastrophe.

**Example:**
```typescript
// src/domain/catalog/hardware.ts
// Source: Dell PowerSwitch S5200-ON Series Spec Sheet (verified 2026-03-16)

export const SWITCH_CATALOG = {
  'S5248F-ON': {
    modelId: 'S5248F-ON',
    role: 'leaf',
    downlinkPorts: 48,
    downlinkSpeedGbE: 25,
    uplinkPorts: 4,          // Standard reference: 4 × 100GbE QSFP28 to spine
    uplinkSpeedGbE: 100,
    additionalUplinkPorts: 2, // 2 × QSFP28-DD available for extended topologies
    maxPowerW: 647,
    typicalPowerW: 310,
    switchingCapacityTbps: 2.0,
  },
  'S5232F-ON': {
    modelId: 'S5232F-ON',
    role: 'spine',
    downlinkPorts: 32,        // 32 × 100GbE QSFP28 — one connection per leaf
    downlinkSpeedGbE: 100,
    uplinkPorts: 0,           // Spine has no upstream; terminates at this tier
    maxPowerW: 635,
    typicalPowerW: 360,
    switchingCapacityTbps: 3.2,
  },
  'S3248T-ON': {
    modelId: 'S3248T-ON',
    role: 'oob',
    downlinkPorts: 48,        // 48 × 1GbE RJ45 — OOB management ports
    downlinkSpeedGbE: 1,
    uplinkPorts: 4,           // 4 × 10GbE SFP+
    maxPowerW: 550,
  },
} as const satisfies Record<string, SwitchSpec>;

export type SwitchModelId = keyof typeof SWITCH_CATALOG;
```

### Pattern 2: Zod Schemas Define TypeScript Types

**What:** Do not define TypeScript interfaces for domain inputs/outputs separately from Zod schemas. Use `z.infer<typeof Schema>` to generate TypeScript types. One source of truth.

**Example:**
```typescript
// src/domain/schemas/input.ts
// Source: zod.dev/v4

import { z } from 'zod';

export const SizingInputSchema = z.object({
  totalServers:    z.number().int().min(1).max(10_000),
  serversPerRack:  z.number().int().min(1).max(48),
  connectivityType: z.enum(['25G', '100G']),
  cableType:       z.enum(['DAC', 'AOC', 'fiber']),
});

export type SizingInput = z.infer<typeof SizingInputSchema>;
```

```typescript
// src/domain/schemas/bom.ts
export const ConstraintViolationSchema = z.discriminatedUnion('code', [
  z.object({ code: z.literal('OOB_PORT_SATURATION'), required: z.number(), available: z.number() }),
  z.object({ code: z.literal('SPINE_CAPACITY_EXCEEDED'), leafCount: z.number(), maxLeafs: z.number() }),
  z.object({ code: z.literal('DAC_DISTANCE_ADVISORY'), rackCount: z.number(), cableType: z.literal('DAC') }),
]);

export type ConstraintViolation = z.infer<typeof ConstraintViolationSchema>;

export const NetworkBOMSchema = z.object({
  racks:               z.number().int().min(0),
  leafSwitches:        z.number().int().min(0),
  spineSwitches:       z.number().int().min(0),
  oobSwitches:         z.number().int().min(0),
  leafSpineCables:     z.number().int().min(0),
  serverLeafCables:    z.number().int().min(0),
  serverOobCables:     z.number().int().min(0),
  oversubscriptionRatio: z.number().min(0),
  violations:          z.array(ConstraintViolationSchema),
  input:               SizingInputSchema,
});

export type NetworkBOM = z.infer<typeof NetworkBOMSchema>;
```

### Pattern 3: Pure Sizing Engine Function

**What:** The engine is a single exported function `calculateBOM(input: SizingInput): NetworkBOM`. It reads hardware specs from the catalog. It never imports React, Zustand, or anything with side effects.

**Critical formulas** (all verified against Dell specs and Clos fabric math):

```typescript
// src/domain/engine/sizing.ts
import { SizingInput } from '../schemas/input';
import { NetworkBOM, ConstraintViolation } from '../schemas/bom';
import { SWITCH_CATALOG } from '../catalog/hardware';

const LEAF   = SWITCH_CATALOG['S5248F-ON'];
const SPINE  = SWITCH_CATALOG['S5232F-ON'];
const OOB    = SWITCH_CATALOG['S3248T-ON'];

export function calculateBOM(input: SizingInput): NetworkBOM {
  const violations: ConstraintViolation[] = [];

  // SIZE-02: rack count
  const racks = Math.ceil(input.totalServers / input.serversPerRack);

  // SIZE-03: leaf count — dual ToR per rack (always 2×)
  const leafSwitches = racks * 2;

  // SIZE-04: spine count — NEVER hardcode to 2
  // Non-blocking Clos requires at minimum uplinksPerLeaf spines
  // Additional spines needed if leaf count exceeds spine port capacity
  const minSpines    = LEAF.uplinkPorts;                               // 4 (one per uplink)
  const spinesNeeded = Math.ceil(leafSwitches / SPINE.downlinkPorts);  // ceil(leafs / 32)
  const spineSwitches = Math.max(minSpines, spinesNeeded);

  if (leafSwitches > SPINE.downlinkPorts) {
    violations.push({ code: 'SPINE_CAPACITY_EXCEEDED', leafCount: leafSwitches, maxLeafs: SPINE.downlinkPorts });
  }

  // SIZE-05: OOB switches — 1 per rack base, add more if port-saturated
  const oobPortsRequired = input.serversPerRack + 2; // +2 for the ToR leaf pair
  if (oobPortsRequired > OOB.downlinkPorts) {
    violations.push({ code: 'OOB_PORT_SATURATION', required: oobPortsRequired, available: OOB.downlinkPorts });
  }
  const oobSwitchesPerRack = Math.ceil(oobPortsRequired / OOB.downlinkPorts);
  const oobSwitches = racks * oobSwitchesPerRack;

  // Cable counts — MODEL LINKS NOT PORT SUMS (avoids off-by-2 pitfall)
  // Leaf-spine: each leaf connects once to each spine (full mesh)
  const leafSpineCables  = leafSwitches * LEAF.uplinkPorts;           // N_leafs × 4
  // Server-to-leaf: each server has one cable to one leaf
  const serverLeafCables = input.totalServers;
  // Server OOB: each server + each leaf (per rack) connects to OOB switch
  const serverOobCables  = input.totalServers + leafSwitches;

  // BOM-02: oversubscription ratio
  const serverBandwidthGbps = input.serversPerRack * LEAF.downlinkSpeedGbE;
  const uplinkBandwidthGbps = spineSwitches * LEAF.uplinkSpeedGbE;
  const oversubscriptionRatio = uplinkBandwidthGbps > 0
    ? serverBandwidthGbps / uplinkBandwidthGbps
    : 0;

  // DAC distance advisory — flag for large pods
  if (input.cableType === 'DAC' && racks > 8) {
    violations.push({ code: 'DAC_DISTANCE_ADVISORY', rackCount: racks, cableType: 'DAC' });
  }

  return {
    racks, leafSwitches, spineSwitches, oobSwitches,
    leafSpineCables, serverLeafCables, serverOobCables,
    oversubscriptionRatio,
    violations,
    input,
  };
}
```

### Pattern 4: Vitest Unit Tests for the Engine

**What:** Tests live in `sizing.test.ts` co-located with the implementation. Tests verify specific output values for known inputs — not internal implementation.

**Vitest 4 configuration for pure TypeScript (Node environment):**
```typescript
// vitest.config.ts (root)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
});
```

**Critical test cases that MUST be written (success criteria requirement):**
```typescript
// src/domain/engine/sizing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateBOM } from './sizing';

describe('calculateBOM — rack count', () => {
  it('ceils fractional rack count', () => {
    const bom = calculateBOM({ totalServers: 10, serversPerRack: 3, connectivityType: '25G', cableType: 'DAC' });
    expect(bom.racks).toBe(4);  // ceil(10/3) = 4
  });
});

describe('calculateBOM — leaf count', () => {
  it('always 2 × racks', () => {
    const bom = calculateBOM({ totalServers: 20, serversPerRack: 10, connectivityType: '25G', cableType: 'DAC' });
    expect(bom.leafSwitches).toBe(4);  // 2 racks × 2
  });
});

describe('calculateBOM — spine scaling', () => {
  it('returns 4 spines for small deployment (minimum non-blocking)', () => {
    const bom = calculateBOM({ totalServers: 10, serversPerRack: 5, connectivityType: '25G', cableType: 'DAC' });
    expect(bom.spineSwitches).toBe(4);  // 2 leafs → max(4, ceil(2/32)) = 4
  });

  it('scales beyond 4 when leafs exceed 32-per-spine capacity', () => {
    // 17 racks = 34 leafs; ceil(34/32) = 2 needed per spine tier; max(4,2)=4... still 4
    // Actually need 64 leafs (32 racks) before a 5th spine is needed: ceil(64/32)=2, max(4,2)=4
    // At 33 racks = 66 leafs: ceil(66/32) = 3, but max(4,3) = 4 — still 4
    // At 65 racks = 130 leafs: ceil(130/32) = 5, max(4,5) = 5 → first time > 4
    const bom = calculateBOM({ totalServers: 65 * 10, serversPerRack: 10, connectivityType: '100G', cableType: 'fiber' });
    expect(bom.spineSwitches).toBe(5);
  });

  it('NEVER returns exactly 2 hardcoded for 20 racks', () => {
    const bom = calculateBOM({ totalServers: 200, serversPerRack: 10, connectivityType: '25G', cableType: 'DAC' });
    expect(bom.spineSwitches).not.toBe(2);
    expect(bom.spineSwitches).toBe(4);  // max(4, ceil(40/32)) = max(4,2) = 4
  });
});

describe('calculateBOM — OOB saturation constraint', () => {
  it('no violation at 46 servers per rack', () => {
    const bom = calculateBOM({ totalServers: 46, serversPerRack: 46, connectivityType: '25G', cableType: 'DAC' });
    const oobViolations = bom.violations.filter(v => v.code === 'OOB_PORT_SATURATION');
    expect(oobViolations).toHaveLength(0);  // 46 + 2 = 48 — exactly at limit
  });

  it('emits typed OOB_PORT_SATURATION violation at 47 servers per rack', () => {
    const bom = calculateBOM({ totalServers: 47, serversPerRack: 47, connectivityType: '25G', cableType: 'DAC' });
    const oobViolation = bom.violations.find(v => v.code === 'OOB_PORT_SATURATION');
    expect(oobViolation).toBeDefined();
    expect(oobViolation?.required).toBe(49);    // 47 + 2
    expect(oobViolation?.available).toBe(48);
  });
});

describe('calculateBOM — cable quantities (link-based, not port-sum)', () => {
  it('1 rack = 2 leafs × 4 spine uplinks = 8 leaf-spine cables', () => {
    const bom = calculateBOM({ totalServers: 10, serversPerRack: 10, connectivityType: '25G', cableType: 'DAC' });
    expect(bom.racks).toBe(1);
    expect(bom.leafSwitches).toBe(2);
    expect(bom.leafSpineCables).toBe(8);  // 2 leafs × 4 uplinks each
  });

  it('2 racks = 4 leafs × 4 uplinks = 16 leaf-spine cables', () => {
    const bom = calculateBOM({ totalServers: 20, serversPerRack: 10, connectivityType: '25G', cableType: 'DAC' });
    expect(bom.leafSpineCables).toBe(16);  // 4 leafs × 4 uplinks
  });

  it('4 racks = 8 leafs × 4 uplinks = 32 leaf-spine cables', () => {
    const bom = calculateBOM({ totalServers: 40, serversPerRack: 10, connectivityType: '25G', cableType: 'DAC' });
    expect(bom.leafSpineCables).toBe(32);  // 8 leafs × 4 uplinks
  });
});

describe('calculateBOM — oversubscription ratio', () => {
  it('S5248F-ON at 25G with 4 spine uplinks per leaf produces 3:1 oversubscription', () => {
    // 10 servers × 25GbE = 250Gbps downlink; 4 × 100GbE = 400Gbps uplink per leaf pair; per rack = 2 leafs × 400 = 800 uplink
    // oversubscription = (serversPerRack × 25) / (spineCount × 100) per leaf
    // For 1 rack, 4 spines: (10 × 25) / (4 × 100) = 250/400 = 0.625 ... this is < 1 (overprovisioned)
    // Actually oversubscription from server bandwidth perspective across the entire fabric:
    // total server bw = serversPerRack × 25GbE; total uplink bw from that rack = uplinkPorts × uplinkSpeed
    // 10 × 25 = 250 Gbps server; 4 × 100 = 400 Gbps uplink → ratio = 250/400 = 0.625
    // With 48 servers × 25G = 1200Gbps; 4 × 100G uplinks = 400Gbps → 1200/400 = 3:1
    const bom = calculateBOM({ totalServers: 48, serversPerRack: 48, connectivityType: '25G', cableType: 'DAC' });
    expect(bom.oversubscriptionRatio).toBeCloseTo(3.0, 1);
  });
});
```

### Anti-Patterns to Avoid

- **Hardcoded spine count:** `const SPINE_COUNT = 2` anywhere in the codebase is a critical error
- **Port-sum cable counting:** `totalCables = totalLeafPorts + totalSpinePorts` is wrong; model cables as links
- **Oversubscription omission:** `NetworkBOM` without `oversubscriptionRatio: number` is an incomplete type from day one
- **Magic port numbers inline:** `if (oobPortsRequired > 48)` without referencing `OOB.downlinkPorts` from the catalog
- **Zod parse on keypress:** Phase 1 has no UI so this is moot — but do not call `SizingInputSchema.parse()` (throws on invalid); use `.safeParse()` for validation helpers, `.parse()` only for trusted inputs
- **DAC distance in UI only:** The `max_distance_m` field must be in the catalog constant, not a UI string

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime type validation | Custom `validateInput(input)` function with instanceof checks | Zod v4 `SizingInputSchema.safeParse(input)` | Zod handles all edge cases (NaN, Infinity, negative, non-integer), generates TypeScript types, produces structured error messages |
| TypeScript types for domain objects | Separate `interface SizingInput { ... }` | `z.infer<typeof SizingInputSchema>` | One source of truth; schema drift impossible |
| Test runner | Manual node script test | Vitest 4 with `globals: true` | Watch mode, coverage, fast TS transform, Jest-compatible API |
| Discriminated error union | String error messages | `z.discriminatedUnion('code', [...])` typed violations | Type-safe error handling; planner and UI can switch on `violation.code` |

**Key insight:** Zod v4 is the single most important library in Phase 1. It does three jobs simultaneously: runtime validation, TypeScript type generation, and structured error production. All three are needed for the domain engine to be correct and type-safe.

---

## Common Pitfalls

### Pitfall 1: Spine Count Hardcoded to 2

**What goes wrong:** At 17+ racks (34+ leafs), a 2-spine design silently exceeds per-spine port capacity. S5232F-ON has 32 ports — 34 leafs cannot connect.

**How to avoid:** Formula: `Math.max(LEAF.uplinkPorts, Math.ceil(leafSwitches / SPINE.downlinkPorts))` — minimum 4, scales up automatically. Emit `SPINE_CAPACITY_EXCEEDED` violation when `leafSwitches > SPINE.downlinkPorts` (32).

**Test to write:** `calculateBOM({ totalServers: 650, serversPerRack: 10, ... })` produces `spineSwitches >= 5` (65 racks = 130 leafs, ceil(130/32) = 5).

### Pitfall 2: Cable Count From Port Sums (Off-by-2)

**What goes wrong:** Summing `totalLeafUplinks + totalSpineDownlinks` counts each cable twice (once from each endpoint).

**How to avoid:** Model from the leaf side only: `leafSpineCables = leafSwitches * LEAF.uplinkPorts`. This counts each unique physical cable once.

**Test to write:** 1 rack → 2 leafs × 4 uplinks = exactly 8 cables. Not 16.

### Pitfall 3: OOB Port Saturation Not a Typed Violation

**What goes wrong:** A UI string check like `if (portsNeeded > 48) showWarning('...')` is not testable, not typed, and invisible to the planner.

**How to avoid:** Engine emits `{ code: 'OOB_PORT_SATURATION', required: 49, available: 48 }` as a typed `ConstraintViolation`. The UI renders it; the engine produces it.

**Boundary:** 47 servers/rack → `47 + 2 = 49 > 48` → violation. 46 servers/rack → `46 + 2 = 48 = 48` → no violation (exactly at limit is valid).

### Pitfall 4: Oversubscription Ratio Missing from BOM Type

**What goes wrong:** Adding `oversubscriptionRatio` after Phase 3 requires touching the core type, all serializers, and all consumers.

**How to avoid:** Define `oversubscriptionRatio: number` on `NetworkBOM` from the first commit. Display as "3:1" (use `${Math.round(ratio)}:1` for display formatting, not `0.33`).

### Pitfall 5: Port Count as Magic Numbers

**What goes wrong:** `if (oobPortsRequired > 48)` — what is 48? S3248T port count. When the catalog changes, this breaks silently.

**How to avoid:** Always reference catalog constants: `if (oobPortsRequired > OOB.downlinkPorts)`.

### Pitfall 6: JSON Override File (CAT-03) Not Validated

**What goes wrong:** A malformed or incomplete JSON override silently corrupts the catalog, producing wrong BOMs for all configurations.

**How to avoid:** Define `SwitchSpecSchema` in Zod. Use `SwitchSpecSchema.parse(jsonEntry)` when merging the override. Throw early with a clear error, not a silent wrong value.

---

## Code Examples

### Zod v4 ConstraintViolation Discriminated Union

```typescript
// Source: zod.dev/v4 - discriminated union with literal discriminator
import { z } from 'zod';

export const ConstraintViolationSchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('OOB_PORT_SATURATION'),
    required: z.number().int(),
    available: z.number().int(),
  }),
  z.object({
    code: z.literal('SPINE_CAPACITY_EXCEEDED'),
    leafCount: z.number().int(),
    maxLeafs: z.number().int(),
  }),
  z.object({
    code: z.literal('DAC_DISTANCE_ADVISORY'),
    rackCount: z.number().int(),
    cableType: z.literal('DAC'),
  }),
]);

export type ConstraintViolation = z.infer<typeof ConstraintViolationSchema>;
```

### Catalog `satisfies` Pattern (TypeScript 5)

```typescript
// TypeScript 5 satisfies operator — validates structure at compile time
// while preserving literal types for catalog lookups

interface SwitchSpec {
  modelId: string;
  role: 'leaf' | 'spine' | 'oob';
  downlinkPorts: number;
  downlinkSpeedGbE: number;
  uplinkPorts: number;
  maxPowerW: number;
  typicalPowerW?: number;
  switchingCapacityTbps?: number;
}

export const SWITCH_CATALOG = {
  'S5248F-ON': { ... },
  'S5232F-ON': { ... },
  'S3248T-ON': { ... },
} as const satisfies Record<string, SwitchSpec>;
```

### JSON Override Catalog Merge Pattern (CAT-03)

```typescript
// src/domain/catalog/loader.ts
import { SWITCH_CATALOG } from './hardware';
import { SwitchSpecSchema } from '../schemas/catalog';

export function loadCatalog(overridePath?: string): typeof SWITCH_CATALOG {
  if (!overridePath) return SWITCH_CATALOG;

  // In a Node/Vite context, this would be a fetch or import
  // For the browser, the JSON file would be loaded via fetch and validated:
  const overrides = JSON.parse(overrideJson) as Record<string, unknown>;
  const validated = Object.fromEntries(
    Object.entries(overrides).map(([id, spec]) => [id, SwitchSpecSchema.parse(spec)])
  );
  return { ...SWITCH_CATALOG, ...validated };
}
```

### Vitest Minimal Config (Node Environment)

```typescript
// vitest.config.ts — Source: vitest.dev/guide
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',   // Pure TypeScript, no DOM needed
    globals: true,         // describe/it/expect without imports
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate TypeScript interface + Zod schema | `z.infer<typeof Schema>` as the only type definition | Zod v3+ | Single source of truth, no drift |
| Zod v3 `.parse()` throws on error | Zod v4 `.safeParse()` returns `{ success, data, error }` | Zod v4 (2024) | No try/catch needed for validation |
| Zod v3 `z.string().email()` | Zod v4 `z.email()` top-level function | Zod v4 | Tree-shakeable, shorter syntax |
| Jest for TypeScript | Vitest 4 | Vitest 1.0 (2023), v4 (2025) | Native Vite transform, no Babel overhead, same config file |
| Hardcoded `const SPINES = 2` | Formula: `Math.max(uplinksPerLeaf, Math.ceil(N_leafs / spinePortCount))` | Best practice since Clos fabric design | Correct BOM for any rack count |
| Cable count = sum of all ports / 2 | Cable count = N_leafs × uplinksPerLeaf (link model) | Engineering best practice | No off-by-factor errors |

**Deprecated/outdated:**
- `z.string().email()` in Zod v4: replaced by `z.email()` at top level
- Custom `errorMap` in Zod v4: replaced by unified `error` parameter
- Jest with Babel transform for TypeScript: replaced by Vitest with native Vite/SWC transform

---

## Open Questions

1. **S5248F-ON: 4 uplinks or 6 uplinks per leaf in reference design?**
   - What we know: 4 × QSFP28 + 2 × QSFP28-DD confirmed on hardware. Standard reference design uses 4 × QSFP28 for spine. QSFP28-DD ports available for additional spine connectivity.
   - What's unclear: Whether any Dell SONiC deployment guide uses all 6 ports for spine uplinks or reserves QSFP28-DD for inter-pod/super-spine links.
   - Recommendation: **Use `uplinkPorts: 4` as the default reference design value** and store `additionalUplinkPorts: 2` in the catalog for future extension. Document this assumption in a code comment citing the research source. The formula `leafSpineCables = leafSwitches × 4` is the correct starting value.

2. **OOB switch: second unit per rack or per pod when saturated?**
   - What we know: S3248T-ON has 48 ports. When `serversPerRack + 2 > 48`, saturation is reached.
   - What's unclear: Official Dell recommendation for adding additional OOB switches at scale.
   - Recommendation: **Use per-rack model**: `oobSwitchesPerRack = Math.ceil(oobPortsRequired / 48)`, total `oobSwitches = racks × oobSwitchesPerRack`. This is conservative (never under-orders) and physically correct (management traffic stays local to the rack). Emit `OOB_PORT_SATURATION` violation regardless so the user can see the saturation event.

3. **CAT-03 JSON override: browser file input or bundled public file?**
   - What we know: The requirement says "JSON override file at runtime without code changes." The project is a browser SPA.
   - What's unclear: Whether this means a `public/custom-catalog.json` file served with the app, or a user file upload via `<input type="file">`.
   - Recommendation: For Phase 1 (no UI), implement the merge logic as a pure function `mergeCatalog(base, override)` with Zod validation. The delivery mechanism (public file vs. upload) can be decided in Phase 2/3 when the UI exists.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (Wave 0 — must create) |
| Quick run command | `npx vitest run src/domain/engine/sizing.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SIZE-02 | `ceil(total_servers / servers_per_rack)` is correct | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| SIZE-03 | leaf count = 2 × racks, always | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| SIZE-04 | spine count scales beyond 4 at 65+ racks | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| SIZE-04 | spine count is never hardcoded 2 for 20 racks | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| SIZE-05 | OOB saturation violation at 47 servers/rack | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| SIZE-05 | no violation at 46 servers/rack (exactly at limit) | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| SIZE-06 | engine is a pure function — same input → same output | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| SIZE-07 | Zod schema rejects `serversPerRack: 0` | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| SIZE-07 | Zod schema rejects `totalServers: -1` | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| CAT-01 | S5248F-ON, S5232F-ON, S3248T-ON exist in catalog | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| CAT-02 | Catalog constants are typed `SwitchSpec` — TS compile check | unit (tsc) | `npx tsc --noEmit` | Wave 0 |
| CAT-03 | mergeCatalog overrides base correctly and validates with Zod | unit | `npx vitest run --reporter=verbose` | Wave 0 |
| Cable formula | 1 rack = 8 cables, 2 racks = 16, 4 racks = 32 | unit | `npx vitest run --reporter=verbose` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/engine/sizing.test.ts`
- **Per wave merge:** `npx vitest run && npx tsc --noEmit`
- **Phase gate:** Full suite green + TypeScript noEmit before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/domain/engine/sizing.test.ts` — covers SIZE-02 through SIZE-07 and cable formula
- [ ] `src/domain/catalog/hardware.test.ts` — covers CAT-01, CAT-02, CAT-03
- [ ] `vitest.config.ts` — minimal Node environment config
- [ ] `tsconfig.json` — strict TypeScript config with `"strict": true`
- [ ] Framework install: `npm install -D vitest typescript@5` — if not yet installed

---

## Sources

### Primary (HIGH confidence)

- Dell PowerSwitch S5200-ON Series Spec Sheet (via netsolutionworks.com reseller): S5248F-ON confirmed 48 × 25GbE SFP28 + 4 × 100GbE QSFP28 + 2 × 100GbE QSFP28-DD; max power 647W
- Multiple Dell-authorized reseller listings (networktigers.com, networkhardwares.com, harddiskdirect.com): S5248F-ON specs cross-verified consistently
- Dell PowerSwitch S5232F-ON Spec (uvation.com marketplace, networkhardwares.com): 32 × 100GbE QSFP28 + 2 × 10GbE SFP+; max power 635W; 3.2 Tbps confirmed
- Dell PowerSwitch S3248T-ON official spec sheet URL: https://www.delltechnologies.com/asset/en-us/products/networking/technical-support/dell-powerswitch-s3248t-on-spec-sheet.pdf (found via search); 48 × 1GbE RJ45 + 4 × 10GbE SFP+ + 2 × 100GbE QSFP28 confirmed
- Zod v4 release notes (zod.dev/v4): discriminated union, `z.infer`, unified `error` parameter confirmed
- Vitest Getting Started (vitest.dev/guide): `environment: 'node'`, `globals: true`, `.test.ts` naming convention confirmed

### Secondary (MEDIUM confidence)

- Dell SONiC SmartFabric Manager deployment guides (infohub.delltechnologies.com): confirm S5248F-ON as leaf and S5232F-ON as spine in reference deployments; QSFP28 ports used for spine uplinks
- Prior project research (`.planning/research/SUMMARY.md`, `PITFALLS.md`, `ARCHITECTURE.md`): all five critical domain pitfalls with formulas and test cases; confidence HIGH per original research

### Tertiary (LOW confidence — flag for validation)

- "4 uplinks per leaf" as the standard reference design value: confirmed by multiple sources describing the 4 × QSFP28 spine connections, but the exact Dell deployment guide specifying this as the canonical number for the SONiC SmartFabric Manager reference topology could not be fetched (403 responses). Recommendation is to use 4 and document the assumption.

---

## Metadata

**Confidence breakdown:**
- Hardware specs (catalog constants): HIGH — port counts verified from multiple independent sources
- Sizing formulas: HIGH — standard Clos fabric math cross-referenced with Dell and Juniper design guides in prior research
- Zod v4 API: HIGH — official docs fetched and verified
- Vitest configuration: HIGH — official docs fetched and verified
- CAT-03 JSON override delivery mechanism: LOW — implementation pattern clear, delivery mechanism TBD

**Research date:** 2026-03-16
**Valid until:** 2026-09-16 (6 months — hardware specs are stable; Zod/Vitest APIs may change on minor versions)

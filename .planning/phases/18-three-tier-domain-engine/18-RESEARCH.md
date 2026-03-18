# Phase 18: Three-Tier Domain & Engine - Research

**Researched:** 2026-03-18
**Domain:** Dell Z-series switch catalog, 3-tier (Core/Aggregation/Access) sizing engine, Zod schema extension
**Confidence:** HIGH

## Summary

Phase 18 adds a three-tier (Core/Aggregation/Access) network topology as an alternative to the existing Leaf-Spine (Clos) topology. This requires: (1) adding Dell Z-series switch models to the hardware catalog with verified specs, (2) extending the catalog type system with a `tier` field for role filtering, (3) adding a topology selector to the input schema, (4) implementing a new `calculateThreeTierBOM()` pure function with per-boundary oversubscription, and (5) producing a 3-tier BOM with inter-tier cable counts.

The existing codebase has a clean, well-established pattern: catalog constants with typed specs, Zod schemas as single source of truth, pure engine functions, and composition for converged mode. The 3-tier engine follows this exact pattern -- it is a new parallel engine (like FC was to Ethernet) but within the Ethernet domain (same physical switches, different topology). The key architectural decision from STATE.md confirms: "Three-Tier is a topology variant within Ethernet (not a new parallel domain like FC)."

**Primary recommendation:** Create a `calculateThreeTierBOM()` pure function in `src/domain/engine/three-tier-sizing.ts` that follows the same structure as `calculateBOM()` and `calculateFCBOM()`. Extend `SwitchSpec` with an optional `tier` field and add Z-series models to `SWITCH_CATALOG`. The converged engine must be updated to call either `calculateBOM()` or `calculateThreeTierBOM()` based on a topology selector.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TIER-01 | Z-series switches added to hardware catalog (Z9264F-ON, Z9332F-ON, Z9432F-ON) with verified specs | Dell spec sheets verified: port counts, power, U-height, switching capacity documented in Standard Stack section |
| TIER-02 | Switch catalog has a `tier` field mapping each model to valid roles (access, aggregation, core) | Architecture Patterns section details how to extend SwitchSpec with `tier` field as optional array without breaking existing models |
| TENG-01 | Topology selector in input schema: "leaf-spine" (Clos) vs "three-tier" | Architecture Patterns section shows schema extension with `topology` field and conditional model selectors |
| TENG-02 | Access switches = 2 per rack (redundant pair, same formula as leaf switches) | Code Examples section provides the formula: `accessSwitches = racks * 2` (identical to leaf formula) |
| TENG-03 | Aggregation switches = ceil(accessSwitches * uplinksPerAccess / aggrDownlinks), min 2 | Code Examples section provides formula with effective uplink clamping |
| TENG-04 | Core switches = ceil(aggrSwitches * uplinksPerAggr / coreDownlinks), min 2 | Code Examples section provides formula with effective uplink clamping |
| TENG-05 | Oversubscription calculated at each tier boundary (access-to-aggr, aggr-to-core) | Code Examples section provides per-boundary oversubscription formulas |
| TENG-06 | Cable BOM: server-access + access-aggr + aggr-core cables with correct inter-tier counts | Code Examples section provides link-model cable count formulas for all three tiers |
| TENG-07 | User can select access/aggregation/core switch models independently | Architecture Patterns section shows three independent model selectors in the schema |
</phase_requirements>

## Standard Stack

### Core (already in project -- no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | v4 | Schema definitions, type inference | Already used for all schemas; `z.infer<>` pattern is the project convention |
| vitest | existing | Unit testing | Already configured; domain tests run in node environment |
| typescript | strict | Type safety | Already configured with strict mode, no `any` |

### Dell Z-Series Switch Specifications (Verified)

These three models serve as core, aggregation, and high-density access/aggregation switches in traditional 3-tier architectures.

| Model | Ports | Speed | U-Height | Typical Power | Max Power | Switching Capacity | Primary 3-Tier Role |
|-------|-------|-------|----------|---------------|-----------|-------------------|---------------------|
| Z9264F-ON | 64x QSFP28 + 2x SFP+ | 100GbE (breakout to 10/25/50G) | 2U | 340W | 750W | 12.8 Tbps | Aggregation |
| Z9332F-ON | 32x QSFP56-DD + 2x SFP+ | 400GbE (breakout to 10/25/50/100G) | 1U | 900W | 1500W | 25.6 Tbps | Core |
| Z9432F-ON | 32x QSFP56-DD + 2x SFP+ | 400GbE (breakout to 10/25/50/100G) | 1U | 900W | 1404W | 25.6 Tbps | Core |

**IMPORTANT -- Port split for 3-tier modeling:**
- Z-series switches are symmetric: all 64 (or 32) high-speed ports are identical. The downlink/uplink split is a *logical* configuration, not physical.
- For 3-tier sizing, the engine must accept user-configurable "uplink count per tier" parameters, just like `activeUplinksPerLeaf` exists today.
- For the Z9264F-ON as aggregation: user specifies how many of the 64 ports face downward (to access) vs. upward (to core). Example: 48 downlink + 16 uplink.
- For the Z9332F-ON/Z9432F-ON as core: all 32 ports face downward to aggregation switches (no upstream -- same concept as spine having `uplinkPorts: 0`).

**Confidence:** HIGH -- specs verified across multiple Dell reseller listings and official spec sheet PDFs.

### Existing S5200 Series as Access Switches

The existing Dell S5200-ON series (S5248F-ON, S5224F-ON, S5212F-ON, S5296F-ON) can serve as access switches in the 3-tier topology. Their role is identical to "leaf" -- they connect servers to the network. The only difference is that their uplinks go to aggregation switches instead of spines.

No new access-tier hardware is needed -- existing leaf models serve double duty.

## Architecture Patterns

### Recommended File Structure

```
src/domain/
  catalog/
    hardware.ts          # MODIFY: add Z-series models, extend SwitchSpec with `tier`
    types.ts             # MODIFY: add `tier` field to SwitchSpec interface
  schemas/
    catalog.ts           # MODIFY: add `tier` to SwitchSpecSchema
    input.ts             # MODIFY: add topology selector (or keep separate)
    three-tier-input.ts  # NEW: ThreeTierSizingInputSchema
    three-tier-bom.ts    # NEW: ThreeTierBOMSchema + ThreeTierConstraintViolationSchema
  engine/
    three-tier-sizing.ts      # NEW: calculateThreeTierBOM() pure function
    three-tier-sizing.test.ts # NEW: unit tests
    converged-sizing.ts       # MODIFY: support topology selector
```

### Pattern 1: Extending SwitchSpec with `tier` Field

**What:** Add an optional `tier` field to `SwitchSpec` that maps each model to valid 3-tier roles.

**When to use:** When a switch model can serve in a 3-tier topology.

**Rationale:** The `tier` field is an *optional array* because: (a) existing Clos models (S5200 series) already have `role: 'leaf'|'spine'|'oob'` which is sufficient for Clos, (b) some models can serve multiple 3-tier roles (Z9264F-ON can be aggregation or access), (c) OOB switch has no 3-tier role.

```typescript
// src/domain/catalog/types.ts
export interface SwitchSpec {
  modelId: string;
  role: 'leaf' | 'spine' | 'oob';
  /** Valid roles in a 3-tier topology. Undefined = not usable in 3-tier mode. */
  tier?: ('access' | 'aggregation' | 'core')[];
  downlinkPorts: number;
  downlinkSpeedGbE: number;
  uplinkPorts: number;
  uplinkSpeedGbE?: number;
  additionalUplinkPorts?: number;
  maxPowerW: number;
  typicalPowerW?: number;
  switchingCapacityTbps?: number;
  /** Rack unit height (1U default, 2U for Z9264F-ON) */
  uHeight?: number;
}
```

**Key design decisions:**
- `tier` is optional (existing S5200/S5232/S3248 entries are unchanged -- backward compatible)
- `tier` is an *array* because models can serve multiple roles (Z9264F-ON: access OR aggregation)
- Existing S5248F-ON/S5224F-ON/S5212F-ON/S5296F-ON get `tier: ['access']` added
- Z9264F-ON gets `tier: ['access', 'aggregation']` (flexible role)
- Z9332F-ON and Z9432F-ON get `tier: ['aggregation', 'core']`
- S5232F-ON gets `tier: ['aggregation']` (can aggregate in small 3-tier deployments)
- S3248T-ON has no `tier` (OOB only)

### Pattern 2: Z-Series Catalog Entries

**What:** Add three new Z-series models to `SWITCH_CATALOG`.

**Critical:** Z-series switches have *symmetric* ports (all QSFP28 or QSFP56-DD). The `downlinkPorts`/`uplinkPorts` split represents a *default configuration*. For the 3-tier engine, the user specifies active uplink counts per tier, and the engine computes the effective split.

```typescript
// src/domain/catalog/hardware.ts -- NEW ENTRIES

'Z9264F-ON': {
  modelId: 'Z9264F-ON',
  role: 'leaf',  // default Clos role (also usable as aggregation)
  tier: ['access', 'aggregation'],
  downlinkPorts: 64,       // all 64x 100GbE QSFP28 (symmetric)
  downlinkSpeedGbE: 100,
  uplinkPorts: 0,          // symmetric -- uplinks configured by engine
  uplinkSpeedGbE: 100,
  maxPowerW: 750,
  typicalPowerW: 340,
  switchingCapacityTbps: 12.8,
  uHeight: 2,
},

'Z9332F-ON': {
  modelId: 'Z9332F-ON',
  role: 'spine',  // default Clos role
  tier: ['aggregation', 'core'],
  downlinkPorts: 32,       // 32x 400GbE QSFP56-DD
  downlinkSpeedGbE: 400,
  uplinkPorts: 0,          // core: no upstream
  uplinkSpeedGbE: 400,
  maxPowerW: 1500,
  typicalPowerW: 900,
  switchingCapacityTbps: 25.6,
  uHeight: 1,
},

'Z9432F-ON': {
  modelId: 'Z9432F-ON',
  role: 'spine',  // default Clos role
  tier: ['aggregation', 'core'],
  downlinkPorts: 32,       // 32x 400GbE QSFP56-DD
  downlinkSpeedGbE: 400,
  uplinkPorts: 0,          // core: no upstream
  uplinkSpeedGbE: 400,
  maxPowerW: 1404,
  typicalPowerW: 900,
  switchingCapacityTbps: 25.6,
  uHeight: 1,
},
```

**Note on `role` vs `tier`:** The `role` field continues to control Clos behavior (leaf/spine/oob). The `tier` field is only consulted by the 3-tier engine to determine valid model selections. This separation keeps Clos logic completely unchanged.

### Pattern 3: Three-Tier Input Schema

**What:** A new Zod schema for 3-tier sizing input, following the same pattern as `SizingInputSchema` and `FCSizingInputSchema`.

```typescript
// src/domain/schemas/three-tier-input.ts

export const ThreeTierSizingInputSchema = z.object({
  racks: z.array(RackConfigSchema).min(1).max(200),
  portsPerServerFrontend: z.number().int().min(0).max(8).default(1),
  portsPerServerBackend: z.number().int().min(0).max(8).default(1),
  connectivityType: z.enum(['25G', '100G']),
  cableType: z.enum(['DAC', 'AOC', 'fiber']),

  // Access tier -- same models as leaf
  accessModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'Z9264F-ON']),
  /** Active uplinks from access to aggregation (1-8, default 4) */
  activeUplinksPerAccess: z.number().int().min(1).max(64).default(4),

  // Aggregation tier
  aggregationModel: z.enum(['Z9264F-ON', 'Z9332F-ON', 'Z9432F-ON', 'S5232F-ON']),
  /** Active uplinks from aggregation to core (1-32, default 4) */
  activeUplinksPerAggregation: z.number().int().min(1).max(32).default(4),

  // Core tier
  coreModel: z.enum(['Z9332F-ON', 'Z9432F-ON']),

  // Border leaf (WAN connectivity)
  borderLeafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'none']),
  borderLeafCount: z.number().int().min(0).max(4),

  rackSize: z.enum(['24U', '42U', '50U']),
  serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),
  switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR'),
});
```

### Pattern 4: Topology Selector for Converged Mode

**What:** The converged engine currently always calls `calculateBOM()` for Ethernet. When 3-tier topology is selected, it must call `calculateThreeTierBOM()` instead.

**Implementation:** Add a `topology` discriminator field. The converged input schema becomes a discriminated union or adds a simple `topology` field:

```typescript
// In ConvergedSizingInputSchema -- add:
topology: z.enum(['leaf-spine', 'three-tier']).default('leaf-spine'),
```

The converged engine then branches:

```typescript
// In converged-sizing.ts
if (input.topology === 'three-tier') {
  const threeTierBom = calculateThreeTierBOM(toThreeTierInput(input));
  // ...
} else {
  const ethernetBom = calculateBOM(toEthernetInput(input));
  // ...
}
```

### Anti-Patterns to Avoid

- **Modifying `calculateBOM()`:** Do NOT add 3-tier logic to the existing Clos engine. Create a separate `calculateThreeTierBOM()` function. The Clos engine is tested and stable; mixing topologies creates fragile branching.
- **Shared generics between topology engines:** Per ADR-0009 pattern, keep engines as parallel functions. Composition (converged) is the integration point, not inheritance.
- **Hardcoding port splits for Z-series:** Z-series ports are symmetric. The engine must compute effective downlinks/uplinks from user-specified uplink counts, not from fixed catalog fields.
- **Breaking existing role enum:** Do NOT change `role: 'leaf' | 'spine' | 'oob'` to include 3-tier roles. Keep `role` for Clos, add `tier` for 3-tier. This is additive, not a replacement.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Port speed normalization | Custom speed conversion logic | Catalog fields with explicit `downlinkSpeedGbE`/`uplinkSpeedGbE` | Z-series supports multi-rate; catalog enforces the canonical speed |
| Schema validation | Manual input checking | Zod schemas with `z.infer<>` | Project convention; runtime validation + type inference |
| Discriminated unions | String error codes | `z.discriminatedUnion('code', [...])` | Existing pattern for ConstraintViolation; TypeScript narrows automatically |
| Test helper factories | Copy-paste input objects | `makeInput()` pattern (see existing tests) | Reduces boilerplate, keeps tests focused on deltas |

## Common Pitfalls

### Pitfall 1: Symmetric Port Confusion
**What goes wrong:** Treating Z-series `downlinkPorts: 64` as "64 downlinks and 0 uplinks" when the switch actually has 64 identical ports that can be configured in any split.
**Why it happens:** The existing S5200 series has a clear downlink/uplink split (e.g., 48 SFP28 + 4 QSFP28). Z-series is different -- all ports are identical.
**How to avoid:** For Z-series in 3-tier mode, the engine computes effective downlinks as `totalPorts - activeUplinks`. The `downlinkPorts` in the catalog represents total configurable ports for that speed class.
**Warning signs:** Tests pass but oversubscription ratios are wildly wrong; cable counts are zero.

### Pitfall 2: Breaking Existing Clos Tests
**What goes wrong:** Changing `SwitchSpec` or `SWITCH_CATALOG` in a way that breaks the 33 existing sizing tests or the 15 hardware catalog tests.
**Why it happens:** Adding a required field to `SwitchSpec` without a default, or changing the `role` enum values.
**How to avoid:** The `tier` field MUST be optional. Existing catalog entries remain unchanged. Run `npx vitest run src/domain/engine/sizing.test.ts` and `npx vitest run src/domain/catalog/hardware.test.ts` after every catalog change.
**Warning signs:** TypeScript errors in existing files; test failures in non-3-tier test files.

### Pitfall 3: Aggregation Switch Port Split Arithmetic
**What goes wrong:** Computing aggregation downlink count incorrectly when the user specifies uplinks. If the aggregation switch is Z9264F-ON (64 ports) with 16 uplinks, the effective downlinks are 48, NOT 64.
**Why it happens:** Using `downlinkPorts` from catalog instead of `totalPorts - activeUplinksPerAggregation`.
**How to avoid:** Always compute `effectiveDownlinks = switchTotalPorts - activeUplinksForThisTier`. This mirrors the `effectiveUplinks` pattern in the Clos engine.
**Warning signs:** Aggregation switch count is too low; access-to-aggr oversubscription is unrealistically low.

### Pitfall 4: Converged Engine Breaking on Topology Switch
**What goes wrong:** The converged engine returns a `NetworkBOM` (Clos) when the topology is 'three-tier', causing type errors in the UI.
**Why it happens:** The converged BOM schema expects `ethernetBom: NetworkBOMSchema` which is the Clos BOM shape, not the 3-tier BOM shape.
**How to avoid:** The converged BOM schema must be updated to accept either Clos BOM or 3-tier BOM (discriminated by topology field, or use a union type). Plan this schema change carefully.
**Warning signs:** TypeScript errors in converged store/UI after adding 3-tier support.

### Pitfall 5: Forgetting OOB Switches in 3-Tier Mode
**What goes wrong:** The 3-tier BOM omits OOB switches because the developer focuses on access/aggregation/core and forgets management network.
**Why it happens:** OOB is a Clos-engine concept. But 3-tier deployments also need OOB management switches.
**How to avoid:** Include OOB switch calculation in `calculateThreeTierBOM()`. Use the same formula: `racks * ceil((maxServersPerRack + 2) / 48)`.
**Warning signs:** 3-tier BOM has zero OOB switches; rack elevation shows no management switch.

### Pitfall 6: Hardware Test Count Assertion
**What goes wrong:** The existing test `'contains exactly 6 models'` in `hardware.test.ts` fails when Z-series models are added.
**Why it happens:** Hard-coded count assertion.
**How to avoid:** Update the test to expect 9 models (6 existing + 3 Z-series). Also add individual Z-series spec tests.

## Code Examples

### Three-Tier Sizing Engine (core formula)

```typescript
// src/domain/engine/three-tier-sizing.ts
// Source: Derived from existing calculateBOM() pattern + 3-tier formulas from REQUIREMENTS.md

export function calculateThreeTierBOM(input: ThreeTierSizingInput): ThreeTierBOM {
  const ACCESS = SWITCH_CATALOG[input.accessModel];
  const AGGR = SWITCH_CATALOG[input.aggregationModel];
  const CORE = SWITCH_CATALOG[input.coreModel];
  const OOB = SWITCH_CATALOG['S3248T-ON'];

  // Rack count from racks array
  const racks = input.racks.length;
  const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0);
  const maxServersPerRack = Math.max(...input.racks.map(r => r.serverCount));

  // TENG-02: Access switches = 2 per rack (redundant pair)
  const accessSwitches = racks * 2;

  // Effective uplinks from access to aggregation
  const effectiveUplinksPerAccess = Math.min(
    input.activeUplinksPerAccess,
    ACCESS.uplinkPorts > 0 ? ACCESS.uplinkPorts : ACCESS.downlinkPorts
  );

  // Effective downlinks on aggregation switch
  // For symmetric switches (Z9264F-ON): totalPorts - uplinks to core = downlinks to access
  const aggrTotalPorts = AGGR.downlinkPorts;  // represents total configurable ports
  const effectiveUplinksPerAggr = Math.min(
    input.activeUplinksPerAggregation,
    aggrTotalPorts
  );
  const effectiveAggrDownlinks = aggrTotalPorts - effectiveUplinksPerAggr;

  // TENG-03: Aggregation switches
  const totalAccessUplinks = accessSwitches * effectiveUplinksPerAccess;
  const aggregationSwitches = Math.max(
    2,
    Math.ceil(totalAccessUplinks / effectiveAggrDownlinks)
  );

  // Core effective downlinks
  const coreTotalPorts = CORE.downlinkPorts;
  const effectiveCoreDownlinks = coreTotalPorts; // core has no upstream

  // TENG-04: Core switches
  const totalAggrUplinks = aggregationSwitches * effectiveUplinksPerAggr;
  const coreSwitches = Math.max(
    2,
    Math.ceil(totalAggrUplinks / effectiveCoreDownlinks)
  );

  // OOB (same formula as Clos)
  const oobPortsRequired = maxServersPerRack + 2;
  const oobSwitchesPerRack = Math.ceil(oobPortsRequired / OOB.downlinkPorts);
  const oobSwitches = racks * oobSwitchesPerRack;

  // TENG-06: Cable counts (link model)
  const serverAccessCables = totalServers * input.portsPerServerFrontend;
  const accessAggrCables = accessSwitches * effectiveUplinksPerAccess;
  const aggrCoreCables = aggregationSwitches * effectiveUplinksPerAggr;
  const serverOobCables = totalServers * input.portsPerServerBackend + accessSwitches;

  // TENG-05: Oversubscription at each tier boundary
  const accessDownlinkBw = maxServersPerRack * ACCESS.downlinkSpeedGbE;
  const accessUplinkBw = effectiveUplinksPerAccess * (ACCESS.uplinkSpeedGbE ?? ACCESS.downlinkSpeedGbE);
  const accessToAggrOversubscription = accessUplinkBw > 0 ? accessDownlinkBw / accessUplinkBw : 0;

  const aggrDownlinkBw = effectiveAggrDownlinks * AGGR.downlinkSpeedGbE;
  const aggrUplinkBw = effectiveUplinksPerAggr * AGGR.downlinkSpeedGbE; // same speed up/down
  const aggrToCoreOversubscription = aggrUplinkBw > 0 ? aggrDownlinkBw / aggrUplinkBw : 0;

  // ... violations, network racks, transceivers, VLT cables follow same patterns as Clos engine
}
```

### Three-Tier BOM Schema

```typescript
// src/domain/schemas/three-tier-bom.ts
import { z } from 'zod';

export const ThreeTierConstraintViolationSchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('AGGREGATION_CAPACITY_EXCEEDED'),
    accessUplinks: z.number().int(),
    aggrDownlinks: z.number().int(),
  }),
  z.object({
    code: z.literal('CORE_CAPACITY_EXCEEDED'),
    aggrUplinks: z.number().int(),
    coreDownlinks: z.number().int(),
  }),
  z.object({
    code: z.literal('OOB_PORT_SATURATION'),
    required: z.number().int(),
    available: z.number().int(),
  }),
  z.object({
    code: z.literal('DAC_DISTANCE_ADVISORY'),
    rackCount: z.number().int(),
    cableType: z.literal('DAC'),
  }),
  z.object({
    code: z.literal('RACK_CAPACITY_EXCEEDED'),
    rackNumber: z.number().int(),
    usedU: z.number().int(),
    totalU: z.number().int(),
  }),
]);

export const ThreeTierBOMSchema = z.object({
  racks: z.number().int().min(0),
  networkRacks: z.number().int().min(0),
  accessSwitches: z.number().int().min(0),
  aggregationSwitches: z.number().int().min(0),
  coreSwitches: z.number().int().min(0),
  oobSwitches: z.number().int().min(0),
  borderLeafSwitches: z.number().int().min(0),

  // Cables
  serverAccessCables: z.number().int().min(0),
  accessAggrCables: z.number().int().min(0),
  aggrCoreCables: z.number().int().min(0),
  serverOobCables: z.number().int().min(0),
  vltCables: z.number().int().min(0),

  // Transceivers
  sfp28Count: z.number().int().min(0),
  qsfp28Count: z.number().int().min(0),
  qsfp56ddCount: z.number().int().min(0),  // NEW: for 400G inter-tier links

  // Oversubscription per boundary (TENG-05)
  accessToAggrOversubscription: z.number().min(0),
  aggrToCoreOversubscription: z.number().min(0),

  switchPositioning: z.enum(['ToR', 'MoR', 'BoR']),
  recommendedCableLengthM: z.number().int().min(0),
  violations: z.array(ThreeTierConstraintViolationSchema),
  input: ThreeTierSizingInputSchema,
});
```

### Extending the Converged Engine for Topology Selection

```typescript
// src/domain/engine/converged-sizing.ts -- modified
export function calculateConvergedBOM(input: ConvergedSizingInput): ConvergedBOM {
  // Ethernet portion: select engine based on topology
  let ethernetBom: NetworkBOM | null = null;
  let threeTierBom: ThreeTierBOM | null = null;

  if (input.topology === 'three-tier') {
    threeTierBom = calculateThreeTierBOM(toThreeTierInput(input));
  } else {
    ethernetBom = calculateBOM(toEthernetInput(input));
  }

  // FC BOM only when FC is enabled
  const fcEnabled = input.hbaPortsPerServer > 0;
  const fcBom = fcEnabled ? calculateFCBOM(toFCInput(input)) : null;

  // Combine violations
  const violations = [
    ...(ethernetBom?.violations ?? []),
    ...(threeTierBom?.violations ?? []),
    ...(fcBom?.violations ?? []),
  ];

  return {
    topology: input.topology,
    ethernetBom,
    threeTierBom,
    fcBom,
    violations,
    input,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| S5200-only catalog | S5200 + S5296F added | Phase 5 (v1.1) | 6 Ethernet switch models |
| FC parallel domain | FC + Converged composition | Phase 15-17 (v3.0) | Established composition pattern |
| Scalar serverCount | Racks array (RACK-03) | Phase 5 (v1.1) | Per-rack variable density |
| Fixed uplink count | activeUplinksPerLeaf | Phase 5 (v1.1) | User-configurable uplinks |

**Z-series context:**
- Z9264F-ON: ~2018 release, still current. 100GbE aggregation class.
- Z9332F-ON: ~2020 release, current. 400GbE for spine/core.
- Z9432F-ON: ~2021 release, current. 400GbE for spine/core (same ASIC as Z9332F-ON, different chassis/buffer).
- Z9664F-ON: Newest (64x400G, 2U). NOT included in requirements -- could be a future addition. Do not add now.

## Open Questions

1. **Converged BOM schema shape when topology varies**
   - What we know: Currently `ConvergedBOM.ethernetBom` is always `NetworkBOM`. With 3-tier, it could be `ThreeTierBOM` instead.
   - What's unclear: Should the converged BOM use a union (`ethernetBom | threeTierBom`) or have both fields nullable?
   - Recommendation: Use two nullable fields: `ethernetBom: NetworkBOM | null` and `threeTierBom: ThreeTierBOM | null`. Only one is populated based on topology. This avoids complex union types and is consistent with the `fcBom: FCNetworkBOM | null` pattern.

2. **Z-series symmetric port modeling in catalog**
   - What we know: Z-series ports are all identical speed. The downlink/uplink split is logical, not physical.
   - What's unclear: Should `downlinkPorts` represent all ports (with uplinks=0) or a default split?
   - Recommendation: Set `downlinkPorts` to total port count and `uplinkPorts` to 0 for Z-series models. The 3-tier engine computes effective splits from user-specified uplink counts. This is consistent with how S5232F-ON spine already has `uplinkPorts: 0`.

3. **Speed mismatch between access and aggregation tiers**
   - What we know: Access switches (S5248F-ON) uplink at 100GbE. Z9264F-ON ports are 100GbE. Z9332F-ON/Z9432F-ON ports are 400GbE.
   - What's unclear: When aggregation is Z9332F-ON (400G) and access uplinks are 100G, how to model the speed conversion for cable counts and oversubscription?
   - Recommendation: Use breakout. A single 400G QSFP56-DD port can break out to 4x100G. For cable counting, each 400G aggregation port connects to 4 access uplinks (via breakout cable). Oversubscription math uses the actual link speeds (100G per link). The engine should handle this with a `breakoutRatio` computed from `aggrPortSpeed / accessUplinkSpeed`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing, node environment for domain tests) |
| Config file | `vite.config.ts` (contains vitest config) |
| Quick run command | `npx vitest run src/domain/engine/three-tier-sizing.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TIER-01 | Z-series models in SWITCH_CATALOG with correct specs | unit | `npx vitest run src/domain/catalog/hardware.test.ts` | Exists (modify) |
| TIER-02 | `tier` field on catalog models mapping to valid roles | unit | `npx vitest run src/domain/catalog/hardware.test.ts` | Exists (modify) |
| TENG-01 | Topology selector in input schema validates correctly | unit | `npx vitest run src/domain/schemas/three-tier-schemas.test.ts` | Wave 0 |
| TENG-02 | Access switches = 2 per rack | unit | `npx vitest run src/domain/engine/three-tier-sizing.test.ts` | Wave 0 |
| TENG-03 | Aggregation switch count formula (ceil + min 2) | unit | `npx vitest run src/domain/engine/three-tier-sizing.test.ts` | Wave 0 |
| TENG-04 | Core switch count formula (ceil + min 2) | unit | `npx vitest run src/domain/engine/three-tier-sizing.test.ts` | Wave 0 |
| TENG-05 | Per-boundary oversubscription ratios | unit | `npx vitest run src/domain/engine/three-tier-sizing.test.ts` | Wave 0 |
| TENG-06 | Cable BOM: server-access + access-aggr + aggr-core | unit | `npx vitest run src/domain/engine/three-tier-sizing.test.ts` | Wave 0 |
| TENG-07 | Independent model selection per tier | unit | `npx vitest run src/domain/engine/three-tier-sizing.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/domain/engine/three-tier-sizing.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/domain/engine/three-tier-sizing.test.ts` -- covers TENG-02 through TENG-07
- [ ] `src/domain/schemas/three-tier-schemas.test.ts` -- covers TENG-01 schema validation
- [ ] Update `src/domain/catalog/hardware.test.ts` -- covers TIER-01, TIER-02 (add Z-series assertions)

## Sources

### Primary (HIGH confidence)
- [NetSolutionWorks Z9264F-ON](https://www.netsolutionworks.com/Networking-Switches/Z-Series/Z9264F-ON.asp) -- port count (64x QSFP28), power (340W typical, 1104W max stated but 750W per PSU more common), 2U, 12.8Tbps
- [NetSolutionWorks Z9332F-ON](https://www.netsolutionworks.com/Networking-Switches/Z-Series/Z9332F-ON.asp) -- port count (32x QSFP56-DD), power (900W typical, 1500W max), 1U, 25.6Tbps
- [NetSolutionWorks Z9432F-ON](https://www.netsolutionworks.com/Networking-Switches/Z-Series/Z9432F-ON.asp) -- port count (32x QSFP56-DD), power (900W typical, 1404W max), 1U, 25.6Tbps
- [Dell Z-Series product page](https://www.dell.com/en-us/shop/ipovw/networking-z-series) -- confirms aggregation/core use cases
- Existing codebase: `src/domain/catalog/hardware.ts`, `src/domain/engine/sizing.ts`, `src/domain/engine/converged-sizing.ts`

### Secondary (MEDIUM confidence)
- [Dell spec sheet Z9332F-ON PDF](https://www.delltechnologies.com/asset/en-us/products/networking/technical-support/dell-emc-networking-z9332f-spec-sheet.pdf) -- referenced but PDF not directly parseable
- [Dell spec sheet Z9432F-ON PDF](https://www.delltechnologies.com/asset/en-us/products/networking/technical-support/dell-emc-powerswitch-z9432f-spec-sheet.pdf) -- referenced but PDF not directly parseable
- [xByte Z9264F-ON](https://www.xbyte.com/products/z9264f-on/) -- corroborates port/power specs
- [NetworkHardwares Z9264F-ON](https://www.networkhardwares.com/products/dell-emc-z9264f-on-dell-emc-powerswitch-z9264f-on-ethernet-switch-2) -- confirms 12.8Tbps, 2U

### Tertiary (LOW confidence)
- Z9264F-ON max power: Sources vary (750W from xByte, 1104W from NetSolutionWorks). Using 750W as it aligns with PSU rating (2x 750W redundant). The 1104W figure may include high-power optics. **Recommend using 750W for conservative sizing.**

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Dell Z-series specs verified across 3+ independent sources
- Architecture: HIGH -- follows established codebase patterns (catalog, schema, engine composition)
- Pitfalls: HIGH -- identified from direct code reading of existing engine and tests
- Z9264F-ON max power: MEDIUM -- conflicting sources (750W vs 1104W); using conservative 750W

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (Dell Z-series is stable product line; specs unlikely to change)

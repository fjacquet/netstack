# Phase 8: FC Catalog and Schema Foundation - Research

**Researched:** 2026-03-18
**Domain:** Fibre Channel hardware catalog (Brocade), Zod v4 schema design, TypeScript catalog patterns
**Confidence:** HIGH — Switch specs verified from Broadcom official techdocs and product briefs; Zod v4 patterns verified from existing codebase (already using Zod 4.3.6); no new runtime dependencies required.

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FC-01 | Brocade Gen7 (64G) switch catalog with verified specs (G710, G720, G730, X7-4, X7-8) | Specs verified from Broadcom techdocs; G710: 8–24 ports (+8 POD), G720: 24–64 ports (DDPOD), G730: 48–128 ports (DDPOD), X7-4: up to 265 ports (4 blades), X7-8: up to 512 ports (8 blades) |
| FC-02 | Brocade Gen8 (128G) switch catalog with verified specs (G820, X8-4, X8-8) | G820: 24–56 ports 128G, 1U, 650W PSU confirmed from official Broadcom techdocs; X8-4/X8-8 use FC128-48 blades; launched Nov 2025 |
| FC-03 | Dynamic POD licensing modeled per switch (basePorts vs totalPorts, podLicenseUnit) | All Gen7/Gen8 switches use POD model. `basePorts` + `podLicenseUnit` fields required in `FCSwitchSpec`. G710: base 8 / unit 8 / max 24; G720: base 24 / unit varies / max 64; G820: base 24 / unit 8 / max 56 |
| FC-04 | 7850 FCIP extension switch in catalog | Verified: 16 physical FC ports (24 addressable via SFP-DD), 18 GE WAN ports (GE0–GE15 SFP+ + 2x100GbE QSFP), Gen7 64G, 1U |
</phase_requirements>

---

## Summary

Phase 8 establishes the Fibre Channel hardware constants and type system — everything the FC sizing engine (Phase 10) will consume. The work is pure TypeScript with zero React dependencies: a `FCSwitchSpec` interface, a `FC_SWITCH_CATALOG` constant covering all 9 Brocade models, a `FC_OPTICS_CATALOG` with a protocol discriminant, and two Zod schemas (`FCSizingInputSchema` + `FCNetworkBOMSchema`). Every TypeScript type is inferred via `z.infer<>`.

The most critical design constraint is the POD licensing model. Every Brocade FC switch ships with fewer active ports than its physical chassis supports. The catalog must model `basePorts` (what you get without extra licenses), `podLicenseUnit` (increment per license), and `totalPorts` (chassis maximum) — not just a single `ports` count. An engine built on `totalPorts` only would systematically undercount required switch quantities.

The protocol discriminant on `FC_OPTICS_CATALOG` entries (`protocol: 'fibre-channel'`) prevents FC transceivers from contaminating Ethernet BOM line items during CSV/PDF export. This is a data-model correctness concern, not just a display concern — the export logic filters by protocol.

**Primary recommendation:** Follow the exact same file/pattern conventions as the Ethernet catalog (`hardware.ts`, `types.ts`, `cables.ts`) but in parallel files (`brocade.ts`, `fc-types.ts`) with FC-specific field names. Never mix FC and Ethernet domains in the same catalog file or schema.

---

## Standard Stack

### Core (No new dependencies — all existing)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Catalog constants and interface definitions | Strict mode enforces no `any`; `as const satisfies` validates catalog shape at compile time |
| Zod | 4.3.6 | Schema validation for FC input and FC BOM | Already in use; `z.infer<>` is the project-mandated type derivation pattern |
| Vitest | 4.1.0 | Unit tests for catalog and schema | Already configured; test environment is `jsdom` (node-compatible for pure domain tests) |

**No new npm packages are required.** Phase 8 is pure TypeScript constants, interfaces, and Zod schemas.

**Verify existing deps are current:**

```bash
npm list zod vitest typescript
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 8 additions only)

```
src/
└── domain/
    ├── catalog/
    │   ├── hardware.ts          (existing — Dell Ethernet, unchanged)
    │   ├── types.ts             (existing — SwitchSpec, unchanged)
    │   ├── cables.ts            (existing — CABLE_CATALOG, unchanged)
    │   ├── brocade.ts           NEW: FC_SWITCH_CATALOG + FC_OPTICS_CATALOG
    │   └── fc-types.ts          NEW: FCSwitchSpec, FCOpticsSpec interfaces
    └── schemas/
        ├── input.ts             (existing — SizingInputSchema, unchanged)
        ├── bom.ts               (existing — NetworkBOMSchema, unchanged)
        ├── fc-input.ts          NEW: FCSizingInputSchema
        └── fc-bom.ts            NEW: FCNetworkBOMSchema, FCConstraintViolationSchema
```

Tests:

```
src/domain/catalog/
└── brocade.test.ts              NEW: catalog entry assertions for all 9 models + 3 optics

src/domain/schemas/
└── fc-schemas.test.ts           NEW: Zod schema parse/reject assertions
```

### Pattern 1: Catalog as `as const satisfies` typed constant

**What:** Hardware catalog is a module-level const with `as const satisfies Record<string, FCSwitchSpec>`. This gives exhaustive literal types on values (no widening), plus compile-time shape validation against the interface.

**When to use:** All catalog constants in this codebase (see `hardware.ts` pattern). Ensures `FC_SWITCH_CATALOG['G720'].basePorts` is typed as `24` (literal), not `number`.

**Example (mirrors existing hardware.ts):**

```typescript
// src/domain/catalog/brocade.ts
import type { FCSwitchSpec } from './fc-types';

export const FC_SWITCH_CATALOG = {
  'G710': {
    modelId: 'G710',
    generation: 7,
    speedGbps: 64,
    totalPorts: 24,
    basePorts: 8,
    podLicenseUnit: 8,
    maxIslPorts: 6,
    uHeight: 1,
    maxPowerW: 150,
    role: 'edge',
    formFactor: 'fixed',
  },
  // ... remaining 8 models
} as const satisfies Record<string, FCSwitchSpec>;

export type FCSwitchModelId = keyof typeof FC_SWITCH_CATALOG;
```

### Pattern 2: FCSwitchSpec Interface with POD Fields

**What:** The `FCSwitchSpec` interface captures all fields needed for correct sizing, including the POD licensing model. It lives in `fc-types.ts` parallel to `types.ts`.

**Critical fields that differ from Ethernet `SwitchSpec`:**

- `totalPorts` — physical port count in chassis
- `basePorts` — ports active without additional POD licenses (must be in BOM as minimum)
- `podLicenseUnit` — port increment per POD license purchase (0 for directors where blades are the unit)
- `speedGbps` — FC speed in Gbps (not GbE — FC uses Gbps convention)
- `maxIslPorts` — recommended ISL port budget (not used for host connections)
- `role: 'edge' | 'director' | 'extension'` — FC topology role, different from Ethernet `'leaf' | 'spine' | 'oob'`
- `formFactor: 'fixed' | 'director'` — fixed (1U/2U) vs. modular chassis

**Example:**

```typescript
// src/domain/catalog/fc-types.ts
export interface FCSwitchSpec {
  modelId: string;
  generation: 7 | 8;
  speedGbps: 32 | 64 | 128;
  totalPorts: number;
  basePorts: number;
  podLicenseUnit: number;  // 0 for directors (blade-based, not port POD)
  maxIslPorts: number;
  uHeight: number;
  maxPowerW: number;
  typicalPowerW?: number;
  role: 'edge' | 'director' | 'extension';
  formFactor: 'fixed' | 'director';
  sfpDDPorts?: number;  // SFP-DD ports (each = 2 FC ports when fully licensed)
  bladeSlotsCount?: number;  // Directors only
  portsPerBlade?: number;    // Directors only
}
```

### Pattern 3: Zod Schemas with z.infer Types

**What:** FC schemas follow the exact same pattern as `SizingInputSchema` — Zod schema is source of truth, TypeScript type is derived via `z.infer<>`, never declared separately.

**When to use:** Always. The project convention is strict on this.

**Example (mirrors existing schemas/input.ts):**

```typescript
// src/domain/schemas/fc-input.ts
import { z } from 'zod';
import { RackConfigSchema } from './input';  // reuse shared sub-schema

export const FCSizingInputSchema = z.object({
  racks: z.array(RackConfigSchema).min(1).max(200),
  hbaPortsPerServer: z.number().int().min(1).max(8).default(2),
  storageTargetPorts: z.number().int().min(2).max(128).default(4),
  storageArrayCount: z.number().int().min(1).max(32).default(1),
  fcSwitchModel: z.enum(['G710', 'G720', 'G730', 'X7-4', 'X7-8', '7850', 'G820', 'X8-4', 'X8-8']),
  islPortsPerSwitch: z.number().int().min(0).max(32).default(4),
  rackSize: z.enum(['24U', '42U', '50U']),
  serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),
});

export type FCSizingInput = z.infer<typeof FCSizingInputSchema>;
```

### Pattern 4: FC Optics Catalog with Protocol Discriminant

**What:** `FC_OPTICS_CATALOG` is a separate constant from `CABLE_CATALOG`. Each entry has a `protocol: 'fibre-channel'` field. This discriminant is used by CSV/PDF export to separate FC transceivers from Ethernet transceivers in BOM line items.

**Why it must be separate:** The SFP28 form factor is shared between 25G Ethernet and 32G FC. Without a protocol discriminant, BOM export cannot tell which `sfp28Count` field belongs to which fabric. This has procurement implications — wrong transceiver type ordered.

**Example:**

```typescript
// src/domain/catalog/brocade.ts (same file as FC_SWITCH_CATALOG)
export interface FCOpticsSpec {
  protocol: 'fibre-channel';  // discriminant — never 'ethernet'
  speedGbps: 32 | 64 | 128;
  formFactor: 'SFP28' | 'SFP+' | 'SFP-DD' | 'QSFP';
  wavelengthNm: number;
  connectorType: 'LC-duplex' | 'SFP-DD';
  maxDistanceM: number;
  useCase: string;
}

export const FC_OPTICS_CATALOG = {
  'FC-32G-SW-SFP28': {
    protocol: 'fibre-channel' as const,
    speedGbps: 32,
    formFactor: 'SFP28',
    wavelengthNm: 850,
    connectorType: 'LC-duplex',
    maxDistanceM: 100,
    useCase: '32G short-wavelength, OM4 multimode, intra-rack',
  },
  'FC-64G-SW-SFP+': {
    protocol: 'fibre-channel' as const,
    speedGbps: 64,
    formFactor: 'SFP+',
    wavelengthNm: 850,
    connectorType: 'LC-duplex',
    maxDistanceM: 100,
    useCase: '64G short-wavelength, OM4 multimode, G720/G730',
  },
  'FC-128G-SW-SFP+': {
    protocol: 'fibre-channel' as const,
    speedGbps: 128,
    formFactor: 'SFP+',
    wavelengthNm: 850,
    connectorType: 'LC-duplex',
    maxDistanceM: 100,
    useCase: '128G short-wavelength, OM4 multimode, G820',
  },
} as const;
```

### Pattern 5: FCNetworkBOMSchema with Required POD Fields

**What:** The BOM schema output must include `podLicensesRequired` per switch model from day one. This is not optional — missing it produces a BOM that understates procurement cost.

**Why `podLicensesRequired` is a required field, not optional:** The customer receives the BOM and orders switches. If POD licenses are missing, they order base-config switches and discover at delivery time that 24-port G720s do not have 64 ports. This is not recoverable without a new PO.

**Example stub (full engine comes in Phase 10):**

```typescript
// src/domain/schemas/fc-bom.ts
export const FCNetworkBOMSchema = z.object({
  fabricASwitches: z.number().int().min(0),
  fabricBSwitches: z.number().int().min(0),
  hostPortsPerFabric: z.number().int().min(0),
  storagePortsPerFabric: z.number().int().min(0),
  islPortsPerFabric: z.number().int().min(0),
  podLicensesRequired: z.number().int().min(0),  // required — see Pitfall 2
  fcOpticsCount: z.number().int().min(0),
  islCables: z.number().int().min(0),
  fanInRatio: z.number().min(0),
  islOversubscriptionRatio: z.number().min(0),   // required — see Pitfall 3
  violations: z.array(FCConstraintViolationSchema),
  input: FCSizingInputSchema,
});

export type FCNetworkBOM = z.infer<typeof FCNetworkBOMSchema>;
```

### Anti-Patterns to Avoid

- **Merging FC fields into `SizingInputSchema`:** Adding `fcSwitchModel`, `hbaPortsPerServer` to the Ethernet schema creates a coupled discriminated union. Every engine branch must check `input.mode`. Separate schemas keep each engine independently testable.
- **Single `ports` field in `FCSwitchSpec`:** Using only `totalPorts` causes the engine to compute switches as `ceil(hostPorts / 64)` for a G720 — the customer gets switches with 24 active ports each, not 64.
- **Adding FC optics to `CABLE_CATALOG`:** Merges Ethernet and FC transceivers; BOM export cannot discriminate between `25G SFP28 Ethernet` and `32G SFP28 FC`.
- **Separate `interface FCSizingInput { ... }` declarations:** All types must come from `z.infer<>`. No parallel type declarations.

---

## Verified Brocade FC Switch Specifications

### Gen7 (64G) — Verified from Broadcom TechDocs (April 2025)

| Model | Role | Total Ports | Base Ports | POD Unit | Max ISL | Form | Power | Verified |
|-------|------|------------|------------|---------|---------|------|-------|---------|
| G710 | edge | 24 | 8 | 8 SFP+ | 6 | 1U | 150W | HIGH — official techdocs |
| G720 | edge | 64 | 24 | DDPOD (dynamic) | 16 | 1U | 349W typ / 700W PSU | HIGH — official techdocs |
| G730 | core | 128 | 48 | DDPOD (dynamic) | 32 | 2U | 969W typ / dual 1100W PSU | HIGH — official techdocs |
| X7-4 | director | 265 | — | blade-based | 16 ICL | 8U chassis | ~2000W est. | MEDIUM — Lenovo Press |
| X7-8 | director | 512 | — | blade-based | 32 ICL | 14U chassis | ~4000W est. | MEDIUM — Lenovo Press |
| 7850 | extension | 24 (16 physical) | — | N/A | 18 GE WAN | 1U | ~200W est. | HIGH — Broadcom hardware features |

**G710 notes:** Ships with 8 active ports; expands to 16 (1 POD) or 24 (2 PODs) via 8-port SFP+ Ports on Demand licenses. Fixed 150W PSU. All enterprise SW licenses included in Gen7.

**G720 notes:** 48 × SFP+ ports + 8 × SFP-DD ports (each SFP-DD = 2 FC ports). Total: 64 ports when all DD ports licensed. Uses Dynamic POD (DDPOD) — base 24, adds ports as they connect up to 64. Universal ports auto-configure as F_Port (host), E_Port (ISL), or D_Port.

**G730 notes:** 96 × SFP+ + 16 × SFP-DD = 128 ports total. DDPOD scales from 48 to 128. ISL trunking up to 512 Gb/s per trunk. Dual redundant hot-swap PSUs. Used as core aggregation.

**X7-4 notes:** 4 horizontal blade slots in 8U chassis. FC64-48 blade = 48 × 64G ports or FC64-64 blade = 64 × 64G ports. Up to 265 ports with 4× FC64-64 blades + 9 ICL ports. No POD per blade — blades are the unit.

**X7-8 notes:** 8 vertical blade slots in 14U chassis. Up to 512 × 64G ports with 8× FC64-64 blades. Up to 32 ICL ports. Used for large enterprise/core fabrics.

**7850 notes:** Gen7 FCIP extension switch. 16 physical FC ports (8 × SFP-DD + 8 × SFP+) = 24 addressable FC ports. 16 × GE0–GE15 SFP+ (1/10/25GbE WAN) + 2 × QSFP (100GbE WAN). Role: `extension`. Not a pure FC switch — connects FC fabric across WAN via FCIP. Triggers only when WAN extension option is enabled in UI (FC-04 covers catalog entry; sizing engine for 7850 is Phase 10 scope).

### Gen8 (128G) — Verified from Broadcom TechDocs / Nov 2025 Launch

| Model | Role | Total Ports | Base Ports | POD Unit | Form | Power | Verified |
|-------|------|------------|------------|---------|------|-------|---------|
| G820 | edge | 56 | 24 | 8 SFP+ | 1U | 650W PSU / 336W typ (full load) | HIGH — official techdocs |
| X8-4 | director | 192 | — | blade-based (FC128-48 × 4) | ~9U chassis | ~2000W est. | MEDIUM — press release + Lenovo Press |
| X8-8 | director | 384 | — | blade-based (FC128-48 × 8) | ~14U chassis | ~4000W est. | MEDIUM — press release + Lenovo Press |

**G820 notes:** 56 × SFP+ ports (0–55). DDPOD scales 24 → 56 with four 8-port PODs. Autosensing 16/32/64/128G per port. AES-GCM-256 encrypted ISLs (quantum-safe). Dual hot-swap 650W AC PSUs. Typical power at 50% load / 56 ports: 336W.

**X8-4 notes:** 4 blade slots × FC128-48 blade = 192 × 128G ports maximum. Chassis approximately 9U. Power estimated — verify from Lenovo Press product guide before encoding in catalog.

**X8-8 notes:** 8 blade slots × FC128-48 blade = 384 × 128G ports maximum. Chassis approximately 14U. Power estimated — verify from Lenovo Press product guide before encoding.

**Research flag from STATE.md:** "G820 Gen8 power figures estimated — verify X8-4/X8-8 director power against Lenovo Press datasheets before encoding." Director power estimates (2000W/4000W) should be marked as `typicalPowerW: undefined` or left absent pending verification. Use `maxPowerW` for the PSU rated value only when confirmed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FC port counts per model | Runtime calculation from partial specs | `FC_SWITCH_CATALOG` constants | Brocade port specs are not derivable — they are hardware facts that must be encoded |
| Zod type derivation | Manual `interface FCSizingInput { ... }` declarations | `z.infer<typeof FCSizingInputSchema>` | Project convention; separate declarations diverge from schemas silently |
| Protocol discriminant on optics | Ad-hoc string matching in export | `protocol: 'fibre-channel'` field on `FCOpticsSpec` | Type-safe filter at export; prevents Ethernet SFP28 count contaminating FC BOM |
| POD license calculation logic | Inline math in engine | `basePorts + (podCount × podLicenseUnit)` formula driven by catalog constants | Engine Phase 10 uses catalog fields; Phase 8 must provide those fields correctly |

**Key insight:** Phase 8 has no algorithmic complexity. The value is encoding correct hardware facts with the right data model. The biggest risk is encoding `totalPorts` only, which would require a breaking schema change to add `basePorts` and `podLicenseUnit` when the engine is written in Phase 10.

---

## Common Pitfalls

### Pitfall 1: Single `ports` Field in FCSwitchSpec

**What goes wrong:** Catalog entry has `ports: 64` for G720. Engine computes `ceil(hostPorts / 64)`. Customer orders that many switches. Discovers at delivery that base G720 ships with 24 active ports.

**Why it happens:** Ethernet switches have a fixed port count. The POD model is FC-specific.

**How to avoid:** Three required fields per switch: `totalPorts` (chassis max), `basePorts` (unlicensed minimum), `podLicenseUnit` (increment). The engine (Phase 10) uses `basePorts + N × podLicenseUnit` for sizing.

**Warning signs:** Any `FCSwitchSpec` that has only one "ports" field.

### Pitfall 2: FC Optics Mixed Into Ethernet CABLE_CATALOG

**What goes wrong:** `CABLE_CATALOG` gains `'FC-32G-SW': { ... }` entry. BOM CSV export has a single `SFP28 Count` column covering both Ethernet 25G and FC 32G transceivers. Customer submits ambiguous purchase order.

**Why it happens:** The SFP28 form factor is physically identical between 25G Ethernet and 32G FC.

**How to avoid:** `FC_OPTICS_CATALOG` is a completely separate constant. The `protocol: 'fibre-channel'` field is a structural discriminant enforced at the type level — not a convention.

**Warning signs:** Any import of `CABLE_CATALOG` in FC-related files, or any FC entry added to `cables.ts`.

### Pitfall 3: Separate TypeScript Type Declarations Alongside Zod Schemas

**What goes wrong:** Developer writes:

```typescript
// DO NOT DO THIS
interface FCSizingInput { racks: RackConfig[]; hbaPortsPerServer: number; ... }
```

alongside the Zod schema. Over time the two diverge silently.

**Why it happens:** TypeScript-first instinct; developer writes interface before schema.

**How to avoid:** Write the Zod schema first, then the `export type FCSizingInput = z.infer<typeof FCSizingInputSchema>` line. No other declaration.

**Warning signs:** Any `interface FCSizing*` or standalone `type FCSizing*` declarations not derived from `z.infer<>`.

### Pitfall 4: Missing `islOversubscriptionRatio` in FCNetworkBOMSchema

**What goes wrong:** `FCNetworkBOMSchema` is defined without `islOversubscriptionRatio`. Phase 10 engine adds it. Phase 12 UI assumes it exists. Schema must be bumped, migration added, tests updated.

**Why it happens:** The ratio is an engine output, so developers defer it to the engine phase.

**How to avoid:** Define the complete output shape of `FCNetworkBOM` in Phase 8 — even fields the engine will compute. The schema defines the contract; the engine must fulfill it. Required fields include: `fanInRatio`, `islOversubscriptionRatio`, `podLicensesRequired`.

**Warning signs:** `FCNetworkBOMSchema` without all three required ratio/license fields.

### Pitfall 5: X7-4 Port Count Off by 9

**What goes wrong:** X7-4 maximum port count encoded as 256 (4 blades × 64 ports). Actual maximum is 265 (includes 9 ICL/Universal ports usable as FC ports in non-ICL configurations).

**Why it happens:** Product brief headline: "up to 265 ports." Developers assume 4 × 64 = 256.

**How to avoid:** Use IBM/Lenovo Press X7-4 spec sheet figure of 265. For conservative sizing, use 256 (4 blades × 64) as `totalPorts` with a code comment citing the discrepancy and the ICL port exception.

---

## Code Examples

### Catalog constant pattern (from existing codebase)

```typescript
// Source: src/domain/catalog/hardware.ts (existing — follow this exactly)
import type { SwitchSpec } from './types';

export const SWITCH_CATALOG = {
  'S5248F-ON': {
    modelId: 'S5248F-ON',
    role: 'leaf',
    downlinkPorts: 48,
    // ...
  },
} as const satisfies Record<string, SwitchSpec>;

export type SwitchModelId = keyof typeof SWITCH_CATALOG;
```

Replicate for FC:

```typescript
// src/domain/catalog/brocade.ts — NEW, follows same pattern
import type { FCSwitchSpec, FCOpticsSpec } from './fc-types';

export const FC_SWITCH_CATALOG = { ... } as const satisfies Record<string, FCSwitchSpec>;
export type FCSwitchModelId = keyof typeof FC_SWITCH_CATALOG;

export const FC_OPTICS_CATALOG = { ... } as const satisfies Record<string, FCOpticsSpec>;
export type FCOpticsId = keyof typeof FC_OPTICS_CATALOG;
```

### Zod schema pattern (from existing codebase)

```typescript
// Source: src/domain/schemas/input.ts (existing — follow this exactly)
import { z } from 'zod';

export const RackConfigSchema = z.object({
  serverCount: z.number().int().min(0).max(500),
});

export const SizingInputSchema = z.object({
  racks: z.array(RackConfigSchema).min(1).max(200),
  // ...
});

export type SizingInput = z.infer<typeof SizingInputSchema>;
export type RackConfig = z.infer<typeof RackConfigSchema>;
```

FC schema must `import { RackConfigSchema } from './input'` to reuse the shared rack sub-schema.

### Catalog test pattern (from existing codebase)

```typescript
// Source: src/domain/catalog/hardware.test.ts (existing — follow this pattern)
import { describe, it, expect } from 'vitest';
import { FC_SWITCH_CATALOG } from './brocade';

describe('FC_SWITCH_CATALOG — G720', () => {
  it('has totalPorts 64', () => {
    expect(FC_SWITCH_CATALOG['G720'].totalPorts).toBe(64);
  });

  it('has basePorts 24', () => {
    expect(FC_SWITCH_CATALOG['G720'].basePorts).toBe(24);
  });

  // A wrong port count fails a test, not a code review — from phase success criteria
  it('G720 basePorts < totalPorts (POD model)', () => {
    const { basePorts, totalPorts } = FC_SWITCH_CATALOG['G720'];
    expect(basePorts).toBeLessThan(totalPorts);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Brocade Gen6 (32G) as primary FC | Gen7 (64G) as standard, Gen8 (128G) as latest | Gen7: 2020; Gen8: Nov 2025 | G720/G730 are current standard; G820 is new but available |
| Static per-port POD licenses | Dynamic POD (DDPOD) on G720/G730/G820 | Gen7 introduction | DDPOD activates ports as needed; simpler license management |
| X6 directors (32G) | X7 directors (64G), X8 directors (128G) | X7: 2020; X8: Nov 2025 | X7-4/X7-8 are current director standard |
| G630 (Gen6 32G core) | G730 (Gen7 64G core) | Gen7 introduction | G630 no longer primary spec recommendation |

**Note on G620/G630:** The ARCHITECTURE.md research mentions G620/G630 as potential catalog entries. Per REQUIREMENTS.md, only FC-01 (G710, G720, G730, X7-4, X7-8), FC-02 (G820, X8-4, X8-8), and FC-04 (7850) are in scope. G620/G630 are out of scope for Phase 8. Do not add them.

---

## Open Questions

1. **X8-4/X8-8 exact power figures**
   - What we know: X8-4 uses FC128-48 blades × 4 = 192 ports; X8-8 = 384 ports. Gen8 128G.
   - What's unclear: Final PSU power ratings. Research flag from STATE.md says "verify X8-4/X8-8 director power against Lenovo Press datasheets before encoding."
   - Recommendation: Use `maxPowerW: 0` or omit `typicalPowerW` for X8-4/X8-8 in Phase 8; mark as TODO with source URL. Phase 10 engine does not require director power for sizing calculations.

2. **G820 DDPOD increment size**
   - What we know: G820 scales from 24 to 56 ports with "four 8-port SFP+ PODs" per the G820 device overview.
   - What's unclear: Whether DDPOD means fixed 8-port increments or truly dynamic (any port activates on demand).
   - Recommendation: Use `podLicenseUnit: 8` (4 PODs × 8 ports = 32 additional ports; 24 + 32 = 56). This is consistent with "four 8-port SFP+ PODs" from the official source.

3. **X7-4 port count: 256 vs 265**
   - What we know: Lenovo Press / IBM spec sheet cites 265 for X7-4 max ports. 4 × FC64-64 = 256 FC ports + 9 ICL ports.
   - Recommendation: Encode `totalPorts: 256` as usable FC data ports for sizing (conservative); add comment noting 265 total includes 9 ICL ports. The sizing engine only needs data ports.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | vite.config.ts (test section, jsdom environment) |
| Quick run command | `npx vitest run src/domain/catalog/brocade.test.ts src/domain/schemas/fc-schemas.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FC-01 | G710/G720/G730/X7-4/X7-8 in FC_SWITCH_CATALOG | unit | `npx vitest run src/domain/catalog/brocade.test.ts` | Wave 0 |
| FC-01 | G710 totalPorts=24, basePorts=8, podLicenseUnit=8 | unit | same | Wave 0 |
| FC-01 | G720 totalPorts=64, basePorts=24 | unit | same | Wave 0 |
| FC-01 | G730 totalPorts=128, basePorts=48 | unit | same | Wave 0 |
| FC-01 | X7-4 role='director', formFactor='director' | unit | same | Wave 0 |
| FC-01 | X7-8 role='director', bladeSlotsCount=8 | unit | same | Wave 0 |
| FC-02 | G820/X8-4/X8-8 in FC_SWITCH_CATALOG with generation=8 | unit | same | Wave 0 |
| FC-02 | G820 totalPorts=56, basePorts=24, speedGbps=128 | unit | same | Wave 0 |
| FC-03 | Every fixed switch: basePorts < totalPorts | unit | same | Wave 0 |
| FC-03 | Every fixed switch: podLicenseUnit > 0 | unit | same | Wave 0 |
| FC-03 | Directors: podLicenseUnit=0 (blade-based, not port POD) | unit | same | Wave 0 |
| FC-04 | 7850 in catalog, role='extension', formFactor='fixed' | unit | same | Wave 0 |
| FC-04 | 7850 totalPorts=24, basePorts=24, maxIslPorts=18 | unit | same | Wave 0 |
| FC-03 | FCSizingInputSchema parses valid input without error | unit | `npx vitest run src/domain/schemas/fc-schemas.test.ts` | Wave 0 |
| FC-03 | FCNetworkBOMSchema has podLicensesRequired field | unit | same | Wave 0 |
| FC-03 | FCSizingInput type derived from z.infer (no separate declaration) | compile | `npx tsc --noEmit` | Wave 0 |
| FC-03 | FC_OPTICS_CATALOG has 3 entries (SFP28/SFP+/SFP+) with protocol='fibre-channel' | unit | `npx vitest run src/domain/catalog/brocade.test.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/catalog/brocade.test.ts src/domain/schemas/fc-schemas.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npx tsc --noEmit` before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/domain/catalog/brocade.test.ts` — all 9 catalog models + 3 optics (FC-01, FC-02, FC-03, FC-04)
- [ ] `src/domain/schemas/fc-schemas.test.ts` — Zod parse/reject for FCSizingInputSchema and FCNetworkBOMSchema
- [ ] `src/domain/catalog/fc-types.ts` — FCSwitchSpec + FCOpticsSpec interfaces (no test, compile-time)
- [ ] `src/domain/catalog/brocade.ts` — FC_SWITCH_CATALOG + FC_OPTICS_CATALOG constants
- [ ] `src/domain/schemas/fc-input.ts` — FCSizingInputSchema + FCSizingInput type
- [ ] `src/domain/schemas/fc-bom.ts` — FCNetworkBOMSchema + FCConstraintViolationSchema + FCNetworkBOM type

*(None of these files exist yet. All are Wave 0 gaps. No existing test infrastructure covers Phase 8 requirements.)*

---

## Sources

### Primary (HIGH confidence)

- [Broadcom TechDocs — G710 Technical Specifications](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g710-switch/1-0/technical-specifications-g710.html) — G710 port counts, form factor, power, POD model (updated April 2025)
- [Broadcom TechDocs — G720 Technical Specifications](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g720-switch/1-0/v25859098.html) — G720 port counts (48 SFP+ + 8 SFP-DD = 64), base 24, 1U, 349W typical
- [Broadcom TechDocs — G730 Technical Specifications](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g730-switch/1-0/Brocade-G730-Switch-Technical-Specifications.html) — G730 96 SFP+ + 16 SFP-DD = 128 ports, base 48, 2U, dual 1100W PSU
- [Broadcom TechDocs — G820 Device Overview](https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g820-switch/1-0/device-overview-g820.html) — G820 56 ports, base 24, 1U, 650W PSU, 128G autosensing, DDPOD
- [Broadcom TechDocs — 7850 Extension Switch Hardware Features](https://techdocs.broadcom.com/us/en/fibre-channel-networking/extension/7850-extension-switch/1-0/device-overview/brocade-7850-hardware-features.html) — 7850 16 physical FC ports (24 addressable), 18 GE WAN ports, 1U
- [Broadcom TechDocs — X7-4 Technical Specifications](https://techdocs.broadcom.com/us/en/fibre-channel-networking/directors/x7-4-director/1-0/GUID-7E301F2D-AD60-41B6-AB7A-93590C1FC5B5_7.html) — X7-4 up to 265 ports, 8U, 4 blade slots (updated July 2025)
- [Broadcom — Gen7 Switch FAQ](https://docs.broadcom.com/doc/Gen7-Switch-FAQ) — POD licensing model, DDPOD confirmation for G720/G730 (Jan 2025)
- Existing codebase — `src/domain/catalog/hardware.ts`, `src/domain/catalog/types.ts`, `src/domain/schemas/input.ts`, `src/domain/schemas/bom.ts` — catalog and schema patterns to replicate

### Secondary (MEDIUM confidence)

- [Lenovo Press — X7-8 and X7-4 Product Guide](https://lenovopress.lenovo.com/lp1587-lenovo-thinksystem-x7-8-and-x7-4-fc-san-directors) — X7-8 14U, 8 blade slots, 512 ports; X7-4 8U, 4 blade slots
- [Lenovo Press — X8-4 and X8-8 Product Guide](https://lenovopress.lenovo.com/lp2271-lenovo-x8-4-and-x8-8-gen-8-fc-directors) — X8-4/X8-8 blade counts and port capacity
- [Broadcom Investor Relations — Gen 8 Launch Announcement, Nov 2025](https://investors.broadcom.com/news-releases/news-release-details/broadcom-introduces-worlds-first-quantum-safe-gen-8-128g-san) — G820, X8-4, X8-8 confirmed available Nov 2025

### Tertiary (LOW confidence — for awareness only)

- [Broadcom SAN Design and Best Practices, Nov 2025](https://docs.broadcom.com/doc/53-1004781) — ISL fan-in ratios, fabric sizing guidance (relevant to Phase 10, not Phase 8)

---

## Metadata

**Confidence breakdown:**

- Switch catalog specs (G710, G720, G730, G820, 7850): HIGH — verified from Broadcom official techdocs
- Switch catalog specs (X7-4, X7-8): HIGH for port counts; MEDIUM for power (estimated)
- Switch catalog specs (X8-4, X8-8): MEDIUM — announced Nov 2025; FC128-48 blade confirmed; chassis power estimates only
- Architecture patterns (FCSwitchSpec, Zod schemas, catalog constant shape): HIGH — derived directly from existing codebase
- POD licensing model: HIGH — confirmed from Broadcom Gen7 FAQ and G820 device overview
- FC optics specifications: HIGH — LC-duplex SFP+ for 64G/128G confirmed from Broadcom product docs

**Research date:** 2026-03-18
**Valid until:** 2026-06-18 (stable hardware specs; 90-day validity for product catalogs)

---

*Phase 8 research: FC Catalog and Schema Foundation*
*Consuming phase: 08-fc-catalog-and-schema-foundation*
*Next phase: 09 (FC mode selector) — Phase 8 domain layer feeds Phases 9, 10, 12*

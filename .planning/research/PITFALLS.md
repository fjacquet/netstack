# Pitfalls Research

**Domain:** FC SAN sizing + switch positioning added to existing Ethernet sizing tool (NetStack v2.0)
**Researched:** 2026-03-18
**Confidence:** HIGH (domain-specific FC facts verified against Broadcom official docs; integration pitfalls derived from existing codebase analysis)

---

## Critical Pitfalls

### Pitfall 1: FC Domain Logic Leaking Into Ethernet Engine

**What goes wrong:**
A single `calculateBOM()` function that handles both Ethernet and FC via if-branches. Engineers add `if (mode === 'FC') …` guards throughout the sizing engine, the BOM schema, and the UI. Within two phases the Ethernet path is riddled with FC guard rails that do nothing but cause confusion. When the FC formulas change, breakage is non-obvious.

**Why it happens:**
The existing `sizing.ts` is a clean pure function and it feels natural to extend it. FC inputs (HBA count, fabric count, ISL ratio) look similar to Ethernet inputs at a surface level. The path of least resistance is to add fields to `SizingInputSchema` and branch in the engine.

**How to avoid:**
Treat FC as a parallel domain: a **separate Zod schema** (`FCSizingInputSchema`), a **separate pure function** (`calculateFCBOM()`), and a **separate result type** (`FCNetworkBOM`). The mode selector at the top of the app renders either the Ethernet subtree or the FC subtree — never both. No shared mutable state, no branching inside the existing engine.

```typescript
// Good — two independent engines
export function calculateBOM(input: SizingInput): NetworkBOM { … }      // Ethernet
export function calculateFCBOM(input: FCSizingInput): FCNetworkBOM { … } // FC

// Bad — one engine with mode branching
export function calculateBOM(input: SizingInput | FCSizingInput): NetworkBOM | FCNetworkBOM {
  if (input.mode === 'FC') { … } // grows without bound
}
```

**Warning signs:**
- `SizingInputSchema` gains fields named `fabricCount`, `islRatio`, `hbaCount`
- `calculateBOM()` has any branch on a `mode` or `protocol` field
- FC tests live in `sizing.test.ts` instead of `fcSizing.test.ts`

**Phase to address:**
FC Domain Engine phase (first FC phase). Establish the parallel module boundary before any FC logic is written.

---

### Pitfall 2: Dynamic POD Licensing Not Modelled — BOM Understates Switch Count

**What goes wrong:**
The FC catalog lists a Brocade G720 as having 64 ports. The sizing engine counts `ceil(hostPorts / 64)` switches and outputs that as the BOM. The customer orders accordingly, then discovers that base G720 ships with only 24 active ports. Additional Ports-on-Demand (POD) licenses must be purchased separately per switch, and the licenses are switch-serial-number locked — they are not interchangeable between units.

**Why it happens:**
Ethernet switches have a fixed port count. Engineers apply the same mental model to FC switches without reading the POD licensing model.

**How to avoid:**
Model every FC switch with two port counts in `FC_SWITCH_CATALOG`:

```typescript
export const FC_SWITCH_CATALOG = {
  'G720': {
    modelId: 'G720',
    generation: 'Gen7',
    speedGbps: 64,
    totalPorts: 64,          // physical ports in chassis
    basePorts: 24,           // ports active without additional POD licenses
    podLicenseUnit: 8,       // POD increments of 8 ports (SFP+) or 16 (SFP-DD pair)
    sfpDDPorts: 8,           // SFP-DD ports (each counts as 2 when fully licensed)
    maxIslPorts: 16,         // recommended ISL port budget
    uHeight: 1,
    maxPowerW: 250,
  },
  'G730': {
    modelId: 'G730',
    generation: 'Gen7',
    speedGbps: 64,
    totalPorts: 128,         // 96 SFP+ + 16 SFP-DD x 2
    basePorts: 48,           // ships with 48 active
    podLicenseUnit: 16,
    sfpDDPorts: 16,
    maxIslPorts: 32,
    uHeight: 2,
    maxPowerW: 450,
  },
} as const;
```

The BOM must output a `podLicensesRequired` field per switch model, and the UI must surface POD license count as a separate line item. Use `effectivePorts = basePorts + podLicensesRequired * podLicenseUnit` for sizing, not `totalPorts`.

**Warning signs:**
- FC catalog has only a single `ports` field per model
- BOM CSV export has no POD license line item
- Engine uses `totalPorts` directly in division

**Phase to address:**
FC Catalog Definition phase. The catalog schema must be correct before the engine is written.

---

### Pitfall 3: ISL Formula Copied From Ethernet Uplink Formula

**What goes wrong:**
Ethernet uplinks are calculated as `leafSwitches x activeUplinksPerLeaf`. Engineers apply the same multiplicative formula for ISLs: `fcSwitches x islLinksPerSwitch`. This is wrong. FC ISL sizing depends on the fabric-wide fan-in ratio (host ports : storage ports), the target oversubscription budget, and the speed mismatch between host ports and storage ports — not on a per-switch uplink count.

The standard Broadcom recommendation is a 7:1 maximum host-to-storage fan-in ratio per storage port. ISL bandwidth must cover the worst-case burst from the busiest server tier to the storage tier.

**Why it happens:**
The Ethernet formula is already working and the variables look superficially similar. ISL is "just the uplink" in FC in the same way uplinks are in Ethernet — or so it seems.

**How to avoid:**
Implement ISL sizing as a separate formula:

```typescript
function calculateIslCount(
  hostPorts: number,         // total server HBA ports connected to fabric A
  storagePorts: number,      // total storage ports on fabric A
  hostSpeedGbps: number,     // e.g. 32 or 64
  storageSpeedGbps: number,  // e.g. 32 or 64
  islSpeedGbps: number,      // e.g. 64 (SFP+) or 128 (SFP-DD)
  targetFanIn: number,       // default 7 per Broadcom recommendation
): number {
  const requiredStoragePorts = Math.ceil(hostPorts / targetFanIn);
  const hostBandwidth = hostPorts * hostSpeedGbps;
  const storageBandwidth = Math.min(storagePorts, requiredStoragePorts) * storageSpeedGbps;
  const bottleneck = Math.min(hostBandwidth, storageBandwidth);
  return Math.ceil(bottleneck / islSpeedGbps);
}
```

The BOM must include `islOversubscriptionRatio` as a required field, mirroring how `oversubscriptionRatio` is required in the Ethernet BOM.

**Warning signs:**
- ISL count is derived directly from `switchCount x someConstant`
- No `hostToStorageFanIn` field in `FCSizingInputSchema`
- `FCNetworkBOM` has no `islOversubscriptionRatio` field

**Phase to address:**
FC Domain Engine phase.

---

### Pitfall 4: Dual-Fabric Topology Rendered as Single Graph

**What goes wrong:**
FC SAN always deploys in two independent fabrics (Fabric A and Fabric B) for redundancy. Each server connects one HBA to Fabric A and a second HBA to Fabric B. If the topology diagram renders both fabrics on the same @xyflow/react graph with shared nodes, it visually implies they are interconnected — which defeats the entire redundancy model. Engineers either merge the two fabrics into one graph, or share switch nodes between both fabrics.

**Why it happens:**
The Ethernet topology is a single connected graph (leaf-spine). The rendering code renders "all switches connected to all servers." Naively applying the same renderer to FC produces a fully-connected graph across both fabrics.

**How to avoid:**
Render two **independent** @xyflow/react sub-graphs side by side (one `<ReactFlow>` for Fabric A, a separate `<ReactFlow>` for Fabric B), or a single graph with a clear visual partition (different node fill color per fabric, a labeled separator lane, no cross-fabric edges). Never share a switch node between both fabrics.

Fabric isolation must be enforced in the data model before rendering:

```typescript
interface FCTopologyData {
  fabricA: { switches: FCSwitchNode[]; edges: ISLEdge[] };
  fabricB: { switches: FCSwitchNode[]; edges: ISLEdge[] };
  // crossFabricEdges: structurally absent — cannot be added by accident
}
```

**Warning signs:**
- `buildFCTopology()` returns a flat `{ nodes, edges }` without fabric attribution
- Switch nodes have no `fabricId` property
- Server nodes have edges to switches in both fabrics without a `fabricId` discriminant on each edge

**Phase to address:**
FC Topology Diagram phase.

---

### Pitfall 5: Mode Switch Corrupts Persisted Ethernet State

**What goes wrong:**
The current `inputStore` persists under the key `netstack-input` at version 5. When a user switches to FC mode, the FC input is stored under the same key with version 6 migration. When they switch back to Ethernet, the merge function encounters FC-shaped data and either crashes (Zod validation fails), silently discards the old Ethernet config, or produces nonsensical values (e.g. `fabricCount: 2` mapped to `borderLeafCount`).

**Why it happens:**
The single-store pattern works well for one mode. Engineers increment the version number and add a migration branch, as has been done 5 times already. The v2-to-v3 scalar-to-racks-array migration succeeded, so the pattern feels safe. FC adds fundamentally incompatible fields, not just additive ones.

**How to avoid:**
Use **separate localStorage keys** for separate modes:

```typescript
// Ethernet store — existing, untouched
persist(…, { name: 'netstack-input', version: 5, … })

// FC store — new, independent key
persist(…, { name: 'netstack-fc-input', version: 1, … })

// Mode selector — lightweight, independent key
persist(…, { name: 'netstack-mode', version: 1, … })
```

The mode selector (`ethernetMode | fcMode`) is stored in a third lightweight store with its own key. No FC field ever appears in the Ethernet schema and vice versa.

This matches the existing Zustand v5 behavior documented in STATE.md: "In v5 initial state is not automatically written to storage" — meaning the FC store starts clean on first use without any migration plumbing.

**Warning signs:**
- `FCSizingInputSchema` fields added to `SizingInputSchema`
- `inputStore.ts` migrate branch handles `fabricCount` or `hbaCount`
- Mode is stored as a field inside `SizingInput`

**Phase to address:**
Mode Selector / Store Isolation phase (must precede both FC engine and switch positioning phases).

---

### Pitfall 6: FC Optics Catalog Confused With Ethernet Optics

**What goes wrong:**
The existing cable catalog uses `SFP28` for 25G Ethernet and `QSFP28` for 100G Ethernet. Brocade FC switches use `SFP+` at 32G and `SFP28` at 64G — different protocols, same form factor names. A developer adds FC transceivers to `CABLE_CATALOG` and names the 32G FC module `SFP28` (because SFP+ at 32G FC uses the SFP28 physical package). The PDF BOM then lists "SFP28 transceivers" in the same line item for both 25G Ethernet and 32G FC, producing an ambiguous order form.

**Why it happens:**
The form factor name (SFP28) is the same between 25G Ethernet and 32G FC. The difference is the protocol layer. A developer who is not an FC specialist will reuse the existing transceiver type.

**How to avoid:**
Introduce a `protocol` discriminant in the cable/transceiver catalog:

```typescript
type TransceiverProtocol = 'ethernet' | 'fibre-channel';

const FC_OPTICS_CATALOG = {
  'FC-32G-SW-SFP28': {
    protocol: 'fibre-channel' as TransceiverProtocol,
    speedGbps: 32,
    formFactor: 'SFP28',
    wavelengthNm: 850,
    connectorType: 'LC-duplex',
    maxDistanceM: 100,
  },
  'FC-64G-SW-SFP+': {
    protocol: 'fibre-channel' as TransceiverProtocol,
    speedGbps: 64,
    formFactor: 'SFP+',   // Gen7 uses SFP+ physical package at 64G
    wavelengthNm: 850,
    connectorType: 'LC-duplex',
    maxDistanceM: 100,
  },
} as const;
```

The BOM CSV export must use `protocol` as a column to disambiguate. Never merge FC and Ethernet transceivers into the same `CABLE_CATALOG`.

**Warning signs:**
- `CABLE_CATALOG` gains `FC-32G` or `FC-64G` entries
- BOM CSV has a single `SFP28 Count` column covering both Ethernet and FC
- `sfp28Count` in `FCNetworkBOM` reuses the Ethernet field name

**Phase to address:**
FC Catalog Definition phase.

---

### Pitfall 7: Switch Positioning U-Slot Math Breaks Existing Rack Elevation

**What goes wrong:**
The existing rack elevation renderer calculates device positions as sequential U-slots from U1 (bottom) or U42 (top). When MoR or BoR positioning is added, the leaf switches are no longer inside the server rack — they move to a dedicated network rack or a shared row rack. The renderer still places two leaf switches at the top of the server rack (because `SWITCH_U_PER_SERVER_RACK = 3` is hardcoded as a constant that assumes ToR). The server rack overflows or renders with ghost switch slots.

**Why it happens:**
`SWITCH_U_PER_SERVER_RACK = 3` (OOB + 2 leaf switches) is a ToR-specific constant now baked into the rack elevation U calculation. MoR and BoR move the leaf switches out of the server rack, so the server rack has only 1U overhead (OOB switch), not 3U.

**How to avoid:**
Make the switch overhead per server rack a function of the positioning mode:

```typescript
function switchOverheadU(positioning: SwitchPositioning): number {
  switch (positioning) {
    case 'ToR': return 3;  // OOB (1U) + leaf pair (2 x 1U)
    case 'MoR': return 1;  // OOB only; leafs in shared row rack
    case 'BoR': return 1;  // OOB only; leafs in bottom-of-row dedicated rack
    case 'EoR': return 1;  // OOB only; leafs at end of row
  }
}
```

The `SWITCH_U_PER_SERVER_RACK` constant must be removed or replaced with a function. The rack elevation must render a separate "network rack" tile for MoR/BoR/EoR showing the leaf switches in their actual row position.

**Warning signs:**
- `SWITCH_U_PER_SERVER_RACK` remains a module-level constant after switch positioning is added
- Rack elevation renders leaf switches inside server rack regardless of positioning mode
- `RACK_CAPACITY_EXCEEDED` violations fire incorrectly in MoR mode because leaf switch U-height is double-counted

**Phase to address:**
Switch Positioning phase. Audit `SWITCH_U_PER_SERVER_RACK` before writing any positioning UI.

---

### Pitfall 8: Cable Length Formula Ignores Row Geometry

**What goes wrong:**
In ToR mode, server-to-leaf cable length is under 3m (same rack). In MoR mode, servers at the ends of a row may be 10-20m from the row-middle switch rack. In BoR/EoR mode, servers may be 20-40m from the switch rack depending on row length. The sizing tool emits a cable quantity without accounting for length — or worse, emits the same `DAC_DISTANCE_ADVISORY` it already emits for Ethernet, creating a false-alarm for a MoR deployment that legitimately needs longer copper runs.

**Why it happens:**
The existing `DAC_DISTANCE_ADVISORY` triggers when `rackCount > 1` and `cableType === 'DAC'`, which was correct for leaf-spine (DAC = patch in same rack). In MoR/BoR, DAC is always wrong for server-to-leaf runs regardless of rack count.

**How to avoid:**
The `DAC_DISTANCE_ADVISORY` violation must account for positioning mode:

```typescript
// Existing: fires when rackCount > 1 AND cableType = DAC
// New: fires for MoR/BoR/EoR ALWAYS when cableType = DAC
if (input.switchPositioning !== 'ToR' && input.cableType === 'DAC') {
  violations.push({ code: 'DAC_POSITIONING_INCOMPATIBLE', positioning: input.switchPositioning });
}
```

Add a `cableRunMeters` estimated output to the BOM for each positioning mode so the customer knows what fiber/AOC lengths to order.

**Warning signs:**
- `DAC_DISTANCE_ADVISORY` logic is unchanged after switch positioning is added
- No cable length estimate appears in the BOM for MoR/BoR modes
- BOM passes validation with DAC cables and MoR positioning without a violation

**Phase to address:**
Switch Positioning phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add FC fields to `SizingInputSchema` | One schema, one store | Breaks Ethernet/FC isolation; Zod parse fails on mode switch | Never |
| Reuse `calculateBOM()` with mode flag | Less new code to write | Engine becomes untestable; Ethernet regression risk on every FC change | Never |
| Skip `podLicensesRequired` in BOM v1 | Faster delivery | Customer orders wrong number of switches; trust damage | Never — must be in BOM from day one |
| Hard-code `SWITCH_U_PER_SERVER_RACK = 3` for now | Unblock rack elevation | Breaks silently when positioning mode is added | Acceptable only if positioning mode is a later phase AND a TODO is filed explicitly |
| Share Ethernet cable catalog for FC optics | One catalog, less code | Ambiguous BOM line items; wrong procurement orders | Never |
| Store mode flag inside `SizingInput` | Simpler state shape | Mode persists incorrectly across store version migrations | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| @xyflow/react + dual-fabric FC diagram | Single `<ReactFlow>` with all FC nodes, cross-fabric edges invisible but present in data | Two separate `<ReactFlow>` instances or strict `fabricId` enforcement on all edges |
| Zustand `persist` + mode switching | Same `name` key for both Ethernet and FC stores | Separate `name` keys: `netstack-input` (Ethernet), `netstack-fc-input` (FC), `netstack-mode` (selector) |
| Zustand `persist` v5 + new store | Assuming initial state auto-writes to storage | Explicitly hydrate or accept that store starts blank until first user interaction |
| `@react-pdf/renderer` + FC BOM | Adding FC fields to existing `NetStackDocument` PDF component | Separate `FCNetStackDocument` component; lazy-load independently |
| i18n + FC mode | Reusing Ethernet translation keys for FC terms (e.g. `t('cables')` for ISL cables) | Separate i18n namespace `fc.*` for all FC-specific labels |
| Zod v4 + discriminated union for mode | Putting both `SizingInput` and `FCSizingInput` in a `z.discriminatedUnion` on `mode` | Keep schemas independent; discriminate in the store layer, not in Zod |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recomputing FC BOM on every Ethernet store change | FC result store subscribes to Ethernet input store | FC result store subscribes only to FC input store | Immediately — stale FC BOM or unnecessary recompute on every keystroke |
| Rendering FC dual-fabric graph when Ethernet mode is active | @xyflow layout computed for hidden FC topology | Conditional render — FC topology only mounts when FC mode is active | With any deployment > 20 racks (layout computation noticeable in tab switch) |
| ISL trunk edge rendering as many individual lines | Visual clutter, overlapping lines per trunk | Aggregate trunk edges into single weighted edge with `trunkMembers` label | At > 4 ISL trunks per switch pair |
| localStorage migration runs on every cold start | `merge()` runs full v2-v3 migration logic for Ethernet even when user is in FC mode | Mode-specific stores have independent versions and merge functions | Immediately on returning users with stale cached state |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Mode switch loses Ethernet config silently | Engineer sizes Ethernet deployment, switches to FC to explore, switches back — Ethernet config is gone | Separate persisted stores; switching modes never touches the other mode's state |
| FC BOM shows "oversubscription ratio" using Ethernet formula | Ratio number is meaningless in FC context; misleads customer | FC BOM uses "host-to-storage fan-in ratio" with Broadcom 7:1 recommended threshold as the benchmark |
| POD license count hidden in tooltip or footnote | Customer misses it on export, orders wrong number of switches | POD license count is a top-level BOM line item, not a tooltip, with a prominent warning if `podLicensesRequired > 0` |
| Switch positioning changes cable type requirement silently | User selects MoR, must use fiber but app does not warn them | Show an explicit violation banner: "DAC incompatible with MoR positioning — fiber or AOC required" |
| Dual fabric shown as one fabric in exported PDF | Customer's procurement team reads the BOM as single-fabric order, under-orders by 2x | PDF shows Fabric A and Fabric B as separate sections with a totals row showing the combined count |

---

## "Looks Done But Isn't" Checklist

- [ ] **FC BOM POD licensing:** Engine outputs `podLicensesRequired` per switch model — verify the CSV export has a dedicated `POD Licenses` row
- [ ] **Dual-fabric count:** All FC switch counts in the BOM are per-fabric — verify the totals section multiplies by 2 and labels them "Fabric A + Fabric B"
- [ ] **ISL oversubscription ratio:** `FCNetworkBOM` has `islOversubscriptionRatio` as a required field — verify it appears in BOM panel and PDF
- [ ] **Mode isolation:** Switching Ethernet to FC to Ethernet leaves Ethernet `inputStore` unchanged — verify with a Vitest test that mounts both stores
- [ ] **ToR U-slot overhead:** `switchOverheadU('ToR')` returns 3, `switchOverheadU('MoR')` returns 1 — verify rack elevation tests cover both modes
- [ ] **FC optics disambiguation:** BOM CSV has separate columns or rows for Ethernet vs FC transceivers — verify the CSV test fixture includes both modes
- [ ] **DAC advisory for non-ToR positioning:** `DAC_POSITIONING_INCOMPATIBLE` violation fires for MoR+DAC combination — verify a dedicated violation test case
- [ ] **i18n completeness:** FC mode has translation keys in all 4 languages (FR, EN, DE, IT) — verify no `undefined` translation renders in FC mode

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| FC logic mixed into Ethernet engine | HIGH | Extract FC engine into `fcSizing.ts`; add full test coverage; remove branches from `sizing.ts`; Ethernet regression risk is real |
| POD licensing missing from BOM at launch | MEDIUM | Add `podLicensesRequired` field to `FCNetworkBOM`; bump FC store version; update CSV/PDF templates; re-test all exports |
| Dual-fabric rendered as single graph | MEDIUM | Refactor `buildFCTopology()` to return `{ fabricA, fabricB }`; update @xyflow component to render two sub-graphs |
| Ethernet state corrupted by mode switch | HIGH | Detect corrupt state in `merge()`; fall back to `DEFAULT_INPUT`; add toast notification to user; bump Ethernet store version with migration |
| `SWITCH_U_PER_SERVER_RACK` constant wrong for MoR | LOW | Replace constant with `switchOverheadU(positioning)` function; update rack elevation tests; no schema change needed |
| DAC advisory missing for MoR mode | LOW | Add `DAC_POSITIONING_INCOMPATIBLE` violation case to engine; add test fixture; re-run test suite |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| FC logic leaking into Ethernet engine | FC Domain Engine (Phase 1 of v2.0) | `sizing.ts` has zero imports from `fcSizing.ts` and vice versa; confirmed by import linting |
| Dynamic POD licensing not modelled | FC Catalog Definition (Phase 0 of v2.0) | `FC_SWITCH_CATALOG` has `basePorts`, `podLicenseUnit` fields; BOM CSV test has `POD Licenses` row |
| ISL formula copied from Ethernet | FC Domain Engine (Phase 1 of v2.0) | Separate `calculateIslCount()` function with fan-in input; `islOversubscriptionRatio` in `FCNetworkBOM` |
| Dual-fabric rendered as single graph | FC Topology Diagram phase | `buildFCTopology()` returns `{ fabricA, fabricB }`; no cross-fabric edges in the data model |
| Mode switch corrupts Ethernet state | Mode Selector phase (before FC engine) | Vitest test: switch to FC mode, mutate FC store, switch back, assert Ethernet store unchanged |
| FC optics confused with Ethernet optics | FC Catalog Definition phase | `FC_OPTICS_CATALOG` is a separate module; CSV test verifies `Protocol` column distinguishes `ethernet` vs `fibre-channel` |
| U-slot math breaks with MoR/BoR positioning | Switch Positioning phase | `switchOverheadU()` function replaces `SWITCH_U_PER_SERVER_RACK` constant; rack elevation tests run with ToR, MoR, BoR inputs |
| Cable length ignores row geometry | Switch Positioning phase | `DAC_POSITIONING_INCOMPATIBLE` violation fires for MoR+DAC combination; BOM has `estimatedCableRunMeters` field |

---

## Sources

- [Broadcom: Ports on Demand Overview — Fabric OS 9.1.x](https://techdocs.broadcom.com/us/en/fibre-channel-networking/fabric-os/fabric-os-software-licensing/9-1-x/v26544088.html)
- [Broadcom: SAN Design and Best Practices, November 2025](https://docs.broadcom.com/doc/53-1004781)
- [Broadcom: Gen 7 Switch FAQ](https://docs.broadcom.com/doc/Gen7-Switch-FAQ)
- [Broadcom: G720 Switch Product Brief](https://docs.broadcom.com/doc/G720-Switch-PB)
- [Broadcom: G730 Switch Product Brief](https://docs.broadcom.com/doc/G730-Switch-PB)
- [Broadcom: Port Oversubscription Monitoring — MAPS 9.1.x](https://techdocs.broadcom.com/us/en/fibre-channel-networking/fabric-os/fabric-os-maps/9-1-x/Fabric-Performance-Impact-Monitoring-Using-MAPS_91x/Congestion-Detection_91x/Oversubscription-Monitoring.html)
- [Zustand: Persist Middleware Reference](https://zustand.docs.pmnd.rs/reference/middlewares/persist)
- [Zustand GitHub: Persist multiple versions discussion #984](https://github.com/pmndrs/zustand/issues/984)
- Codebase analysis: `src/store/inputStore.ts` (version 5 migration pattern), `src/domain/schemas/bom.ts` (ConstraintViolation discriminated union), `src/domain/catalog/hardware.ts` (SWITCH_CATALOG pattern)

---
*Pitfalls research for: NetStack v2.0 — FC SAN sizing + switch positioning added to existing Ethernet tool*
*Researched: 2026-03-18*

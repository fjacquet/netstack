# Stack Research

**Domain:** Network sizing / BOM calculator web app (Dell SONiC Leaf-Spine + Brocade FC SAN)
**Researched:** 2026-03-18 (v2.0 milestone — FC SAN + switch positioning additions)
**Confidence:** HIGH (hardware specs from Broadcom official techdocs; no new npm deps required)

---

## Milestone Context

v2.0 adds two features to the existing validated stack:
1. **Fibre Channel SAN sizing** — Brocade Gen7 (64G) and Gen8 (128G) switch catalog, dual-fabric topology, ISL calculations, FC optics
2. **Switch positioning** — ToR / MoR / BoR selector, cable length impact on BOM, rack elevation placement

**Verdict: No new runtime npm dependencies are required.** All new functionality fits within the existing stack. The additions are pure catalog data + engine logic extensions.

---

## Recommended Stack

### Core Technologies (Unchanged from v1.1)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | 8.0.0 | Build tool / dev server | Unchanged — no FC-specific build needs |
| React | 19.2.4 | UI framework | Unchanged — FC input form + topology uses same component model |
| TypeScript | 5.9.3 | Type safety | Strict mode especially important for FC domain — ports/speeds/fabric IDs are meaningfully typed |
| Zustand | 5.0.12 | Global state management | Unchanged — FC mode flag + FC BOM live alongside Ethernet BOM in same store pattern |
| Zod | 4.3.6 | Schema validation | FC input schema follows exact same Zod pattern: `FCSizingInputSchema` with `z.infer<>` types |

### FC SAN Domain Layer (New — no library, pure TypeScript)

| Component | Type | Purpose | Implementation Strategy |
|-----------|------|---------|------------------------|
| `FC_SWITCH_CATALOG` | TS constant | Brocade G720/G730/G820 hardware specs | Follows `SWITCH_CATALOG` pattern in `src/domain/catalog/hardware.ts` — new constant, same shape |
| `FC_OPTICS_CATALOG` | TS constant | SFP+ LC / SFP-DD FC optics per speed | New constant in `src/domain/catalog/cables.ts` — covers 64G SWL/LWL, 128G SWL |
| `FCSizingInputSchema` | Zod schema | FC input: server count, HBA ports, FC switch model, ISL ratio | New Zod schema in `src/domain/schemas/fc-input.ts` — separate from `SizingInputSchema` |
| `FCNetworkBOMSchema` | Zod schema | FC BOM output: switches per fabric, ISL count, optics | New Zod schema in `src/domain/schemas/fc-bom.ts` |
| `calculateFCBOM()` | Pure function | FC sizing engine | New pure function in `src/domain/engine/fc-sizing.ts` — same contract as `calculateBOM()` |

**Why no library for FC calculations:** No npm package exists for Fibre Channel SAN sizing calculations. FC sizing formulas are straightforward arithmetic (port counts, ISL ratios, dual-fabric multiplication) — identical in nature to the existing Ethernet sizing engine. Adding a library would introduce dependency risk with no benefit over typed TypeScript functions.

### Visualization (Unchanged — @xyflow/react)

| Library | Version | Purpose | FC-Specific Notes |
|---------|---------|---------|------------------|
| @xyflow/react | 12.10.1 | Topology diagram | FC dual-fabric diagram uses same custom node approach. Two parallel fabric flows rendered side-by-side or stacked. No API changes needed. |

**FC topology pattern:** Render Fabric A and Fabric B as two independent `<ReactFlow>` instances sharing a common layout container, OR as a single flow with two subgraphs separated by a gap. Custom node types: `FCSwitch` (with fabric color coding). Edges carry ISL vs. F_Port metadata. This is a pure data + component change — no new library.

### Rack Elevation (Unchanged — Custom SVG)

Switch positioning (ToR/MoR/BoR) only affects which U-slot the switch renders in. The existing custom SVG rack component already accepts U-position as a prop. The change is:
- Add a `switchPosition: 'ToR' | 'MoR' | 'BoR'` field to `SizingInput`
- Derive U-slot from position + rack height in the engine
- Pass derived U-slot to the existing SVG component

No library change. The SVG component is already parameterized by U-position.

### Export (Unchanged)

| Library | Version | FC-Specific Notes |
|---------|---------|------------------|
| @react-pdf/renderer | 4.3.2 | FC BOM adds a new section/table — same `<View>` + `<Text>` JSX pattern |
| react-papaparse | 4.4.0 | FC BOM CSV: additional rows for FC switches, ISL cables, FC optics |

### UI & Forms (Unchanged)

| Library | Version | FC-Specific Notes |
|---------|---------|------------------|
| react-hook-form | 7.71.2 | FC input form: new `useForm` instance with `zodResolver(FCSizingInputSchema)` |
| shadcn/ui | latest | Reuse `Select`, `Card`, `Badge`, `Table` components — no new components needed |
| Tailwind v4 | 4.2.1 | FC fabric colors (A = blue, B = orange) are standard Tailwind utilities |

---

## Hardware Catalog: Brocade FC Switches

All specs sourced from Broadcom official techdocs (HIGH confidence). These go directly into `FC_SWITCH_CATALOG` constants — not npm dependencies.

### Gen7 64G Switches

| Model | Role | FC Ports (max) | Base Ports (PoD) | Form Factor | Max Power | ISL Trunking | Notes |
|-------|------|---------------|------------------|-------------|-----------|--------------|-------|
| G720 | Edge switch | 64 (48 SFP+ + 8 DD×2) | 24 | 1U | 349W typical, 700W supply | Up to 8 ports per ISL trunk | Primary Gen7 choice for ToR FC |
| G730 | Core/director-class | 128 (96 SFP+ + 16 DD) | 48 | 2U | 969W, dual 1100W supply | 512 Gb/s per ISL trunk | For large fabrics; ISL aggregation |

**G720 detail:** 48 × 64G SFP+ ports + 8 × dual-density SFP-DD ports (each SFP-DD = 2 ports). Ports 0–55 addressable. PoD scales 24 → 64 with licenses. Universal ports self-configure as F_Port (host) or E_Port (ISL). 1U, 4.39 cm H × 44 cm W × 35.56 cm D.

**G730 detail:** 96 × 64G SFP+ + 16 × SFP-DD ports = 128 ports total. 2U. Dual redundant PSUs. Used for aggregation/core role in larger fabrics; less common as pure edge switch.

### Gen8 128G Switches

| Model | Role | FC Ports (max) | Base Ports (PoD) | Form Factor | Typical Power | ISL Trunking | Notes |
|-------|------|---------------|------------------|-------------|---------------|--------------|-------|
| G820 | Edge switch | 56 | 24 | 1U | 262W (28 ports, 50% load) / 336W (56 ports, 50% load) | AES-GCM-256 encrypted ISL | Gen8 launched Nov 2025; 128G autosensing |

**G820 detail:** 56 × 128G SFP+ (autosensing 16G/32G/64G/128G). Dynamic PoD: 24 → 56 ports. Dual hot-swap 650W PSUs. Universal ports: F_Port, E_Port, EX_Port, D_Port. C3338R processor, dual-core 1.5 GHz. Quantum-safe (AES-GCM-256 on ISLs).

### FC Optics Reference (for `FC_OPTICS_CATALOG`)

| Technology | Speed | Connector | Max Distance | Use Case |
|------------|-------|-----------|-------------|----------|
| 64G SWL SFP+ | 64G FC | LC duplex | 100m OM4 | Intra-rack / short-haul |
| 64G LWL SFP+ | 64G FC | LC duplex | 10km SMF | Long-haul / inter-row |
| 64G SFP-DD | 2×64G FC | SFP-DD | 100m OM4 | G720/G730 DD ports only |
| 128G SWL SFP+ | 128G FC | LC duplex | 100m OM4 | G820 intra-row |

---

## Switch Positioning: ToR / MoR / BoR

### What Changes per Position

| Position | Switch Location | Cable Length Multiplier (server → switch) | Rack U-Slot |
|----------|----------------|------------------------------------------|-------------|
| ToR | Top of rack (U1–U2) | ~3m (short, DAC/AOC safe) | rackSize – switchUHeight |
| MoR | Middle of row (separate shared rack) | ~5–15m (center-of-row, fiber recommended) | Fixed in dedicated network rack |
| BoR | Bottom of rack (U44–U45 in 42U) | ~3m (bottom, equivalent to ToR distance-wise) | switchUHeight (bottom) |

**Note on MoR:** Switches are not in each server rack — they are in a dedicated network rack at the middle of the row. Multiple server racks share one MoR switch. This changes the sizing formula: fewer switches total but more cables per switch, longer runs.

### Implementation: No New Libraries

The `switchPosition` field is a new enum in `SizingInputSchema`:
```typescript
switchPosition: z.enum(['ToR', 'MoR', 'BoR']).default('ToR')
```

Engine derives:
- `cableLengthAdvisory`: emit `DAC_DISTANCE_ADVISORY` if MoR + DAC (MoR cable runs typically exceed DAC's 3–5m limit)
- `switchUSlot`: calculated field for rack elevation SVG positioning
- BOM quantities: MoR changes leaf count formula (one switch pair per row of N racks instead of per rack)

The existing `ConstraintViolation` discriminated union gains a new `MOR_DAC_INCOMPATIBLE` code (MoR runs exceed DAC max distance). This is pure domain logic — no library.

---

## Installation

No new packages required for v2.0.

The existing lockfile is sufficient. All FC and switch positioning features are:
- New TypeScript constants (hardware catalog entries)
- New Zod schemas (FC input + FC BOM)
- New pure functions (FC sizing engine)
- New React components using existing `@xyflow/react` and shadcn/ui primitives

```bash
# Verify existing deps are current (no additions needed)
npm list @xyflow/react zustand zod react-hook-form
```

---

## Alternatives Considered

| Decision | Considered Alternative | Why Rejected |
|----------|----------------------|--------------|
| Separate FC_SWITCH_CATALOG constant | Merge FC models into SWITCH_CATALOG | FC switches have a different role taxonomy (edge/core vs. leaf/spine) and different port semantics (F_Port/E_Port vs. downlink/uplink). Merging would require adding FC-specific optional fields to the `SwitchSpec` interface and complicate type narrowing. Separate catalog keeps domain models clean. |
| Dedicated `calculateFCBOM()` function | Extend `calculateBOM()` with mode flag | FC sizing is a different domain — dual fabric, ISL ratios, HBA port math. Extending `calculateBOM()` would require a mode discriminant and complex branching. Separate pure function keeps each engine testable and understandable in isolation. |
| Two `<ReactFlow>` instances for dual fabric | Single flow with two subgraphs | Two instances give independent pan/zoom per fabric, cleaner isolation, simpler node ID namespacing. Tradeoff: slightly more React state. Preferred for fabric A / fabric B clarity. |
| MoR uses separate switch-rack model | MoR uses same per-rack switch model | MoR fundamentally changes the topology (shared switches across racks). Separate model flag in BOM is cleaner than trying to encode MoR in per-rack switch counts. |
| Add a 3rd-party FC capacity library | Pure TypeScript engine | No meaningful npm package exists for FC SAN sizing. The calculations are simple arithmetic. A dependency would add risk with zero benefit. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Brocade CLI emulation libraries | No such npm package; also out of scope (pure sizing, not config) | TypeScript constants for hardware specs |
| Any DCIM / IPAM library (NetBox client, etc.) | Heavyweight; requires backend; out of scope for pure client-side tool | Custom domain types + Zod schemas |
| G720 PoD "base" port count (24) in sizing | Base config is unlicensed minimum, not a deployable quantity. Use max (64) as catalog value and note PoD licensing requirement. | Use `portCount: 64` in FC_SWITCH_CATALOG, add `podLicenseRequired: true` flag |
| Treating ISL ports as identical to F_Ports | ISL ports consume the same physical SFP+ slots as host ports. ISL count must be subtracted from available host ports in the engine. | Subtract ISL allocation: `hostPorts = totalPorts - islPorts` |
| Single-fabric FC topology | FC best practice is always dual-fabric (Fabric A + Fabric B) for redundancy. Single-fabric is not recommended for production sizing. | Model dual fabric as default; allow single-fabric only as an explicit override with a violation warning. |

---

## Stack Patterns by Variant

**For FC SAN topology diagram:**
- Two `<ReactFlow>` instances, Fabric A and Fabric B, side-by-side in a flex container
- Custom node type `FCEdgeSwitchNode` renders switch name, port count, fabric label
- Edges between host-side nodes and switch: `F_Port` style (dotted, thin)
- Edges between switches (ISL): `E_Port` style (solid, thick)
- Fabric A: blue color scheme; Fabric B: orange color scheme (Tailwind `blue-600` / `orange-600`)

**For switch positioning in rack elevation:**
- `ToR`: switch renders at top of rack SVG (highest U numbers)
- `BoR`: switch renders at bottom of rack SVG (lowest U numbers)
- `MoR`: switch does NOT render in server rack SVG; renders in a separate network rack SVG
- U-slot calculation: `getUSlot(switchPosition, rackSizeU, switchUHeight) => number` — pure function

**For FC input form:**
- Mode selector renders at the top of the form: `Ethernet | Fibre Channel` toggle
- FC mode shows: FC switch model selector (G720/G730/G820), HBA ports per server (1/2/4), ISL port count per switch, fabric count (always 2, display only)
- Ethernet mode shows: existing form unchanged

**For FC BOM output:**
- FC BOM panel shows per-fabric counts: FC switches per fabric, ISL cables, FC optics (SFP+ count by type)
- Oversubscription concept in FC is different from Ethernet — model as "ISL bandwidth ratio" (ISL Gbps vs. total host Gbps)
- Re-use existing `Badge` and `Card` primitives; add new `FCBOMPanel` feature component

**For sizing engine — FC formula:**
```
switchesPerFabric = ceil(totalServers × hbaPortsPerServer / hostPortsPerSwitch)
islPortsPerSwitch = input.islPortCount  // from user, typically 4-8
hostPortsPerSwitch = catalogPorts - islPortsPerSwitch
totalFCSwitches = switchesPerFabric × 2  // dual fabric
islCables = switchesPerFabric × islPortsPerSwitch / 2  // ISL cables connect pairs
fcOpticsSFP = totalServers × hbaPortsPerServer × 2  // 2 SFP+ per link (HBA + switch)
```

---

## Version Compatibility

| Package | Version | FC/Positioning Compatibility Notes |
|---------|---------|-------------------------------------|
| @xyflow/react | 12.10.1 | Multiple `<ReactFlow>` instances in same React tree confirmed working; each needs its own `ReactFlowProvider` |
| zod | 4.3.6 | `z.discriminatedUnion` for `FCSizingInput` mode selector; same pattern as existing BOM violations |
| zustand | 5.0.12 | FC mode state + FC BOM state fits same store structure; add `fcMode: boolean` + `fcResult: FCNetworkBOM | null` |
| react-hook-form | 7.71.2 | Separate `useForm` for FC input — do not share form instance with Ethernet input |
| @react-pdf/renderer | 4.3.2 | FC BOM section added as new `<Page>` or `<View>` section in existing PDF template |

---

## Sources

- https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g720-switch/1-0/v25859098.html — G720 technical specifications: 48 SFP+ + 8 DD ports, 1U, 349W typical (HIGH confidence — Broadcom official techdocs)
- https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g730-switch/1-0/Brocade-G730-Switch-Technical-Specifications.html — G730 technical specifications: 96 SFP+ + 16 DD ports, 2U, dual 1100W PSU (HIGH confidence — Broadcom official techdocs)
- https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g820-switch/1-0/device-overview-g820.html — G820 device overview: 56 ports, 1U, 650W PSU, 128G autosensing, Gen8 (HIGH confidence — Broadcom official techdocs)
- https://docs.broadcom.com/doc/Gen7-Switch-FAQ — Gen7 FAQ: G720 and G730 PoD scaling, port counts confirmed (HIGH confidence — Broadcom official)
- https://www.storagenewsletter.com/2025/11/24/broadcom-introduces-the-worlds-first-quantum-safe-gen-8-128g-san-switch-portfolio/ — G820 launch November 2025, quantum-safe AES-GCM-256 ISL encryption (MEDIUM confidence — industry news, consistent with official docs)
- https://dc.mynetworkinsights.com/data-center-switching-centralized-eor-mor-top-of-rack-tor/ — ToR/MoR/EoR architecture patterns, cable length implications (MEDIUM confidence — technical blog, consistent with Cisco community docs)
- https://community.cisco.com/t5/data-center-switches/what-is-tor-eor-bor-mor/td-p/4990184 — ToR/EoR/BoR/MoR terminology definitions (MEDIUM confidence — Cisco community, authoritative on terminology)
- npm registry search for FC SAN calculation libraries — no relevant package found (confirms pure TypeScript implementation is correct approach) (HIGH confidence — negative finding verified)

---

*Stack research for: NetStack v2.0 — FC SAN sizing + switch positioning additions*
*Researched: 2026-03-18*
*Previous STACK.md (v1.1, Ethernet-only): superseded by this document — all prior recommendations still valid, this adds FC/positioning layer on top*

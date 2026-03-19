# Feature Research

**Domain:** Network sizing calculator / infrastructure BOM generator (Dell Leaf-Spine + SONiC + Brocade FC SAN)
**Researched:** 2026-03-18 (milestone v2.0 update — FC SAN + switch positioning)
**Updated:** 2026-03-19 (milestone v6.0 — Physical Planning: cable length schedule, power budget)
**Confidence:** MEDIUM-HIGH — Brocade switch specs confirmed via Broadcom official docs and Lenovo Press product guides. ISL/oversubscription ratios from Broadcom SAN Design and Best Practices guide (Nov 2025). Switch positioning cable length rules from multiple datacenter cabling sources.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Parameterized input form | Every sizing tool starts here — server count, rack density, link speed are universal inputs | LOW | Already in PROJECT.md: server count, servers/rack, connectivity type |
| Rack count calculation | First output engineers need; any sizing tool without this is useless | LOW | `ceil(total_servers / servers_per_rack)` — pure math |
| Switch count output | Engineers must know how many boxes to order — the core BOM question | LOW | Leaf, spine, OOB separate line items |
| Cable quantity output | Ordering without cable counts is incomplete; Cisco Hyperfabric and Nutanix Sizer both do this | MEDIUM | Must separate server-to-leaf, leaf-to-spine, OOB cables |
| BOM summary table | Single-page hardware list with model and quantity; standard output for procurement | LOW | Per-model rows: switch model, quantity, cable type, quantity |
| CSV export | Universally expected for procurement workflows; found in every comparable tool | LOW | Column headers: item, model, qty, category |
| PDF/print report | Stakeholders and procurement teams require printable output | MEDIUM | Formatted report with BOM table + summary inputs |
| Input validation with error messages | Tools that silently accept bad input destroy trust | LOW | Zod-based: port overflow, negative counts, incompatible cable+speed |
| Topology diagram | Visual confirmation the design is correct; every network tool shows this | HIGH | Force-directed or hierarchical graph of leaf-spine connections |
| Rack elevation diagram | Physical placement view; essential for data center planning | HIGH | SVG/canvas rendering of per-rack device stacking |
| Save/load configuration | Engineers iterate on designs; losing work is unacceptable | LOW | localStorage sufficient for single-user browser tool |
| Oversubscription ratio display | Standard metric; engineers verify it before signing off a design | LOW | Derived from downlink count × speed / uplink count × speed |
| Port utilization per switch | Engineers need to know if switches are over-provisioned | LOW | Calculated from inputs vs. switch port spec from hardware catalog |

---

## New Features: v2.0 Milestone

### FC SAN Mode (GH #1)

#### Table Stakes for FC SAN Sizing

These are the baseline features an FC SAN sizing tool must have to be useful.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Mode selector: Ethernet vs FC | Engineers design one fabric type at a time; modes are mutually exclusive | LOW | Radio button or tab toggle; mode change resets fabric-specific inputs |
| Dual-fabric topology (Fabric A + B) | Every production FC SAN requires dual fabric for redundancy; single-fabric is not acceptable in enterprise | MEDIUM | Both fabrics sized identically; total switch count = per-fabric count × 2 |
| FC switch catalog (Gen7 + Gen8) | BOM engine needs port density specs; without catalog, sizing is guesswork | MEDIUM | 9 Brocade models: G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8 |
| Server HBA port count input | FC sizing starts from HBA count, not server count; each server typically has 2 HBA ports | LOW | Input: HBA ports per server (default 2); feeds switch port demand |
| Storage target port count input | FC switch must have enough ports for storage as well as hosts | LOW | Input: storage target ports per fabric (typically 2–8 per array) |
| FC switch port calculation | Core sizing output: how many switches needed to connect all hosts + storage | MEDIUM | Formula: `ceil((hostPorts + storagePorts + islPorts) / availablePorts)` per fabric |
| ISL link calculation | FC fabrics cascade edge-to-core via ISLs; must be included in port budget | MEDIUM | Formula: ISLs = max(2, ceil(edgeSwitchCount × uplinksPerSwitch)) |
| FC BOM panel | Same as Ethernet BOM but with FC-specific line items (switches, SFP transceivers, patch cables) | MEDIUM | Line items: fabric A switches, fabric B switches, SFP optics, patch cables |
| Oversubscription ratio for FC | Fan-in ratio (host ports : ISL bandwidth) must be displayed; Broadcom recommends max 7:1 | LOW | Formula: `totalHostPorts / totalISLBandwidth`; flag >7:1 as warning |
| Dynamic POD licensing display | POD licensing affects per-switch cost; BOM must reflect base vs. licensed port count | MEDIUM | G710: 8 base, 8-port PODs to 24. G720: 24 base, PODs to 64. G730: 48 base, PODs to 128. G820: 24 base, PODs to 56 |
| FC-specific constraint violations | Port saturation, oversized fabric (>239 switches), ISL oversubscription >7:1 | LOW | Typed ConstraintViolation discriminated union, same pattern as Ethernet mode |

#### Differentiators for FC SAN

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Gen8 vs Gen7 recommendation | Surfaces when Gen8 (128G) makes sense vs staying on Gen7 (64G) — AI/NVMe workloads drive upgrade | MEDIUM | Heuristic: if server count > threshold or high-IOPS workload flag, recommend Gen8 |
| Extension switch (7850) BOM | WAN DR sites need FC extension; no competing tool sizes 7850 gateway with SAN | HIGH | 7850 is Gen7 extension product: 24 FC ports (16 physical), 18× GE WAN ports; triggers only when "WAN extension" checkbox enabled |
| ISL trunking recommendation | Recommend trunk group size (2–8 ISLs per trunk) based on traffic pattern input | MEDIUM | Best practice: 2 ISLs per trunk minimum; spread across separate ASICs |
| Zoning recommendation hints | Output hint: single initiator/target zoning vs. zone sets — avoids common misconfiguration | LOW | Text advisory only, no zone config generation |
| Director vs fixed switch decision guidance | Show breakeven point where director (X7-4/X8-4) is cheaper than stacking fixed switches | MEDIUM | Breakeven: typically >64 ports per fabric makes director cost-effective |

#### Anti-Features for FC SAN

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Zone configuration generation | Engineers want config scripts, not just BOM | FC zoning is complex, vendor-specific, and error-prone to automate; wrong zones = data loss | Note model numbers; link to Brocade ZONE documentation |
| Real-time Fabric OS version checking | "Show me compatible FOS version" | Requires live internet call; breaks offline/air-gapped usage | Document tested FOS versions in release notes |
| Combined Ethernet + FC in same session | Power users want unified BOM | Ethernet and FC fabrics are designed independently; combining would require fundamentally different data model | Export separate BOMs, combine in procurement |
| N_Port ID Virtualization (NPIV) sizing | VM admin users want HBA virtualization count | NPIV changes port consumption dramatically and is highly workload-specific; sizing becomes unreliable | Document that NPIV requirements need manual adjustment |

---

### FC SAN Sizing Formulas (Reference for Implementation)

These are the sizing formulas derived from Broadcom SAN Design and Best Practices (Nov 2025).

**Per-fabric switch count (edge/access switches):**
```
hostPortsPerFabric = totalServers × hbaPortsPerServer
totalPortsNeeded = hostPortsPerFabric + storageTargetPortsPerFabric + islPortReservation
edgeSwitchCount = ceil(totalPortsNeeded / (switchMaxPorts × devicePortRatio))
```
Where `devicePortRatio` = fraction of ports used for devices vs ISLs (typical: 75–80% device, 20–25% ISL).

**ISL count per edge switch (to core/spine):**
```
islsPerEdgeSwitch = max(2, ceil(edgeSwitchCount / (coreSwitchCount × portsPerISLTrunk)))
```
Minimum 2 ISLs per trunk for link redundancy. Trunk members should span separate ASICs.

**FC oversubscription ratio:**
```
fcOversubscription = (totalHostPorts × hostLinkSpeed) / (totalISLBandwidth)
```
Broadcom recommendation: keep <= 7:1 for most workloads, <= 3:1 for high-IOPS (NVMe-oF).

**Dynamic POD licensed port count (affects BOM cost):
```
G710: base 8 ports, +8 per POD, max 24 (1U, 150W)
G720: base 24 ports, +8/+8/+8 SFP+ PODs + 1 SFP-DD POD = max 64 (1U)
G730: base 48 ports, +24 SFP+ PODs + SFP-DD PODs = max 128 (2U, 1100W PSU)
G820: base 24 ports, PODs to max 56 (1U, 650W, Gen8 128G)
X7-4: up to 256 ports, 4 blade slots, 9U chassis
X7-8: up to 512 ports, 8 blade slots, 14U chassis
X8-4: up to 192 ports, 4 blade slots (FC128-48 blades × 4), Gen8
X8-8: up to 384 ports, 8 blade slots (FC128-48 blades × 8), Gen8
7850: 24 FC ports (16 physical), 18 WAN ports (GE + QSFP), Gen7 extension
```

---

### Switch Positioning (GH #6)

#### Table Stakes for Switch Positioning

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| ToR / MoR / BoR position selector | Engineers specify switch placement to get accurate cable lengths; this is an input to BOM | LOW | Three-way selector per rack group (or global default): Top, Middle, Bottom |
| Cable length update on position change | Cable quantities in BOM change by type based on position; otherwise selector has no effect | MEDIUM | DAC feasibility and cable type recommendations change with distance |
| DAC distance advisory update | DAC cables are limited to ~5–10m passive / 15m active; MoR/BoR may exceed passive DAC range to top servers | LOW | Same constraint violation pattern as existing DAC_DISTANCE_ADVISORY |
| Rack elevation switch U position | Rack diagram must show switch at correct U position based ToR/MoR/BoR selection | MEDIUM | ToR: top 1–2U. MoR: ~23–25U in 42U rack. BoR: bottom 1–2U |

#### Switch Positioning: Cable Length Model

Cable lengths from switch to server depend on switch position in rack:

```
ToR (Top of Rack):
  - Switch at U42–U41 (42U rack)
  - Server at U1 (bottom) → cable run ≈ rack height = 1.8–2.1m
  - Server at U40 (near top) → cable run ≈ 0.3–0.5m
  - Average run ≈ 1–1.5m
  - DAC passive feasible for entire rack (< 5m)
  - Recommendation: 1m + 2m DAC cables sufficient

MoR (Middle of Rack):
  - Switch at U21–U23 (42U rack)
  - Server at U1 (bottom) → cable run ≈ 1.0–1.2m
  - Server at U42 (top) → cable run ≈ 1.0–1.2m
  - Maximum run ≈ 1.2m (half of ToR max distance)
  - All cables same length ≈ 2m; optimal for standardization
  - DAC passive easily feasible

BoR (Bottom of Rack):
  - Switch at U1–U2 (42U rack)
  - Server at U42 (top) → cable run ≈ 1.8–2.1m
  - Server at U2 (near bottom) → cable run ≈ 0.3–0.5m
  - Average run ≈ 1–1.5m (mirror image of ToR)
  - DAC passive feasible for entire rack (< 5m)
  - Similar to ToR but U-position placement reversed for hot aisle / power reasons
```

**DAC distance advisory trigger by position:**

| Position | Max in-rack run | Passive DAC (≤5m) | Active DAC (≤15m) | Fiber required |
|----------|-----------------|-------------------|--------------------|----------------|
| ToR | ~2.5m (slack) | Yes, always | — | Never for in-rack |
| MoR | ~1.5m (slack) | Yes, always | — | Never for in-rack |
| BoR | ~2.5m (slack) | Yes, always | — | Never for in-rack |

Note: DAC constraints for FC SAN become relevant for intra-rack FC patch cables (host HBA to ToR FC switch). FC uses optical SFP, not DAC — so DAC_DISTANCE_ADVISORY only applies to Ethernet mode.

#### Differentiators for Switch Positioning

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cable length breakdown by type | Show short/medium cable count split for MoR vs uniform long cables for ToR/BoR | LOW | BOM cable line items: "1m DAC × N, 2m DAC × M" instead of single line |
| Rack elevation U-position validation | Flag if switch U placement conflicts with server density (not enough U space) | LOW | Check: switch U position overlaps with populated server Us |
| Power distribution unit (PDU) conflict advisory | BoR placement risks cable clash with PDUs typically also at bottom; advisory text only | LOW | Text warning in constraint panel when BoR selected |
| Position-aware uplink cable length | Uplinks from leaf to spine run overhead trays; MoR adds ~0.5–1m overhead vs ToR | MEDIUM | Uplink cable length = rack-to-rack distance + delta based on position |

#### Anti-Features for Switch Positioning

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-rack individual positioning | "Each rack has different switch position" | Dramatically increases input surface area; most deployments standardize position across row | Single global position selector with note: "applies to all racks in design" |
| Exact cable-run length calculator | "Give me exact meters per cable" | Requires knowing rack row layout, aisle width, cable tray routing — inputs the tool doesn't have | Provide minimum cable length estimate + 15–20% slack recommendation note |
| Cable management arm (CMA) support | CMA adds ~0.3m to each run | Too granular for a sizing tool; adds maintenance burden | Note in UI: "Add 0.3m per cable for CMA if used" |

---

## New Features: v6.0 Milestone — Physical Planning

### Overview

v6.0 extends NetStack from "how many boxes and cables to order" to "what lengths to order and how much power to plan for." The four target features are:

1. **Cable length schedule** — per-link-type lengths from rack pitch, rack height, tray height, and switch position
2. **Adjacent vs non-adjacent rack toggle** — patch panel advisory when non-adjacent
3. **DAC distance advisory upgrade** — actual computed length replaces the static rack-count heuristic
4. **Power budget per rack** — sum of switch `maxPowerW` + server power estimate

All four features are pure additions to the domain layer. They do not modify any existing sizing formulas. The pattern is: new inputs → new engine sub-functions → new fields on existing BOM output type (or new BOM extension object).

---

### 1. Cable Length Schedule

#### What Engineers Expect

An engineer ordering cables for a 10-rack deployment must specify lengths at procurement time. Without estimated lengths, they either over-order (wasteful) or under-order (delays installation). Industry-standard cable SKU steps are fixed by vendors, so the tool must map computed distances to the next available SKU length.

#### Standard Cable SKU Lengths (HIGH confidence — vendor-confirmed)

| Type | Standard Available Lengths | Notes |
|------|---------------------------|-------|
| DAC passive (25G SFP28) | 1m, 1.5m, 2m, 2.5m, 3m | ≤2m: no FEC required; 2.5–3m: BASE-R FEC required; 4–5m: RS-FEC required |
| DAC passive (100G QSFP28) | 1m, 2m, 3m, 5m | 5m is the standard passive maximum (IEEE 802.3bj / SFF-8665) |
| DAC active (25G SFP28) | 5m, 7m | Signal conditioning electronics; more expensive |
| DAC active (100G QSFP28) | 7m | Active copper extending beyond passive 5m |
| AOC (25G SFP28) | 1m, 3m, 5m, 7m, 10m, 15m, 20m, 30m | OM3/OM4 fiber with integrated transceivers |
| AOC (100G QSFP28) | 1m, 3m, 5m, 7m, 10m, 15m, 20m, 30m | Same SKU ladder as 25G AOC |
| Fiber LC/LC (25G) | Custom or 1m, 2m, 3m, 5m, 7m, 10m | Requires SFP28 transceivers (already counted in BOM) |
| Fiber MPO (100G) | Custom or 1m, 2m, 3m, 5m, 7m, 10m | Requires QSFP28 transceivers (already counted in BOM) |

**Key rule for DAC advisory:** The 25G passive DAC limit is 3m at BASE-R FEC and 5m at RS-FEC. Practical recommendation for non-FEC deployments: keep ≤2m passive. For leaf-spine uplinks (100G), passive maximum is 5m — adequate for any in-rack or adjacent-rack run.

#### Physical Constants for Length Calculation (HIGH confidence — industry standards)

| Constant | Value | Source |
|----------|-------|--------|
| 1 rack unit (1U) height | 44.45 mm (1.75 in) | EIA-310 / IEC 60297 standard |
| Rack pitch (center-to-center spacing in a row) | 600 mm typical, 800 mm deep configurations | BICSI 002 / TIA-942 |
| Overhead cable tray height above top of rack | 300–600 mm typical | TIA-942, varies by facility |
| Slack factor (ordering buffer) | 15–20% | Industry convention; prevents short cables |
| Adjacent rack bonus run | +0.5m for horizontal hop | Practical estimation from community sources |

#### Length Calculation Formulas by Link Type

**Server-to-Leaf (in-rack, 25G SFP28 / 100G QSFP28):**
```
switchUPosition = switchPositioning == 'ToR' ? rackSizeU
                : switchPositioning == 'MoR' ? floor(rackSizeU / 2)
                : 1  // BoR

serverUPosition = 1  // worst-case: server furthest from switch

distanceU = abs(switchUPosition - serverUPosition)
rawLengthM = distanceU × 0.04445  // 1U = 44.45mm
minLengthM = rawLengthM + 0.3     // 0.3m add for connector slack / cable management
recommendedSKU = nextStandardSKU(minLengthM × 1.15)  // 15% slack buffer
```

For practical defaults (matching existing `recommendedCableLengthM` values):
- ToR in 42U rack → max raw = 41 × 0.04445 = 1.82m → round to 2m SKU
- MoR in 42U rack → max raw = 20 × 0.04445 = 0.89m → round to 1m SKU
- BoR in 42U rack → max raw = 41 × 0.04445 = 1.82m → round to 2m SKU

**Leaf-to-Spine (inter-rack, 100G QSFP28):**

Leaf switches are in server racks; spines are in a dedicated network rack. The run goes up through the overhead tray and back down:
```
verticalRun = (rackSizeU × 0.04445) + trayHeightM  // up from switch + up to tray
horizontalRun = rackPitchM × racksBetween           // lateral distance in tray
rawLengthM = verticalRun × 2 + horizontalRun        // up + across + down
recommendedSKU = nextStandardSKU(rawLengthM × 1.15)
```

For adjacent racks (racksBetween = 1, trayHeight = 0.4m, pitch = 0.6m):
- rawLength = (42 × 0.04445 + 0.4) × 2 + 0.6 = (2.27m) × 2 + 0.6m = 5.14m → 7m SKU (DAC or AOC)
- This is the critical boundary: adjacent leaf-to-spine runs on 100G DAC require the 5m passive maximum or 7m active DAC.

**VLT Interconnect (within a leaf pair, 100G QSFP28-DD):**

VLT cables connect two leaf switches that occupy adjacent U-slots in the same rack:
```
rawLengthM = 2 × 0.04445  // 2U separation between co-located leaf pair
recommendedSKU = 1m  // always; minimum available
```

**OOB Management (server-to-OOB, 1G RJ45):**

OOB switches are in the same rack as the leaves (per ADR-0014). Cable runs are identical in length to server-to-leaf runs. Use the same formula and the same SKU.

#### Cable Length Schedule Output Format (what engineers need)

Engineers expect a table, not a single number. The output should be a schedule grouped by link type:

```
Link Type          | Cable Type | Qty | Unit Length | SKU    | Total Length
-------------------|------------|-----|-------------|--------|-------------
Server → Leaf      | DAC 25G    | 120 | 2m          | SFP28  | 240m
Leaf → Spine       | AOC 100G   |  16 | 7m          | QSFP28 | 112m
VLT Interconnect   | DAC 100G   |  10 | 1m          | QSFP28-DD | 10m
Server → OOB       | Cat6 1G    | 120 | 2m          | RJ45   | 240m
```

This format is directly importable into a procurement spreadsheet. No competitor tool produces this output for Dell SONiC deployments.

#### Required New Inputs

| Input | Type | Required / Optional | Default | Notes |
|-------|------|---------------------|---------|-------|
| Rack pitch (center-to-center) | number (mm) | Optional | 600 | Affects leaf-to-spine inter-rack run; 600mm is typical |
| Cable tray height above rack top | number (mm) | Optional | 400 | Affects inter-rack vertical run |
| Racks adjacent? | boolean toggle | Required | true | See section 2 below |

#### Outputs Added to BOM

- `cableLengthSchedule`: array of `{ linkType, cableType, quantity, unitLengthM, recommendedSKU }` — new field on `NetworkBOM`
- `maxServerLeafLengthM`: computed number (replaces static `recommendedCableLengthM` with position-aware calculation)
- `maxLeafSpineLengthM`: computed number (new — inter-rack run length)

---

### 2. Adjacent vs Non-Adjacent Rack Mode

#### What Engineers Expect

When leaf racks and the spine/network rack are adjacent (physically next to each other in the row), direct DAC or short AOC cables are viable. When they are non-adjacent (separated by other racks or in a different row), the cable run is longer and potentially exceeds DAC passive limits — triggering a recommendation to use patch panels and fiber structured cabling instead.

This is a common real-world decision point. Engineers must know:
- Whether their proposed cable type is still viable given the rack layout
- Whether to include patch panels in the BOM

#### Feature Definition

**Toggle:** "Racks are adjacent / non-adjacent" (boolean, default: adjacent = true)

**Adjacent mode (default):**
- No patch panel advisory
- Leaf-to-spine length calculated from rack pitch (600mm hop)
- DAC feasibility check: 100G DAC passive max 5m; if computed length > 5m, suggest AOC or active DAC

**Non-adjacent mode:**
- Patch panel advisory fires as a new `ConstraintViolation` type: `PATCH_PANEL_RECOMMENDED`
- Estimated leaf-to-spine length increases: `racksBetween × rackPitch + overhead runs`
- For non-adjacent, the computed distance very often exceeds passive DAC limits → always recommend fiber or AOC
- Advisory text: "Inter-rack cable runs exceed passive DAC range. Consider a patch panel and structured fiber cabling."

#### Non-Adjacent Length Model

```
// Non-adjacent: racks separated by N other racks
racksBetween = input.racksBetween ?? 2  // default assumption: 2 racks between leaf and spine
horizontalRun = racksBetween × rackPitchM
rawLengthM = (rackSizeU × 0.04445 + trayHeightM) × 2 + horizontalRun
```

For racksBetween=2, rackPitch=0.6m, trayHeight=0.4m, 42U rack:
- rawLength = (1.87m + 0.4m) × 2 + 1.2m = 4.54m + 1.2m = 5.74m → exceeds 5m passive DAC, must use AOC or active DAC

#### Patch Panel Advisory

| Condition | Advisory |
|-----------|----------|
| Non-adjacent AND cableType=DAC AND computedLength > 5m | `PATCH_PANEL_RECOMMENDED` violation + "Switch to AOC or structured fiber with patch panels" |
| Non-adjacent AND cableType=AOC | No violation; AOC supports up to 30m |
| Non-adjacent AND cableType=fiber | No violation; fiber has no practical distance limit for this use case |

#### Complexity Assessment

**LOW-MEDIUM.** The boolean toggle is a one-line input addition to `SizingInputSchema`. The violation is a new member of the `ConstraintViolationSchema` discriminated union. The length formula is a small pure function. The UI advisory is a new violation renderer.

#### Dependency: existing DAC_DISTANCE_ADVISORY

The existing `DAC_DISTANCE_ADVISORY` fires when `cableType === 'DAC' && racks > 8`. This was a proxy heuristic for "many racks probably means non-adjacent." After v6.0:
- `DAC_DISTANCE_ADVISORY` gets enhanced with `computedLengthM` field (see section 3 below)
- `PATCH_PANEL_RECOMMENDED` replaces the proximity logic for the explicit non-adjacent case
- Both can coexist: `DAC_DISTANCE_ADVISORY` is for inter-rack length; `PATCH_PANEL_RECOMMENDED` is for structural cable-type advice

---

### 3. DAC Distance Advisory with Computed Length

#### Current State

`DAC_DISTANCE_ADVISORY` fires when `cableType === 'DAC' && racks > 8`. The violation payload contains only `rackCount` and `cableType`. No actual distance is computed. The advisory is purely a heuristic ("many racks probably means long cables").

#### What Engineers Need

When the advisory fires, engineers want to know *why* — specifically, what the estimated cable length is, and whether it actually exceeds the DAC passive limit. A violation that says "8 racks → DAC advisory" is less actionable than "estimated leaf-to-spine run = 6.2m, exceeds 5m passive DAC maximum."

#### Enhancement

Extend `DAC_DISTANCE_ADVISORY` in `ConstraintViolationSchema`:

```
Current: { code: 'DAC_DISTANCE_ADVISORY', rackCount: number, cableType: 'DAC' }

New:     { code: 'DAC_DISTANCE_ADVISORY',
           rackCount: number,
           cableType: 'DAC',
           estimatedLeafSpineLengthM: number,    // computed from rack layout inputs
           dacPassiveLimitM: number,              // 5m for 100G QSFP28
           exceedsPassiveLimit: boolean }
```

The trigger condition changes from `racks > 8` to `estimatedLeafSpineLengthM > dacPassiveLimitM`. This is strictly more accurate: a 20-rack deployment with an adjacent spine rack might not exceed 5m; a 4-rack deployment with a distant spine rack might.

#### Fallback for Missing Physical Inputs

If `rackPitch` and `trayHeight` are not provided (optional inputs), the engine falls back to a geometry estimate:
```
estimatedLeafSpineLengthM = (rackSizeU × 0.04445 + 0.4) × 2 + 0.6  // default tray+pitch
```
This produces the same ballpark as the current racks > 8 heuristic but with a real distance value.

#### Complexity

**LOW.** Schema field addition + one computed value + trigger condition change. No structural changes to BOM type.

---

### 4. Power Budget Per Rack

#### What Engineers Expect

Data center engineers always compute power per rack before provisioning PDUs and UPS. A sizing tool that does not output power estimates forces a manual spreadsheet step.

Standard industry inputs for power budgeting:
- Switch `maxPowerW` (already in hardware catalog for all models)
- Server power estimate (user-provided W/server, or a category choice: low/mid/high)
- PUE factor (optional; default 1.0 for IT load only, or 1.5 for facility overhead)

Standard outputs:
- Total IT power per rack (W and kW)
- Total IT power for the deployment (kW)
- Circuit sizing hint: "Each rack requires a X-amp circuit at Y volts"

#### Industry Reference Power Ranges (MEDIUM confidence — multiple web sources)

| Server Category | Typical Power per Server |
|-----------------|-------------------------|
| 1U entry-level | 150–300W |
| 1U standard (dual CPU) | 300–500W |
| 2U high-memory | 500–800W |
| GPU/AI accelerated | 1000–3000W+ |

For planning purposes, a configurable per-server watt estimate (default 300W for 1U servers) covers the vast majority of use cases. Avoid a preset "high/mid/low" tier selector — a simple number input is more transparent and procurement-ready.

#### Power Formula Per Rack

```
switchPowerW = leafPower × 2  // two leaf switches per rack (ToR/MoR/BoR)
             + oobPower × oobSwitchesPerRack
             // Note: spine and border leaf power is on the network rack, not server racks

serverPowerW = serverCount × wattsPerServer  // per rack, varies by rack config

totalRackPowerW = switchPowerW + serverPowerW
totalRackPowerKW = totalRackPowerW / 1000

// Circuit sizing (single-phase 208V or 240V):
ampereRequired = totalRackPowerW / supplyVoltage  // default 208V
```

#### Required New Inputs

| Input | Type | Required / Optional | Default | Notes |
|-------|------|---------------------|---------|-------|
| Watts per server | number | Required | 300 | User-entered; no preset tiers; range 50–5000W |
| Supply voltage | enum: 110V, 208V, 240V | Optional | 208V | Only used for ampere calculation |

#### Outputs Added to BOM

- `rackPowerBudgets`: array of `{ rackIndex, serverCount, switchPowerW, serverPowerW, totalPowerW, totalPowerKW, ampereRequired208V }` — one entry per server rack
- `networkRackPowerW`: aggregate spine + border leaf power (separate from server racks)
- `totalDeploymentPowerKW`: sum of all rack power budgets

#### What to Show in the UI

Engineers care about:
1. Per-rack power in kW and amps — for PDU provisioning
2. Total deployment power in kW — for facility planning
3. A flag when a rack exceeds typical density thresholds (e.g., >10 kW/rack = high density, may need dedicated cooling)

A simple table with one row per rack covers items 1 and 2. A `HIGH_DENSITY_RACK` advisory covers item 3 if it fires.

#### Complexity Assessment

**LOW-MEDIUM.** New input field (`wattsPerServer`) added to `SizingInputSchema`. New computation loop over the rack array. New output fields on `NetworkBOM`. No changes to existing formulas. UI requires a new power panel or extension to the existing BOM panel.

---

### Feature Dependencies (v6.0)

```
[Physical Planning Inputs]
  ├── rackPitch (mm)            -- optional, default 600
  ├── trayHeight (mm)           -- optional, default 400
  ├── racksAdjacent (boolean)   -- required, default true
  └── wattsPerServer (W)        -- required, default 300

[Cable Length Engine (pure function)]
  ├── depends on: switchPositioning (existing)
  ├── depends on: rackSize (existing)
  ├── depends on: cableType (existing)
  ├── depends on: rackPitch (new)
  ├── depends on: trayHeight (new)
  └── produces:
       ├── cableLengthSchedule[]  (new BOM field)
       ├── maxServerLeafLengthM   (replaces recommendedCableLengthM)
       └── maxLeafSpineLengthM    (new)

[DAC_DISTANCE_ADVISORY upgrade]
  ├── depends on: maxLeafSpineLengthM (computed above)
  └── adds: estimatedLeafSpineLengthM, dacPassiveLimitM, exceedsPassiveLimit

[PATCH_PANEL_RECOMMENDED advisory]
  ├── depends on: racksAdjacent (new input)
  ├── depends on: cableType (existing)
  ├── depends on: maxLeafSpineLengthM (computed above)
  └── fires when: non-adjacent AND DAC AND length > 5m

[Power Budget Engine (pure function)]
  ├── depends on: SWITCH_CATALOG[leafModel].maxPowerW (existing)
  ├── depends on: SWITCH_CATALOG[oobModel].maxPowerW (existing)
  ├── depends on: racks[] (existing)
  ├── depends on: wattsPerServer (new)
  └── produces:
       ├── rackPowerBudgets[]     (new BOM field)
       ├── networkRackPowerW      (new BOM field)
       └── totalDeploymentPowerKW (new BOM field)

[Export (CSV/PDF)]
  └── extended with: cable length schedule section + power budget section
```

---

### Table Stakes vs Differentiators for v6.0

#### Table Stakes

| Feature | Why Expected | Complexity | Depends On |
|---------|--------------|------------|------------|
| Per-link cable length estimate | Engineers order cables with specific lengths; units without length output are incomplete | MEDIUM | switchPositioning (existing), rackSize (existing), new rackPitch input |
| DAC advisory with computed distance | Current advisory fires on rack count heuristic; engineers expect distance in the message | LOW | new length formula |
| Power per rack in Watts | Standard deliverable for PDU planning; every comparable tool includes it | LOW | maxPowerW in existing catalog, new wattsPerServer input |
| Total deployment power kW | Facility engineers need aggregate; per-rack alone is insufficient | LOW | rackPowerBudgets sum |

#### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cable length schedule by link type and SKU | No competitor tool outputs a procurement-ready cable schedule for Dell SONiC | MEDIUM | Maps computed lengths to standard vendor SKU steps |
| Adjacent vs non-adjacent rack mode with patch panel advisory | Surfaces real-world deployment constraint automatically | LOW | New boolean input + new violation type |
| Ampere per rack at 208V | PDU selection hint; engineers use this directly for circuit planning | LOW | Derived from total rack power / voltage |
| High-density rack advisory (>10kW) | Flags racks that need additional cooling consideration | LOW | New violation type: HIGH_DENSITY_RACK |

#### Anti-Features for v6.0

| Feature | Why Problematic | Alternative |
|---------|-----------------|-------------|
| Exact-to-the-centimeter cable length calculator | Requires room layout (CAD), raised floor maps, aisle width — out of scope for a sizing tool | Provide minimum + 15% buffer; recommend site survey for exact runs |
| Cable routing visualization (3D or floor plan) | Full DCIM product scope; years of development | Export the length schedule; let the site DCIM tool handle routing |
| PUE-adjusted power cost calculator | Pricing and PUE are facility-specific; baking in assumptions breaks trust | Provide raw IT power output; note "multiply by PUE for total facility load" |
| Cooling estimate (BTU/h per rack) | BTU = power × 3.412; trivial formula but opens cooling system design conversation that is out of scope | Note in UI: "1 kW IT load ≈ 3412 BTU/h; consult cooling vendor" |
| Weight per rack | Requires server weight inputs; no standard default; floor load analysis is structural engineering | Out of scope for v6.0; listed as v7.0+ in PROJECT.md |
| Multi-row cable tray layout | Requires knowing row topology, not just rack count | Defer to v7.0+ multi-pod support |

---

## Feature Dependencies (Full — all milestones)

```
[Mode Selector: Ethernet vs FC]
    ├──selects──> [Ethernet Mode: existing features unchanged]
    └──selects──> [FC SAN Mode]
                      └──requires──> [FC Switch Catalog: Brocade Gen7/Gen8 specs]
                                         └──feeds──> [FC Sizing Engine: calculateFCSAN(input) => FCBOM]
                                                          ├──requires──> [Dual Fabric Calculator (A + B)]
                                                          ├──requires──> [ISL Calculator]
                                                          ├──requires──> [POD License Calculator]
                                                          └──requires──> [FC ConstraintViolation types]

[FC Sizing Engine output]
    ├──feeds──> [FC BOM Panel]
    ├──feeds──> [FC Dual-Fabric Topology Diagram]
    ├──feeds──> [FC Oversubscription Display]
    └──feeds──> [FC Violation Alerts]

[FC BOM Panel]
    ├──enables──> [CSV Export] (extended with FC line items)
    └──enables──> [PDF Export] (extended with FC section)

[Switch Positioning Selector: ToR / MoR / BoR]
    ├──enhances──> [Rack Elevation] (switch U-position changes)
    ├──modifies──> [Cable Length Calculation] (in Ethernet mode)
    └──triggers──> [DAC Distance Advisory] (position-dependent threshold update)

[Existing Sizing Engine (Ethernet)]
    └──unchanged; positioning selector feeds cable-length adjustment only

[Existing Rack Elevation]
    └──enhanced──> Switch rendered at correct U from position selector

[v6.0 Physical Planning Inputs]
    ├──rackPitch, trayHeight ──feeds──> [Cable Length Engine]
    ├──racksAdjacent ──feeds──> [PATCH_PANEL_RECOMMENDED violation]
    └──wattsPerServer ──feeds──> [Power Budget Engine]

[Cable Length Engine]
    ├──uses──> switchPositioning, rackSize, cableType (all existing)
    ├──produces──> cableLengthSchedule (new BOM field)
    └──produces──> maxLeafSpineLengthM ──feeds──> [DAC_DISTANCE_ADVISORY upgrade]

[Power Budget Engine]
    ├──uses──> SWITCH_CATALOG[model].maxPowerW (existing catalog field)
    ├──uses──> racks[] (existing input)
    └──produces──> rackPowerBudgets, networkRackPowerW, totalDeploymentPowerKW (new BOM fields)
```

### Dependency Notes (v6.0 Additions)

- **Cable length engine is additive:** New pure sub-function, no changes to `calculateBOM` formula logic.
- **`recommendedCableLengthM` is superseded:** The existing static map `{ToR:2, MoR:1, BoR:2}` becomes the fallback; the new computed value replaces it when physical layout inputs are provided.
- **`DAC_DISTANCE_ADVISORY` schema is extended, not replaced:** New optional fields on the existing discriminated union member. Older consumers that only read `rackCount` and `cableType` continue to work.
- **`PATCH_PANEL_RECOMMENDED` is a new violation member:** Added to the discriminated union alongside existing violation types.
- **Power budget engine has no side effects:** Pure computation over the existing rack array and catalog. FC power budgets are not in scope for v6.0 (FC power per rack would require FC switch power data and a separate FC physical layout model).
- **Export extensions are additive:** New sections appended to existing CSV/PDF templates; no changes to existing section layout.

---

## MVP Definition for v6.0

### Launch With

**Cable Length Schedule:**
- [ ] New inputs: `rackPitch` (optional, default 600mm), `trayHeight` (optional, default 400mm), `racksAdjacent` (required, default true)
- [ ] Cable length engine: compute `maxServerLeafLengthM` and `maxLeafSpineLengthM` from rack geometry
- [ ] SKU mapping function: `nextStandardSKU(rawLengthM)` → nearest standard cable length from vendor SKU ladder
- [ ] `cableLengthSchedule` output array on `NetworkBOM`
- [ ] BOM panel: new "Cable Length Schedule" section showing table by link type

**DAC Advisory Upgrade:**
- [ ] `DAC_DISTANCE_ADVISORY` schema extended with `estimatedLeafSpineLengthM`, `dacPassiveLimitM`, `exceedsPassiveLimit`
- [ ] Advisory trigger changes from `racks > 8` heuristic to `estimatedLeafSpineLengthM > dacPassiveLimitM`
- [ ] UI violation card shows computed distance and limit

**Adjacent/Non-Adjacent Toggle:**
- [ ] `racksAdjacent` boolean input in `SizingInputSchema`
- [ ] `PATCH_PANEL_RECOMMENDED` added to `ConstraintViolationSchema`
- [ ] Non-adjacent length formula uses `racksBetween` estimate (default 2)

**Power Budget:**
- [ ] `wattsPerServer` number input in `SizingInputSchema` (default 300)
- [ ] Power budget engine computing `rackPowerBudgets[]` and `totalDeploymentPowerKW`
- [ ] BOM panel or dedicated power panel showing per-rack and total power
- [ ] `HIGH_DENSITY_RACK` advisory fires when any rack > 10kW

### Add After Validation (v6.x)

- [ ] `supplyVoltage` input (110V/208V/240V) for per-rack ampere calculation
- [ ] Cable length schedule in CSV/PDF export
- [ ] Power budget in CSV/PDF export
- [ ] Per-link-type cable quantity breakdown split by SKU length (e.g., "120 × 2m, 40 × 1m" instead of single count)

---

## Prioritization Matrix for v6.0

| Feature | User Value | Implementation Cost | Priority | Notes |
|---------|------------|---------------------|----------|-------|
| Per-link cable length estimate (server-leaf) | HIGH | LOW | P1 | Uses existing switchPositioning + rackSize |
| Per-link cable length estimate (leaf-spine) | HIGH | MEDIUM | P1 | Requires new rackPitch/trayHeight inputs |
| DAC advisory with computed distance | HIGH | LOW | P1 | Schema extension only |
| Adjacent/non-adjacent toggle | HIGH | LOW | P1 | Boolean input + new violation type |
| Power per rack (W and kW) | HIGH | LOW | P1 | maxPowerW already in catalog |
| Total deployment power (kW) | HIGH | LOW | P1 | Sum of rack power budgets |
| SKU mapping (next standard length) | MEDIUM | LOW | P1 | Small lookup function |
| Cable length schedule table in BOM panel | MEDIUM | LOW | P1 | New UI section |
| HIGH_DENSITY_RACK advisory | MEDIUM | LOW | P1 | Simple threshold check |
| Ampere per rack (208V) | MEDIUM | LOW | P2 | Derived from power / voltage |
| Cable length schedule in CSV/PDF | MEDIUM | MEDIUM | P2 | Export template extension |
| Power budget in CSV/PDF | MEDIUM | MEDIUM | P2 | Export template extension |
| Per-link cable count split by SKU | LOW | MEDIUM | P3 | Nice detail, not blocking |
| FC power budget | LOW | HIGH | P3 | FC physical layout not yet modeled |

**Priority key:**
- P1: Must have for v6.0 launch
- P2: Should have, add in v6.x
- P3: Future consideration

---

## DAC Physical Limits by Speed (Verified)

| Speed | Form Factor | Passive Max | Active Max | FEC Required? |
|-------|------------|-------------|------------|---------------|
| 10G | SFP+ DAC | 10m | 15m | No FEC for ≤7m passive |
| 25G | SFP28 DAC | 3m (BASE-R FEC) / 5m (RS-FEC) | 7m | BASE-R for 2.5–3m; RS-FEC for 4–5m |
| 40G | QSFP+ DAC | 7m | 10m | — |
| 100G | QSFP28 DAC | 5m | 7m | RS-FEC typically required |
| 400G | QSFP-DD DAC | 3m | 5m | RS-FEC required |

**For NetStack v6.0:**
- Server-leaf links are 25G SFP28 → passive DAC limit = 3m (with FEC) or 2m (without FEC). For in-rack ToR/MoR/BoR, this is always satisfied.
- Leaf-spine links are 100G QSFP28 → passive DAC limit = 5m. This is the critical threshold for the adjacent rack scenario.
- If computed leaf-to-spine run exceeds 5m (passive) → `DAC_DISTANCE_ADVISORY` fires with `exceedsPassiveLimit: true`; recommendation: switch to AOC or active DAC.

**Confidence: HIGH** — confirmed across Cisco datasheets, FS.com specifications, Mellanox/NVIDIA product data, and IEEE 802.3by / 802.3bj standard references.

---

## Sources

**v6.0 Physical Planning:**
- DAC cable length limits by speed: https://www.walsun.com/knowledge/What-is-the-maximum-length-of-SFP-DAC-cable_680.html
- 25G SFP28 FEC requirements at 2.5–3m: Cisco 25GBASE SFP28 Modules Data Sheet: https://www.cisco.com/c/en/us/products/collateral/interfaces-modules/transceiver-modules/datasheet-c78-736950.html
- 100G QSFP28 passive DAC 5m maximum (IEEE 802.3bj / SFF-8665): https://prolabs.com/msa-qsfp28-100g-dac-5m-nc-100gbase-cu-qsfp28-qsfp28-dac-passive-twinax-5m
- DAC vs AOC standard lengths: https://community.fs.com/article/guide-to-10g-dac-and-aoc-cables.html
- Rack unit height (1U = 44.45mm): EIA-310-E standard; https://en.wikipedia.org/wiki/Rack_unit
- Cable tray overhead clearance (300mm min): TIA-942; referenced in https://guidelines.risa.gov.rw/books/data-center-and-cloud-services-directives/page/overhead-cable-trays
- Typical cable slack factor (15–20%): industry convention; https://www.tek-tips.com/threads/patch-cable-length-estimator.1603827/
- Server power ranges (150–800W): https://www.amcoenclosures.com/how-to-calculate-your-average-server-rack-power-consumption/
- Rack power density (4–15 kW/rack typical): https://northernlink.com/guide-to-calculating-power-consumption-costs-per-rack-in-data-centers/
- Patch panel best practices for non-adjacent racks: https://community.cisco.com/t5/other-data-center-subjects/inter-rack-patching-advice/td-p/1659038
- ToR/MoR/BoR cable length differences: https://www.anfkomftth.com/data-center-cabling-eor-mor-or-tor/
- Rack pitch / spacing (600mm typical): BICSI 002 / TIA-942; referenced in https://www.cobtel.com/info/server-room-cabling-cable-management-standards-103374428.html

**Brocade Gen7 switches (v2.0 research — retained):**
- Brocade Gen7 Switch FAQ (Broadcom, Jan 2025): https://docs.broadcom.com/doc/Gen7-Switch-FAQ
- Brocade G720 Product Brief: https://docs.broadcom.com/doc/G720-Switch-PB
- Brocade G730 Technical Specifications: https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g730-switch/1-0/Brocade-G730-Switch-Technical-Specifications.html
- Broadcom SAN Design and Best Practices (Nov 2025): https://docs.broadcom.com/doc/53-1004781

**Previously referenced (v1.0 / v2.0 research):**
- Cisco Nexus Hyperfabric Getting Started Guide: https://www.cisco.com/c/en/us/td/docs/dcn/hyperfabric/software/cisco-nexus-hyperfabric-getting-started.html
- Oversubscription in Leaf-Spine (FS.com): https://www.fs.com/blog/a-simplified-guide-to-traffic-oversubscription-in-network-systems-1193.html

---

*Feature research for: NetStack v6.0 — Physical Planning (cable length schedule, DAC advisory upgrade, power budget)*
*Updated: 2026-03-19*

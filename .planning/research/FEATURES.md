# Feature Research

**Domain:** Network sizing calculator / infrastructure BOM generator (Dell Leaf-Spine + SONiC + Brocade FC SAN)
**Researched:** 2026-03-18 (milestone v2.0 update — FC SAN + switch positioning)
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

## Feature Dependencies

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
```

### Dependency Notes

- **Mode selector is a root input:** FC and Ethernet modes have completely different input schemas, sizing engines, and output structures. They share only the hardware catalog pattern, export functions, and i18n.
- **FC Sizing Engine is additive:** A new pure function `calculateFCSAN(input: FCSizingInput): FCBOM` alongside the existing `calculateBOM`. No changes to Ethernet engine.
- **FC Switch Catalog is a new catalog constant:** `FC_SWITCH_CATALOG` alongside existing `SWITCH_CATALOG`. Same extensible pattern.
- **Switch positioning is a modifier in Ethernet mode only:** Does not apply to FC mode. FC SAN uses optical patch cables that are not position-sensitive.
- **Rack elevation is enhanced, not rewritten:** ToR/MoR/BoR changes the U position at which the switch SVG block is rendered. Existing drag-to-reorder may conflict with fixed-position constraint — investigate.
- **Export is extended, not duplicated:** CSV and PDF exports add conditional FC sections when FC mode is active. No separate export button needed.
- **FC ConstraintViolation types extend existing discriminated union:** New members: `FC_PORT_SATURATION`, `FC_OVERSUBSCRIPTION_EXCEEDED`, `FC_FABRIC_TOO_LARGE`, `FC_ISL_UNDERPROVISIONED`.

---

## MVP Definition for v2.0

### Launch With (v2.0)

Minimum viable product for the FC SAN + switch positioning milestone.

**FC SAN (GH #1):**
- [ ] Mode selector (Ethernet / FC) — root of feature set
- [ ] Brocade FC switch catalog (Gen7: G710, G720, G730, X7-4, X7-8; Gen8: G820, X8-4, X8-8) — sizing foundation
- [ ] FC input form (HBA ports/server, storage target ports, switch model selector) — entry point
- [ ] Dual-fabric sizing engine (per-fabric switch count, ISL count, port utilization) — core value
- [ ] FC BOM panel with oversubscription ratio and Dynamic POD licensing note — primary output
- [ ] FC dual-fabric topology diagram (two side-by-side fabric views) — visual validation
- [ ] FC constraint violations (port saturation, oversubscription >7:1) — correctness guard
- [ ] FC columns in CSV and PDF export — procurement handoff

**Switch Positioning (GH #6):**
- [ ] ToR / MoR / BoR selector — root input
- [ ] Rack elevation switch U position update (switch moves to correct U) — visual correctness
- [ ] Cable length advisory update in BOM notes — key value of the feature
- [ ] DAC distance advisory update for position — re-validates existing constraint

### Add After Validation (v2.x)

- [ ] 7850 extension switch sizing — niche use case; validate demand first
- [ ] Gen8 vs Gen7 recommendation engine — complex heuristic; defer until workload input model is defined
- [ ] Director vs fixed switch cost breakeven hint — requires pricing data inputs
- [ ] Per-rack cable length breakdown (1m + 2m split) — nice detail; not blocking

### Future Consideration (v3.0+)

- [ ] Combined FC + Ethernet multi-fabric session — requires unified data model redesign
- [ ] NPIV virtualization sizing guidance — too workload-specific for deterministic sizing
- [ ] ISL trunking ASIC placement advisory — deep platform knowledge needed; low ROI for sizing tool
- [ ] FC zone count estimation — would require zone membership inputs; significant scope increase

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Mode selector (Eth/FC) | HIGH | LOW | P1 |
| FC switch catalog (9 models) | HIGH | LOW | P1 |
| FC sizing engine (dual fabric) | HIGH | MEDIUM | P1 |
| FC input form | HIGH | LOW | P1 |
| FC BOM panel | HIGH | MEDIUM | P1 |
| FC topology diagram (dual fabric) | HIGH | HIGH | P1 |
| FC constraint violations | HIGH | LOW | P1 |
| FC CSV/PDF export | HIGH | LOW | P1 |
| Switch positioning selector (ToR/MoR/BoR) | HIGH | LOW | P1 |
| Rack elevation switch U position | MEDIUM | MEDIUM | P1 |
| Cable length advisory for position | MEDIUM | LOW | P1 |
| DAC advisory update for position | LOW | LOW | P1 |
| 7850 extension switch sizing | MEDIUM | HIGH | P2 |
| Gen8 vs Gen7 recommendation | MEDIUM | MEDIUM | P2 |
| Director vs fixed switch guidance | MEDIUM | MEDIUM | P2 |
| Per-rack cable length breakdown | LOW | MEDIUM | P3 |
| ISL trunking ASIC advisory | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for v2.0 launch
- P2: Should have, add when possible in v2.x
- P3: Nice to have, future consideration

---

## Brocade FC Switch Catalog (Verified Specifications)

### Gen7 (64G) — Production

| Model | Max Ports | Base Ports | POD Increments | Form Factor | Power | Role |
|-------|-----------|------------|----------------|-------------|-------|------|
| G710 | 24 | 8 | +8 (× 2 PODs) | 1U | 150W | Entry leaf |
| G720 | 64 | 24 | +8/+8/+8 SFP+ + 1 SFP-DD | 1U | ~500W est. | Mid-range leaf |
| G730 | 128 | 48 | +24 SFP+ + SFP-DD PODs | 2U | 1100W (PSU max) | Core/director-class |
| X7-4 | 256 | — | 4 blade slots (64-port blades) | 9U chassis | ~2000W est. | Mid director |
| X7-8 | 512 | — | 8 blade slots (64-port blades) | 14U chassis | ~4000W est. | Large director |
| 7850 | 24 FC + 18 WAN | — | Not applicable | 1U | ~200W est. | Extension/gateway |

### Gen8 (128G) — Current/Latest (announced Nov 2025)

| Model | Max Ports | Base Ports | POD Increments | Form Factor | Power | Role |
|-------|-----------|------------|----------------|-------------|-------|------|
| G820 | 56 | 24 | PODs to 56 | 1U | 650W | Leaf/access |
| X8-4 | 192 | — | 4 blade slots (FC128-48 blades × 4) | ~9U chassis | ~2000W est. | Mid director |
| X8-8 | 384 | — | 8 blade slots (FC128-48 blades × 8) | ~14U chassis | ~4000W est. | Large director |

**Note:** G820, X8-4, X8-8 are newly announced (Nov 2025, availability confirmed 2026). G820 port blade supports 128G, 64G, 32G, 16G autosensing. X8-4/X8-8 use FC128-48 blades (48 ports/blade). Power figures marked est. need verification from final datasheets.

---

## Competitor Feature Analysis (Updated)

| Feature | Cisco Nexus Hyperfabric | Nutanix Sizer | Dell EIPT | Juniper Apstra | NetStack v1.1 | NetStack v2.0 |
|---------|------------------------|---------------|-----------|----------------|---------------|---------------|
| Ethernet leaf-spine sizing | Yes | No | Yes | Yes | Yes | Yes |
| FC SAN sizing | No | No | No | No | No | Yes (new) |
| Dual-fabric FC topology | No | No | No | No | No | Yes (new) |
| Brocade switch catalog | No | No | No | No | No | Yes (9 models, new) |
| Switch positioning (ToR/MoR/BoR) | No | No | No | No | No | Yes (new) |
| Position-aware cable lengths | No | No | No | No | No | Yes (new) |
| BOM generation | Yes | Yes | Yes | No | Yes | Yes (extended) |
| Topology diagram | Yes | Rack only | Canvas | Yes | Yes | Yes (extended) |
| Rack elevation | Partial | Yes | Limited | Partial | Yes | Yes (enhanced) |
| Export CSV/PDF | Yes | Yes | Limited | No | Yes | Yes |
| Dell SONiC specific | No | No | Power/cooling | No | Yes | Yes |

**Key differentiator for v2.0:** NetStack becomes the only tool sizing both Dell SONiC Ethernet leaf-spine and Brocade FC SAN from a single interface. No competitor covers this combination. FC SAN + Ethernet sizing in one browser-native, offline-capable, export-ready tool is a strong differentiator for Dell infrastructure architects.

---

## Sources

**Brocade Gen7 switches:**
- Brocade Gen7 Switch FAQ (Broadcom, Jan 2025): https://docs.broadcom.com/doc/Gen7-Switch-FAQ
- Brocade G710 Technical Specifications: https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g710-switch/1-0/technical-specifications-g710.html
- Brocade G720 Product Brief: https://docs.broadcom.com/doc/G720-Switch-PB
- Brocade G730 Technical Specifications: https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g730-switch/1-0/Brocade-G730-Switch-Technical-Specifications.html
- Brocade X7-4/X7-8 FAQ (Broadcom, Mar 2024): https://docs.broadcom.com/doc/X7-Director-FAQ
- Brocade X7-8/X7-4 Lenovo Press Product Guide: https://lenovopress.lenovo.com/lp1587-lenovo-thinksystem-x7-8-and-x7-4-fc-san-directors
- Brocade 7850 Extension Switch Hardware Features: https://techdocs.broadcom.com/us/en/fibre-channel-networking/extension/7850-extension-switch/1-0/device-overview/brocade-7850-hardware-features.html

**Brocade Gen8 switches:**
- Brocade G820 Device Overview: https://techdocs.broadcom.com/us/en/fibre-channel-networking/switches/g820-switch/1-0/device-overview-g820.html
- Brocade G820 Product Brief: https://docs.broadcom.com/doc/G820-Switch-PB
- X8-4/X8-8 Lenovo Press Product Guide: https://lenovopress.lenovo.com/lp2271-lenovo-x8-4-and-x8-8-gen-8-fc-directors
- Broadcom Gen8 Launch Announcement (Nov 2025): https://investors.broadcom.com/news-releases/news-release-details/broadcom-introduces-worlds-first-quantum-safe-gen-8-128g-san

**FC SAN sizing and best practices:**
- Broadcom SAN Design and Best Practices (Nov 2025): https://docs.broadcom.com/doc/53-1004781
- Broadcom Fan-In/Fan-Out Ratio (MAPS 9.1.x): https://techdocs.broadcom.com/us/en/fibre-channel-networking/fabric-os/fabric-os-maps/9-1-x/
- TechTarget oversubscription definition: https://www.techtarget.com/searchstorage/definition/oversubscription
- Broadcom Community oversubscription calculation: https://community.broadcom.com/t5/Fibre-Channel-SAN-Forums/Oversubscription-Calculation/td-p/17392

**Switch positioning:**
- Virtual Wiki — ToR switch placement in rack: https://www.v-wiki.net/top-of-rack-switch-placement-in-a-rack-not-at-the-top/
- dc.mynetworkinsights — ToR/MoR/EoR architecture: https://dc.mynetworkinsights.com/data-center-switching-centralized-eor-mor-top-of-rack-tor/
- Cisco Community — TOR/EOR/BOR/MOR definitions: https://community.cisco.com/t5/data-center-switches/what-is-tor-eor-bor-mor/td-p/4990184
- DAC cable deployment considerations (FS.com): https://www.fs.com/blog/sfp-dac-twinax-cable-deployment-considerations-2976.html
- ANFKOM datacenter cabling guide: https://www.anfkomftth.com/data-center-cabling-eor-mor-or-tor/

**Previously referenced (v1.0 research):**
- Cisco Nexus Hyperfabric Getting Started Guide: https://www.cisco.com/c/en/us/td/docs/dcn/hyperfabric/software/cisco-nexus-hyperfabric-getting-started.html
- Nutanix Sizer Product Page: https://www.nutanix.com/products/sizer
- Dell EIPT Landing Page: https://www.dell.com/calc
- Oversubscription in Leaf-Spine (FS.com): https://www.fs.com/blog/a-simplified-guide-to-traffic-oversubscription-in-network-systems-1193.html

---

*Feature research for: NetStack v2.0 — Brocade FC SAN + Switch Positioning*
*Updated: 2026-03-18*

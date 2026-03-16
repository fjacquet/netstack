# Feature Research

**Domain:** Network sizing calculator / infrastructure BOM generator (Dell Leaf-Spine + SONiC)
**Researched:** 2026-03-16
**Confidence:** MEDIUM — Competitor tools exist but vary widely. Cisco Nexus Hyperfabric and Nutanix Sizer provided the highest-quality comparisons. Dell EIPT and Juniper Apstra confirmed adjacent patterns.

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

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Port saturation alerts | Proactive warnings when OOB switch hits >48 ports or spine runs out of leaf-facing ports — Cisco Nexus Hyperfabric validates in real time | LOW | Alert inline in BOM, not modal — engineers scan, not read |
| Cable type selector (DAC/AOC/fiber) | Different environments use different cabling; forcing one type alienates half the users | MEDIUM | Per-link-type selection cascades into cable SKU and quantity changes |
| Extensible hardware catalog | Future Dell models addable without code changes — no competing tool makes this visible | MEDIUM | JSON/TS constants file; catalog versioned separately |
| Topology annotation (port labels) | Show which ports connect to which — useful for rack build teams | MEDIUM | Overlay on topology diagram showing interface IDs |
| Growth scenario projector | "What if I add 20 more servers?" comparison view — Nutanix Sizer does this for compute | HIGH | Side-by-side diff of BOM before/after |
| JSON export | Enables programmatic consumption of BOM by automation pipelines and IaC tools | LOW | Schema-stable output for downstream tooling |
| Spine scaling visualization | Clearly shows when another spine switch tier is needed — unique to Clos fabric tools | MEDIUM | Graph line showing spine count vs. leaf count growth |
| Multiple named configurations | Save design A and design B for comparison; found in Nutanix Sizer | MEDIUM | localStorage keyed by user-assigned name |
| Oversubscription ratio target input | Let engineer set a target ratio and auto-scale uplinks — Cisco Hyperfabric does this | HIGH | Reverse-engineering: given N leaves at 3:1, solve for spine uplink count |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time pricing / procurement integration | Engineers want "total cost" in the tool | Prices change daily; tool becomes stale and untrustworthy; requires vendor API maintenance | Provide model numbers so procurement uses their own pricing source |
| BGP/VLAN configuration generation | Some users want config snippets, not just hardware lists | Out of scope creep; SONiC config generation is a separate, complex tool domain | Provide clear documentation link to SONiC SmartFabric Manager for config |
| Multi-site / multi-datacenter in one session | Power users always ask for this | Compounds complexity without validating single-site core value; use case is niche for v1 | Export JSON per site; let users combine externally |
| Mobile-optimized UI | Looks like a feature | Network engineers size deployments at a desk, not on a phone; mobile layout wastes design effort | Responsive enough to not break, but desktop-first layout is correct |
| SNMP/live device discovery integration | "Why not connect to real switches?" | Adds backend infrastructure, authentication, network access requirements; contradicts browser-only, no-backend constraint | Sizing is pre-deployment; live discovery is post-deployment DCIM territory |
| Role-based access / multi-user auth | Team tools need sharing | Adds backend, auth service, session management — massive scope expansion | Share via JSON export; single-user localStorage is sufficient for v1 |
| Inventory reconciliation | Track what's ordered vs. installed | Out of scope; this is DCIM/asset management territory | Link users to existing DCIM tools for asset tracking |
| AI-generated design recommendations | "Just tell me the best design" | Opaque reasoning erodes trust in safety-critical sizing; engineers need to verify each number | Keep deterministic math visible; show all intermediate calculations |

---

## Feature Dependencies

```
[Input Form: server count, servers/rack, link speed, cable type]
    └──requires──> [Hardware Catalog: switch specs, port counts, speeds]
                       └──feeds──> [Sizing Engine: pure function (inputs) => BOM]
                                       ├──requires──> [Rack Calculator]
                                       ├──requires──> [Leaf Calculator]
                                       ├──requires──> [Spine Calculator]
                                       └──requires──> [OOB Calculator]

[Sizing Engine output]
    ├──feeds──> [BOM Summary Table]
    ├──feeds──> [Topology Diagram]  ──requires──> [Graph rendering library (React Flow / D3)]
    ├──feeds──> [Rack Elevation View] ──requires──> [SVG/canvas renderer]
    ├──feeds──> [Oversubscription Display]
    └──feeds──> [Port Utilization Display]

[BOM Summary Table]
    ├──enables──> [CSV Export]
    ├──enables──> [PDF Export]
    └──enables──> [JSON Export]

[Sizing Engine output]
    └──feeds──> [Validation Alerts: port saturation, cable compat]

[Save/Load Config]
    └──requires──> [localStorage schema definition]
    └──enhances──> [Multiple Named Configurations]

[Cable Type Selector]
    └──enhances──> [BOM Summary Table] (changes cable SKU line items)

[Growth Scenario Projector]
    └──requires──> [Save/Load Config] (compares named configs)
    └──requires──> [Sizing Engine]
```

### Dependency Notes

- **Sizing Engine requires Hardware Catalog:** The engine cannot compute switch counts without port density data. The catalog must be defined before the engine.
- **Topology Diagram requires Sizing Engine output:** The diagram is a rendering of the computed topology, not a drag-and-drop designer. Rendering library choice is independent.
- **CSV/PDF/JSON Export requires BOM Table:** Export is a transformation of the already-computed BOM table. No independent data source.
- **Port saturation alerts require Hardware Catalog + Sizing Engine:** Alerts compare computed quantities against catalog port limits. Both must be complete first.
- **Growth Scenario Projector requires Save/Load:** Comparison requires at least two persisted named configurations. Save/Load must ship first.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Input form (server count, servers/rack, connectivity type 25G/100G) — entry point
- [ ] Hardware catalog (S5248F-ON, S5232F-ON, S3248T-ON specs as constants) — sizing foundation
- [ ] Pure sizing engine: rack, leaf, spine, OOB calculations — core value
- [ ] Zod validation with user-visible error messages — trust and correctness
- [ ] Port utilization + oversubscription display — engineers validate before sign-off
- [ ] Port saturation alerts (OOB >48 ports, spine capacity warnings) — prevents bad orders
- [ ] BOM summary table — answers "how many boxes and cables?"
- [ ] CSV export — enables procurement workflow
- [ ] Topology diagram (logical view) — visual validation of design
- [ ] Rack elevation view (physical placement) — physical build documentation
- [ ] Save/load via localStorage — engineers iterate without losing work
- [ ] PDF/print report — stakeholder handoff

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Cable type selector (DAC/AOC/fiber) — add when user feedback confirms it's blocking adoption
- [ ] JSON export — add when downstream automation use cases are confirmed
- [ ] Multiple named configurations — add when users report needing to compare designs
- [ ] Topology port labels — add when rack build teams request wiring documentation

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Growth scenario projector — complex UX; validate core sizing first
- [ ] Oversubscription ratio target input (reverse solver) — advanced feature for power users
- [ ] Spine scaling visualization (graph view) — valuable but not blocking initial use
- [ ] Additional hardware vendors or switch models — extend catalog after core is stable

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Input form | HIGH | LOW | P1 |
| Hardware catalog (constants) | HIGH | LOW | P1 |
| Sizing engine (pure functions) | HIGH | LOW | P1 |
| Zod validation + error messages | HIGH | LOW | P1 |
| BOM summary table | HIGH | LOW | P1 |
| Oversubscription + port utilization display | HIGH | LOW | P1 |
| Port saturation alerts | HIGH | LOW | P1 |
| CSV export | HIGH | LOW | P1 |
| Save/load (localStorage) | MEDIUM | LOW | P1 |
| Topology diagram | HIGH | HIGH | P1 |
| Rack elevation view | HIGH | HIGH | P1 |
| PDF/print report | MEDIUM | MEDIUM | P1 |
| Cable type selector (DAC/AOC/fiber) | HIGH | MEDIUM | P2 |
| JSON export | MEDIUM | LOW | P2 |
| Multiple named configurations | MEDIUM | MEDIUM | P2 |
| Topology port labels | MEDIUM | MEDIUM | P2 |
| Growth scenario projector | HIGH | HIGH | P3 |
| Oversubscription target solver | MEDIUM | HIGH | P3 |
| Spine scaling visualization | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Cisco Nexus Hyperfabric | Nutanix Sizer | Dell EIPT | Juniper Apstra | NetStack (this project) |
|---------|------------------------|---------------|-----------|----------------|------------------------|
| Input-driven sizing | Yes — topology + capacity inputs | Yes — workload-based | Yes — hardware selection | Yes — logical device abstraction | Yes — server count, rack density |
| BOM generation | Yes — includes cables, optics, DAC/AOC | Yes — hardware + software SKUs | Yes — Bill of Materials Mode | No dedicated BOM | Yes — switches + cables |
| Topology diagram | Yes — interactive, multi-type | Rack view only | Canvas-based | Yes — logical + physical | Yes — leaf-spine diagram |
| Rack elevation | Partial (cabling plan, no explicit elevation) | Yes — rack view in BOM report | Rack-level summaries | Rack type abstractions | Yes — per-rack device view |
| Oversubscription display | Yes — explicit design input | Not network-focused | Not network-focused | Yes — fabric design constraint | Yes — calculated and displayed |
| Port saturation alerts | Yes — real-time validation | Not applicable | Limited | Yes — design validation | Yes — OOB + spine alerts |
| Cable type selection | Yes — DAC/AOC/optics in BOM | Not applicable | Not applicable | Interface map based | Yes — DAC/AOC/fiber per link |
| Export CSV | Yes | Yes — BOM report | Limited | No | Yes |
| Export PDF | Yes — design report | Yes — proposal + BOM | Print mode | No | Yes |
| Export JSON | Yes (API) | No | No | Blueprint API | Yes |
| Save/load configs | Yes — cloud-based, multi-user | Yes — cloud-based, shareable | Yes — web caching | Yes — blueprint versioning | Yes — localStorage, single-user |
| What-if scenarios | Yes | Yes | Limited | Yes | v2+ (Growth projector) |
| Procurement integration | Yes — Cisco Commerce Workspace | Not direct | Dell Solutions Configurator | No | Intentionally excluded |
| Dell SONiC specific | No — Cisco-only | No — Nutanix-only | Power/cooling only | Multi-vendor | Yes — Dell S-series, SONiC |

**Key differentiator:** NetStack is the only tool targeting Dell SONiC Leaf-Spine specifically. Cisco Hyperfabric is the closest functional competitor but is Cisco-hardware-locked and cloud-managed. NetStack is vendor-specific (Dell), locally-run, export-focused, and deterministic — a different market position.

---

## Sources

- Cisco Nexus Hyperfabric Getting Started Guide: https://www.cisco.com/c/en/us/td/docs/dcn/hyperfabric/software/cisco-nexus-hyperfabric-getting-started.html
- Cisco Nexus Hyperfabric Data Sheet: https://www.cisco.com/c/en/us/products/collateral/data-center-networking/nexus-hyperfabric/nexus-hyperfabric-ds.html
- Nutanix Sizer Overview: https://sizing-workshop.readthedocs.io/en/latest/sizer/overview/overview.html
- Nutanix Sizer Product Page: https://www.nutanix.com/products/sizer
- Dell EIPT User Guide via PDF4PRO: https://pdf4pro.com/view/enterprise-infrastructure-planning-tool-user-guide-dell-352358.html
- Dell EIPT Landing Page: https://www.dell.com/calc
- Juniper Apstra Rack Types (v5.0): https://www.juniper.net/documentation/us/en/software/apstra5.0/apstra-user-guide/topics/concept/rack-types.html
- Rack Elevation Diagrams Guide: https://graphicalnetworks.com/blog-rack-diagrams-your-ultimate-guide/
- DCIM Software Overview (Device42): https://www.device42.com/features/data-center-management/
- Sunbird DCIM Rack Diagrams: https://www.sunbirddcim.com/glossary/rack-diagram
- Top 14 Network Planning Tools (AIM Multiple): https://aimultiple.com/network-planning-tools
- Oversubscription in Leaf-Spine (FS.com): https://www.fs.com/blog/a-simplified-guide-to-traffic-oversubscription-in-network-systems-1193.html
- DAC vs AOC Cable Guide 2025: https://network-switch.com/blogs/networking/dac-vs-aoc-cables-the-guide-2025
- Siemon BOM Best Practices: https://blog.siemon.com/infrastructure/5-tips-for-an-effective-bom
- Cisco Crosswork Planning: https://www.cisco.com/site/us/en/products/networking/software/crosswork-planning/index.html

---

*Feature research for: Dell Leaf-Spine SONiC Network Sizing Calculator (NetStack)*
*Researched: 2026-03-16*

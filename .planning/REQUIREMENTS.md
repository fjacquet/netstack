# Requirements: NetStack v6.0 Physical Planning

**Defined:** 2026-03-19
**Core Value:** Answer "How many boxes and cables do I need to order?" instantly and accurately — and now also "How long should those cables be?"

## v6.0 Requirements

### Cable Length Schedule

- [ ] **CABLE-01**: User sees recommended cable length (metres + SKU) for server→leaf links in all modes
- [ ] **CABLE-02**: User sees recommended cable length for leaf→spine and VLT links in Clos mode
- [ ] **CABLE-03**: User sees three cable length estimates for Three-Tier: server→access, access→aggregation, aggregation→core
- [ ] **CABLE-04**: User sees estimated ISL cable length for FC SAN mode
- [ ] **CABLE-05**: Cable lengths map to nearest standard SKU (1m/3m/5m/10m ladder) with 15% slack buffer
- [ ] **CABLE-06**: Cable lengths computed from rack pitch, rack height (derived from rack size), and switch position (ToR/MoR/BoR)

### Rack Geometry Inputs

- [ ] **RACK-01**: User can configure rack pitch in mm (default 600mm, optional field)
- [ ] **RACK-02**: User can toggle "all racks adjacent" (default true)
- [ ] **RACK-03**: When non-adjacent, user inputs rack-to-patch-panel distance (metres)
- [ ] **RACK-04**: Non-adjacent mode shows an amber advisory recommending patch panels (not a red violation)

### DAC Distance Advisory Upgrade

- [ ] **DAC-01**: DAC advisory shows the computed cable path length and the applicable DAC spec limit
- [ ] **DAC-02**: Advisory trigger uses computed geometry vs speed-specific limits (25G SFP28 = 3m, 100G QSFP28 = 5m)
- [ ] **DAC-03**: Fix existing `CABLE_CATALOG.DAC.maxDistanceM` to reflect speed-specific limits (was incorrectly set to 5m for all speeds)

### Schema & Store Foundation

- [ ] **PHYS-01**: New `advisories[]` output array distinct from `violations[]` — renders as amber advisory cards in UI
- [ ] **PHYS-02**: `inputStore` bumped to version 9 with automatic migration for all new fields
- [ ] **PHYS-03**: Profile load normalises against current schema before applying (no silent stale fields from saved profiles)
- [ ] **PHYS-04**: i18n labels for all new inputs and sections in EN/FR/DE/IT

### Export

- [ ] **EXP-05**: CSV export includes cable length schedule rows (link type, quantity, length, SKU)
- [ ] **EXP-06**: PDF export includes a cable schedule section

## v7.0 Requirements (Deferred)

### Power Budget

- **PWR-01**: BOM shows per-rack power budget with typical and max columns
- **PWR-02**: User inputs estimated server power per server (default 300W, global)
- **PWR-03**: Power budget shows grand total across all racks
- **PWR-04**: HIGH_DENSITY_RACK advisory when rack power exceeds threshold

### Data Portability

- **PERS-02**: JSON file import/export for sharing configurations
- **EXP-04**: JSON export for machine-readable BOM (procurement tool integration)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Exact per-centimetre cable runs | Requires room CAD / floor plan; outside tool scope |
| Power budget | Deferred to v7.0 |
| PUE / energy cost calculator | Pricing changes too fast; separate domain |
| Cooling BTU estimation | Too deployment-specific; separate domain |
| Rack weight estimation | Low value for procurement; separate domain |
| Multi-site / multi-row topology | Single-row assumption sufficient for target deployments |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CABLE-01 | — | Pending |
| CABLE-02 | — | Pending |
| CABLE-03 | — | Pending |
| CABLE-04 | — | Pending |
| CABLE-05 | — | Pending |
| CABLE-06 | — | Pending |
| RACK-01 | — | Pending |
| RACK-02 | — | Pending |
| RACK-03 | — | Pending |
| RACK-04 | — | Pending |
| DAC-01 | — | Pending |
| DAC-02 | — | Pending |
| DAC-03 | — | Pending |
| PHYS-01 | — | Pending |
| PHYS-02 | — | Pending |
| PHYS-03 | — | Pending |
| PHYS-04 | — | Pending |
| EXP-05 | — | Pending |
| EXP-06 | — | Pending |

**Coverage:**
- v6.0 requirements: 19 total
- Mapped to phases: 0 (roadmap pending)
- Unmapped: 19 ⚠️

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after initial definition*

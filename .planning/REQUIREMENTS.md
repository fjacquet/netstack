# Requirements: NetStack v6.0 Physical Planning

**Defined:** 2026-03-19
**Core Value:** Answer "How many boxes and cables do I need to order?" instantly and accurately — and now also "How long should those cables be?"

## v6.0 Requirements

### Cable Length Schedule

- [x] **CABLE-01**: User sees recommended cable length (metres + SKU) for server→leaf links in all modes
- [x] **CABLE-02**: User sees recommended cable length for leaf→spine and VLT links in Clos mode
- [x] **CABLE-03**: User sees three cable length estimates for Three-Tier: server→access, access→aggregation, aggregation→core
- [x] **CABLE-04**: User sees estimated ISL cable length for FC SAN mode
- [x] **CABLE-05**: Cable lengths map to nearest standard SKU (1m/3m/5m/10m ladder) with 15% slack buffer
- [x] **CABLE-06**: Cable lengths computed from rack pitch, rack height (derived from rack size), and switch position (ToR/MoR/BoR)

### Rack Geometry Inputs

- [x] **RACK-01**: User can configure rack pitch in mm (default 600mm, optional field)
- [x] **RACK-02**: User can toggle "all racks adjacent" (default true)
- [x] **RACK-03**: When non-adjacent, user inputs rack-to-patch-panel distance (metres)
- [x] **RACK-04**: Non-adjacent mode shows an amber advisory recommending patch panels (not a red violation)

### DAC Distance Advisory Upgrade

- [x] **DAC-01**: DAC advisory shows the computed cable path length and the applicable DAC spec limit
- [x] **DAC-02**: Advisory trigger uses computed geometry vs speed-specific limits (25G SFP28 = 3m, 100G QSFP28 = 5m)
- [x] **DAC-03**: Fix existing `CABLE_CATALOG.DAC.maxDistanceM` to reflect speed-specific limits (was incorrectly set to 5m for all speeds)

### Schema & Store Foundation

- [x] **PHYS-01**: New `advisories[]` output array distinct from `violations[]` — renders as amber advisory cards in UI
- [x] **PHYS-02**: `inputStore` bumped to version 9 with automatic migration for all new fields
- [x] **PHYS-03**: Profile load normalises against current schema before applying (no silent stale fields from saved profiles)
- [x] **PHYS-04**: i18n labels for all new inputs and sections in EN/FR/DE/IT

### Export

- [x] **EXP-05**: CSV export includes cable length schedule rows (link type, quantity, length, SKU)
- [x] **EXP-06**: PDF export includes a cable schedule section

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
| CABLE-01 | Phase 26 | Complete |
| CABLE-02 | Phase 26 | Complete |
| CABLE-03 | Phase 26 | Complete |
| CABLE-04 | Phase 26 | Complete |
| CABLE-05 | Phase 26 | Complete |
| CABLE-06 | Phase 26 | Complete |
| RACK-01 | Phase 25 | Complete |
| RACK-02 | Phase 25 | Complete |
| RACK-03 | Phase 25 | Complete |
| RACK-04 | Phase 26 | Complete |
| DAC-01 | Phase 26 | Complete |
| DAC-02 | Phase 26 | Complete |
| DAC-03 | Phase 25 | Complete |
| PHYS-01 | Phase 25 | Complete |
| PHYS-02 | Phase 25 | Complete |
| PHYS-03 | Phase 25 | Complete |
| PHYS-04 | Phase 27 | Complete |
| EXP-05 | Phase 28 | Complete |
| EXP-06 | Phase 28 | Complete |

**Coverage:**
- v6.0 requirements: 19 total
- Mapped to phases: 19 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 — traceability populated after v6.0 roadmap creation*

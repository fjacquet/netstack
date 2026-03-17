# Requirements: NetStack

**Defined:** 2026-03-17
**Core Value:** Answer "How many boxes and cables do I need?" instantly and accurately

## v1.1 Requirements

### Rack Configuration

- [ ] **RACK-01**: User can define number of racks explicitly (not just derived from totalServers / serversPerRack)
- [ ] **RACK-02**: User can set different server counts per rack (variable density)
- [x] **RACK-03**: Engine calculates BOM from per-rack configuration array instead of uniform scalars

### Server Ports

- [ ] **PORT-01**: User can configure frontend (data) port count per server (0-8, default 1)
- [ ] **PORT-02**: User can configure backend (OOB) port count per server (0-8, default 1)
- [ ] **PORT-03**: Cable and transceiver counts adjust based on per-server port configuration

### Rack Elevation

- [ ] **ELEV-01**: Servers are visible in the rack elevation view with correct U-height
- [ ] **ELEV-02**: User can configure server U-height (1U, 2U, 4U, 8U)
- [ ] **ELEV-03**: RACK_CAPACITY_EXCEEDED constraint violation fires when total device U-height exceeds rack size

### Uplink Configuration

- [ ] **UPLN-01**: User can select number of active uplinks per leaf switch (1 to model maximum)
- [ ] **UPLN-02**: Oversubscription ratio and cable counts recalculate based on active uplink count

## v2 Requirements

### Fibre Channel SAN (GH #1)

- **FC-01**: FC sizing mode with Brocade Gen7 (64G) switch catalog
- **FC-02**: FC sizing mode with Brocade Gen8 (128G) switch catalog
- **FC-03**: FC topology diagram with director/switch tiers
- **FC-04**: User selects Ethernet OR Fibre Channel mode (not both)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-site / multi-datacenter | Single site focus |
| BGP/VLAN configuration | Physical sizing only |
| Real-time pricing | BOM is quantities only |
| Mobile app | Web-first (PWA works) |
| SONiC configuration generation | Separate tool |
| Backend / user accounts | Pure client-side |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RACK-01 | Phase 6 | Pending |
| RACK-02 | Phase 6 | Pending |
| RACK-03 | Phase 5 | Complete |
| PORT-01 | Phase 6 | Pending |
| PORT-02 | Phase 6 | Pending |
| PORT-03 | Phase 5 | Pending |
| ELEV-01 | Phase 7 | Pending |
| ELEV-02 | Phase 7 | Pending |
| ELEV-03 | Phase 7 | Pending |
| UPLN-01 | Phase 6 | Pending |
| UPLN-02 | Phase 5 | Pending |

**Coverage:**
- v1.1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 after v1.1 roadmap creation*

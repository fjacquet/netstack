# ADR-0007: VLT Interconnect Cable Modeling and Transceiver Splitting by Speed

## Status
Accepted

## Date
2026-03-17

## Context
The BOM cable calculation must accurately reflect the physical cabling for a Dell leaf-spine deployment. Two modeling questions arose during Phase 4 implementation:

### Question 1: VLT Interconnect Cables

Dell Virtual Link Trunking (VLT) requires a dedicated interconnect between the two leaf switches in each ToR pair. The VLT peer-link is typically a 2-cable LAG (Link Aggregation Group) using 100G QSFP28 ports. This is a real physical cable that procurement must order.

Should VLT cables be included in the BOM?

### Question 2: Transceiver Counting by Speed

The BOM must list transceivers separately from cables because:
- Server-to-leaf links use SFP28 (25G) transceivers — one per server port plus one per leaf port
- Leaf-to-spine uplinks use QSFP28 (100G) transceivers — one per uplink plus one per spine port
- DAC/AOC cables include integrated transceivers; standalone fiber cables require separate transceivers

Should transceivers be counted as a separate line item, split by speed?

## Decision

### VLT Cables: Include in BOM
Each rack has a leaf pair (Leaf A + Leaf B). The VLT interconnect uses **2 cables per leaf pair** (for redundancy), connecting a dedicated QSFP28 port on each leaf. VLT cables are modeled as a dedicated cable type in the BOM:

```
vlt_cables = leafPairs × 2 = (N_racks × 2) / 2 × 2 = N_racks × 2
```

VLT cables are always QSFP28 (100G) regardless of server connectivity speed.

### Transceivers: Split by Type into SFP28 and QSFP28
For DAC and AOC cables (which include integrated transceivers), transceiver count is zero.
For fiber cables, transceivers are required at both ends:

- **SFP28 transceivers** (25G): `totalServers + (leafSwitches × serverDownlinkPortsUsed)`
- **QSFP28 transceivers** (100G): `(leafSwitches × uplinkPorts) + (spineSwitches × downlinkPortsUsed)`

The `CsvRow.category` is typed as a discriminated union `'Switch' | 'Cable' | 'Transceiver'` to allow exhaustive switching in the CSV generator.

## Consequences
- VLT cables inflate the QSFP28 cable count but accurately reflect real procurement needs
- Transceiver quantities are only non-zero when cable type is `fiber`; UI shows them as separate table rows
- The `SFP28` vs `QSFP28` split enables per-speed pricing in procurement spreadsheets
- Any future 400G spine model (QSFP-DD) would require a new transceiver category

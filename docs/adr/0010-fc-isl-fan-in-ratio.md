# ADR-0010: FC ISL Fan-In Ratio of 7:1 (Broadcom Default)

## Status
Accepted

## Date
2026-03-18

## Context
Inter-Switch Links (ISLs) in a Fibre Channel fabric must be sized to avoid oversubscription between switches. Two approaches were considered:
1. **Symmetric ratio** matching the Ethernet uplink formula (e.g., same oversubscription metric)
2. **FC-specific fan-in ratio** based on Broadcom's fabric engineering guidance

Broadcom (manufacturer of the ASICs in all Brocade Gen7/Gen8 switches) specifies a default fan-in ratio of **7:1** for balanced FC workloads. NVMe-oF workloads require a tighter 3:1 ratio, but that is a future concern.

The ISL formula uses host bandwidth as the numerator, not `min(host, storage)`, so ISL count scales with server count rather than being capped by storage ports.

## Decision
ISL count per fabric is calculated as:
```
islPortsPerFabric = ceil(hostBandwidth / (targetFanIn × islPortSpeed))
```
where `targetFanIn = 7` (Broadcom FC standard) and ISL ports are reserved from each switch's total ports before host connectivity sizing.

`FC_PORT_SATURATION` fires against single-switch capacity minus effective ISL reservation.

## Consequences
- Correct ISL sizing for standard FC SAN deployments
- 7:1 differs from the Ethernet uplink oversubscription formula — the two must never be confused
- NVMe-oF deployments (3:1) require a UI option in v2.x; hard-coded at 7:1 for v2.0
- Research flag noted: expose workload type selector in a future release

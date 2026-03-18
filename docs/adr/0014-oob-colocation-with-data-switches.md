# ADR-0014: OOB Switch Co-Located with Data Switches

## Status
Accepted

## Date
2026-03-18

## Context
The OOB (Out-of-Band) management switch (S3248T-ON) was initially placed at U1 (physical bottom) for all positioning modes. When switch positioning was corrected to rack-level (ADR-0013), the data switches moved to the correct position (top/middle/bottom) but OOB remained stranded at U1.

In physical rack deployments, OOB management switches are cabled to the same equipment they manage — primarily the leaf switches and servers in the same rack. Placing OOB at U1 while data switches are at U40–42 (ToR) creates a long management cable run within the rack, contradicts physical installation practice, and produces a confusing rack elevation diagram.

## Decision
OOB is **always co-located with the data switches** as a group. The three-device switch group (OOB + Leaf A + Leaf B) moves together:
- **ToR**: OOB at U(n-2), adjacent below the two leaf switches at U(n-1) and U(n)
- **MoR**: OOB at U(mid-1), adjacent below the two leaf switches at U(mid) and U(mid+1)
- **BoR**: OOB at U1, Leaf B at U2, Leaf A at U3 — unchanged (already co-located)

Servers fill all remaining U-slots, skipping the reserved switch group positions.

## Consequences
- Rack elevation diagrams reflect real-world installation practice
- Cable management is simplified — OOB management cables are short (adjacent devices in the same group)
- For ToR mode, servers now occupy U1 through U(n-3) — the full lower portion of the rack
- `switchOverheadU` remains 3 for all modes

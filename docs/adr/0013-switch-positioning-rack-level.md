# ADR-0013: Switch Positioning is Rack-Level, Not Row-Level

## Status
Accepted

## Date
2026-03-18

## Context
ToR/MoR/BoR switch positioning was initially implemented as **row-level** positioning: in MoR and BoR modes, leaf switches were removed from individual server racks and centralized in a dedicated "positioning rack" at the middle or end of the row. This model assumed cable runs of 15m (MoR) and 30m (BoR) to reach servers in remote racks.

This was incorrect. The industry meaning of ToR/MoR/BoR is **vertical position within each individual server rack**:
- **ToR (Top of Rack)**: switches mounted at the physical top of the rack
- **MoR (Middle of Rack)**: switches mounted at mid-rack height
- **BoR (Bottom of Rack)**: switches mounted at the bottom of the rack

Cable runs are entirely within a single rack (≤2m), well within DAC cable specification.

## Decision
Switch positioning is rack-level. All three modes keep leaves and OOB inside each server rack:
- **ToR**: OOB at U(n-2), Leaf B at U(n-1), Leaf A at U(n) — grouped at the top
- **MoR**: OOB at U(n/2-1), Leaf B at U(n/2), Leaf A at U(n/2+1) — grouped at mid-rack
- **BoR**: OOB at U1, Leaf B at U2, Leaf A at U3 — grouped at the bottom

OOB is always co-located with the data switches (see ADR-0014).

`DAC_POSITIONING_INCOMPATIBLE` violation removed — all modes use DAC-compatible in-rack cable lengths (ToR=2m, MoR=1m, BoR=2m). The separate "positioning rack" concept and `buildPositioningRackDevices` were deleted.

## Consequences
- Rack elevation correctly visualizes switch placement for all three modes
- `switchOverheadU` returns 3 for all modes (OOB + 2 leaves always in server rack)
- `RACK_CAPACITY_EXCEEDED` fires earlier for MoR/BoR than under the old row-level model — correct behaviour
- i18n labels corrected: "Middle of Row" → "Middle of Rack", "Bottom of Row" → "Bottom of Rack"

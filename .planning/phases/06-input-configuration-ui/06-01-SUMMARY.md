---
plan: 06-01
phase: 06-input-configuration-ui
status: complete
completed: 2026-03-17
---

# Summary: Replace Bridge Pattern with Per-Rack Editor

## What Was Built

Rewrote `src/features/sizing/InputForm.tsx` to replace the `totalServers + rackCount` bridge pattern with a full per-rack configuration UI, plus frontend/backend port count inputs and an active uplink selector.

## Changes

### InputForm.tsx

- Removed `FormValues` bridge interface and `toRacksArray()` helper
- New `FormValues` type with `rackCount: number`, `rackServers: number[]`, and all scalar fields
- **Rack Configuration section** (RACK-01, RACK-02): rack count input + per-rack server count inputs (scrollable when > 4 racks) + total server summary text
- **Server Connectivity section** (PORT-01, PORT-02): `portsPerServerFrontend` and `portsPerServerBackend` number inputs (0-8), with FormDescription help text
- **Network Configuration section**: connectivity type, cable type, leaf model, **active uplinks per leaf** (dynamic max from `SWITCH_CATALOG[leafModel].uplinkPorts`), spine model
- **Border Leaf section**: border leaf model + conditional count
- **Physical section**: rack size
- Auto-clamps `activeUplinksPerLeaf` when leaf model changes and current value exceeds new model's max
- All new inputs have `data-testid` attributes: `rack-count`, `rack-server-{i}`, `ports-frontend`, `ports-backend`, `active-uplinks`

### i18n locales (all 4: en, fr, de, it)

Added 14 new `sizing` keys: `rackCount`, `rackLabel`, `rackServerCount`, `totalServersDisplay`, `rackConfigHeading`, `serverConnectivityHeading`, `networkConfigHeading`, `physicalHeading`, `portsPerServerFrontend`, `portsPerServerBackend`, `frontendPortsHelp`, `backendPortsHelp`, `activeUplinksPerLeaf`, `activeUplinksHelp`

## Verification

- `npx tsc --noEmit` — zero errors
- `npx vitest run` — 189 tests pass (no regressions)

# ADR-0020: Save/Load Named Configurations via localStorage

## Status
Accepted

## Date
2026-03-19

## Context
Users frequently size multiple deployment scenarios (different server counts, rack densities, switch models). Currently, changing inputs overwrites the previous state. There is no way to compare configurations or return to a previous design without manually re-entering values.

## Decision
Add save/load named configurations using localStorage:
- **Save**: Capture current input state as a named profile (e.g., "DC-North 200 servers", "Lab POC 20 servers")
- **Load**: Restore a saved profile, replacing current inputs
- **List**: Show all saved profiles with summary metadata (mode, server count, date)
- **Delete**: Remove a saved profile

Profiles are stored in a dedicated localStorage key (`netstack-profiles`) as a JSON array. Each profile contains the mode, topology, and full input state (Ethernet + FC if converged).

## Consequences
- Users can quickly switch between sizing scenarios without re-entering values
- Profiles persist across browser sessions (localStorage)
- No backend or account system required — pure client-side
- Profile format includes a version field for future schema migration
- Export to JSON file is a natural extension (copy profile to clipboard or download)

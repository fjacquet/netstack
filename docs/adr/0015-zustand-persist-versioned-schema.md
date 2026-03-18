# ADR-0015: Zustand Persist with Versioned Schema and Merge Strategy

## Status
Accepted

## Date
2026-03-17

## Context
NetStack persists user inputs to `localStorage` so that refreshing the browser does not lose work. As the project evolves, the input schema changes (new fields added in v1.1: `serverUHeight`, `portsPerServerFrontend`; v1.1 phased racks array; v2.0 FC input). Without a migration strategy, stale cached data from an older schema version would cause runtime errors or silent defaults.

## Decision
`inputStore` uses **Zustand's `persist` middleware** with:
- An explicit **version number** incremented on every breaking schema change (currently v6)
- A **`merge` function** that spreads the persisted state over fresh defaults, ensuring new fields appear with correct defaults even when loaded from an old cache
- The **FC store** uses a separate `localStorage` key (`netstack-fc-input` v1) — completely isolated from the Ethernet store's key (`netstack-input` v6)

No explicit per-version migration functions are written; the merge spread handles additive changes. Destructive changes (field removal/rename) increment the version to discard stale caches cleanly.

## Consequences
- Users never see a blank form after an app update — their previous inputs are preserved where compatible
- New fields always appear with correct schema defaults, not `undefined`
- FC and Ethernet inputs cannot corrupt each other — separate keys, separate schemas
- Breaking schema changes require a version bump; forgetting to bump is a silent regression risk

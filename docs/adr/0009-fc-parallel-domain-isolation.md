# ADR-0009: Fibre Channel as a Parallel Domain with No Shared State

## Status
Accepted

## Date
2026-03-18

## Context
v2.0 added Fibre Channel SAN sizing alongside the existing Ethernet leaf-spine calculator. Two design approaches were considered:
1. **Generic/shared engine** — a single calculator parameterised to handle both Ethernet and FC
2. **Parallel domains** — separate schemas, engines, stores, and components for each technology

FC and Ethernet differ fundamentally in topology (dual-fabric vs leaf-spine), catalog (Brocade directors vs Dell switches), licensing (POD licensing), ISL calculation (fan-in ratio vs uplink multiplier), and BOM structure. Forcing a shared abstraction would couple two incompatible models.

## Decision
FC and Ethernet are implemented as **strictly parallel domains** with zero cross-imports between domain layers:
- Separate Zod schemas (`fc-types.ts`, `fc-bom.ts` vs `input.ts`, `bom.ts`)
- Separate sizing engines (`fc-sizing.ts` vs `sizing.ts`)
- Separate Zustand stores with different localStorage keys (`netstack-fc-input` v1 vs `netstack-input` v5)
- Separate React components (`FCBOMPanel`, `FCTopologyCanvas` vs `BOMPanel`, `TopologyCanvas`)
- Mode selector is **ephemeral `useState`** in `AppContent` — never persisted to localStorage

## Consequences
- No risk of Ethernet schema changes breaking FC or vice versa
- Each domain can evolve independently (e.g., NVMe-oF ISL ratios for FC in v3.x)
- More code duplication than a generic approach, but the duplication is intentional isolation
- Mode selector ephemeral state prevents stale-mode-on-reload bugs
- Two independent `ReactFlowProvider` instances required to prevent cross-fabric edge rendering

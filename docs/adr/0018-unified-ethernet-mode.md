# ADR-0018: Unified Ethernet Mode with Topology Selector

## Status
Accepted

## Date
2026-03-19

## Context
v4.0 introduced Three-Tier (Core/Aggregation/Access) as a 4th standalone mode alongside Spine-Leaf, FC, and Converged. This created two separate Ethernet modes with duplicated store/form/BOM/export infrastructure — one for Clos topology, one for 3-tier topology.

The user experience was confusing: "Spine-Leaf" and "Three-Tier" are both Ethernet fabric topologies, not fundamentally different modes like FC vs Ethernet. Converged mode already had a topology selector dropdown to choose between Clos and 3-tier for the Ethernet portion — proving the pattern works.

## Decision
Merge Spine-Leaf and Three-Tier into a single **Ethernet** mode with an internal topology selector dropdown (matching the Converged mode pattern). The app has 3 modes:

- **Ethernet** — Clos (leaf-spine) or 3-tier (core/aggregation/access), selected via dropdown
- **FC** — Brocade dual-fabric (unchanged)
- **Converged** — Ethernet (Clos or 3-tier) + FC (unchanged, already has topology selector)

The ModeSelector shows 3 buttons instead of 4. The Ethernet input form conditionally renders leaf/spine fields (Clos) or access/aggr/core fields (3-tier) based on the topology selector.

## Consequences
- Simpler mental model: 3 categories (Ethernet, FC, Converged) instead of 4
- Ethernet mode reuses the topology selector pattern proven in Converged mode
- Single Ethernet store with topology field replaces two separate stores (inputStore + threeTierInputStore)
- BOM panel, topology diagram, rack elevation, and export conditionally render based on topology
- The "Three-Tier" standalone mode and its dedicated stores become dead code and are removed

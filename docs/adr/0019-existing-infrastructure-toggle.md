# ADR-0019: Existing Infrastructure Toggle for Brownfield Deployments

## Status
Accepted

## Date
2026-03-19

## Context
In brownfield deployments, parts of the network infrastructure already exist. For example:
- **3-tier**: Core switches are often already deployed; the user only needs access + aggregation switches
- **Clos**: Spine switches may already be in place; only new leaf switches are needed

The current BOM always sizes the complete fabric from scratch, which produces inflated purchase orders for brownfield scenarios.

## Decision
Add an "existing infrastructure" toggle per tier/layer:
- **3-tier**: "Core switches already deployed" → BOM excludes core switches but still calculates aggregation uplinks to connect to existing core
- **Clos**: "Spines already deployed" → BOM excludes spine switches but still calculates leaf uplinks

The toggle affects only the BOM output (purchase quantities), not the topology calculations (cable counts, oversubscription ratios still include the existing switches for correctness).

## Consequences
- BOM accurately reflects what needs to be purchased, not the total fabric
- Cable BOM still includes inter-tier cables (user needs new cables to connect to existing switches)
- Topology diagram still shows the full fabric (existing + new) with visual distinction
- Oversubscription ratios remain accurate (calculated against total fabric, not just new switches)

# ADR-0011: Spine Count Minimum of 2 for Redundancy

## Status
Accepted

## Date
2026-03-17

## Context
The original spine formula used `max(4, ceil(leafs / 32))`, hardcoding a minimum of 4 spines regardless of deployment size. For small deployments (1–4 racks, 2–8 leaf switches), 4 spines is excessive — each spine would be nearly idle and the BOM would be inflated.

Spine switches provide redundancy: if one spine fails, traffic reroutes through the remaining spines. The minimum for redundancy is 2. For non-blocking traffic, the number of spine uplinks per leaf is the binding constraint, not a fixed spine floor.

## Decision
Spine count formula changed to:
```
spineSwitches = max(2, ceil(leafSwitches / SPINE.downlinkPorts))
```
Minimum 2 spines ensures redundancy for all deployment sizes. Scaling kicks in when leaf count exceeds a single spine's port capacity.

## Consequences
- Small deployments (≤ 32 leafs with S5232F-ON) use exactly 2 spines — accurate and cost-effective BOM
- The minimum 2 is not configurable by design — single-spine is not a supported topology in the reference design
- `SPINE_CAPACITY_EXCEEDED` violation fires when `leafSwitches > SPINE.downlinkPorts` to warn before scaling

# ADR-0001: Leaf-Spine Architecture with Dell SONiC Switches

## Status
Accepted

## Date
2026-03-17

## Context
NetStack needs to calculate network sizing for data center deployments. Multiple network topologies exist (traditional three-tier, spine-leaf, fat-tree, etc.) and multiple vendors are available.

## Decision
We chose a **leaf-spine (Clos) topology** exclusively with **Dell S-series switches running SONiC** because:
- Leaf-spine provides predictable, non-blocking east-west traffic patterns suited to modern workloads
- Dell S52xx/S32xx series are widely deployed and well-documented
- SONiC (Software for Open Networking in the Cloud) is open-source and avoids vendor lock-in on the OS layer
- Redundant ToR pairs (2 leafs per rack) provide high availability

## Consequences
- The sizing engine is purpose-built for this topology — it does not support three-tier or other topologies
- Hardware catalog is Dell-only; adding other vendors would require catalog abstraction
- Spine count formula (`max(4, ceil(leafs / 32))`) is specific to S5232F-ON port density

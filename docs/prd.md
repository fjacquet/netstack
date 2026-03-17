# PRD (Product Requirements Document): NetStack

## 1 Objective

Automate the calculation of a **Leaf-Spine** network infrastructure with **OOB (Out-of-Band) management** for server rack deployments, exclusively on Dell S-series switches running SONiC.

## 2 Hardware Specifications (Reference)

| Model | Typical Role | Data Ports | Uplink Ports | Max Power |
|-------|-------------|------------|--------------|-----------|
| **S5248F-ON** | Leaf (25G) | 48×25G SFP28 | 4×100G QSFP28 | 647W |
| **S5232F-ON** | Spine (100G) | 32×100G QSFP28 | — | 635W |
| **S5224F-ON** | Leaf (25G, half) | 24×25G SFP28 | 4×100G QSFP28 | 455W |
| **S5212F-ON** | Leaf (25G, quarter) | 12×25G SFP28 | 3×100G QSFP28 | 304W |
| **S3248T-ON** | OOB Management | 48×1G RJ45 | 4×10G SFP+ | 550W |

Hardware specs are centralized in `src/domain/catalog/hardware.ts` (single source of truth).

## 3 Sizing Logic

The calculation engine (`src/domain/engine/sizing.ts`) applies the following formulas:

- **Racks**:
$$N_{racks} = \lceil \frac{\text{Total Servers}}{\text{Servers per Rack}} \rceil$$

- **Leaf switches**: $2 \times N_{racks}$ (redundant Top-of-Rack pair)

- **Spine switches**: $\max(4, \lceil \frac{\text{Leaf count}}{32} \rceil)$ — scales with leaf count, never fixed

- **OOB (S3248T-ON)**: $N_{racks} \times \lceil \frac{\text{Servers per Rack} + 2}{48} \rceil$

- **OOB ports needed per rack**:
$$P_{oob} = \text{Servers} + \text{Leafs (2)} + \text{Console/PDU (optional)}$$
  *Alert when $P_{oob} > 48$.*

- **Cables**: Computed from link counts (not port sums) to avoid off-by-2 errors

- **Oversubscription ratio**: Required field on every BOM output

## 4 User Stories

1. **As a network engineer**, I want to enter my server count and connectivity type (25G/100G) to instantly get the number of Dell switches I need.
2. **As an architect**, I want to see if my OOB S3248T-ON is saturated based on my rack density.
3. **As a procurement manager**, I want an exportable BOM listing switch quantities per model, cables by type, and power estimates.
4. **As a site planner**, I want a topology diagram showing spine-leaf connections and a rack elevation view showing physical device placement.
5. **As an international team member**, I want to use the tool in my language (EN, FR, DE, IT).

## 5 Constraint Violations

The engine returns typed discriminated-union violations:

| Violation | Trigger |
|-----------|---------|
| `OOB_PORT_SATURATION` | OOB ports needed exceed 48 per rack |
| `SPINE_CAPACITY_EXCEEDED` | More leaf switches than spine port capacity |
| `DAC_DISTANCE_ADVISORY` | Cable distance may exceed DAC limits |

## 6 Out of Scope (v1)

- Multi-site / multi-datacenter in a single session
- BGP / VLAN configuration (physical sizing only)
- Real-time pricing or procurement integration
- SONiC configuration generation
- Mobile app (web-first)

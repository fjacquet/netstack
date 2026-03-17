# NetStack User Guide

## Overview

NetStack is a browser-based network sizing calculator for Dell Leaf-Spine + OOB infrastructure under SONiC. Enter your server deployment parameters and instantly get a Bill of Materials with topology diagrams.

## Getting Started

1. Open the application in your browser
2. Select your preferred language (EN, FR, DE, IT) using the language switcher
3. Choose light or dark theme (auto-detected from system preferences)

## Input Parameters

### Server Configuration

- **Total Servers** — The total number of servers to deploy across all racks
- **Servers per Rack** — How many servers fit in each rack (determines rack count)

### Connectivity

- **Server Link Speed** — 25G (SFP28) or 100G (QSFP28) per server
- **Uplink Speed** — Leaf-to-spine uplink speed (100G QSFP28)

## Tabs

### Sizing

View the calculated Bill of Materials:

- Number of racks, leaf switches, spine switches, and OOB switches
- Per-model quantities (S5248F-ON, S5232F-ON, S3248T-ON, etc.)
- Cable counts by type (DAC, AOC, fiber)
- Power consumption estimates
- Oversubscription ratios
- Constraint violations and advisories

### Topology

Interactive diagram showing:

- Spine layer at top
- Leaf pairs per rack
- OOB switches
- Cable connections between layers

Use mouse to pan/zoom. Click nodes for details.

### Rack Elevation

Visual rack layout showing switch placement and server density per rack.

### Export

- **PDF** — Full report with BOM, topology diagram, and rack elevation
- **CSV** — Raw BOM data for spreadsheet analysis

## Understanding the Results

### Switch Models

| Model | Role | Key Specs |
|-------|------|-----------|
| S5248F-ON | Leaf (25G) | 48×25G SFP28 + 4×100G uplinks |
| S5232F-ON | Spine | 32×100G QSFP28 |
| S5224F-ON | Leaf (25G, small) | 24×25G SFP28 + 4×100G uplinks |
| S5212F-ON | Leaf (25G, smallest) | 12×25G SFP28 + 3×100G uplinks |
| S3248T-ON | OOB Management | 48×1G RJ45 + 4×10G uplinks |

### Warnings

- **OOB Port Saturation** — More than 48 devices need OOB in a single rack
- **Spine Capacity Exceeded** — More leafs than spine ports can handle
- **DAC Distance Advisory** — Cable distance may exceed DAC limits (use AOC/fiber instead)

## Data Persistence

Your inputs are automatically saved in your browser's localStorage. They persist across page reloads but are local to your browser — no data is sent to any server.

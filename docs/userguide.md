# NetStack User Guide

## Overview

NetStack is a browser-based network sizing calculator for Dell Leaf-Spine + OOB infrastructure under SONiC. Enter your server deployment parameters and instantly get a complete Bill of Materials with topology diagrams, rack elevation views, and export options.

No installation required — NetStack runs entirely in your web browser with no data sent to any server.

## Getting Started

1. Open the application URL in any modern browser (Chrome, Firefox, Edge, Safari)
2. Select your preferred language using the language switcher in the top-right corner (EN, FR, DE, IT)
3. Choose light or dark theme using the sun/moon icon (automatically detected from system preferences on first visit)
4. Your input settings are automatically saved in your browser and restored on the next visit

## Sizing a Deployment

The **Sizing** tab contains the input form on the left and the Bill of Materials on the right. Results update automatically as you type — there is no Submit button.

### Input Parameters

| Field | Description | Range |
|-------|-------------|-------|
| **Total Servers** | The total number of servers to deploy across all racks | 1 to 10,000 |
| **Servers per Rack** | How many servers fit in each rack | 1 to 48 |
| **Connectivity Type** | Per-server uplink speed | 25G (SFP28) or 100G (QSFP28) |
| **Cable Type** | Physical cable medium for all links | DAC, AOC, or Fiber |
| **Leaf Switch Model** | The leaf (Top-of-Rack) switch model | S5248F-ON, S5224F-ON, or S5212F-ON |

**OOB alert:** If Servers per Rack exceeds 46, the OOB port saturation alert will fire because the S3248T-ON has only 48 ports and 2 are reserved for the leaf switches.

## Reading the Bill of Materials

The BOM panel shows all calculated quantities based on your inputs.

### Oversubscription Ratio

The oversubscription badge at the top of the BOM shows the ratio of server-facing bandwidth to uplink bandwidth:

| Color | Status | Ratio |
|-------|--------|-------|
| Green | Optimal | <= 3:1 |
| Amber | Acceptable | <= 6:1 |
| Red | Critical | > 6:1 |

### Switches Table

Lists all switch models with their quantities and port utilization:

- **Model** — Dell PowerSwitch model number
- **Role** — Leaf (ToR), Spine, or OOB
- **Qty** — Number of units required
- **Utilization** — Progress bar showing used vs available ports; turns amber at 80% and red at 100%

### Cables Table

Lists cables grouped by type (DAC, AOC, or Fiber). For Fiber cable type, SFP28 and QSFP28 transceivers are listed as separate line items.

### Alerts

Constraint violations appear below the cables table:

| Alert | Meaning | Action |
|-------|---------|--------|
| **OOB Port Saturation** | More than 48 devices need OOB management in a rack | Reduce Servers per Rack or add a second OOB switch |
| **Spine Capacity Exceeded** | More leaf switches than spine ports can handle | Split into multiple pods |
| **DAC Distance Advisory** | DAC cables are limited to 3m; verify run lengths | Switch to AOC or Fiber for longer distances |

## Topology Diagram

The **Topology** tab shows an interactive 3-tier diagram of your leaf-spine network.

### Layout

- **Top row**: Spine switches (S5232F-ON, purple)
- **Middle row**: Leaf switch pairs — one pair per rack (S5248F/S5224F/S5212F, blue)
- **Bottom row**: Rack nodes (gray)

Each leaf pair is connected to all spine switches (full mesh). VLT interconnect links (dashed) connect the two leaf switches in each rack pair.

### Node Colors and Status

| Color | Role |
|-------|------|
| Blue | Leaf switch |
| Purple | Spine switch |
| Gray | OOB switch or rack |

Node border glow indicates port saturation:

| Border | Status |
|--------|--------|
| Green | Healthy — under 80% utilization |
| Amber | Warning — 80% or more utilization |
| Red | Saturated — at or exceeding 100% |

### Controls

- **Fit View** — Zoom to show all nodes
- **Reset Layout** — Recompute and re-center the diagram
- **Legend** — Toggle the legend panel showing node colors and status meanings
- **Pan** — Click and drag the background
- **Zoom** — Scroll wheel or pinch gesture

## Rack Elevation

The **Rack Elevation** tab shows the physical device placement inside individual racks.

### Using the Rack Elevation View

1. Select a rack from the dropdown (e.g., "Rack 1 — 3 switches")
2. The rack diagram shows U-slot positions for each device:
   - **U1**: OOB switch (S3248T-ON)
   - **U2**: Leaf B switch
   - **U3**: Leaf A switch
3. Devices can be dragged to rearrange their U-slot positions within the rack

**Note:** Rearranged positions are not saved — the rack resets to default layout when you navigate away or recalculate.

## Exporting Results

The **Export** tab provides three ways to save your results. Export buttons are disabled until a BOM has been calculated.

### CSV Export

Downloads the Bill of Materials as a CSV file with UTF-8 BOM encoding for Excel compatibility.

- Click **Export CSV** to download immediately
- Open in Microsoft Excel, Google Sheets, or any spreadsheet application
- Contains separate rows for switches, cables, and transceivers

### PDF Report

Generates a formatted multi-page PDF report.

- Click **Export PDF** to start generation
- The first export takes a moment (the PDF library loads on first use)
- Subsequent exports in the same session are faster
- The report includes: sizing inputs summary, Bill of Materials table, oversubscription status, and constraint violation alerts

### Print

Prints the current view using your browser's print dialog.

- Press **Ctrl+P** (Windows/Linux) or **Cmd+P** (macOS), or click **Print**
- Navigation controls are automatically hidden for a clean printed layout
- Works with any printer or PDF virtual printer

## Settings

### Theme

Toggle between light and dark mode using the sun/moon icon in the top-right corner. The preference is saved and restored on the next visit.

### Language

Select your language from the dropdown next to the theme toggle:

| Code | Language |
|------|----------|
| EN | English |
| FR | French (Français) |
| DE | German (Deutsch) |
| IT | Italian (Italiano) |

The selected language is saved and restored on the next visit.

## Hardware Reference

NetStack calculates BOMs for the following Dell PowerSwitch models running SONiC:

| Model | Role | Server Ports | Uplink Ports | Power |
|-------|------|-------------|--------------|-------|
| S5248F-ON | Leaf (large) | 48×25G SFP28 | 4×100G QSFP28 | 647W |
| S5232F-ON | Spine | 32×100G QSFP28 | — | 635W |
| S5224F-ON | Leaf (medium) | 24×25G SFP28 | 4×100G QSFP28 | 455W |
| S5212F-ON | Leaf (small) | 12×25G SFP28 | 3×100G QSFP28 | 304W |
| S3248T-ON | OOB Management | 48×1G RJ45 | 4×10G SFP+ | 550W |

The spine switch (S5232F-ON) is always selected automatically — the engine scales spine count based on leaf count.

## Troubleshooting

| Symptom | Solution |
|---------|---------|
| BOM shows no results | Enter at least 1 server in the Total Servers field |
| PDF generation is slow | First generation loads the PDF library; subsequent exports are faster |
| Topology diagram is blank | Enter sizing parameters in the Sizing tab first |
| Topology looks wrong or overlapping | Click **Reset Layout** in the Topology tab |
| Language is wrong after page reload | The language preference is saved to your browser; clear localStorage if it persists incorrectly |
| OOB alert fires unexpectedly | Reduce Servers per Rack to 46 or fewer |

## Data Persistence

Your inputs are automatically saved in your browser's localStorage. They persist across page reloads and browser restarts but are local to your browser — no data is ever sent to any server. Inputs saved in one browser are not available in another browser or on another device.

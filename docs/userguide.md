# NetStack User Guide

## Overview

NetStack is a browser-based network sizing calculator that supports three infrastructure modes:

- **Ethernet (Spine-Leaf)** -- Dell PowerSwitch Leaf-Spine + OOB infrastructure under SONiC
- **Fibre Channel** -- Brocade / Broadcom dual-fabric SAN sizing with POD licensing
- **Converged** -- unified Ethernet + FC sizing from a single input form

Enter your server deployment parameters and instantly get a complete Bill of Materials with topology diagrams, rack elevation views, and export options. No backend -- the entire application runs in your web browser with no data sent to any server.

NetStack is also a **Progressive Web App (PWA)**. You can install it on your desktop or mobile device and use it fully offline.

## Getting Started

1. Open the application URL in any modern browser (Chrome, Firefox, Edge, Safari).
2. **Select a mode** using the mode selector buttons in the top bar: **Spine-Leaf**, **Fibre Channel**, or **Converged**. The input form and BOM output adapt to the selected mode.
3. Select your preferred language using the language switcher in the top-right corner (EN, FR, DE, IT).
4. Choose light or dark theme using the sun/moon icon (automatically detected from system preferences on first visit).
5. Your input settings are automatically saved in your browser and restored on the next visit.
6. Optionally, **install as a PWA** for offline use (see [PWA / Offline](#pwa--offline) below).

## Mode Selector

The mode selector appears in the top bar next to the NetStack logo. It contains three buttons:

| Button | Mode | Description |
|--------|------|-------------|
| **Spine-Leaf** | Ethernet | Dell Leaf-Spine + OOB under SONiC. Calculates leafs, spines, border leafs, OOB switches, cables, and transceivers. |
| **Fibre Channel** | FC | Brocade dual-fabric SAN. Calculates per-fabric switches, ISL cables, FC optics, and POD licenses. |
| **Converged** | Converged | Combined Ethernet + FC from a single form. Produces a merged BOM. FC is optional -- set HBA ports to 0 to size Ethernet only. |

The active mode is highlighted. Switching modes preserves your inputs in each mode -- they are stored independently.

## Ethernet (Spine-Leaf) Mode

The **Sizing** tab contains the input form on the left and the Bill of Materials on the right. Results update automatically as you type -- there is no Submit button.

### Input Parameters

| Field | Description | Range / Options |
|-------|-------------|-----------------|
| **Racks** | Per-rack server count configuration. Each row represents one rack with its own server count. Add or remove racks as needed. | 1--200 racks; 0--500 servers per rack |
| **Frontend Ports per Server** | Number of data/leaf-facing uplink ports on each server | 0--8 (default 1) |
| **Backend Ports per Server** | Number of OOB management ports on each server | 0--8 (default 1) |
| **Active Uplinks per Leaf** | Number of uplink ports each leaf switch uses towards spines. The engine clamps this to the model's physical uplink count. | 1--8 (default 4) |
| **Connectivity Type** | Per-server uplink speed | 25G (SFP28) or 100G (QSFP28) |
| **Cable Type** | Physical cable medium for all links | DAC, AOC, or Fiber |
| **Leaf Switch Model** | The leaf (Top-of-Rack) switch model | S5248F-ON, S5224F-ON, S5212F-ON, S5296F-ON |
| **Spine Switch Model** | The spine switch model | S5232F-ON |
| **Border Leaf Model** | Optional border leaf switch for WAN/uplink connectivity | S5248F-ON, S5224F-ON, S5212F-ON, S5296F-ON, or None |
| **Border Leaf Count** | Number of border leaf switches (set to 0 for no border leafs) | 0--4 |
| **Switch Positioning** | Where switches are placed in the rack. Affects rack overhead, cable length advisory, and DAC compatibility. | ToR (Top of Rack), MoR (Middle of Rack), BoR (Bottom of Rack) |
| **Server U-Height** | Physical height of each server in rack units | 1U, 2U, 4U, or 8U |
| **Rack Size** | Total rack unit capacity | 24U, 42U, or 50U |

**OOB alert:** If per-rack server count exceeds 46, the OOB port saturation alert fires because the S3248T-ON has only 48 ports and 2 are reserved for the leaf switches.

### Reading the Bill of Materials

The BOM panel shows all calculated quantities based on your inputs.

#### Oversubscription Ratio

The oversubscription badge at the top of the BOM shows the ratio of server-facing bandwidth to uplink bandwidth:

| Color | Status | Ratio |
|-------|--------|-------|
| Green | Optimal | <= 3:1 |
| Amber | Acceptable | <= 6:1 |
| Red | Critical | > 6:1 |

#### Switches Table

Lists all switch models with their quantities and port utilization:

- **Model** -- Dell PowerSwitch model number
- **Role** -- Leaf (ToR/MoR/BoR), Spine, Border Leaf, or OOB
- **Qty** -- Number of units required
- **Utilization** -- Progress bar showing used vs available ports; turns amber at 80% and red at 100%

#### Cables Table

Lists cables grouped by type (DAC, AOC, or Fiber). For Fiber cable type, SFP28 and QSFP28 transceivers are listed as separate line items.

The BOM also includes a **recommended cable length** based on switch positioning (ToR = 2m, MoR = 1m, BoR = 2m).

#### Alerts

Constraint violations appear below the cables table:

| Alert | Meaning | Action |
|-------|---------|--------|
| **OOB Port Saturation** | More than 48 devices need OOB management in a rack | Reduce servers per rack or add a second OOB switch |
| **Spine Capacity Exceeded** | More leaf switches than spine ports can handle | Split into multiple pods |
| **DAC Distance Advisory** | DAC cables are limited to 3m; verify run lengths | Switch to AOC or Fiber for longer distances |
| **Rack Capacity Exceeded** | Total U-height of devices in a rack exceeds the rack size. Reports the rack number, used U, and total U. | Reduce servers per rack, choose a smaller server U-height, or select a larger rack size |

## Fibre Channel Mode

Switch to **Fibre Channel** mode using the mode selector. The input form and BOM adapt to FC-specific parameters.

### FC Input Parameters

| Field | Description | Range / Options |
|-------|-------------|-----------------|
| **Racks** | Per-rack server count configuration (same as Ethernet) | 1--200 racks; 0--500 servers per rack |
| **HBA Ports per Server** | Number of Fibre Channel HBA ports on each server. Typically 2 for dual-fabric redundancy. | 1--8 (default 2) |
| **Storage Target Ports** | Total FC target ports on all storage arrays combined | 2--128 (default 4) |
| **Storage Array Count** | Number of storage arrays in the fabric | 1--32 (default 1) |
| **FC Switch Model** | Brocade FC switch model | G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8 |
| **Preferred Generation** | Filter switch selection by Brocade generation | Gen 7 (64G), Gen 8 (128G), or Any |
| **ISL Ports per Switch** | Number of inter-switch link ports reserved on each switch | 0--32 (default 4) |
| **Server U-Height** | Physical height of each server in rack units | 1U, 2U, 4U, or 8U |
| **Rack Size** | Total rack unit capacity | 24U, 42U, or 50U |

### FC Bill of Materials

The FC BOM output includes:

- **Fabric A Switches** -- Number of FC switches in the primary fabric
- **Fabric B Switches** -- Number of FC switches in the secondary fabric (always matches Fabric A for symmetry)
- **Host Ports per Fabric** -- Total server-facing ports allocated per fabric
- **Storage Ports per Fabric** -- Storage-facing ports per fabric (storageTargetPorts / 2)
- **ISL Ports per Fabric** -- Inter-switch link ports provisioned per fabric
- **ISL Cables** -- Total ISL cable count between switches across both fabrics
- **FC Optics Count** -- Total FC SFP/SFP+ optics required (2 per cable)
- **POD Licenses Required** -- Ports-on-Demand license units needed to unlock additional ports beyond the base port count. 0 if base ports are sufficient. Directors (X7-4, X7-8, X8-4, X8-8) use blade-based licensing and always show 0.
- **Fan-In Ratio** -- Host-to-storage port ratio. Broadcom recommends a maximum of 7:1 for Gen 7 switches.
- **ISL Oversubscription Ratio** -- Traffic demand vs ISL bandwidth

### FC Alerts

| Alert | Meaning | Action |
|-------|---------|--------|
| **FC Port Saturation** | Total FC host ports required exceed available ports on the selected switch model (after ISL reservation) | Choose a higher-density switch model or add more switches |
| **FC Oversubscription Exceeded** | Fan-in ratio exceeds the recommended maximum (typically 7:1). Reports the current ratio and minimum storage ports needed. | Add more storage target ports or reduce HBA ports per server |
| **ISL Underprovisioned** | Insufficient ISL ports to avoid bottleneck between switches | Increase ISL ports per switch or choose a model with more ISL capacity |

### FC Topology Diagram

The FC topology view shows a **dual-fabric layout**:

- **Fabric A** -- drawn in blue
- **Fabric B** -- drawn in orange
- Servers connect to both fabrics for redundancy
- Storage arrays connect to both fabrics

Each fabric is displayed with its switches, ISL links, server connections, and storage connections.

## Converged Mode

Switch to **Converged** mode for a unified sizing experience that combines Ethernet and FC in a single input form.

### How It Works

- Converged mode uses a single rack configuration shared by both the Ethernet and FC fabrics -- the same physical racks and servers.
- All Ethernet input fields (leaf model, spine model, connectivity type, cable type, border leafs, switch positioning, etc.) appear alongside FC input fields (FC switch model, HBA ports, storage target ports, ISL ports, preferred generation).
- **FC is optional**: set HBA Ports per Server to 0 to produce an Ethernet-only BOM. When HBA ports are greater than 0, the FC BOM is included.

### Converged BOM Output

The converged BOM contains:

- **Ethernet BOM** -- always present, identical to standalone Ethernet mode output
- **FC BOM** -- present only when HBA Ports per Server > 0; identical to standalone FC mode output; null otherwise
- **Combined Violations** -- a merged list of all Ethernet and FC alerts

## Topology Diagram

The **Topology** tab shows an interactive network diagram. The content adapts to the active mode.

### Ethernet Topology Layout

- **Top row**: Spine switches (S5232F-ON, purple)
- **Middle row**: Leaf switch pairs -- one pair per rack (blue)
- **Bottom row**: Rack nodes (gray)

Each leaf pair is connected to all spine switches (full mesh). VLT interconnect links (dashed) connect the two leaf switches in each rack pair.

### FC Topology Layout

- **Fabric A** (blue): FC switches with ISL links, server connections, and storage connections
- **Fabric B** (orange): Mirrored layout for the secondary fabric

### Node Colors and Status

| Color | Role |
|-------|------|
| Blue | Leaf switch / Fabric A |
| Purple | Spine switch |
| Orange | Fabric B |
| Gray | OOB switch or rack |

Node border glow indicates port saturation:

| Border | Status |
|--------|--------|
| Green | Healthy -- under 80% utilization |
| Amber | Warning -- 80% or more utilization |
| Red | Saturated -- at or exceeding 100% |

### Controls

- **Fit View** -- Zoom to show all nodes
- **Reset Layout** -- Recompute and re-center the diagram
- **Legend** -- Toggle the legend panel showing node colors and status meanings
- **Pan** -- Click and drag the background
- **Zoom** -- Scroll wheel or pinch gesture

## Rack Elevation

The **Rack Elevation** tab shows the physical device placement inside individual racks.

### Using the Rack Elevation View

1. Select a rack from the dropdown (e.g., "Rack 1 -- 3 switches")
2. The rack diagram shows U-slot positions for each device. The switch positioning setting (ToR, MoR, or BoR) affects where switches are placed:
   - **ToR (Top of Rack)**: Switches at the top U-slots
   - **MoR (Middle of Rack)**: Switches in the middle U-slots
   - **BoR (Bottom of Rack)**: Switches at the bottom U-slots
3. Devices can be dragged to rearrange their U-slot positions within the rack

**Note:** Rearranged positions are not saved -- the rack resets to default layout when you navigate away or recalculate.

## Exporting Results

Export buttons are located in the **top bar** (header), next to the mode selector and settings controls. They are disabled until a BOM has been calculated.

### CSV Export

Downloads the Bill of Materials as a CSV file with UTF-8 BOM encoding for Excel compatibility.

- Click the **spreadsheet icon** in the top bar to download immediately
- Open in Microsoft Excel, Google Sheets, or any spreadsheet application
- Contains separate rows for switches, cables, and transceivers
- In FC mode, exports the FC-specific BOM (switches, ISL cables, optics, POD licenses)

### PDF Report

Generates a formatted multi-page PDF report.

- Click the **document icon** in the top bar to start generation
- The first export takes a moment (the PDF library loads on first use)
- Subsequent exports in the same session are faster
- Ethernet PDF includes: sizing inputs summary, Bill of Materials table, oversubscription status, constraint violation alerts, and topology diagram screenshot
- FC PDF includes: FC sizing inputs, FC BOM, fan-in ratio, ISL oversubscription, FC alerts, and dual-fabric topology screenshots (Fabric A and Fabric B)

### Print

Prints the current view using your browser's print dialog.

- Press **Ctrl+P** (Windows/Linux) or **Cmd+P** (macOS), or click the **printer icon** in the top bar
- Navigation controls are automatically hidden for a clean printed layout
- Works with any printer or PDF virtual printer

## PWA / Offline

NetStack is a Progressive Web App. A service worker caches all application assets so you can use it without an internet connection.

### Installing as an App

1. Open NetStack in Chrome, Edge, or Safari.
2. Look for the **Install** prompt in the browser address bar (Chrome/Edge: install icon on the right side of the URL bar; Safari on iOS: Share > Add to Home Screen).
3. Click **Install** (or **Add to Home Screen**).
4. NetStack appears as a standalone app on your desktop or home screen with its own window (no browser chrome).

On Firefox, PWA installation is not natively supported -- use the site as a regular browser tab instead.

### Using Offline

Once you have loaded NetStack at least once with an internet connection, the service worker caches all assets. You can then:

- Disconnect from the internet and continue using the app
- All three modes (Ethernet, FC, Converged) work fully offline
- Inputs are saved to localStorage and persist across offline sessions
- No data is ever sent to a server -- all calculations run locally

### Update Notifications

When a new version of NetStack is deployed, the service worker detects the update. A toast notification appears at the bottom-right of the screen:

- **"App ready to work offline"** -- confirms the service worker has cached everything
- **"New content available"** -- a newer version is ready; click **Reload** to update, or **Close** to dismiss and update later

### Offline Zip from GitHub Releases

For air-gapped environments, download the latest offline zip from the GitHub Releases page. Extract and serve the files with any static HTTP server (e.g., `python -m http.server` or `npx serve`).

## Settings

### Theme

Toggle between light and dark mode using the sun/moon icon in the top-right corner. The preference is saved and restored on the next visit.

### Language

Select your language from the dropdown next to the theme toggle:

| Code | Language |
|------|----------|
| EN | English |
| FR | French (Francais) |
| DE | German (Deutsch) |
| IT | Italian (Italiano) |

The selected language is saved and restored on the next visit.

## Hardware Reference

### Dell PowerSwitch Models (Ethernet)

NetStack calculates Ethernet BOMs for the following Dell PowerSwitch models running SONiC:

| Model | Role | Server Ports | Uplink Ports | Power |
|-------|------|-------------|--------------|-------|
| S5248F-ON | Leaf (large) | 48x25G SFP28 | 4x100G QSFP28 | 647W |
| S5232F-ON | Spine | 32x100G QSFP28 | -- | 635W |
| S5224F-ON | Leaf (medium) | 24x25G SFP28 | 4x100G QSFP28 | 455W |
| S5212F-ON | Leaf (small) | 12x25G SFP28 | 3x100G QSFP28 | 304W |
| S3248T-ON | OOB Management | 48x1G RJ45 | 4x10G SFP+ | 550W |

The spine switch (S5232F-ON) is always selected automatically -- the engine scales spine count based on leaf count. Leaf models can also serve as border leaf switches for WAN connectivity.

### Brocade FC Switch Models (Fibre Channel)

NetStack calculates FC BOMs for the following Brocade / Broadcom Fibre Channel switch models:

| Model | Gen | Speed | Total Ports | Base Ports | POD License Unit | Role |
|-------|-----|-------|-------------|------------|-------------------|------|
| G710 | 7 | 64G | 24 | 8 | 8 ports | Edge |
| G720 | 7 | 64G | 64 | 24 | 8 ports | Edge |
| G730 | 7 | 64G | 128 | 48 | 8 ports | Edge |
| X7-4 | 7 | 64G | 256 | All | Director license | Director |
| X7-8 | 7 | 64G | 512 | All | Director license | Director |
| 7850 | 7 | 64G | 24 | All | -- | Extension |
| G820 | 8 | 128G | 56 | 24 | 8 ports | Edge |
| X8-4 | 8 | 128G | 192 | All | Director license | Director |
| X8-8 | 8 | 128G | 384 | All | Director license | Director |

**POD Licensing:** Edge switches (G710, G720, G730, G820) ship with a base port count and require Ports-on-Demand licenses to unlock additional ports in increments of 8. Director-class switches (X7-4, X7-8, X8-4, X8-8) use blade-based licensing -- all ports on installed blades are active. The 7850 extension switch has all FC ports base-licensed.

**Generation filtering:** Use the Preferred Generation selector to restrict the switch model list to Gen 7 (64G) or Gen 8 (128G) models only.

## Troubleshooting

### Ethernet Issues

| Symptom | Solution |
|---------|----------|
| BOM shows no results | Enter at least 1 server in a rack configuration |
| Topology diagram is blank | Enter sizing parameters in the Sizing tab first |
| Topology looks wrong or overlapping | Click **Reset Layout** in the Topology tab |
| OOB alert fires unexpectedly | Reduce servers per rack to 46 or fewer |
| Rack Capacity Exceeded alert | Reduce servers per rack, choose a smaller server U-height, or select a larger rack size (42U or 50U) |
| DAC Distance Advisory appears | Switch to AOC or Fiber if cable runs exceed 3m; consider MoR switch positioning for shorter runs |

### Fibre Channel Issues

| Symptom | Solution |
|---------|----------|
| FC BOM shows 0 switches | Verify that at least one rack has servers and HBA ports per server is >= 1 |
| FC Port Saturation alert | Choose a higher-density switch model (e.g., G730, X7-4) or reduce HBA ports per server |
| FC Oversubscription Exceeded | Add more storage target ports or reduce HBA ports per server to bring the fan-in ratio below 7:1 |
| ISL Underprovisioned alert | Increase ISL ports per switch or choose a model with higher ISL capacity |
| POD licenses show 0 but ports seem insufficient | Director-class switches have all ports active; check if the total port count matches your needs |

### PWA / Offline Issues

| Symptom | Solution |
|---------|----------|
| Install prompt does not appear | Ensure you are using HTTPS and a supported browser (Chrome, Edge, or Safari). Firefox does not support PWA install. |
| App does not work offline | Load the app at least once with an internet connection so the service worker can cache all assets |
| "New content available" keeps appearing | Click **Reload** to apply the update; the notification will stop once the new version is active |
| Stale data after update | Clear your browser cache or unregister the service worker in DevTools > Application > Service Workers |

### General Issues

| Symptom | Solution |
|---------|----------|
| PDF generation is slow | First generation loads the PDF library; subsequent exports are faster |
| Language is wrong after page reload | The language preference is saved to your browser; clear localStorage if it persists incorrectly |
| Inputs are missing after switching browsers | Inputs are stored in localStorage, which is per-browser. Export your BOM as CSV to transfer results. |

## Data Persistence

Your inputs are automatically saved in your browser's localStorage. Each mode (Ethernet, FC, Converged) stores its inputs independently. They persist across page reloads and browser restarts but are local to your browser -- no data is ever sent to any server. Inputs saved in one browser are not available in another browser or on another device.

In addition to localStorage, the **service worker cache** stores all application assets (HTML, CSS, JavaScript, images) for offline use. This cache is managed automatically and updated when a new version of NetStack is deployed.

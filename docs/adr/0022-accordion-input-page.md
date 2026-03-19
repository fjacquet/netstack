# ADR-0022: Dedicated Full-Page Input Form with Accordion Sections

## Status
Accepted

## Date
2026-03-19

## Context
The current input form (`InputForm.tsx`, 847 lines) renders in a 320px sidebar alongside the BOM panel. As the form grew through v1.0–v5.0 to support Clos topology, Three-Tier topology, switch positioning, brownfield toggles, and per-rack configuration, the sidebar became cramped and difficult to navigate.

Users configuring complex deployments (multiple racks, border leafs, Three-Tier with separate access/aggregation/core switch selection) must scroll through a long flat list of fields with no visual hierarchy or grouping.

## Decision
Introduce a dedicated full-page input route (`/input`) where all input fields are organized into collapsible accordion sections. The BOM panel moves to the results route (`/`), making the results view cleaner and input configuration a first-class experience.

### Accordion section structure per mode

**Ethernet — Clos:**
1. Rack Config *(open by default)* — racks, server count per rack
2. Switch Selection — leaf model, spine model, border leaf model/count, connectivity type, cable type, active uplinks
3. Advanced — switch positioning, server U-height, rack size, brownfield toggle

**Ethernet — Three-Tier:**
Same 3-section structure with topology-specific field labels:
1. Rack Config *(open by default)*
2. Switch Selection — access model, aggregation model, core model, active uplinks per tier, connectivity type, cable type
3. Advanced — switch positioning, server U-height, rack size, brownfield toggle

**Fibre Channel:**
1. Rack Config *(open by default)* — racks, server U-height, rack size
2. Fabric Config — FC switch model, preferred generation, HBA ports, storage target ports, storage array count
3. Advanced — ISL ports per switch

**Converged:**
1. Rack Config *(open by default)* — racks, topology selector, server U-height, rack size
2. Ethernet Switches — leaf/access/aggregation/core models, connectivity type, cable type, active uplinks
3. FC Fabric — FC switch model, preferred generation, HBA ports, storage targets, ISL ports
4. Advanced — switch positioning, brownfield toggles

### Default state
The first section (Rack Config) is open on initial load. All other sections are collapsed. Open/closed state is not persisted to localStorage.

### TopBar navigation
A Configure icon button is added to the TopBar. Clicking it navigates to `/input`. The button shows an active visual state when the user is on the `/input` route.

## Consequences
- Input configuration has its own full-width page — no more cramped 320px sidebar
- Accordion sections provide clear visual hierarchy and progressive disclosure
- The Sizing tab becomes Results-only (BOM panel without InputForm)
- Applies to all 3 modes (Ethernet, FC, Converged) — consistent UX across modes
- Requires adding the shadcn/ui `Accordion` component to `src/components/ui/`
- Live recalculation is preserved — results update in the background even while the user is on `/input`
- The existing `SizingPage.tsx` splits into `InputPage.tsx` (accordion form) and `ResultsPage.tsx` (BOM panel)

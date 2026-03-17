---
status: testing
phase: 04-visualization-export-and-documentation
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md]
started: 2026-03-17T07:30:00Z
updated: 2026-03-17T08:00:00Z
---

## Current Test

number: 1
name: Topology Diagram Renders
expected: |
  Open the Topology tab. Diagram with correct node counts matching BOM.
awaiting: paused — fixing 3 issues before continuing UAT

## Tests

### 1. Topology Diagram Renders
expected: Open the Topology tab. Diagram with correct node counts matching BOM.
result: [pending]

### 2. Topology Interaction
expected: Pan/zoom, click node for popover, drag to reposition, Fit View, Legend toggle.
result: [pending]

### 3. Topology Saturation Colors
expected: High utilization → amber/red borders. Low utilization → green borders.
result: [pending]

### 4. Rack Elevation View
expected: Vertical rack with U-slot numbers matching rackSize (24U/42U/50U). Devices at correct positions.
result: issue
reported: "rack remains 4U — only shows U1-U4 regardless of rackSize setting"
severity: major

### 5. Rack Selector
expected: Dropdown to select rack. Switching racks updates diagram.
result: [pending]

### 6. Rack Drag-to-Reorder
expected: Drag device between U-slots.
result: [pending]

### 7. CSV Export
expected: Downloads .csv with headers, switch/cable rows, UTF-8 BOM.
result: [pending]

### 8. PDF Export
expected: Downloads PDF with cover, BOM summary, inputs, topology diagram.
result: issue
reported: "PDF generation failed — error message shown: Unable to generate the report"
severity: blocker

### 9. Print Layout
expected: Ctrl+P shows clean layout without chrome.
result: [pending]

### 10. Dark Mode in Visualizations
expected: All Phase 4 tabs adapt to dark theme.
result: [pending]

### 11. Language Switch in Phase 4 Tabs
expected: All labels translate to FR/DE/IT.
result: [pending]

### 12. Documentation Files
expected: docs/adr/ (8 files), prd.md, userguide.md, CHANGELOG.md.
result: [pending]

### 13. Leaf-Spine Cable Count
expected: With 2 spines and S5248F-ON (4 uplinks), leafSpineCables = leafSwitches × 2 (not × 4). QSFP28 count follows.
result: issue
reported: "quantities are wrong — 16 leaf-spine cables with only 2 spines. Should be 8 (each leaf connects to each spine once)"
severity: major

## Summary

total: 13
passed: 0
issues: 3
pending: 10
skipped: 0

## Gaps

- truth: "Rack elevation shows correct number of U-slots matching rackSize input (24U/42U/50U)"
  status: failed
  reason: "User reported: rack remains 4U — only shows U1-U4 regardless of rackSize setting"
  severity: major
  test: 4
  artifacts: []
  missing: []

- truth: "PDF export generates a formatted report"
  status: failed
  reason: "User reported: PDF generation failed — error message shown"
  severity: blocker
  test: 8
  artifacts: []
  missing: []

- truth: "Leaf-spine cable count equals leafSwitches × min(spineSwitches, uplinkPorts)"
  status: failed
  reason: "User reported: 16 leaf-spine cables with only 2 spines, should be 8"
  severity: major
  test: 13
  artifacts: []
  missing: []

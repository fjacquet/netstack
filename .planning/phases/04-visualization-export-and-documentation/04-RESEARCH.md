# Phase 4: Visualization, Export and Documentation - Research

**Researched:** 2026-03-17
**Domain:** @xyflow/react topology diagrams, custom rack elevation UI, @react-pdf/renderer PDF export, CSV download, print stylesheet, project documentation
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Topology diagram**

- Tree-style vertical layout: spines at root (top), leafs as branches (middle), rack/server nodes as leaves (bottom)
- Deterministic positioning: same inputs always produce the same node positions
- Fully interactive: click for details (port info popover), drag to rearrange, pan and zoom
- Port saturation shown via border color glow: green (healthy), amber (>80%), red (saturated) — matches BOM panel color coding
- VLT links shown between leaf pairs (dashed or distinct style)

**Topology edges**

- Claude's discretion on edge style (straight vs bezier, color coding by cable type)
- Must be readable at different deployment scales (2 racks vs 20+ racks)

**Rack elevation view**

- Vertical orientation: classic rack diagram with U-slots numbered bottom-to-top (U1 at bottom)
- One rack at a time with a dropdown/tab selector (rack summary in selector)
- Device colors: fill = role color (leaf=blue, spine=purple, OOB=gray), border glow = utilization color (green/amber/red)
- U-slot positions are user-configurable: drag devices to custom U-slots
- Rack view updates automatically when sizing inputs change

**Export formats**

- Claude's discretion on CSV column structure and PDF report layout
- PDF must include BOM summary, sizing inputs, and topology diagram
- PDF generated with @react-pdf/renderer (lazy-loaded per CLAUDE.md)
- Print (Ctrl+P) must render clean layout with no navigation chrome

**Documentation**

- Claude's discretion on depth/format for ARD, PRD, User Guide, and Changelog
- ARD was deferred from Phase 2 — describes four-layer architecture, data flow, pure-function engine contract
- All docs in docs/ folder as Markdown

### Claude's Discretion

- Edge styling for topology (straight vs bezier, color coding)
- CSV column ordering and naming
- PDF report sections, branding, and layout
- Documentation depth and format for all four docs
- Rack elevation device default positions before user customization
- How the rack selector UI looks (dropdown vs mini-tabs vs sidebar)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIZ-01 | Auto-generated Leaf-Spine topology diagram using @xyflow/react with deterministic layout | @xyflow/react v12.10.1 custom nodes, programmatic position calculation, ReactFlowProvider pattern |
| VIZ-02 | Rack elevation view showing physical device placement per rack | Pure CSS/HTML grid approach, HTML5 drag API for U-slot reordering, no extra library |
| VIZ-03 | Visual port saturation alerts when OOB or leaf ports approach/exceed capacity | Reuse BOMPanel saturation color helpers (getProgressColor pattern), border-glow via Tailwind classes |
| EXP-01 | User can export BOM as CSV file | Browser Blob + URL.createObjectURL, UTF-8 BOM for Excel compatibility, immediate download |
| EXP-02 | User can export formatted PDF report with BOM summary and diagrams | @react-pdf/renderer v4.3.2, pdf().toBlob() on demand, html-to-image toPng for diagram capture |
| EXP-03 | Print-friendly CSS stylesheet for browser printing | @media print rules in index.css, hide nav chrome, show active tab only |
| DOC-01 | Architecture Reference Document (ARD) — system design for developers | Markdown in docs/ARD.md, describes 4-layer architecture and pure-function engine contract |
| DOC-02 | Product Requirements Document (PRD) — formal product specification | Markdown in docs/PRD.md, formalizes 28 v1 requirements with acceptance criteria |
| DOC-03 | User Guide — end-user documentation | Markdown in docs/USER-GUIDE.md, explains sizing, BOM interpretation, export |
| DOC-04 | Changelog — version history | Markdown in docs/CHANGELOG.md, records v1.0 with all shipped features |
</phase_requirements>

---

## Summary

Phase 4 completes the v1.0 milestone by filling three placeholder tabs with functional content and adding project documentation. The core technical work divides into three distinct domains: (1) interactive topology diagram using @xyflow/react v12, (2) custom rack elevation view using pure React/HTML5 drag without additional libraries, and (3) export pipeline using @react-pdf/renderer v4 for PDF and native browser APIs for CSV/print.

All three placeholder tabs (`topology`, `rackElevation`, `export`) in `App.tsx` are wired up and ready — they just need their `PlaceholderTab` components replaced with functional feature components. The `useResultStore` already provides the full `NetworkBOM` (with `racks`, `leafSwitches`, `spineSwitches`, `oobSwitches`, port counts, violations) that both visualization tabs consume. The `useInputStore` provides sizing metadata for export context. Color semantics (green/amber/red saturation) and Tailwind helper patterns from `BOMPanel.tsx` are directly reusable.

The critical integration challenge is capturing the ReactFlow canvas as a PNG image to embed in the PDF export. The recommended approach uses `html-to-image` (the library React Flow officially endorses) with `getNodesBounds` + `getViewportForBounds` utilities. The @react-pdf/renderer `pdf().toBlob()` imperative API is the right pattern for on-demand generation (avoids always-rendering the PDF on page load).

**Primary recommendation:** Implement in four waves — (1) install packages + shadcn components, (2) topology diagram, (3) rack elevation + export, (4) documentation. Keep the topology diagram capture function in a shared utility so the export feature can call it independently of the visible tab.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.1 | Topology diagram, custom nodes, interactive pan/zoom | Per CLAUDE.md; v12 is the current non-deprecated package (not `reactflow`) |
| @react-pdf/renderer | 4.3.2 | PDF generation in browser | Per CLAUDE.md; generates — not views — PDFs; React 19 compatible |
| html-to-image | 1.11.13 | Capture ReactFlow canvas as PNG for PDF embed | Officially endorsed by React Flow docs for diagram screenshot export |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui popover | (already in repo) | Node click detail panel | Install with `npx shadcn@latest add popover` |
| shadcn/ui scroll-area | (already in repo) | Scrollable rack elevation frame | Install with `npx shadcn@latest add scroll-area` |
| lucide-react | (already installed) | Node icons: Network (leaf), Share2 (spine), Monitor (OOB) | No new install needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| html-to-image toPng | html2canvas | html-to-image has better SVG fidelity and is React Flow's own recommendation |
| pdf().toBlob() API | usePDF hook | usePDF auto-renders on mount (wasteful); pdf() is strictly on-demand |
| Native HTML5 drag for rack | @dnd-kit or react-beautiful-dnd | Native drag avoids an extra dependency; rack has simple ordered-list semantics, not complex 2D drag |
| Custom layout algorithm | dagre or ELK | For this fixed 3-tier topology, hand-computed positions are simpler and deterministic without a layout library |

**Installation (Wave 0):**

```bash
npm install @xyflow/react @react-pdf/renderer html-to-image
npx shadcn@latest add popover
npx shadcn@latest add scroll-area
```

**Version verification (confirmed 2026-03-17):**

- `@xyflow/react`: 12.10.1 (npm dist-tag: latest)
- `@react-pdf/renderer`: 4.3.2 (npm dist-tag: latest)
- `html-to-image`: 1.11.13 (npm dist-tag: latest)

---

## Architecture Patterns

### Recommended Feature Structure

```
src/features/
├── topology/
│   ├── TopologyTab.tsx          # Main tab component; wraps ReactFlowProvider
│   ├── TopologyCanvas.tsx       # ReactFlow instance + useReactFlow calls
│   ├── TopologyToolbar.tsx      # Fit View / Reset Layout / Legend toggle
│   ├── TopologyLegend.tsx       # Toggleable legend card
│   ├── nodes/
│   │   ├── SwitchNode.tsx       # Typed custom node for spine/leaf/OOB
│   │   └── RackNode.tsx         # Typed custom node for rack/server grouping
│   ├── utils/
│   │   ├── buildTopologyGraph.ts  # Pure fn: NetworkBOM → { nodes, edges }
│   │   └── captureTopologyPng.ts  # html-to-image capture utility
│   └── index.ts
├── rack-elevation/
│   ├── RackElevationTab.tsx     # Tab wrapper + rack selector
│   ├── RackFrame.tsx            # Visual rack with U-slot grid
│   ├── RackDevice.tsx           # Draggable device block
│   └── utils/
│       └── buildRackDevices.ts  # Pure fn: NetworkBOM + rackIndex → RackDevice[]
├── export/
│   ├── ExportTab.tsx            # Three export cards
│   ├── exportCsv.ts             # Pure fn: NetworkBOM → CSV string + download
│   ├── exportPdf.ts             # Async fn: NetworkBOM + pngDataUrl → PDF blob
│   └── pdf/
│       ├── NetStackDocument.tsx # @react-pdf/renderer Document component
│       ├── CoverPage.tsx
│       ├── InputsPage.tsx
│       ├── BOMPage.tsx
│       ├── TopologyPage.tsx
│       └── ViolationsPage.tsx
```

### Pattern 1: Deterministic 3-Tier Layout

**What:** Compute node positions from canvas dimensions and BOM counts — no layout library needed for a fixed-tier tree.

**When to use:** Any time the topology shape is known at build time (spines top, leafs middle, racks bottom).

**Example:**

```typescript
// Source: Custom — verified against @xyflow/react v12 Node type
function buildTopologyGraph(
  bom: NetworkBOM,
  canvasWidth = 1000
): { nodes: Node<SwitchNodeData>[]; edges: Edge[] } {
  const TIER_Y = { spine: 80, leaf: 240, rack: 420 }
  const xSpacing = (n: number) => canvasWidth / (n + 1)

  const spineNodes = Array.from({ length: bom.spineSwitches }, (_, i) => ({
    id: `spine-${i}`,
    type: 'switchNode' as const,
    position: { x: xSpacing(bom.spineSwitches) * (i + 1), y: TIER_Y.spine },
    data: { model: 'S5232F-ON', role: 'spine', usedPorts: bom.leafSwitches, totalPorts: 32 },
  }))

  const leafNodes = Array.from({ length: bom.leafSwitches }, (_, i) => ({
    id: `leaf-${i}`,
    type: 'switchNode' as const,
    position: { x: xSpacing(bom.leafSwitches) * (i + 1), y: TIER_Y.leaf },
    data: { model: bom.input.leafModel, role: 'leaf', usedPorts: bom.input.serversPerRack, totalPorts: 48 },
  }))
  // ... rack nodes and edges similarly
}
```

### Pattern 2: ReactFlowProvider + useReactFlow

**What:** `ReactFlowProvider` wraps the feature; `useReactFlow()` is called inside a child component to access `fitView` and `getNodes()`.

**When to use:** Whenever `fitView()` or node queries need to be called from outside the `<ReactFlow />` component itself (e.g., toolbar buttons, export trigger).

**Example:**

```typescript
// Source: https://reactflow.dev/learn/advanced-use/hooks-providers
// TopologyTab.tsx
export function TopologyTab() {
  return (
    <ReactFlowProvider>
      <TopologyCanvas />
    </ReactFlowProvider>
  )
}

// TopologyCanvas.tsx
function TopologyCanvas() {
  const { fitView, getNodes } = useReactFlow()
  // fitView({ padding: 0.1, duration: 300 }) on toolbar button click
}
```

### Pattern 3: Typed Custom Nodes

**What:** `Node<DataType, 'typeName'>` generics produce type-safe custom node components.

**When to use:** Every custom node — prevents data property typos at compile time.

**Example:**

```typescript
// Source: https://reactflow.dev/learn/advanced-use/typescript
type SwitchNodeData = {
  model: string
  role: 'spine' | 'leaf' | 'oob'
  usedPorts: number
  totalPorts: number
}
type SwitchNode = Node<SwitchNodeData, 'switchNode'>

function SwitchNode({ data }: NodeProps<SwitchNode>) {
  const saturation = data.usedPorts / data.totalPorts
  // border color derived from saturation — same thresholds as BOMPanel
}
```

### Pattern 4: Dark Mode Integration with ReactFlow

**What:** Use `colorMode` prop on `<ReactFlow />` synchronized to the existing ThemeProvider context. Override `--xy-*` CSS variables to match shadcn's CSS variable system.

**When to use:** Required for topology canvas background and edge colors to respect the app theme.

**Example:**

```typescript
// Source: https://reactflow.dev/learn/customization/theming
// Import base only, not full style.css (prevents style conflicts with Tailwind)
import '@xyflow/react/dist/base.css'

// In TopologyCanvas.tsx
const { theme } = useTheme()  // from src/components/theme-provider.tsx
<ReactFlow
  colorMode={theme === 'dark' ? 'dark' : 'light'}
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
/>
```

### Pattern 5: PDF Generation on Demand

**What:** Use the imperative `pdf().toBlob()` API instead of `usePDF` hook. Lazy-load the entire PDF module via dynamic import.

**When to use:** PDF export button click — do NOT render PDF on page load.

**Example:**

```typescript
// Source: https://react-pdf.org/advanced
// exportPdf.ts — not a React component, just an async function
async function generatePdfBlob(bom: NetworkBOM, topoDiagramPng: string): Promise<Blob> {
  // Dynamic import — deferred until first call
  const { pdf } = await import('@react-pdf/renderer')
  const { NetStackDocument } = await import('./pdf/NetStackDocument')

  const blob = await pdf(
    <NetStackDocument bom={bom} topoDiagramPng={topoDiagramPng} />
  ).toBlob()
  return blob
}

// In ExportTab.tsx
async function handleExportPdf() {
  setGenerating(true)
  try {
    const png = await captureTopologyPng()  // html-to-image
    const blob = await generatePdfBlob(bom, png)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'netstack-report.pdf'; a.click()
    URL.revokeObjectURL(url)
  } finally {
    setGenerating(false)
  }
}
```

### Pattern 6: Diagram PNG Capture for PDF

**What:** Use `getNodesBounds` + `getViewportForBounds` + `toPng` from `html-to-image` to capture the ReactFlow viewport as a static PNG at a fixed resolution.

**When to use:** Before PDF generation — must be called while the topology tab is visible or via a hidden off-screen render.

**Example:**

```typescript
// Source: https://reactflow.dev/examples/misc/download-image
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import { toPng } from 'html-to-image'

export async function captureTopologyPng(
  rfInstance: ReactFlowInstance,
  bgColor: string
): Promise<string> {
  const IMAGE_W = 800, IMAGE_H = 500
  const bounds = getNodesBounds(rfInstance.getNodes())
  const viewport = getViewportForBounds(bounds, IMAGE_W, IMAGE_H, 0.5, 2)
  const el = document.querySelector<HTMLElement>('.react-flow__viewport')!
  return toPng(el, {
    backgroundColor: bgColor,
    width: IMAGE_W,
    height: IMAGE_H,
    style: {
      width: `${IMAGE_W}px`,
      height: `${IMAGE_H}px`,
      transform: `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})`,
    },
  })
}
```

### Pattern 7: CSV Download with UTF-8 BOM

**What:** Build CSV string in memory, prepend `\uFEFF` for Excel compatibility, create Blob, trigger anchor download.

**When to use:** CSV export button — synchronous, no spinner needed.

**Example:**

```typescript
// Source: Verified via WebSearch — standard browser pattern
export function downloadBomCsv(bom: NetworkBOM): void {
  const BOM_CHAR = '\uFEFF'
  const header = 'Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes'
  const rows = buildCsvRows(bom)  // returns string[]
  const csv = BOM_CHAR + [header, ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'netstack-bom.csv'; a.click()
  URL.revokeObjectURL(url)
}
```

### Pattern 8: Rack Elevation via Native HTML5 Drag

**What:** Use `draggable`, `onDragStart`, `onDragOver`, `onDrop` on U-slot rows. Maintain device order in `useState`. No dnd library needed.

**When to use:** Rack elevation — simple 1D reorder within a fixed list.

**Example:**

```typescript
// Each RackSlot receives a device and knows its slotIndex
// dragItem ref stores { deviceId, fromSlot }
const handleDrop = (toSlot: number) => {
  if (dragItem.current === null) return
  const newDevices = [...devices]
  const [removed] = newDevices.splice(dragItem.current.fromSlot, 1)
  newDevices.splice(toSlot, 0, removed)
  setDevices(newDevices)
}
```

### Anti-Patterns to Avoid

- **Importing full `@xyflow/react/dist/style.css`**: imports opinionated colors that clash with Tailwind/shadcn. Use `@xyflow/react/dist/base.css` only.
- **Rendering `<Document>` inside a visible React component**: this triggers PDF re-computation on every render. Use `pdf().toBlob()` only on button click.
- **Defining `nodeTypes` inside the component body**: React Flow will re-register node types on every render, causing infinite layout loops. Define `nodeTypes` as a module-level constant.
- **Calling `useReactFlow()` outside `ReactFlowProvider`**: silently fails in v12. Wrap the entire topology feature in `<ReactFlowProvider>`.
- **Using `disabled` HTML attribute on export buttons**: prevents tooltip from showing on keyboard focus. Use `aria-disabled="true"` and pointer-events CSS instead (per UI-SPEC accessibility contract).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topology pan/zoom/drag | Custom SVG canvas | @xyflow/react | Built-in MiniMap, Controls, multi-select; handles pointer events cross-browser |
| PDF generation | Canvas/jsPDF | @react-pdf/renderer | Proper text reflow, font embedding, page breaking, A4 layout — not bitmap |
| Diagram → PNG capture | Custom canvas drawImage | html-to-image toPng | Handles SVG nodes, CSS variables, foreign objects that canvas drawImage misses |
| CSV string escaping | Manual quote wrapping | Explicit `wrapCsvValue()` helper | Fields with commas or quotes in violation text will break naive CSV |

**Key insight:** The topology diagram and PDF are the two hardest problems here. Both have well-maintained libraries that handle the edge cases. Custom SVG topology is tempting but gets very complicated with pan/zoom/touch events across devices and dark mode. Custom PDF is even worse — font subsetting, page breaking, and image compression are all non-trivial.

---

## Common Pitfalls

### Pitfall 1: nodeTypes Defined Inside Component

**What goes wrong:** React Flow detects a new `nodeTypes` object on every render and re-initializes node rendering, causing infinite layout recalculations and flickering.

**Why it happens:** JavaScript object identity — `{}` !== `{}` even with same contents. React Flow uses reference equality to detect changes.

**How to avoid:** Define `const nodeTypes = { switchNode: SwitchNode, rackNode: RackNode }` at module scope, outside any component.

**Warning signs:** Topology nodes flash or flicker; React profiler shows constant rerenders of the ReactFlow root.

### Pitfall 2: @react-pdf/renderer CSS Not Supported

**What goes wrong:** Using Tailwind or standard CSS properties in PDF components. The library uses a subset of Flexbox/CSS — no grid, no CSS variables, no Tailwind classes.

**Why it happens:** @react-pdf/renderer is a completely separate renderer — it does NOT use the DOM. It re-implements CSS parsing independently.

**How to avoid:** Use `StyleSheet.create({})` for all PDF styles. Use hardcoded hex/rgb values, not CSS variables. Use only supported properties (Flexbox, borders, colors, fontSize, fontWeight, padding, margin).

**Warning signs:** Styles silently ignored in PDF output; layout looks wrong in generated PDF.

### Pitfall 3: Font.register for Inter Requires Network or Bundled File

**What goes wrong:** PDF renders with Helvetica instead of Inter because `Font.register` with a Google Fonts CDN URL fails in production or offline.

**Why it happens:** @react-pdf/renderer fetches fonts at render time, not at build time. CDN URLs may be blocked or slow.

**How to avoid:** Bundle Inter TTF/WOFF files in `public/fonts/` and reference them as absolute URLs (`/network-sizer/fonts/inter-regular.woff`). Only TTF and WOFF formats are supported.

**Warning signs:** PDF shows Helvetica; browser console shows font fetch errors during PDF generation.

### Pitfall 4: Diagram Capture Requires Topology Tab to Be Visible

**What goes wrong:** `document.querySelector('.react-flow__viewport')` returns null or the canvas has zero dimensions when the user triggers PDF export from the Export tab while the Topology tab is hidden.

**Why it happens:** ReactFlow only renders its canvas when the containing element is visible and has dimensions.

**How to avoid:** Either (a) capture the PNG immediately when the user leaves the Topology tab and cache it in a ref/store, or (b) briefly switch to the Topology tab, capture, then switch back. Option (a) is preferred UX.

**Warning signs:** PDF Topology page is blank; `toPng()` returns a transparent PNG.

### Pitfall 5: CSV Values With Commas in Notes Field

**What goes wrong:** The `Notes` column contains ConstraintViolation text like "47 ports required but only 48 available..." which may contain commas. Unescaped commas break CSV column alignment.

**Why it happens:** Naive CSV building with array `.join(',')` does not handle embedded commas.

**How to avoid:** Wrap each cell value in double quotes and escape internal double quotes by doubling them: `"value with ""quotes"" inside"`.

**Warning signs:** CSV opens in Excel with wrong column alignment for rows with violation notes.

### Pitfall 6: Print Stylesheet Topology Canvas

**What goes wrong:** Topology canvas prints as a blank box because browser print engines don't always render canvas/SVG elements that were dynamically sized.

**Why it happens:** React Flow uses CSS transforms for pan/zoom that print engines may not honor.

**How to avoid:** The print stylesheet in the UI-SPEC adds `break-inside: avoid` on `.react-flow__renderer`. Accept that printed topology may not look perfect — recommend PDF export for formatted output in user-facing copy.

**Warning signs:** Blank white box in browser Print Preview where the topology should appear.

### Pitfall 7: useShallow Missing on Result Store Consumers

**What goes wrong:** Topology and rack elevation components re-render on every BOM recomputation (which happens on every input change), causing layout thrashing in the topology diagram.

**Why it happens:** Without `useShallow`, Zustand returns a new object reference on every state update even when the relevant fields are unchanged.

**How to avoid:** Use `useShallow` from `zustand/shallow` for all `useResultStore` selectors, consistent with established pattern in BOMPanel.tsx.

**Warning signs:** React DevTools shows TopologyTab re-rendering on every keystroke in the Sizing form.

---

## Code Examples

Verified patterns from official sources:

### ReactFlow Base Imports (theme-safe)

```typescript
// Source: https://reactflow.dev/learn/customization/theming
import { ReactFlow, ReactFlowProvider, useReactFlow, Background, Controls } from '@xyflow/react'
import '@xyflow/react/dist/base.css'  // NOT dist/style.css
```

### PDF Page with Hardcoded Styles

```typescript
// Source: https://react-pdf.org/advanced
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/network-sizer/fonts/inter-regular.ttf', fontWeight: 400 },
    { src: '/network-sizer/fonts/inter-semibold.ttf', fontWeight: 600 },
  ],
})

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Inter', fontSize: 12 },
  sectionHeading: { fontSize: 20, fontWeight: 600, marginBottom: 16 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  cell: { flex: 1, padding: 6 },
})
```

### usePDF vs pdf() API (prefer pdf() for button-triggered generation)

```typescript
// Source: https://react-pdf.org/hooks + https://react-pdf.org/advanced
// Button-triggered: use pdf() imperative API
const blob = await pdf(<NetStackDocument bom={bom} topoPng={png} />).toBlob()

// Auto-updating: use usePDF hook (NOT preferred here — generates on render)
const [instance, update] = usePDF({ document: <NetStackDocument bom={bom} topoPng={png} /> })
```

### i18n Keys for New Phase 4 Copy

```typescript
// Keys to add to all 4 locale files (en, fr, de, it)
// Reference EN copy from UI-SPEC copywriting contract
{
  "topology": {
    "heading": "Topology Diagram",
    "fitView": "Fit View",
    "resetLayout": "Reset Layout",
    "legend": "Legend",
    "emptyHeading": "No topology available",
    "emptyBody": "Enter sizing parameters in the Sizing tab to generate the topology diagram.",
    "legendLeaf": "Leaf Switch",
    "legendSpine": "Spine Switch",
    "legendOob": "OOB Switch",
    "legendRack": "Rack",
    "legendHealthy": "Healthy (< 80%)",
    "legendWarning": "Warning (>= 80%)",
    "legendCritical": "Saturated (>= 100%)",
    "legendVlt": "VLT Link",
    "nodeAriaLabel": "{{model}} {{role}} — click for port details",
    "portUtilization": "Port Utilization",
    "portsFormat": "{{used}} / {{available}} used ({{pct}}%)"
  },
  "rack": {
    "heading": "Rack Elevation",
    "selectorLabel": "Rack",
    "selectorOptionFormat": "Rack {{n}} — {{switchCount}} switches",
    "emptyHeading": "No racks to display",
    "emptyBody": "Enter sizing parameters in the Sizing tab to generate the rack elevation view."
  },
  "export": {
    "heading": "Export",
    "csvHeading": "CSV Export",
    "csvDescription": "Download the Bill of Materials as a CSV file. Opens in Excel and Google Sheets.",
    "csvButton": "Export CSV",
    "pdfHeading": "PDF Report",
    "pdfDescription": "Generate a formatted report including BOM summary, sizing inputs, and topology diagram.",
    "pdfButton": "Export PDF",
    "printHeading": "Print",
    "printDescription": "Print the current view. Navigation controls are hidden automatically.",
    "printButton": "Print",
    "disabledTooltip": "Calculate a BOM first",
    "pdfGenerating": "Generating PDF...",
    "pdfErrorHeading": "PDF generation failed",
    "pdfErrorBody": "Unable to generate the report. Check your sizing inputs and try again."
  }
}
```

### Tailwind Saturation Border Color Helper (reuse BOMPanel pattern)

```typescript
// Source: src/features/sizing/BOMPanel.tsx (existing codebase)
// Reuse this exact pattern for topology nodes and rack devices
function getSaturationBorderClass(usedPorts: number, totalPorts: number): string {
  const pct = (usedPorts / totalPorts) * 100
  if (pct < 80) return 'border-[hsl(142_76%_36%)] dark:border-[hsl(142_69%_58%)]'
  if (pct < 100) return 'border-[hsl(38_92%_50%)] dark:border-[hsl(38_95%_64%)]'
  return 'border-destructive'
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reactflow` package | `@xyflow/react` package | v12 (2024) | Different import path — CLAUDE.md already specifies correct package |
| `reactflow` default export | Named exports from `@xyflow/react` | v12 | No more `import ReactFlow from 'reactflow'` — use `import { ReactFlow } from '@xyflow/react'` |
| node.width/node.height | node.measured.width/node.measured.height | v12 | Layout libs must read dimensions from `.measured` after first render |
| `PDFDownloadLink` always-renders | `pdf().toBlob()` on demand | v3+ | Critical for performance — prevents PDF re-computation on every render |
| Full `@xyflow/react/dist/style.css` | `@xyflow/react/dist/base.css` + CSS var overrides | v12 | Required for Tailwind integration without style conflicts |

**Deprecated/outdated:**

- `reactflow` (legacy package name): deprecated, use `@xyflow/react`
- `dagre` for layout: still works but not needed for a fixed 3-tier topology — hand-computed positions are simpler
- `@react-pdf/renderer` `<PDFDownloadLink>`: renders PDF on mount — use `pdf().toBlob()` for button-triggered download

---

## Open Questions

1. **Inter Font Bundling for PDF**
   - What we know: @react-pdf/renderer only supports TTF and WOFF. Font.register requires a URL accessible at runtime.
   - What's unclear: Whether Google Fonts CDN (fonts.gstatic.com) is reliably accessible in CI/CD builds and offline usage.
   - Recommendation: Download Inter TTF files into `public/fonts/` and reference via absolute path `/network-sizer/fonts/inter-*.ttf`. This is deterministic and works offline.

2. **Topology PNG Capture When Tab is Hidden**
   - What we know: ReactFlow canvas only has real dimensions when visible.
   - What's unclear: Whether a zero-dimension canvas (hidden tab) will produce a valid PNG via html-to-image or silently produce a blank image.
   - Recommendation: Cache the last captured PNG in a module-level ref whenever the topology canvas renders. PDF export uses the cached PNG. If cache is empty (user never visited Topology tab), show a warning: "Open the Topology tab before exporting to include the diagram."

3. **ReactFlow v12 `.measured` Dimensions for Custom Layout**
   - What we know: In v12, dimensions are on `node.measured.width/height` after first render, not on `node.width/height`.
   - What's unclear: Since this phase uses hand-computed positions (not a layout library), `.measured` may not matter — but the "Reset Layout" button needs to re-run the position algorithm after nodes are measured.
   - Recommendation: Run the position algorithm in a `useEffect` that fires after `nodes` are measured (check `nodes.every(n => n.measured)`), then call `fitView`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (latest, pinned in vite.config.ts `test` block) |
| Config file | `vite.config.ts` (test block — no separate vitest.config.ts) |
| Quick run command | `npx vitest run src/features/topology` |
| Full suite command | `npx vitest run` (109 tests currently passing) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIZ-01 | `buildTopologyGraph(bom)` returns correct node/edge count | unit | `npx vitest run src/features/topology/utils/buildTopologyGraph.test.ts` | Wave 0 |
| VIZ-01 | `buildTopologyGraph(bom)` produces deterministic positions on repeated calls | unit | same file | Wave 0 |
| VIZ-02 | `buildRackDevices(bom, 0)` returns correct devices for rack 0 | unit | `npx vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | Wave 0 |
| VIZ-03 | `getSaturationBorderClass(usedPorts, totalPorts)` returns correct Tailwind class | unit | `npx vitest run src/features/topology/nodes/SwitchNode.test.tsx` | Wave 0 |
| EXP-01 | `downloadBomCsv(bom)` — verify CSV string has UTF-8 BOM prefix and correct columns | unit | `npx vitest run src/features/export/exportCsv.test.ts` | Wave 0 |
| EXP-01 | CSV values with commas in Notes are properly quoted | unit | same file | Wave 0 |
| EXP-02 | `generatePdfBlob` resolves to a Blob instance | integration | `npx vitest run src/features/export/exportPdf.test.ts` | Wave 0 |
| EXP-03 | Print stylesheet rules exist in index.css (header/tablist hidden) | manual | visual check in browser print preview | n/a — manual |
| DOC-01 | ARD exists at docs/ARD.md | smoke | `npx vitest run docs/docs.test.ts` or fs check | Wave 0 |
| DOC-02 | PRD exists at docs/PRD.md | smoke | same file | Wave 0 |
| DOC-03 | User Guide exists at docs/USER-GUIDE.md | smoke | same file | Wave 0 |
| DOC-04 | Changelog exists at docs/CHANGELOG.md | smoke | same file | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/features/topology src/features/rack-elevation src/features/export`
- **Per wave merge:** `npx vitest run` (full suite — must be green)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/topology/utils/buildTopologyGraph.test.ts` — covers VIZ-01 deterministic layout
- [ ] `src/features/rack-elevation/utils/buildRackDevices.test.ts` — covers VIZ-02 device ordering
- [ ] `src/features/topology/nodes/SwitchNode.test.tsx` — covers VIZ-03 saturation coloring
- [ ] `src/features/export/exportCsv.test.ts` — covers EXP-01 CSV format and BOM prefix
- [ ] `src/features/export/exportPdf.test.ts` — covers EXP-02 PDF blob generation (mock @react-pdf/renderer)

---

## Sources

### Primary (HIGH confidence)

- `https://reactflow.dev/learn/customization/custom-nodes` — Custom node API, nodeTypes registration pattern
- `https://reactflow.dev/learn/advanced-use/typescript` — Typed NodeProps, Node<DataType> generic
- `https://reactflow.dev/learn/customization/theming` — colorMode prop, --xy-* CSS variables, base.css import
- `https://reactflow.dev/learn/layouting/layouting` — Layout algorithm options (dagre, ELK, custom)
- `https://reactflow.dev/learn/advanced-use/hooks-providers` — ReactFlowProvider + useReactFlow pattern
- `https://reactflow.dev/examples/misc/download-image` — getNodesBounds + getViewportForBounds + toPng pattern
- `https://react-pdf.org/advanced` — pdf().toBlob() imperative API, on-the-fly generation
- `https://react-pdf.org/hooks` — usePDF hook API (url, blob, loading, error, update())
- `https://react-pdf.org/fonts` — Font.register API, TTF/WOFF only, hyphenation

### Secondary (MEDIUM confidence)

- npm registry: `@xyflow/react@12.10.1` (dist-tags.latest verified 2026-03-17)
- npm registry: `@react-pdf/renderer@4.3.2` (dist-tags.latest verified 2026-03-17)
- npm registry: `html-to-image@1.11.13` (verified 2026-03-17)
- WebSearch cross-verified: UTF-8 BOM (\uFEFF) prefix pattern for Excel-compatible CSV

### Tertiary (LOW confidence)

- WebSearch only: Inter font offline bundling approach — specific behavior in CI not verified with official source; flagged for validation during implementation

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions verified against npm registry; library choices mandated by CLAUDE.md
- Architecture: HIGH — official React Flow docs verified; PDF pattern verified via react-pdf.org
- Pitfalls: HIGH for pitfalls 1–3 (documented in official sources); MEDIUM for pitfall 4 (diagram capture — inferred from known DOM visibility constraints)
- Validation: HIGH — existing test infrastructure confirmed working (109 tests pass); new test files listed as Wave 0 gaps

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable libraries; @xyflow/react and @react-pdf/renderer have regular releases — re-verify if implementation starts after 30 days)

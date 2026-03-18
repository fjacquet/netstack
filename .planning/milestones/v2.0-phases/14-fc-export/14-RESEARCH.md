# Phase 14: FC Export - Research

**Researched:** 2026-03-18
**Domain:** CSV/PDF export extension for Fibre Channel BOM — mode-gated, i18n-keyed, dual-fabric layout
**Confidence:** HIGH

---

## Summary

Phase 14 extends the existing export pipeline — `exportCsv.ts` / `exportPdf.ts` / PDF page components — to cover Fibre Channel mode. The Ethernet export path (`NetworkBOM`) and the FC export path (`FCNetworkBOM`) are parallel and must never share state. In FC mode the CSV adds dedicated Fabric A and Fabric B sections; the PDF gains a new `FCBOMPage` and an FC-aware topology page using `getLastFCTopologyPng`. All new strings require four-locale i18n keys.

The critical design constraint is that `ExportTab.tsx` is currently Ethernet-only: it imports from `useResultStore`, calls `downloadBomCsv(bom)`, and calls `generatePdfBlob(bom, png)`. To serve FC mode the tab must branch on the `mode` prop (or a store selector) and dispatch to a parallel set of FC-specific functions. The underlying library APIs (`@react-pdf/renderer ^4.3.2`, `vitest ^4.1.0`) are unchanged from the existing export phase.

**Primary recommendation:** Add `buildFCCsvString(bom: FCNetworkBOM): string` and `generateFCPdfBlob(bom: FCNetworkBOM, pngA?, pngB?): Promise<Blob>` as new parallel entry-points; update `ExportTab.tsx` to call the right function based on mode; add an `FCBOMPage.tsx` and optionally a `FCTopologyPage.tsx` to the PDF sub-folder; add i18n keys in all four locales.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FC-13 | CSV export includes FC BOM (switches, optics, ISLs, POD licenses) | `buildCsvString()` pattern in `exportCsv.ts` is directly replicable; `FCNetworkBOM` schema has all needed fields |
| FC-14 | PDF report includes FC BOM summary, inputs, and dual-fabric topology | `NetStackDocument` / `@react-pdf/renderer` PDF component pattern established; `getLastFCTopologyPng(fabric)` per-fabric cache already exists |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-pdf/renderer` | ^4.3.2 (already installed) | PDF generation | Project standard; lazy-loaded dynamically |
| `vitest` | ^4.1.0 (already installed) | Unit tests | Project-wide test framework |
| `react-i18next` | already installed | i18n keys in UI | Project-wide i18n layer |

No new npm dependencies are needed. v2.0 milestone explicitly prohibits new npm dependencies.

**Installation:** none required.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Parallel FC export functions | Generics over mode union | Generic approach increases type-system complexity and couples Ethernet/FC; project decision is strict domain isolation |

---

## Architecture Patterns

### Recommended File Structure

```
src/features/export/
├── exportCsv.ts                # Existing Ethernet CSV — do NOT modify logic
├── exportFCCsv.ts              # NEW: buildFCCsvString(bom: FCNetworkBOM): string
│                               #      downloadFCBomCsv(bom: FCNetworkBOM): void
├── exportPdf.ts                # Existing Ethernet PDF — do NOT modify
├── exportFCPdf.ts              # NEW: generateFCPdfBlob(bom, pngA?, pngB?): Promise<Blob>
├── ExportTab.tsx               # MODIFY: branch on mode prop → call FC or Ethernet functions
├── pdf/
│   ├── FCBOMPage.tsx           # NEW: dual-fabric switches, optics, ISLs, POD licenses, oversub
│   ├── FCInputsPage.tsx        # NEW: FC sizing parameters (hba ports, storage targets, model)
│   ├── FCTopologyPage.tsx      # NEW: two Image blocks — Fabric A PNG and Fabric B PNG
│   ├── FCViolationsPage.tsx    # NEW: FC constraint violations
│   ├── FCNetStackDocument.tsx  # NEW: Document wrapper for FC mode
│   ├── NetStackDocument.tsx    # Existing — untouched
│   └── ...existing pages
└── index.ts                    # MODIFY: re-export new FC functions
```

### Pattern 1: Mode-gated ExportTab

`ExportTab.tsx` receives `mode` as a prop (same `'ethernet' | 'fc'` type used in `App.tsx`). When `mode === 'fc'` it reads `useFCResultStore`, calls `downloadFCBomCsv(bom)` for CSV and `generateFCPdfBlob(bom, pngA, pngB)` for PDF.

```typescript
// ExportTab.tsx — mode prop addition (pattern from App.tsx)
interface ExportTabProps {
  mode: 'ethernet' | 'fc'
}

export function ExportTab({ mode }: ExportTabProps) {
  const { bom: ethBom } = useResultStore(useShallow((s) => ({ bom: s.bom })))
  const { bom: fcBom } = useFCResultStore(useShallow((s) => ({ bom: s.bom })))
  // ...
  const handleCsvExport = () => {
    if (mode === 'fc' && fcBom) { downloadFCBomCsv(fcBom); return }
    if (ethBom) downloadBomCsv(ethBom)
  }
}
```

App.tsx must pass `mode` prop: `<ExportTab mode={mode} />` — currently ExportTab is rendered only in ethernet mode (`{mode === 'ethernet' && ...}`). For FC export the tab must be shown in both modes.

### Pattern 2: FC CSV structure

The CSV follows the same column schema as Ethernet:
`Category, Model / Type, Role, Quantity, Unit, Connectivity, Notes`

FC sections to add:

| Category | Model / Type | Role | Qty | Unit | Connectivity | Notes |
|----------|-------------|------|-----|------|--------------|-------|
| Switch | `{model}` | FC Fabric A | `fabricASwitches` | each | FC | `{speedGbps}G` |
| Switch | `{model}` | FC Fabric B | `fabricBSwitches` | each | FC | `{speedGbps}G` |
| Optics | `{formFactor}` | FC Host/ISL | `fcOpticsCount` | each | FC | `protocol: FC` |
| Cable | ISL | FC ISL | `islCables` | each | FC | Inter-Switch Link |
| License | POD License | FC POD | `podLicensesRequired` | units | FC | |

Critical: Protocol column must be `"FC"` (not `"Ethernet"`) — SC-3 in phase success criteria.

**Section separator rows** between Fabric A and Fabric B:

```typescript
rows.push(['--- Fabric A ---', '', '', '', '', '', ''])
rows.push(['--- Fabric B ---', '', '', '', '', '', ''])
```

### Pattern 3: FC PDF components

`@react-pdf/renderer` Page/View/Text/Image/StyleSheet used exactly as in existing PDF pages. The only new element is the two-fabric topology page which embeds two `<Image>` blocks.

```typescript
// FCTopologyPage.tsx — source: existing TopologyPage.tsx pattern
import { Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'

interface FCTopologyPageProps {
  pngFabricA?: string
  pngFabricB?: string
}

export function FCTopologyPage({ pngFabricA, pngFabricB }: FCTopologyPageProps) {
  // render two image blocks, one per fabric
}
```

`generateFCPdfBlob` mirrors `generatePdfBlob` — dynamic import of `@react-pdf/renderer` + `FCNetStackDocument`:

```typescript
export async function generateFCPdfBlob(
  bom: FCNetworkBOM,
  pngFabricA?: string,
  pngFabricB?: string,
): Promise<Blob> {
  const [{ pdf }, { FCNetStackDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./pdf/FCNetStackDocument'),
  ])
  const element = React.createElement(FCNetStackDocument, { bom, pngFabricA, pngFabricB }) as unknown as React.ReactElement<any>
  return pdf(element).toBlob()
}
```

### Pattern 4: i18n keys

New keys live under `export.fc.*` namespace. All four locale files (EN, FR, DE, IT) must receive the same keys. Follow the existing pattern of flat string keys with `{{variable}}` interpolation for dynamic values.

Proposed new keys:

```json
"export": {
  "fc": {
    "csvFabricAHeading": "--- Fabric A ---",
    "csvFabricBHeading": "--- Fabric B ---",
    "roleFabricA": "FC Fabric A",
    "roleFabricB": "FC Fabric B",
    "roleOptics": "FC Optics",
    "roleIsl": "FC ISL Cables",
    "rolePod": "FC POD Licenses",
    "protocolFC": "FC",
    "pdfFCBomHeading": "FC Bill of Materials",
    "pdfFCInputsHeading": "FC Sizing Parameters",
    "pdfTopologyFabricA": "Fabric A Topology",
    "pdfTopologyFabricB": "Fabric B Topology",
    "pdfFCViolationsHeading": "FC Alerts"
  }
}
```

Note: existing `fcbom.*` keys (violationPortSatTitle, violationOversubBody etc.) already exist — PDF violation page should reuse these string literals rather than duplicate.

### Anti-Patterns to Avoid

- **Modifying `exportCsv.ts` to branch on mode:** Breaks Ethernet path. Create `exportFCCsv.ts` instead.
- **Importing FCNetworkBOM into NetStackDocument.tsx:** Cross-domain coupling. Keep FC document in `FCNetStackDocument.tsx`.
- **Synchronous PDF generation:** `@react-pdf/renderer` is always async via dynamic import; never call synchronously.
- **Capturing topology PNG inside ExportTab on click:** PNG must already be cached by `getLastFCTopologyPng(fabric)` from a previous render of `FCTopologyCanvas`. ExportTab reads the cache — it does not trigger a render.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF layout engine | Custom canvas/HTML print | `@react-pdf/renderer` | Already installed; handles A4 pagination, fonts, images |
| CSV quoting | Custom quote logic | `wrapCsvValue()` from `exportCsv.ts` | Already handles RFC 4180 edge cases (commas, quotes, newlines) |
| FC topology PNG capture | Re-implement canvas capture | `getLastFCTopologyPng('A')` / `getLastFCTopologyPng('B')` | Module-level cache from Phase 13; per-fabric |

---

## Common Pitfalls

### Pitfall 1: Export tab hidden in FC mode

**What goes wrong:** `App.tsx` currently renders `<ExportTab />` only when `mode === 'ethernet'`. If this guard is not removed, the export tab is invisible in FC mode and FC-13/FC-14 can never be reached.

**Why it happens:** Export was added in v1.x before FC mode existed.

**How to avoid:** Remove the `mode === 'ethernet'` guard from the export tab render and instead pass `mode` as a prop to `ExportTab`.

**Warning signs:** Export tab disappears when switching to FC mode in manual testing.

### Pitfall 2: Protocol column reads "Ethernet" for FC optics

**What goes wrong:** Copy-pasting the Ethernet CSV row builder produces `conn` (which equals `bom.input.connectivityType` = `'25G'`) in the Connectivity column for FC optics.

**Why it happens:** Ethernet and FC use the same column schema but different domain values.

**How to avoid:** Hard-code `'FC'` in the Connectivity column for all FC rows. This is a phase success criterion (SC-3).

### Pitfall 3: Both fabric PNGs are null when PDF is generated

**What goes wrong:** `getLastFCTopologyPng('A')` returns `null` because the user never visited the FC topology tab.

**Why it happens:** The topology PNG is only captured when `FCTopologyCanvas` mounts and renders. If the user goes directly to Export, no PNG exists.

**How to avoid:** Handle `null` gracefully in `FCTopologyPage` — render a placeholder text block ("Open Topology tab before exporting") just like the existing `TopologyPage` does.

### Pitfall 4: `@react-pdf/renderer` mock must be extended for FC PDF tests

**What goes wrong:** `exportPdf.test.ts` already mocks `@react-pdf/renderer`. The new `exportFCPdf.test.ts` must replicate the same mock pattern — or the test will try to import the real renderer (which crashes in Node/vitest).

**Why it happens:** `@react-pdf/renderer` has a browser-only PDF generation engine.

**How to avoid:** Copy the `vi.mock('@react-pdf/renderer', ...)` block from `exportPdf.test.ts` verbatim into `exportFCPdf.test.ts`. Add `FCNetStackDocument` to the mock list.

### Pitfall 5: CSV section separator rows break Excel pivot tables

**What goes wrong:** Inserting `--- Fabric A ---` separator rows with empty cells creates blank rows that confuse Excel structured table parsing.

**Why it happens:** CSV has no concept of sections.

**How to avoid:** Use a `Section` Category value in the first column (e.g., `Section,Fabric A,,,,,`) so filters and pivots can treat separators as data rows, not blanks. Alternatively use a blank-free comment row format.

---

## Code Examples

### FC CSV rows (parallel to Ethernet pattern)

```typescript
// Source: established pattern in src/features/export/exportCsv.ts
export function buildFCCsvRows(bom: FCNetworkBOM): string[][] {
  const rows: string[][] = []
  const model = bom.input.fcSwitchModel
  const speed = String(bom.input.islPortsPerSwitch) // placeholder — engine knows speed via catalog

  // Section header
  rows.push(['Section', 'Fabric A', '', '', '', 'FC', ''])
  rows.push(['Switch', model, 'FC Fabric A', String(bom.fabricASwitches), 'each', 'FC', ''])

  rows.push(['Section', 'Fabric B', '', '', '', 'FC', ''])
  rows.push(['Switch', model, 'FC Fabric B', String(bom.fabricBSwitches), 'each', 'FC', ''])

  // Shared BOM items (same for both fabrics)
  rows.push(['Optics', 'FC SFP', 'FC Host/ISL', String(bom.fcOpticsCount), 'each', 'FC', 'fibre-channel protocol'])
  rows.push(['Cable', 'ISL Cable', 'FC ISL', String(bom.islCables), 'each', 'FC', ''])
  if (bom.podLicensesRequired > 0) {
    rows.push(['License', 'POD License', 'FC POD', String(bom.podLicensesRequired), 'units', 'FC', ''])
  }

  // Violations as note rows
  for (const v of bom.violations) {
    if (v.code === 'FC_OVERSUBSCRIPTION_EXCEEDED') {
      rows.push(['Note', '', 'FC', '', '', '', `Fan-in ${v.ratio}:1 exceeds max ${v.maxRatio}:1`])
    }
    // ... other FC violations
  }

  return rows
}
```

### FC PDF document (parallel to NetStackDocument.tsx)

```typescript
// Source: established pattern in src/features/export/pdf/NetStackDocument.tsx
import { Document } from '@react-pdf/renderer'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'
import { CoverPage } from './CoverPage'      // reuse existing
import { FCInputsPage } from './FCInputsPage'
import { FCBOMPage } from './FCBOMPage'
import { FCTopologyPage } from './FCTopologyPage'
import { FCViolationsPage } from './FCViolationsPage'

interface FCNetStackDocumentProps {
  bom: FCNetworkBOM
  pngFabricA?: string
  pngFabricB?: string
}

export function FCNetStackDocument({ bom, pngFabricA, pngFabricB }: FCNetStackDocumentProps) {
  const generatedDate = new Date().toLocaleString('en-US', { /* same options */ })
  return (
    <Document title="NetStack — FC Sizing Report" author="NetStack" subject="Brocade FC SAN BOM Report">
      <CoverPage generatedDate={generatedDate} />
      <FCInputsPage input={bom.input} />
      <FCBOMPage bom={bom} />
      <FCTopologyPage pngFabricA={pngFabricA} pngFabricB={pngFabricB} />
      {bom.violations.length > 0 && <FCViolationsPage violations={bom.violations} />}
    </Document>
  )
}
```

### ExportTab mode branch (key change in App.tsx and ExportTab.tsx)

In `App.tsx` — change the export tab guard:

```typescript
// Before (ethernet-only):
{mode === 'ethernet' && (
  <TabsContent value="export" className="mt-0">
    <ExportTab />
  </TabsContent>
)}

// After (both modes):
<TabsContent value="export" className="mt-0">
  <ExportTab mode={mode} />
</TabsContent>
```

Note: the Export tab trigger in `TabsList` must also be un-gated.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| reactflow | @xyflow/react | v2.0 Phase 13 | FCTopologyCanvas already exports per-fabric PNG cache |
| Single-mode export | Mode-gated parallel export | Phase 14 | New FC path, Ethernet path unchanged |

---

## Open Questions

1. **Does `FCOpticsSpec.formFactor` need to appear in the CSV optics row?**
   - What we know: `FCOpticsSpec` has `formFactor: 'SFP28' | 'SFP+' | 'SFP-DD' | 'QSFP'` and `speedGbps`
   - What's unclear: The engine output `FCNetworkBOM` only has `fcOpticsCount` (a count integer), not the specific optic model. The switch model is in `bom.input.fcSwitchModel`.
   - Recommendation: Derive optic form factor from `FC_OPTICS_CATALOG[bom.input.fcSwitchModel]` at export time, or simply label the row "FC SFP Optics" with `speedGbps` derived from the switch catalog. The planner should specify whether to add an optic model lookup or keep it generic.

2. **Should the Export tab be visible as a separate tab or integrated with the existing export tab?**
   - What we know: App.tsx currently guards export tab on `mode === 'ethernet'`. The roadmap says "CSV and PDF exports include complete FC BOM data."
   - What's unclear: Whether FC export is a new tab or the same tab made mode-aware.
   - Recommendation: Same tab, mode-aware — lower friction for users switching between modes, consistent with single Export tab UX pattern.

3. **i18n PDF strings: use existing `fcbom.*` keys or new `export.fc.*` keys?**
   - What we know: `fcbom.violationPortSatTitle` etc. already exist in all 4 locales.
   - What's unclear: PDF pages in `@react-pdf/renderer` render outside the React tree and cannot call `useTranslation()`.
   - Recommendation: PDF pages use plain English string literals (not i18n) — same pattern as `BOMPage.tsx`, `ViolationsPage.tsx`, `InputsPage.tsx` which hardcode English. The i18n requirement (SC-4) applies to the CSV row labels and the ExportTab UI strings, not the PDF rendered text.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vite.config.ts` (vitest section) |
| Quick run command | `npx vitest run src/features/export/` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FC-13 | `buildFCCsvString(bom)` produces Fabric A and Fabric B sections | unit | `npx vitest run src/features/export/exportFCCsv.test.ts` | No — Wave 0 |
| FC-13 | FC rows have Protocol = "FC" not "Ethernet" | unit | same | No — Wave 0 |
| FC-13 | FC rows absent in Ethernet mode export (existing test guards) | unit | `npx vitest run src/features/export/exportCsv.test.ts` | Yes (existing) |
| FC-14 | `generateFCPdfBlob(bom)` returns a Blob | unit | `npx vitest run src/features/export/exportFCPdf.test.ts` | No — Wave 0 |
| FC-14 | `FCBOMPage` renders without throwing | unit | same | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/features/export/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (currently 375 passing) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/export/exportFCCsv.test.ts` — covers FC-13 CSV shape
- [ ] `src/features/export/exportFCPdf.test.ts` — covers FC-14 blob generation
- [ ] `src/features/export/pdf/FCBOMPage.tsx` — smoke test via `@react-pdf/renderer` mock

*(Existing test infrastructure: 375 tests passing, vitest ^4.1.0, no framework install needed)*

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `src/features/export/exportCsv.ts` — CSV structure, `wrapCsvValue`, header, violation rows
- Direct code inspection: `src/features/export/exportPdf.ts` — dynamic import pattern for lazy PDF generation
- Direct code inspection: `src/features/export/pdf/NetStackDocument.tsx`, `BOMPage.tsx`, `TopologyPage.tsx`, `ViolationsPage.tsx`, `InputsPage.tsx` — all PDF page patterns
- Direct code inspection: `src/domain/schemas/fc-bom.ts` — `FCNetworkBOM` fields available for export
- Direct code inspection: `src/domain/catalog/fc-types.ts` — `FCOpticsSpec.protocol: 'fibre-channel'` discriminant
- Direct code inspection: `src/features/topology/index.ts` — `getLastFCTopologyPng(fabric)` per-fabric cache API
- Direct code inspection: `src/App.tsx` — mode prop pattern, existing export tab guard
- Direct code inspection: `src/i18n/locales/en/translation.json` — existing i18n keys, `export.*` and `fcbom.*` namespaces
- Direct code inspection: `package.json` — `@react-pdf/renderer: ^4.3.2`, `vitest: ^4.1.0`

### Secondary (MEDIUM confidence)

- STATE.md accumulated context: `getLastFCTopologyPng(fabric)` per-fabric module-level cache noted in Phase 13-02 decision

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed, no new dependencies
- Architecture: HIGH — patterns are directly inherited from existing export code; FC schemas fully defined
- Pitfalls: HIGH — export tab gating pitfall confirmed by reading App.tsx; protocol column pitfall confirmed by reading fc-types.ts discriminant; PNG null pitfall confirmed by reading TopologyPage.tsx fallback pattern

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable — no fast-moving libraries involved)

# Phase 28: Export — Research

**Researched:** 2026-03-19
**Domain:** CSV/PDF export extension — cable schedule sections
**Confidence:** HIGH

## Summary

Phase 28 is a surgical extension of the existing export layer. All domain data
is already present in the BOM schemas (added in Phase 26). The export modules
follow a highly consistent pattern: a `buildXxxCsvRows()` function adds rows
after the existing BOM rows, and the PDF layer gains a new page component that
renders data using the established `@react-pdf/renderer` table pattern.

There are four affected export modules (Clos CSV, Clos PDF, Three-Tier CSV,
Three-Tier PDF) plus two propagation sites (FC CSV/PDF for
`islCableLengthSkuM`). The Converged export delegates to the sub-module
functions so it inherits changes automatically once the underlying modules are
updated — no separate changes are needed for `exportConvergedCsv.ts` or
`exportConvergedPdf.ts`.

The work is entirely additive: no existing rows are modified, no new BOM
fields are needed, and no store changes are required. The optional guard
(`cableSchedule` is typed as `z.object({...}).optional()` in both BOM schemas,
`islCableLengthSkuM` is `.optional()` in the FC BOM schema) means every export
function MUST check for presence before emitting cable schedule rows or the
cable schedule PDF section.

**Primary recommendation:** Extend the four CSV `buildRows` functions and four
PDF BOM page components; gate every addition on `bom.cableSchedule != null`
(or `bom.islCableLengthSkuM != null` for FC). No new files, no new store
wiring, no i18n required.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXP-05 | CSV export includes cable length schedule rows (link type, quantity, length, SKU) | `cableSchedule` / `islCableLengthSkuM` fields present in BOM schemas; existing `buildCsvRows` / `buildThreeTierCsvRows` / `buildFCCsvRows` patterns define how to append rows |
| EXP-06 | PDF export includes a cable schedule section | `BOMPage.tsx` / `ThreeTierBOMPage.tsx` / `FCBOMPage.tsx` patterns define how to add a `<Text style={styles.subheading}>` section with a `<View style={styles.table}>` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | (project-pinned) | PDF generation | Already used throughout; all BOM page components import from it |

### Supporting
No new libraries needed.

### Alternatives Considered
None — the export stack is locked by prior phases.

---

## Architecture Patterns

### Export Directory Layout (unchanged)
```
src/features/export/
├── exportCsv.ts              # Clos CSV — ADD cable schedule rows here
├── exportCsv.test.ts         # ADD tests for cable schedule rows
├── exportThreeTierCsv.ts     # Three-Tier CSV — ADD cable schedule rows here
├── exportThreeTierCsv.test.ts# ADD tests
├── exportFCCsv.ts            # FC CSV — ADD islCableLengthSkuM row here
├── exportFCCsv.test.ts       # ADD tests
├── exportConvergedCsv.ts     # Delegates — no change needed
├── exportPdf.ts              # Clos PDF entrypoint — no change needed
├── exportThreeTierPdf.ts     # Three-Tier PDF entrypoint — no change needed
├── exportFCPdf.ts            # FC PDF entrypoint — no change needed
├── exportConvergedPdf.ts     # Delegates — no change needed
└── pdf/
    ├── BOMPage.tsx           # Clos BOM — ADD CableSchedule subsection here
    ├── ThreeTierBOMPage.tsx  # Three-Tier BOM — ADD CableSchedule subsection
    ├── FCBOMPage.tsx         # FC BOM — ADD ISL cable length row here
    ├── NetStackDocument.tsx  # No change (BOMPage receives full bom)
    ├── ThreeTierNetStackDocument.tsx  # No change
    └── FCNetStackDocument.tsx         # No change
```

### Pattern 1: CSV cable schedule rows — Clos mode

Add after the transceiver rows block in `buildCsvRows()`, guarded on presence.

The existing CSV columns are:
`Category, Model / Type, Role, Quantity, Length (m), SKU (m), Notes`

Wait — the ACTUAL columns in the file are:
`Category, Model / Type, Role, Quantity, Unit, Connectivity, Notes`

There are only 7 columns, already defined by the header. The cable schedule
rows must reuse those same 7 columns. The mapping that fits without adding new
columns:

| Col 0 Category | Col 1 Model/Type | Col 2 Role | Col 3 Qty | Col 4 Unit | Col 5 Connectivity | Col 6 Notes |
|---|---|---|---|---|---|---|
| `Cable Schedule` | `Server-Leaf` | `Server-Leaf` | (qty from bom field, e.g. `bom.serverLeafCables`) | `each` | (conn) | `SKU: {n}m` |

However, the requirement asks for "link type, quantity, length, SKU". Given the
fixed 7-column format, the cleanest approach is to use a `Cable Schedule`
category in col 0, link type in col 1, role in col 2, qty in col 3, `m` in
col 4, connectivity in col 5, and `SKU: {n}m` in col 6 (Notes).

Alternatively — and more clearly matching the requirement — add a separate
section using `Section` category rows (as done in `buildFCCsvRows`) to visually
separate the cable schedule, then emit one data row per link type.

**Recommended approach:** Use a `Section,Cable Schedule,...` separator row
followed by `Cable Schedule` category rows:

```typescript
// Source: pattern from exportFCCsv.ts line 13 (Section row) and bom.cableSchedule
if (bom.cableSchedule) {
  rows.push(['Section', 'Cable Schedule', '', '', '', '', ''])
  rows.push([
    'Cable Schedule', 'Server-Leaf', 'Server-Leaf',
    String(bom.serverLeafCables), 'm', '', `SKU: ${bom.cableSchedule.serverLeafSkuM}m`
  ])
  rows.push([
    'Cable Schedule', 'Leaf-Spine', 'Leaf-Spine',
    String(bom.leafSpineCables), 'm', '', `SKU: ${bom.cableSchedule.leafSpineSkuM}m`
  ])
  rows.push([
    'Cable Schedule', 'VLT', 'VLT',
    String(bom.vltCables), 'm', '', `SKU: ${bom.cableSchedule.vltSkuM}m`
  ])
}
```

### Pattern 2: CSV cable schedule rows — Three-Tier mode

Same Section+data pattern in `buildThreeTierCsvRows()`:

```typescript
if (bom.cableSchedule) {
  rows.push(['Section', 'Cable Schedule', '', '', '', '', ''])
  rows.push(['Cable Schedule', 'Server-Access', 'Server-Access',
    String(bom.serverAccessCables), 'm', '',
    `SKU: ${bom.cableSchedule.serverAccessSkuM}m`])
  rows.push(['Cable Schedule', 'Access-Aggr', 'Access-Aggr',
    String(bom.accessAggrCables), 'm', '',
    `SKU: ${bom.cableSchedule.accessAggregationSkuM}m`])
  rows.push(['Cable Schedule', 'Aggr-Core', 'Aggr-Core',
    String(bom.aggrCoreCables), 'm', '',
    `SKU: ${bom.cableSchedule.aggregationCoreSkuM}m`])
}
```

### Pattern 3: CSV cable schedule — FC mode

`islCableLengthSkuM` is a top-level optional on `FCNetworkBOM` (not nested
under `cableSchedule`):

```typescript
if (bom.islCableLengthSkuM != null) {
  rows.push(['Section', 'Cable Schedule', '', '', '', 'FC', ''])
  rows.push([
    'Cable Schedule', 'ISL Cable', 'FC ISL',
    String(bom.islCables), 'm', 'FC',
    `SKU: ${bom.islCableLengthSkuM}m`
  ])
}
```

### Pattern 4: PDF cable schedule — shared table style

All BOM page components (`BOMPage.tsx`, `ThreeTierBOMPage.tsx`, `FCBOMPage.tsx`)
use an identical `StyleSheet.create({})` block with these relevant styles:

- `styles.subheading` — 14px, fontWeight 600, marginTop 20, marginBottom 8
- `styles.table` + `styles.headerRow` + `styles.row` — standard table layout
- `styles.colModel` (45%) + `styles.colRole` (35%) + `styles.colQty` (20%)
- `styles.headerText` — fontWeight 600, color '#444444'

For cable schedule, a 4-column table is needed:
`Link Type | Qty | Length | SKU`

Since the existing columns are 3 (Model 45%, Role 35%, Qty 20%), a cable
schedule table needs a new column breakdown. Options:

**Option A:** Reuse the same 3 column widths with different semantics:
- Col 1 (45%): Link Type
- Col 2 (35%): Qty (count)
- Col 3 (20%): SKU (e.g. "3m")

**Option B:** New 4-column layout with inline style widths:
- Link Type (40%), Qty (20%), Computed Length (20%), SKU (20%)

Option B is more explicit and matches the requirement better. Since
`StyleSheet.create` already defines `colModel/colRole/colQty`, adding the
cable schedule section inline with slightly different widths is clean:

```tsx
// Source: pattern from BOMPage.tsx (all existing PDF page components)
{bom.cableSchedule && (
  <>
    <Text style={styles.subheading}>Cable Schedule</Text>
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={{ width: '40%', ...styles.headerText }}>Link Type</Text>
        <Text style={{ width: '20%', ...styles.headerText }}>Qty</Text>
        <Text style={{ width: '20%', textAlign: 'right', ...styles.headerText }}>
          Length (m)
        </Text>
        <Text style={{ width: '20%', textAlign: 'right', ...styles.headerText }}>
          SKU
        </Text>
      </View>
      {/* one <View style={styles.row}> per link type */}
    </View>
  </>
)}
```

### Anti-Patterns to Avoid

- **Modifying the header row:** The 7-column CSV header is fixed and shared across all
  export functions. Never add an 8th column — this breaks Converged export which calls
  these functions and concatenates rows.
- **Touching `exportConvergedCsv.ts`:** This file calls `buildCsvRows()` and
  `buildThreeTierCsvRows()` directly. It will inherit cable schedule rows automatically
  once those functions are updated. Patching it separately would duplicate the logic.
- **Touching `exportConvergedPdf.ts` or `ConvergedNetStackDocument.tsx`:** Same
  delegation pattern — the PDF document passes the BOM to BOMPage/ThreeTierBOMPage
  which will render the cable schedule once those components are updated.
- **Skipping the optional guard:** `cableSchedule` can be undefined on older BOM
  objects (backward compat). Always guard with `bom.cableSchedule &&` before
  emitting rows.
- **Hardcoding length values:** The cable schedule section shows the SKU value
  from the BOM field (e.g. `serverLeafSkuM`), not a hardcoded number. The
  engine computed these.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cable SKU values | Recompute from geometry inputs | Read from `bom.cableSchedule.*` / `bom.islCableLengthSkuM` | Engine already computed these in Phase 26 |
| CSV escaping | Custom quote logic | `wrapCsvValue()` (already in `exportCsv.ts`) | Handles commas, embedded quotes, newlines per RFC 4180 |
| PDF page styles | Duplicate StyleSheet | Reuse styles object already defined in each BOMPage component | Consistent visual style, less code |

---

## Common Pitfalls

### Pitfall 1: Forgetting the optional guard on `cableSchedule`
**What goes wrong:** TypeScript compile error — property access on `undefined`.
**Why it happens:** `cableSchedule` is `.optional()` in the Zod schema (Phase 26
backward compat decision).
**How to avoid:** Always check `if (bom.cableSchedule)` before accessing fields.
**Warning signs:** TypeScript reports `Object is possibly 'undefined'`.

### Pitfall 2: Breaking the Converged CSV column count
**What goes wrong:** Converged export produces malformed CSV with inconsistent
column counts if cable schedule rows use a different column count than 7.
**Why it happens:** `buildConvergedCsvString` concatenates raw string rows from
`buildCsvRows()` and `buildFCCsvRows()` — all rows must have exactly 7 fields.
**How to avoid:** Every new cable schedule row must produce exactly 7 values
before joining with commas. Verify with `row.length === 7` in tests.
**Warning signs:** Converged CSV opens with misaligned columns in Excel.

### Pitfall 3: PDF page overflow
**What goes wrong:** Cable schedule section is added to a page that already has
content, pushing it past the A4 page boundary.
**Why it happens:** `BOMPage.tsx` already renders Oversubscription + Switches +
Cables sections. Adding a fourth section can overflow on large BOMs.
**How to avoid:** Keep the cable schedule table compact (3-4 rows max for Clos;
3 rows for Three-Tier; 1 row for FC). If overflow is observed during manual
testing, move the cable schedule to a standalone `CableSchedulePage.tsx`. For
Phase 28 scope (small tables), inline is acceptable.
**Warning signs:** Bottom rows are clipped in generated PDF.

### Pitfall 4: FC `islCableLengthSkuM` is top-level, not nested
**What goes wrong:** Code incorrectly accesses `bom.cableSchedule.islCableLengthSkuM`
which doesn't exist on FCNetworkBOM.
**Why it happens:** Ethernet modes use a nested `cableSchedule` object; FC uses
a flat top-level `islCableLengthSkuM` field (ADR-0009 parallel domain rule).
**How to avoid:** Read `fc-bom.ts` schema — `islCableLengthSkuM` is directly on
`FCNetworkBOMSchema`, not inside any nested object.
**Warning signs:** TypeScript error `Property 'cableSchedule' does not exist on type FCNetworkBOM`.

---

## Code Examples

### CSV row format (verified from existing files)

```typescript
// Source: src/features/export/exportCsv.ts line 25-27 (existing row pattern)
// 7 columns: Category, Model/Type, Role, Quantity, Unit, Connectivity, Notes
rows.push(['Switch', bom.input.leafModel, 'Leaf', String(bom.leafSwitches), 'each', conn, ''])

// Source: src/features/export/exportFCCsv.ts line 13 (Section row pattern)
rows.push(['Section', 'Fabric A', '', '', '', 'FC', ''])
```

### PDF table subheading + table (verified from BOMPage.tsx)

```tsx
// Source: src/features/export/pdf/BOMPage.tsx lines 121-134
<Text style={styles.subheading}>Switches</Text>
<View style={styles.table}>
  <View style={styles.headerRow}>
    <Text style={{ ...styles.colModel, ...styles.headerText }}>Model</Text>
    <Text style={{ ...styles.colRole, ...styles.headerText }}>Role</Text>
    <Text style={{ ...styles.colQty, ...styles.headerText }}>Qty</Text>
  </View>
  {switchRows.map(([model, role, qty]) => (
    <View key={model} style={styles.row}>
      <Text style={styles.colModel}>{model}</Text>
      <Text style={styles.colRole}>{role}</Text>
      <Text style={styles.colQty}>{qty}</Text>
    </View>
  ))}
</View>
```

### Conditional PDF section (verified from FCBOMPage.tsx)

```tsx
// Source: src/features/export/pdf/FCBOMPage.tsx lines 167-183
{bom.podLicensesRequired > 0 && (
  <>
    <Text style={styles.subheading}>POD Licenses</Text>
    <View style={styles.table}>
      ...
    </View>
  </>
)}
```

### PDF 4-column cable schedule (new pattern for Phase 28)

```tsx
// Inline width overrides — no new StyleSheet entry needed
{bom.cableSchedule && (
  <>
    <Text style={styles.subheading}>Cable Schedule</Text>
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Text style={{ width: '40%', fontWeight: 600, color: '#444444' }}>Link Type</Text>
        <Text style={{ width: '20%', fontWeight: 600, color: '#444444' }}>Qty</Text>
        <Text style={{ width: '20%', textAlign: 'right', fontWeight: 600, color: '#444444' }}>Length</Text>
        <Text style={{ width: '20%', textAlign: 'right', fontWeight: 600, color: '#444444' }}>SKU</Text>
      </View>
      <View style={styles.row}>
        <Text style={{ width: '40%' }}>Server-Leaf</Text>
        <Text style={{ width: '20%' }}>{bom.serverLeafCables}</Text>
        <Text style={{ width: '20%', textAlign: 'right' }}>{bom.cableSchedule.serverLeafSkuM}m</Text>
        <Text style={{ width: '20%', textAlign: 'right' }}>{bom.cableSchedule.serverLeafSkuM}m</Text>
      </View>
      {/* repeat for leafSpineSkuM, vltSkuM */}
    </View>
  </>
)}
```

Note: The "Length" and "SKU" columns show the same value (the SKU is the
already-rounded standard length). The requirement says "link type, quantity,
length, SKU" — since the engine rounds to the nearest standard SKU, the SKU IS
the recommended length. A simpler 3-column table (Link Type, Qty, SKU) is
equally valid and avoids redundancy; the planner should decide based on
EXP-05/EXP-06 wording.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No cable lengths in BOM | `cableSchedule` on NetworkBOM / ThreeTierBOM, `islCableLengthSkuM` on FCNetworkBOM | Phase 26 | Data source now available for export |
| Flat 5m DAC limit in catalog | Speed-specific limits (3m @ 25G, 5m @ 100G) | Phase 25 | No impact on export |

---

## Open Questions

1. **Column layout in the PDF cable schedule: 3-column or 4-column?**
   - What we know: EXP-06 says "cable schedule section" with "same data" as CSV;
     EXP-05 says "link type, quantity, length, SKU"
   - What's unclear: Since SKU equals the length (the engine maps to nearest
     standard SKU), a 3-column table (Type, Qty, SKU) may be less redundant
     than a 4-column table (Type, Qty, Length, SKU)
   - Recommendation: Use 3 columns (Link Type, Qty, SKU m) for simplicity.
     If the design review wants explicit separation, add a 4th column.

2. **Cable count column in the CSV cable schedule**
   - What we know: EXP-05 says "link type, quantity, length, SKU"
   - What's unclear: "quantity" could mean cable count (e.g. serverLeafCables=40)
     or metres-per-cable (the SKU value)
   - Recommendation: Use cable count (e.g. 40) as Qty, and SKU as the length
     value in the Notes column. This matches procurement intent.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (node environment) |
| Config file | vite.config.ts (vitest section) |
| Quick run command | `npx vitest run src/features/export/exportCsv.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-05 | `buildCsvRows()` emits cable schedule rows when `cableSchedule` is present | unit | `npx vitest run src/features/export/exportCsv.test.ts` | ✅ (extend) |
| EXP-05 | `buildThreeTierCsvRows()` emits cable schedule rows when `cableSchedule` is present | unit | `npx vitest run src/features/export/exportThreeTierCsv.test.ts` | ✅ (extend) |
| EXP-05 | `buildFCCsvRows()` emits ISL cable length row when `islCableLengthSkuM` is present | unit | `npx vitest run src/features/export/exportFCCsv.test.ts` | ✅ (extend) |
| EXP-05 | No cable schedule rows emitted when `cableSchedule` is undefined | unit | same as above | ✅ (extend) |
| EXP-06 | `generatePdfBlob()` returns a Blob (smoke test) | smoke | `npx vitest run src/features/export/exportPdf.test.ts` | ✅ (extend mockBom) |
| EXP-06 | `generateThreeTierPdfBlob()` returns a Blob (smoke test) | smoke | `npx vitest run src/features/export/exportThreeTierPdf.test.ts` | ✅ (extend mockBom) |
| EXP-06 | `generateFCPdfBlob()` returns a Blob (smoke test) | smoke | `npx vitest run src/features/export/exportFCPdf.test.ts` | ✅ (extend mockBom) |

All test files already exist — the task is to add new test cases to each.

### Sampling Rate
- **Per task commit:** `npx vitest run src/features/export/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. No new test
files need to be created; existing test files need new cases added.

---

## Sources

### Primary (HIGH confidence)
- Direct code reading: `src/features/export/exportCsv.ts` — 7-column CSV format, wrapCsvValue pattern
- Direct code reading: `src/features/export/exportFCCsv.ts` — Section row pattern, conditional license row
- Direct code reading: `src/features/export/pdf/BOMPage.tsx` — StyleSheet, table pattern, conditional sections
- Direct code reading: `src/features/export/pdf/FCBOMPage.tsx` — conditional POD licenses section
- Direct code reading: `src/domain/schemas/bom.ts` — `cableSchedule` is `.optional()` on NetworkBOMSchema
- Direct code reading: `src/domain/schemas/three-tier-bom.ts` — `cableSchedule` is `.optional()` on ThreeTierBOMSchema
- Direct code reading: `src/domain/schemas/fc-bom.ts` — `islCableLengthSkuM` is `.optional()` top-level on FCNetworkBOMSchema
- Direct code reading: `src/features/export/exportConvergedCsv.ts` — delegates to buildCsvRows/buildThreeTierCsvRows/buildFCCsvRows
- Direct code reading: `src/features/export/exportConvergedPdf.ts` — delegates to sub-document components

### Secondary (MEDIUM confidence)
None needed — all findings are from direct code inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing patterns directly read from source
- Architecture: HIGH — export patterns are consistent and verified from 6 existing export files
- Pitfalls: HIGH — optional guard and column-count constraints derived directly from schema and code
- Test patterns: HIGH — existing test files read directly; mock pattern is clear

**Research date:** 2026-03-19
**Valid until:** 2026-06-19 (stable codebase; expires when export modules change structurally)

# ADR-0006: @react-pdf/renderer with Dynamic Import for PDF Generation

## Status
Accepted

## Date
2026-03-17

## Context
NetStack needs to generate a multi-page PDF report containing: sizing inputs, Bill of Materials table, oversubscription badge, constraint violation alerts, and a topology diagram snapshot. The PDF feature is in the Export tab and is triggered by user action, not on page load.

Three PDF approaches were evaluated:

| Approach | Library | Notes |
|----------|---------|-------|
| PDF viewer | `react-pdf` | Viewer only — renders existing PDFs, cannot generate them |
| Inline PDF link | `@react-pdf/renderer` `PDFDownloadLink` | Renders the PDF component inside the React tree; triggers on mount, not on click |
| Programmatic generation | `@react-pdf/renderer` `pdf().toBlob()` | Returns a Promise<Blob>; caller controls timing; no React lifecycle coupling |

The `PDFDownloadLink` approach was rejected because:
1. It begins rendering the PDF in the background as soon as it mounts, wasting CPU on page load
2. The `usePDF` hook similarly starts generation immediately
3. Both approaches cause a noticeable jank on initial render when the BOM is large

## Decision
Use **@react-pdf/renderer** with **dynamic import()** and the `pdf().toBlob()` API.

The PDF module is loaded only when the user clicks "Export PDF":

```typescript
const { pdf } = await import('@react-pdf/renderer');
const blob = await pdf(<BomReportDocument bom={bom} />).toBlob();
```

This pattern:
- Defers the ~200 KB library load until first use (improves initial page load)
- Generates the PDF on-demand (no background CPU usage)
- Returns a `Blob` that the caller converts to an object URL for download

The PDF component (`BomReportDocument`) is a pure React component using @react-pdf/renderer primitives (`Document`, `Page`, `View`, `Text`, `StyleSheet`) — no HTML, no DOM.

## Consequences
- First PDF generation takes slightly longer (library download + parse), subsequent generations in the same session are fast
- `@react-pdf/renderer` is incompatible with `react-pdf` (the viewer); both cannot coexist with the same import name — the project uses only `@react-pdf/renderer`
- PDF layout uses fixed-width columns (no CSS flexbox); all measurements are in points (pt) not pixels
- The topology diagram cannot be embedded as an SVG in the PDF; a static text summary is included instead

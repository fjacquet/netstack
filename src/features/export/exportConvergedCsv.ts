import type { ConvergedBOM } from '@/domain/schemas/converged-bom'
import { wrapCsvValue, buildCsvRows } from './exportCsv'
import { buildFCCsvRows } from './exportFCCsv'

/**
 * Builds a single CSV string combining Ethernet and FC BOM sections.
 * When fcBom is null, only Ethernet rows are included (no FC section separator).
 *
 * Format:
 *   - UTF-8 BOM character on first line
 *   - Single header row (never duplicated)
 *   - Section,Ethernet separator (only when fcBom is present)
 *   - Ethernet data rows
 *   - Section,Fabric A + FC Fabric A rows (only when fcBom is present)
 *   - Section,Fabric B + FC Fabric B rows (only when fcBom is present)
 *   - FC optics, cables, licenses, notes (only when fcBom is present)
 *   - CRLF line endings per RFC 4180
 */
export function buildConvergedCsvString(bom: ConvergedBOM): string {
  const BOM_CHAR = '\uFEFF'
  const header = 'Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes'

  // Ethernet rows (buildCsvRows returns pre-joined comma-separated strings)
  const ethernetRows = buildCsvRows(bom.ethernetBom)

  const allRows: string[] = []

  if (bom.fcBom !== null) {
    // Add Ethernet section separator
    allRows.push(
      ['Section', 'Ethernet', '', '', '', 'Ethernet', ''].map(wrapCsvValue).join(',')
    )
  }

  // Add Ethernet data rows
  allRows.push(...ethernetRows)

  if (bom.fcBom !== null) {
    // FC rows (buildFCCsvRows returns string[][] -- needs wrapCsvValue+join)
    const fcRows = buildFCCsvRows(bom.fcBom).map(
      (row) => row.map(wrapCsvValue).join(',')
    )
    allRows.push(...fcRows)
  }

  return BOM_CHAR + '\r\n' + [header, ...allRows].join('\r\n')
}

/**
 * Triggers a browser download of the converged BOM as a CSV file.
 * Filename: netstack-converged-bom.csv
 */
export function downloadConvergedBomCsv(bom: ConvergedBOM): void {
  const csv = buildConvergedCsvString(bom)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'netstack-converged-bom.csv'
  a.click()
  URL.revokeObjectURL(url)
}

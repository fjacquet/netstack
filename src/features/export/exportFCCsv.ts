import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'
import { wrapCsvValue } from './exportCsv'

/**
 * Builds the array of CSV rows for an FC BOM.
 * All data rows use 'FC' as the Connectivity column value (column index 5).
 * Section separator rows use 'Section' as the Category value.
 */
export function buildFCCsvRows(bom: FCNetworkBOM): string[][] {
  const rows: string[][] = []

  // Fabric A section
  rows.push(['Section', 'Fabric A', '', '', '', 'FC', ''])
  rows.push([
    'Switch',
    bom.input.fcSwitchModel,
    'FC Fabric A',
    String(bom.fabricASwitches),
    'each',
    'FC',
    '',
  ])

  // Fabric B section
  rows.push(['Section', 'Fabric B', '', '', '', 'FC', ''])
  rows.push([
    'Switch',
    bom.input.fcSwitchModel,
    'FC Fabric B',
    String(bom.fabricBSwitches),
    'each',
    'FC',
    '',
  ])

  // Optics
  rows.push([
    'Optics',
    'FC SFP',
    'FC Host/ISL',
    String(bom.fcOpticsCount),
    'each',
    'FC',
    'fibre-channel',
  ])

  // ISL cables
  rows.push([
    'Cable',
    'ISL Cable',
    'FC ISL',
    String(bom.islCables),
    'each',
    'FC',
    'Inter-Switch Link',
  ])

  // POD license row — only when required
  if (bom.podLicensesRequired > 0) {
    rows.push([
      'License',
      'POD License',
      'FC POD',
      String(bom.podLicensesRequired),
      'units',
      'FC',
      '',
    ])
  }

  // Fan-in ratio informational note
  rows.push([
    'Note',
    '',
    'FC Oversubscription',
    '',
    '',
    'FC',
    'Fan-in ratio: ' + bom.fanInRatio.toFixed(1) + ':1',
  ])

  // Violation notes
  for (const v of bom.violations) {
    if (v.code === 'FC_OVERSUBSCRIPTION_EXCEEDED') {
      rows.push([
        'Note',
        '',
        'FC',
        '',
        '',
        'FC',
        `Fan-in ${v.ratio}:1 exceeds max ${v.maxRatio}:1`,
      ])
    } else if (v.code === 'FC_PORT_SATURATION') {
      rows.push([
        'Note',
        '',
        'FC',
        '',
        '',
        'FC',
        `Port saturation: ${v.requiredPorts} required, ${v.availablePorts} available`,
      ])
    } else if (v.code === 'FC_ISL_UNDERPROVISIONED') {
      rows.push([
        'Note',
        '',
        'FC',
        '',
        '',
        'FC',
        `ISL underprovisioned: ${v.islsRequired} required, ${v.islsAvailable} available`,
      ])
    }
  }

  return rows
}

/**
 * Builds a CSV string for an FC BOM with UTF-8 BOM prefix for Excel compatibility.
 * Header: "Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes"
 * Line endings use CRLF per RFC 4180.
 * All data rows use 'FC' in the Connectivity column — never 'Ethernet' or '25G'.
 */
export function buildFCCsvString(bom: FCNetworkBOM): string {
  const BOM_CHAR = '\uFEFF'
  const header = 'Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes'
  const rows = buildFCCsvRows(bom).map((row) => row.map(wrapCsvValue).join(','))
  return BOM_CHAR + '\r\n' + [header, ...rows].join('\r\n')
}

/**
 * Triggers a browser download of the FC BOM as a CSV file.
 * Filename: netstack-fc-bom.csv
 */
export function downloadFCBomCsv(bom: FCNetworkBOM): void {
  const csv = buildFCCsvString(bom)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'netstack-fc-bom.csv'
  a.click()
  URL.revokeObjectURL(url)
}

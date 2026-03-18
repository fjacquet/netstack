import type { NetworkBOM } from '@/domain/schemas/bom'

/**
 * Wraps a CSV value in double quotes if it contains commas, double quotes, or newlines.
 * Internal double quotes are escaped by doubling them.
 */
export function wrapCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export function buildCsvRows(bom: NetworkBOM): string[] {
  const rows: string[][] = []
  const conn = bom.input.connectivityType
  const cableLabel =
    bom.input.cableType === 'DAC'
      ? 'DAC'
      : bom.input.cableType === 'AOC'
        ? 'AOC'
        : 'Fiber'

  // Switches
  rows.push(['Switch', bom.input.leafModel, 'Leaf', String(bom.leafSwitches), 'each', conn, ''])
  rows.push(['Switch', 'S5232F-ON', 'Spine', String(bom.spineSwitches), 'each', conn, ''])
  rows.push(['Switch', 'S3248T-ON', 'OOB', String(bom.oobSwitches), 'each', '1G', ''])

  // Cables
  rows.push([
    'Cable',
    'Leaf-Spine',
    'Leaf-Spine',
    String(bom.leafSpineCables),
    'each',
    conn,
    cableLabel,
  ])
  rows.push([
    'Cable',
    'Server-Leaf',
    'Server-Leaf',
    String(bom.serverLeafCables),
    'each',
    conn,
    cableLabel,
  ])
  rows.push([
    'Cable',
    'Server-OOB',
    'Server-OOB',
    String(bom.serverOobCables),
    'each',
    '1G',
    'RJ45',
  ])
  rows.push([
    'Cable',
    'VLT Interconnect',
    'VLT',
    String(bom.vltCables),
    'each',
    '100G',
    'QSFP28-DD',
  ])

  // Transceivers (only for fiber — DAC/AOC are integrated)
  if (bom.sfp28Count > 0) {
    rows.push([
      'Transceiver',
      'SFP28',
      'Server-Leaf',
      String(bom.sfp28Count),
      'each',
      '25G',
      '',
    ])
  }
  if (bom.qsfp28Count > 0) {
    rows.push([
      'Transceiver',
      'QSFP28',
      'Leaf-Spine',
      String(bom.qsfp28Count),
      'each',
      '100G',
      '',
    ])
  }

  // Violation notes as informational rows
  for (const v of bom.violations) {
    if (v.code === 'OOB_PORT_SATURATION') {
      rows.push([
        'Note',
        '',
        'OOB',
        '',
        '',
        '',
        `OOB Port Saturation: ${v.required} ports required, ${v.available} available`,
      ])
    } else if (v.code === 'SPINE_CAPACITY_EXCEEDED') {
      rows.push([
        'Note',
        '',
        'Spine',
        '',
        '',
        '',
        `Spine Capacity Exceeded: ${v.leafCount} leafs exceed ${v.maxLeafs} port capacity`,
      ])
    } else if (v.code === 'DAC_DISTANCE_ADVISORY') {
      rows.push([
        'Note',
        '',
        '',
        '',
        '',
        '',
        `DAC Distance Advisory: ${v.rackCount} racks — verify cable runs within 3m spec`,
      ])
    }
  }

  return rows.map((row) => row.map(wrapCsvValue).join(','))
}

/**
 * Builds a CSV string with UTF-8 BOM prefix for Excel compatibility.
 * The BOM character is on its own first "line" (index 0 after split by \r\n),
 * followed by the header row (index 1) and data rows.
 * Line endings use CRLF per RFC 4180.
 */
export function buildCsvString(bom: NetworkBOM): string {
  const BOM_CHAR = '\uFEFF'
  const header = 'Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes'
  const rows = buildCsvRows(bom)
  return BOM_CHAR + '\r\n' + [header, ...rows].join('\r\n')
}

/**
 * Triggers a browser download of the BOM as a CSV file.
 * Includes UTF-8 BOM for Excel compatibility.
 */
export function downloadBomCsv(bom: NetworkBOM): void {
  const csv = buildCsvString(bom)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'netstack-bom.csv'
  a.click()
  URL.revokeObjectURL(url)
}

import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'
import { wrapCsvValue } from './exportCsv'

/**
 * Builds 7-column CSV rows for a three-tier BOM.
 * Columns: Category, Model / Type, Role, Quantity, Unit, Connectivity, Notes
 */
export function buildThreeTierCsvRows(bom: ThreeTierBOM): string[] {
  const rows: string[][] = []
  const conn = bom.input.connectivityType
  const cableLabel =
    bom.input.cableType === 'DAC'
      ? 'DAC'
      : bom.input.cableType === 'AOC'
        ? 'AOC'
        : 'Fiber'

  // Switches -- Access, Aggregation, Core, OOB
  rows.push(['Switch', bom.input.accessModel, 'Access', String(bom.accessSwitches), 'each', conn, ''])
  rows.push(['Switch', bom.input.aggregationModel, 'Aggregation', String(bom.aggregationSwitches), 'each', conn, ''])
  rows.push(['Switch', bom.input.coreModel, 'Core', String(bom.coreSwitches), 'each', conn, ''])
  rows.push(['Switch', 'S3248T-ON', 'OOB', String(bom.oobSwitches), 'each', '1G', ''])

  // Border leaf (optional)
  if (bom.borderLeafSwitches > 0) {
    rows.push(['Switch', bom.input.borderLeafModel, 'Border Leaf', String(bom.borderLeafSwitches), 'each', conn, ''])
  }

  // Cables
  rows.push([
    'Cable',
    'Server-Access',
    'Server-Access',
    String(bom.serverAccessCables),
    'each',
    conn,
    cableLabel,
  ])
  rows.push([
    'Cable',
    'Access-Aggr',
    'Access-Aggr',
    String(bom.accessAggrCables),
    'each',
    conn,
    cableLabel,
  ])
  rows.push([
    'Cable',
    'Aggr-Core',
    'Aggr-Core',
    String(bom.aggrCoreCables),
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

  // Transceivers (only for fiber -- DAC/AOC are integrated)
  if (bom.sfp28Count > 0) {
    rows.push([
      'Transceiver',
      'SFP28',
      'Server-Access',
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
      'Inter-Tier',
      String(bom.qsfp28Count),
      'each',
      '100G',
      '',
    ])
  }
  if (bom.qsfp56ddCount > 0) {
    rows.push([
      'Transceiver',
      'QSFP56-DD',
      'Inter-Tier',
      String(bom.qsfp56ddCount),
      'each',
      '400G',
      '',
    ])
  }

  // Violation notes
  for (const v of bom.violations) {
    if (v.code === 'AGGREGATION_CAPACITY_EXCEEDED') {
      rows.push([
        'Note',
        '',
        'Aggregation',
        '',
        '',
        '',
        `Aggregation Capacity Exceeded: ${v.accessUplinks} access uplinks exceed ${v.aggrDownlinks} aggregation downlinks`,
      ])
    } else if (v.code === 'CORE_CAPACITY_EXCEEDED') {
      rows.push([
        'Note',
        '',
        'Core',
        '',
        '',
        '',
        `Core Capacity Exceeded: ${v.aggrUplinks} aggregation uplinks exceed ${v.coreDownlinks} core downlinks`,
      ])
    } else if (v.code === 'OOB_PORT_SATURATION') {
      rows.push([
        'Note',
        '',
        'OOB',
        '',
        '',
        '',
        `OOB Port Saturation: ${v.required} ports required, ${v.available} available`,
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
    } else if (v.code === 'RACK_CAPACITY_EXCEEDED') {
      rows.push([
        'Note',
        '',
        'Rack',
        '',
        '',
        '',
        `Rack Capacity Exceeded: rack ${v.rackNumber} uses ${v.usedU}U of ${v.totalU}U`,
      ])
    }
  }

  return rows.map((row) => row.map(wrapCsvValue).join(','))
}

/**
 * Builds a CSV string with UTF-8 BOM prefix for Excel compatibility.
 * Line endings use CRLF per RFC 4180.
 */
export function buildThreeTierCsvString(bom: ThreeTierBOM): string {
  const BOM_CHAR = '\uFEFF'
  const header = 'Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes'
  const rows = buildThreeTierCsvRows(bom)
  return BOM_CHAR + '\r\n' + [header, ...rows].join('\r\n')
}

/**
 * Triggers a browser download of the three-tier BOM as a CSV file.
 */
export function downloadThreeTierBomCsv(bom: ThreeTierBOM): void {
  const csv = buildThreeTierCsvString(bom)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'netstack-three-tier-bom.csv'
  a.click()
  URL.revokeObjectURL(url)
}

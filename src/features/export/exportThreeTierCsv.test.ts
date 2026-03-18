import { describe, it, expect, vi } from 'vitest'
import { buildThreeTierCsvRows, buildThreeTierCsvString, downloadThreeTierBomCsv } from './exportThreeTierCsv'
import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'

const mockThreeTierBom: ThreeTierBOM = {
  racks: 2,
  networkRacks: 1,
  accessSwitches: 4,
  aggregationSwitches: 2,
  coreSwitches: 2,
  oobSwitches: 1,
  borderLeafSwitches: 0,
  serverAccessCables: 40,
  accessAggrCables: 16,
  aggrCoreCables: 8,
  serverOobCables: 44,
  vltCables: 2,
  sfp28Count: 0,
  qsfp28Count: 0,
  qsfp56ddCount: 0,
  accessToAggrOversubscription: 2.5,
  aggrToCoreOversubscription: 2,
  switchPositioning: 'ToR',
  recommendedCableLengthM: 2,
  violations: [],
  input: {
    racks: [{ serverCount: 20 }, { serverCount: 20 }],
    portsPerServerFrontend: 1,
    portsPerServerBackend: 1,
    connectivityType: '25G',
    cableType: 'DAC',
    accessModel: 'S5248F-ON',
    activeUplinksPerAccess: 4,
    aggregationModel: 'Z9264F-ON',
    activeUplinksPerAggregation: 4,
    coreModel: 'Z9332F-ON',
    borderLeafModel: 'none',
    borderLeafCount: 0,
    rackSize: '42U',
    serverUHeight: '1U',
    switchPositioning: 'ToR',
  },
}

describe('buildThreeTierCsvRows', () => {
  it('produces rows for access switches with role Access', () => {
    const rows = buildThreeTierCsvRows(mockThreeTierBom)
    const accessRow = rows.find((r) => r.includes('Access') && r.includes('S5248F-ON'))
    expect(accessRow).toBeDefined()
    expect(accessRow).toContain('Switch')
    expect(accessRow).toContain('4')
  })

  it('produces rows for aggregation switches with role Aggregation', () => {
    const rows = buildThreeTierCsvRows(mockThreeTierBom)
    const aggrRow = rows.find((r) => r.includes('Aggregation') && r.includes('Z9264F-ON'))
    expect(aggrRow).toBeDefined()
    expect(aggrRow).toContain('Switch')
    expect(aggrRow).toContain('2')
  })

  it('produces rows for core switches with role Core', () => {
    const rows = buildThreeTierCsvRows(mockThreeTierBom)
    const coreRow = rows.find((r) => r.includes('Core') && r.includes('Z9332F-ON'))
    expect(coreRow).toBeDefined()
    expect(coreRow).toContain('Switch')
    expect(coreRow).toContain('2')
  })

  it('produces rows for OOB switches', () => {
    const rows = buildThreeTierCsvRows(mockThreeTierBom)
    const oobRow = rows.find((r) => r.includes('OOB') && r.includes('S3248T-ON'))
    expect(oobRow).toBeDefined()
    expect(oobRow).toContain('Switch')
  })

  it('produces cable rows for Server-Access, Access-Aggr, Aggr-Core, Server-OOB, VLT', () => {
    const rows = buildThreeTierCsvRows(mockThreeTierBom)
    const joined = rows.join('\n')
    expect(joined).toContain('Server-Access')
    expect(joined).toContain('Access-Aggr')
    expect(joined).toContain('Aggr-Core')
    expect(joined).toContain('Server-OOB')
    expect(joined).toContain('VLT Interconnect')
  })

  it('does not include border leaf row when borderLeafSwitches is 0', () => {
    const rows = buildThreeTierCsvRows(mockThreeTierBom)
    const joined = rows.join('\n')
    expect(joined).not.toContain('Border Leaf')
  })

  it('includes border leaf row when borderLeafSwitches > 0', () => {
    const bomWithBorderLeaf: ThreeTierBOM = {
      ...mockThreeTierBom,
      borderLeafSwitches: 2,
      input: {
        ...mockThreeTierBom.input,
        borderLeafModel: 'S5248F-ON',
        borderLeafCount: 2,
      },
    }
    const rows = buildThreeTierCsvRows(bomWithBorderLeaf)
    const joined = rows.join('\n')
    expect(joined).toContain('Border Leaf')
    expect(joined).toContain('S5248F-ON')
  })

  it('includes transceiver rows when sfp28Count > 0', () => {
    const bomWithTransceivers: ThreeTierBOM = {
      ...mockThreeTierBom,
      sfp28Count: 80,
    }
    const rows = buildThreeTierCsvRows(bomWithTransceivers)
    const joined = rows.join('\n')
    expect(joined).toContain('SFP28')
    expect(joined).toContain('80')
  })

  it('includes transceiver rows when qsfp28Count > 0', () => {
    const bomWithTransceivers: ThreeTierBOM = {
      ...mockThreeTierBom,
      qsfp28Count: 32,
    }
    const rows = buildThreeTierCsvRows(bomWithTransceivers)
    const joined = rows.join('\n')
    expect(joined).toContain('QSFP28')
    expect(joined).toContain('32')
  })

  it('includes transceiver rows when qsfp56ddCount > 0', () => {
    const bomWithTransceivers: ThreeTierBOM = {
      ...mockThreeTierBom,
      qsfp56ddCount: 16,
    }
    const rows = buildThreeTierCsvRows(bomWithTransceivers)
    const joined = rows.join('\n')
    expect(joined).toContain('QSFP56-DD')
    expect(joined).toContain('16')
  })

  it('includes violation note for AGGREGATION_CAPACITY_EXCEEDED', () => {
    const bomWithViolation: ThreeTierBOM = {
      ...mockThreeTierBom,
      violations: [
        { code: 'AGGREGATION_CAPACITY_EXCEEDED', accessUplinks: 32, aggrDownlinks: 24 },
      ],
    }
    const rows = buildThreeTierCsvRows(bomWithViolation)
    const joined = rows.join('\n')
    expect(joined).toContain('Aggregation Capacity Exceeded')
  })

  it('includes violation note for CORE_CAPACITY_EXCEEDED', () => {
    const bomWithViolation: ThreeTierBOM = {
      ...mockThreeTierBom,
      violations: [
        { code: 'CORE_CAPACITY_EXCEEDED', aggrUplinks: 16, coreDownlinks: 8 },
      ],
    }
    const rows = buildThreeTierCsvRows(bomWithViolation)
    const joined = rows.join('\n')
    expect(joined).toContain('Core Capacity Exceeded')
  })

  it('includes violation note for OOB_PORT_SATURATION', () => {
    const bomWithViolation: ThreeTierBOM = {
      ...mockThreeTierBom,
      violations: [
        { code: 'OOB_PORT_SATURATION', required: 60, available: 48 },
      ],
    }
    const rows = buildThreeTierCsvRows(bomWithViolation)
    const joined = rows.join('\n')
    expect(joined).toContain('OOB Port Saturation')
  })

  it('includes violation note for DAC_DISTANCE_ADVISORY', () => {
    const bomWithViolation: ThreeTierBOM = {
      ...mockThreeTierBom,
      violations: [
        { code: 'DAC_DISTANCE_ADVISORY', rackCount: 5, cableType: 'DAC' },
      ],
    }
    const rows = buildThreeTierCsvRows(bomWithViolation)
    const joined = rows.join('\n')
    expect(joined).toContain('DAC Distance Advisory')
  })

  it('includes violation note for RACK_CAPACITY_EXCEEDED', () => {
    const bomWithViolation: ThreeTierBOM = {
      ...mockThreeTierBom,
      violations: [
        { code: 'RACK_CAPACITY_EXCEEDED', rackNumber: 1, usedU: 46, totalU: 42 },
      ],
    }
    const rows = buildThreeTierCsvRows(bomWithViolation)
    const joined = rows.join('\n')
    expect(joined).toContain('Rack Capacity Exceeded')
  })
})

describe('buildThreeTierCsvString', () => {
  it('starts with UTF-8 BOM character', () => {
    const csv = buildThreeTierCsvString(mockThreeTierBom)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('has exactly one header row', () => {
    const csv = buildThreeTierCsvString(mockThreeTierBom)
    const lines = csv.split('\r\n')
    const headerLines = lines.filter(
      (l) => l === 'Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes'
    )
    expect(headerLines).toHaveLength(1)
  })

  it('contains access, aggregation, core, and OOB switch rows', () => {
    const csv = buildThreeTierCsvString(mockThreeTierBom)
    expect(csv).toContain('Switch,S5248F-ON,Access')
    expect(csv).toContain('Switch,Z9264F-ON,Aggregation')
    expect(csv).toContain('Switch,Z9332F-ON,Core')
    expect(csv).toContain('Switch,S3248T-ON,OOB')
  })

  it('contains cable rows', () => {
    const csv = buildThreeTierCsvString(mockThreeTierBom)
    expect(csv).toContain('Cable,Server-Access')
    expect(csv).toContain('Cable,Access-Aggr')
    expect(csv).toContain('Cable,Aggr-Core')
    expect(csv).toContain('Cable,Server-OOB')
    expect(csv).toContain('Cable,VLT Interconnect')
  })
})

describe('downloadThreeTierBomCsv', () => {
  it('triggers download with filename netstack-three-tier-bom.csv', () => {
    const mockClick = vi.fn()
    const mockCreateElement = vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement)
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock')
    const mockRevokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = mockCreateObjectURL
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL

    downloadThreeTierBomCsv(mockThreeTierBom)

    expect(mockCreateElement).toHaveBeenCalledWith('a')
    expect(mockClick).toHaveBeenCalled()
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()

    const anchor = mockCreateElement.mock.results[0]?.value as { download: string }
    expect(anchor.download).toBe('netstack-three-tier-bom.csv')

    mockCreateElement.mockRestore()
  })
})

import { describe, it, expect } from 'vitest'
import { buildCsvString, buildCsvRows, wrapCsvValue } from './exportCsv'
import type { NetworkBOM } from '@/domain/schemas/bom'

const mockBom: NetworkBOM = {
  racks: 2,
  networkRacks: 1,
  leafSwitches: 4,
  spineSwitches: 2,
  oobSwitches: 1,
  borderLeafSwitches: 0,
  leafSpineCables: 8,
  serverLeafCables: 40,
  serverOobCables: 44,
  sfp28Count: 0,
  qsfp28Count: 0,
  vltCables: 2,
  oversubscriptionRatio: 3,
  switchPositioning: 'ToR',
  recommendedCableLengthM: 2,
  violations: [],
  advisories: [],
  input: {
    topology: 'leaf-spine',
    racks: [{ serverCount: 20 }, { serverCount: 20 }],
    portsPerServerFrontend: 1,
    portsPerServerBackend: 1,
    connectivityType: '25G',
    cableType: 'DAC',
    activeUplinksPerLeaf: 4,
    leafModel: 'S5248F-ON',
    spineModel: 'S5232F-ON',
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
    existingSpinesDeployed: false,
    existingCoreDeployed: false,
    rackPitchMm: 600,
    racksAdjacent: true,
    patchPanelDistanceM: 1,
  },
}

describe('wrapCsvValue', () => {
  it('passes through simple strings', () => {
    expect(wrapCsvValue('hello')).toBe('hello')
  })
  it('wraps values containing commas in double quotes', () => {
    expect(wrapCsvValue('hello, world')).toBe('"hello, world"')
  })
  it('doubles internal double quotes', () => {
    expect(wrapCsvValue('say "hi"')).toBe('"say ""hi"""')
  })
})

const mockBomWithCableSchedule: NetworkBOM = {
  ...mockBom,
  cableSchedule: {
    serverLeafSkuM: 3,
    leafSpineSkuM: 5,
    vltSkuM: 1,
  },
}

describe('buildCsvRows - cable schedule', () => {
  it('emits a Section separator row and 3 data rows when cableSchedule is present', () => {
    const rows = buildCsvRows(mockBomWithCableSchedule)
    const joined = rows.join('\n')
    expect(joined).toContain('Section,Cable Schedule')
    const scheduleRows = rows.filter((r) => r.startsWith('Cable Schedule,'))
    expect(scheduleRows).toHaveLength(3)
  })

  it('emits Server-Leaf cable schedule row with correct SKU in Notes column', () => {
    const rows = buildCsvRows(mockBomWithCableSchedule)
    const serverLeafRow = rows.find((r) => r.includes('Server-Leaf') && r.startsWith('Cable Schedule,'))
    expect(serverLeafRow).toBeDefined()
    expect(serverLeafRow).toContain('SKU: 3m')
  })

  it('emits Leaf-Spine cable schedule row with correct SKU in Notes column', () => {
    const rows = buildCsvRows(mockBomWithCableSchedule)
    const leafSpineRow = rows.find((r) => r.includes('Leaf-Spine') && r.startsWith('Cable Schedule,'))
    expect(leafSpineRow).toBeDefined()
    expect(leafSpineRow).toContain('SKU: 5m')
  })

  it('emits VLT cable schedule row with correct SKU in Notes column', () => {
    const rows = buildCsvRows(mockBomWithCableSchedule)
    const vltRow = rows.find((r) => r.includes('VLT') && r.startsWith('Cable Schedule,'))
    expect(vltRow).toBeDefined()
    expect(vltRow).toContain('SKU: 1m')
  })

  it('emits zero cable schedule rows when cableSchedule is undefined', () => {
    const rows = buildCsvRows(mockBom)
    const joined = rows.join('\n')
    expect(joined).not.toContain('Cable Schedule,')
    expect(joined).not.toContain('Section,Cable Schedule')
  })

  it('every cable schedule row has exactly 7 comma-separated fields', () => {
    const rows = buildCsvRows(mockBomWithCableSchedule)
    const scheduleRows = rows.filter(
      (r) => r.startsWith('Cable Schedule,') || r.startsWith('Section,Cable Schedule')
    )
    for (const row of scheduleRows) {
      const fields = row.split(',')
      expect(fields).toHaveLength(7)
    }
  })
})

describe('buildCsvString', () => {
  it('starts with UTF-8 BOM character', () => {
    const csv = buildCsvString(mockBom)
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
  })
  it('has correct header row', () => {
    const csv = buildCsvString(mockBom)
    const lines = csv.split('\r\n')
    expect(lines[1]).toBe('Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes')
  })
  it('contains switch rows for leaf, spine, and OOB', () => {
    const csv = buildCsvString(mockBom)
    expect(csv).toContain('Switch,S5248F-ON,Leaf')
    expect(csv).toContain('Switch,S5232F-ON,Spine')
    expect(csv).toContain('Switch,S3248T-ON,OOB')
  })
  it('contains cable rows', () => {
    const csv = buildCsvString(mockBom)
    expect(csv).toContain('Cable,Leaf-Spine')
    expect(csv).toContain('Cable,Server-Leaf')
    expect(csv).toContain('Cable,Server-OOB')
    expect(csv).toContain('Cable,VLT Interconnect')
  })
})

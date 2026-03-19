import { describe, it, expect } from 'vitest'
import { buildCsvString, wrapCsvValue } from './exportCsv'
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

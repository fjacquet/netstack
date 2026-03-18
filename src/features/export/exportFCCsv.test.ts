import { describe, it, expect } from 'vitest'
import { buildFCCsvString } from './exportFCCsv'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'

const mockFCBom: FCNetworkBOM = {
  fabricASwitches: 2,
  fabricBSwitches: 2,
  hostPortsPerFabric: 40,
  storagePortsPerFabric: 4,
  islPortsPerFabric: 4,
  switchPortsPerFabric: 48,
  podLicensesRequired: 24,
  fcOpticsCount: 88,
  islCables: 8,
  fanInRatio: 5,
  islOversubscriptionRatio: 1.2,
  violations: [],
  input: {
    racks: [{ serverCount: 20 }, { serverCount: 20 }],
    hbaPortsPerServer: 2,
    storageTargetPorts: 8,
    storageArrayCount: 1,
    fcSwitchModel: 'G720',
    islPortsPerSwitch: 4,
    rackSize: '42U',
    serverUHeight: '1U',
    preferredGeneration: 'gen7',
  },
}

const mockFCBomNoPod: FCNetworkBOM = {
  ...mockFCBom,
  podLicensesRequired: 0,
}

const mockFCBomWithViolations: FCNetworkBOM = {
  ...mockFCBom,
  violations: [
    {
      code: 'FC_OVERSUBSCRIPTION_EXCEEDED',
      ratio: 10,
      maxRatio: 7,
      minStoragePorts: 12,
    },
    {
      code: 'FC_PORT_SATURATION',
      requiredPorts: 60,
      availablePorts: 48,
    },
    {
      code: 'FC_ISL_UNDERPROVISIONED',
      islsAvailable: 2,
      islsRequired: 4,
    },
  ],
}

describe('buildFCCsvString', () => {
  it('starts with UTF-8 BOM character', () => {
    const csv = buildFCCsvString(mockFCBom)
    expect(csv.charCodeAt(0)).toBe(0xFEFF)
  })

  it('has correct header row', () => {
    const csv = buildFCCsvString(mockFCBom)
    const lines = csv.split('\r\n')
    expect(lines[1]).toBe('Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes')
  })

  it('contains Fabric A switch row with correct quantity', () => {
    const csv = buildFCCsvString(mockFCBom)
    expect(csv).toContain('Switch,G720,FC Fabric A,2,each,FC,')
  })

  it('contains Fabric B switch row with correct quantity', () => {
    const csv = buildFCCsvString(mockFCBom)
    expect(csv).toContain('Switch,G720,FC Fabric B,2,each,FC,')
  })

  it('contains Optics row with fcOpticsCount quantity and FC connectivity', () => {
    const csv = buildFCCsvString(mockFCBom)
    expect(csv).toContain('Optics,FC SFP,FC Host/ISL,88,each,FC,')
  })

  it('contains ISL cable row', () => {
    const csv = buildFCCsvString(mockFCBom)
    expect(csv).toContain('Cable,ISL Cable,FC ISL,8,each,FC,')
  })

  it('contains POD license row when podLicensesRequired > 0', () => {
    const csv = buildFCCsvString(mockFCBom)
    expect(csv).toContain('License,POD License,FC POD,24,units,FC,')
  })

  it('does not contain License row when podLicensesRequired === 0', () => {
    const csv = buildFCCsvString(mockFCBomNoPod)
    expect(csv).not.toContain('License,POD License')
  })

  it('all FC data rows have FC in the Connectivity column (column index 5)', () => {
    const csv = buildFCCsvString(mockFCBom)
    const lines = csv.split('\r\n')
    // Skip BOM line (index 0) and header (index 1), check all data rows
    const dataLines = lines.slice(2).filter((line) => line.length > 0)
    for (const line of dataLines) {
      const cols = line.split(',')
      // Connectivity is column index 5 (0-based)
      expect(cols[5]).toBe('FC')
    }
  })

  it('FC_OVERSUBSCRIPTION_EXCEEDED violation produces a Note row with fan-in ratio text', () => {
    const csv = buildFCCsvString(mockFCBomWithViolations)
    expect(csv).toContain('Note')
    expect(csv).toContain('Fan-in 10')
  })

  it('section separator rows use Section as Category value', () => {
    const csv = buildFCCsvString(mockFCBom)
    expect(csv).toContain('Section,Fabric A')
    expect(csv).toContain('Section,Fabric B')
  })
})

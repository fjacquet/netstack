import { describe, it, expect, vi } from 'vitest'
import { buildConvergedCsvString, downloadConvergedBomCsv } from './exportConvergedCsv'
import type { ConvergedBOM } from '@/domain/schemas/converged-bom'
import type { NetworkBOM } from '@/domain/schemas/bom'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'

const mockEthernetBom: NetworkBOM = {
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
  },
}

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

const mockConvergedInput = {
  topology: 'leaf-spine' as const,
  racks: [{ serverCount: 20 }, { serverCount: 20 }],
  rackSize: '42U' as const,
  serverUHeight: '1U' as const,
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  activeUplinksPerLeaf: 4,
  connectivityType: '25G' as const,
  cableType: 'DAC' as const,
  leafModel: 'S5248F-ON' as const,
  spineModel: 'S5232F-ON' as const,
  borderLeafModel: 'none' as const,
  borderLeafCount: 0,
  switchPositioning: 'ToR' as const,
  accessModel: 'S5248F-ON' as const,
  aggregationModel: 'Z9264F-ON' as const,
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON' as const,
  hbaPortsPerServer: 2,
  storageTargetPorts: 8,
  storageArrayCount: 1,
  fcSwitchModel: 'G720' as const,
  islPortsPerSwitch: 4,
  preferredGeneration: 'gen7' as const,
}

const convergedBomWithFC: ConvergedBOM = {
  topology: 'leaf-spine',
  ethernetBom: mockEthernetBom,
  threeTierBom: null,
  fcBom: mockFCBom,
  violations: [],
  input: mockConvergedInput,
}

const convergedBomNoFC: ConvergedBOM = {
  topology: 'leaf-spine',
  ethernetBom: mockEthernetBom,
  threeTierBom: null,
  fcBom: null,
  violations: [],
  input: { ...mockConvergedInput, hbaPortsPerServer: 0 },
}

describe('buildConvergedCsvString', () => {
  it('starts with UTF-8 BOM character when fcBom is null', () => {
    const csv = buildConvergedCsvString(convergedBomNoFC)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it('has exactly one header row when fcBom is null (no duplicate headers)', () => {
    const csv = buildConvergedCsvString(convergedBomNoFC)
    const lines = csv.split('\r\n')
    const headerLines = lines.filter(
      (l) => l === 'Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes'
    )
    expect(headerLines).toHaveLength(1)
  })

  it('contains Ethernet switch rows but no FC section separator when fcBom is null', () => {
    const csv = buildConvergedCsvString(convergedBomNoFC)
    expect(csv).toContain('Switch,S5248F-ON,Leaf')
    expect(csv).toContain('Switch,S5232F-ON,Spine')
    expect(csv).toContain('Switch,S3248T-ON,OOB')
    expect(csv).not.toContain('Section,Fibre Channel')
    expect(csv).not.toContain('Section,Fabric A')
  })

  it('contains Section,Ethernet header separator row when fcBom is present', () => {
    const csv = buildConvergedCsvString(convergedBomWithFC)
    expect(csv).toContain('Section,Ethernet')
  })

  it('contains Section,Fabric A and Section,Fabric B rows when fcBom is present', () => {
    const csv = buildConvergedCsvString(convergedBomWithFC)
    expect(csv).toContain('Section,Fabric A')
    expect(csv).toContain('Section,Fabric B')
  })

  it('has exactly one header row when fcBom is present (CSV header appears once, not twice)', () => {
    const csv = buildConvergedCsvString(convergedBomWithFC)
    const lines = csv.split('\r\n')
    const headerLines = lines.filter(
      (l) => l === 'Category,Model / Type,Role,Quantity,Unit,Connectivity,Notes'
    )
    expect(headerLines).toHaveLength(1)
  })
})

describe('downloadConvergedBomCsv', () => {
  it('triggers download with filename netstack-converged-bom.csv', () => {
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

    downloadConvergedBomCsv(convergedBomNoFC)

    expect(mockCreateElement).toHaveBeenCalledWith('a')
    expect(mockClick).toHaveBeenCalled()
    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalled()

    // Verify the download filename
    const anchor = mockCreateElement.mock.results[0]?.value as { download: string }
    expect(anchor.download).toBe('netstack-converged-bom.csv')

    mockCreateElement.mockRestore()
  })
})

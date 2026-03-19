import { describe, it, expect, vi } from 'vitest'
import type { ConvergedBOM } from '@/domain/schemas/converged-bom'
import type { NetworkBOM } from '@/domain/schemas/bom'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'

vi.mock('@react-pdf/renderer', () => ({
  pdf: () => ({ toBlob: () => Promise.resolve(new Blob(['test'])) }),
  Document: ({ children }: { children: unknown }) => children,
  Page: ({ children }: { children: unknown }) => children,
  View: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  Image: () => null,
  StyleSheet: { create: (s: unknown) => s },
  Font: { register: () => {} },
}))

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
  existingSpinesDeployed: false,
  existingCoreDeployed: false,
  rackPitchMm: 600,
  racksAdjacent: true,
  patchPanelDistanceM: 1,
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

describe('generateConvergedPdfBlob', () => {
  it('returns a Blob when fcBom is present', async () => {
    const { generateConvergedPdfBlob } = await import('./exportConvergedPdf')
    const blob = await generateConvergedPdfBlob(convergedBomWithFC)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('returns a Blob when fcBom is null (Ethernet-only)', async () => {
    const { generateConvergedPdfBlob } = await import('./exportConvergedPdf')
    const blob = await generateConvergedPdfBlob(convergedBomNoFC)
    expect(blob).toBeInstanceOf(Blob)
  })
})

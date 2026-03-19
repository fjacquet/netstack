import { describe, it, expect, vi } from 'vitest'
import type { NetworkBOM } from '@/domain/schemas/bom'

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
  },
}

describe('generatePdfBlob', () => {
  it('returns a Blob', async () => {
    const { generatePdfBlob } = await import('./exportPdf')
    const blob = await generatePdfBlob(mockBom)
    expect(blob).toBeInstanceOf(Blob)
  })
})

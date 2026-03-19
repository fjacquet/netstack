import { describe, it, expect, vi } from 'vitest'
import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'

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
  advisories: [],
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
    existingCoreDeployed: false,
    rackPitchMm: 600,
    racksAdjacent: true,
    patchPanelDistanceM: 1,
  },
}

describe('generateThreeTierPdfBlob', () => {
  it('returns a Blob', async () => {
    const { generateThreeTierPdfBlob } = await import('./exportThreeTierPdf')
    const blob = await generateThreeTierPdfBlob(mockThreeTierBom)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('returns a Blob with topoDiagramPng', async () => {
    const { generateThreeTierPdfBlob } = await import('./exportThreeTierPdf')
    const blob = await generateThreeTierPdfBlob(mockThreeTierBom, 'data:image/png;base64,abc')
    expect(blob).toBeInstanceOf(Blob)
  })
})

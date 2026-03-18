import { describe, it, expect, vi } from 'vitest'
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

describe('generateFCPdfBlob', () => {
  it('returns a Blob without topology PNGs', async () => {
    const { generateFCPdfBlob } = await import('./exportFCPdf')
    const blob = await generateFCPdfBlob(mockFCBom)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('returns a Blob with Fabric A and Fabric B topology PNGs', async () => {
    const { generateFCPdfBlob } = await import('./exportFCPdf')
    const blob = await generateFCPdfBlob(
      mockFCBom,
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    )
    expect(blob).toBeInstanceOf(Blob)
  })
})

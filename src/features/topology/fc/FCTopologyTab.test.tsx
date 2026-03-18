import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'

// Mock @xyflow/react — prevent canvas/WebGL errors in jsdom
vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ReactFlow: () => <div data-testid="react-flow" />,
  Background: () => null,
  Controls: () => null,
  useReactFlow: () => ({
    fitView: vi.fn(),
    getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
  }),
}))

// Mock theme provider
vi.mock('@/components/theme-provider', () => ({
  useTheme: () => ({ theme: 'light' }),
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

// Mock captureTopologyPng utility (used inside FCTopologyCanvas)
vi.mock('../utils/captureTopologyPng', () => ({
  captureTopologyPng: vi.fn(() => Promise.resolve('data:image/png;base64,test')),
}))

// Minimal FCNetworkBOM for smoke testing — matches FCNetworkBOMSchema shape
const makeMockBOM = (): FCNetworkBOM => ({
  fabricASwitches: 2,
  fabricBSwitches: 2,
  islPortsPerFabric: 2,
  islCables: 4,
  fcOpticsCount: 8,
  hostPortsPerFabric: 8,
  storagePortsPerFabric: 4,
  podLicensesRequired: 0,
  fanInRatio: 7,
  islOversubscriptionRatio: 1,
  violations: [],
  input: {
    racks: [{ serverCount: 10 }],
    hbaPortsPerServer: 2,
    storageTargetPorts: 4,
    storageArrayCount: 1,
    fcSwitchModel: 'G720',
    islPortsPerSwitch: 2,
    rackSize: '42U',
    serverUHeight: '1U',
    preferredGeneration: 'any',
  },
})

// Mock useFCResultStore — selector receives { bom }
const mockStoreState: { bom: FCNetworkBOM | null } = { bom: null }
vi.mock('@/store/fcResultStore', () => ({
  useFCResultStore: (selector: (s: { bom: FCNetworkBOM | null }) => unknown) =>
    selector(mockStoreState),
}))

// Import after mocks are set up
import { FCTopologyTab } from './FCTopologyTab'

describe('FCTopologyTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crash when bom is available', () => {
    mockStoreState.bom = makeMockBOM()

    expect(() => render(<FCTopologyTab />)).not.toThrow()
    // Two react-flow canvases (one per fabric) should render
    const canvases = screen.getAllByTestId('react-flow')
    expect(canvases.length).toBe(2)
  })

  it('shows empty state when bom is null', () => {
    mockStoreState.bom = null

    render(<FCTopologyTab />)
    // The empty state heading uses t('topology.emptyHeading')
    expect(screen.getByText('topology.emptyHeading')).toBeInTheDocument()
  })
})

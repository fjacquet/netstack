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

// Minimal FCNetworkBOM for smoke testing
const makeMockBOM = (): FCNetworkBOM => ({
  fabricASwitches: 2,
  fabricBSwitches: 2,
  islPortsPerFabric: 2,
  islCables: 4,
  totalSwitches: 4,
  hostPortsPerFabric: 8,
  storagePortsPerFabric: 4,
  podLicensesRequired: 0,
  fanInRatio: 7,
  islOversubscriptionRatio: 1,
  violations: [],
  input: {
    fcSwitchModel: 'G720',
    totalServers: 10,
    fcInitiatorsPerServer: 2,
    storageControllers: 2,
    targetPortsPerController: 4,
    islPortsPerSwitch: 2,
    targetFanIn: 7,
  },
})

// Mock useFCResultStore
const mockUseFCResultStore = vi.fn()
vi.mock('@/store/fcResultStore', () => ({
  useFCResultStore: (selector: (s: { bom: FCNetworkBOM | null; violations: unknown[] }) => unknown) =>
    mockUseFCResultStore(selector),
}))

// Import after mocks are set up
import { FCTopologyTab } from './FCTopologyTab'

describe('FCTopologyTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crash when bom is available', () => {
    const bom = makeMockBOM()
    // useShallow selector — return bom directly
    mockUseFCResultStore.mockImplementation((selector: (s: { bom: FCNetworkBOM | null }) => unknown) =>
      selector({ bom, violations: [] }),
    )

    expect(() => render(<FCTopologyTab />)).not.toThrow()
    // Two react-flow canvases (one per fabric) should render
    const canvases = screen.getAllByTestId('react-flow')
    expect(canvases.length).toBe(2)
  })

  it('shows empty state when bom is null', () => {
    mockUseFCResultStore.mockImplementation((selector: (s: { bom: null; violations: [] }) => unknown) =>
      selector({ bom: null, violations: [] }),
    )

    render(<FCTopologyTab />)
    // The empty state heading uses t('topology.emptyHeading')
    expect(screen.getByText('topology.emptyHeading')).toBeInTheDocument()
  })
})

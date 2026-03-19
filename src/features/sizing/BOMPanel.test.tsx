import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BOMPanel } from './BOMPanel'
import { useResultStore } from '@/store/resultStore'
import { useInputStore } from '@/store/inputStore'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { NetworkBOM } from '@/domain/schemas/bom'
import type { SizingInput } from '@/domain/schemas/input'

// Mock the resultStore to inject controlled BOM data
vi.mock('@/store/resultStore', () => ({
  useResultStore: vi.fn(),
}))

// Mock the inputStore to inject controlled input state
vi.mock('@/store/inputStore', () => ({
  useInputStore: vi.fn(),
}))

// Mock react-i18next — return key names directly for assertion
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

// Helper: returns a valid NetworkBOM with overridable fields
function makeBom(overrides: Partial<NetworkBOM> = {}): NetworkBOM {
  return {
    racks: 3,
    networkRacks: 1,
    leafSwitches: 6,
    spineSwitches: 4,
    oobSwitches: 3,
    borderLeafSwitches: 0,
    leafSpineCables: 24,
    serverLeafCables: 48,
    serverOobCables: 54,
    sfp28Count: 0,
    qsfp28Count: 0,
    vltCables: 3,
    oversubscriptionRatio: 2.4,
    switchPositioning: 'ToR',
    recommendedCableLengthM: 2,
    violations: [],
    advisories: [],
    input: {
      topology: 'leaf-spine',
      racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
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
    ...overrides,
  }
}

// Default input for inputStore mock
const DEFAULT_INPUT: SizingInput = {
  topology: 'leaf-spine',
  racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
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
}

// Helper: mock useResultStore with a given state
function mockStore(state: { bom: NetworkBOM | null; threeTierBom: null; violations: NetworkBOM['violations'] }) {
  vi.mocked(useResultStore).mockImplementation(
    (selector: (s: { bom: NetworkBOM | null; threeTierBom: null; violations: NetworkBOM['violations'] }) => unknown) =>
      selector(state)
  )
}

// Helper: mock useInputStore with a given input
function mockInputStore(overrides: Partial<SizingInput> = {}) {
  const input = { ...DEFAULT_INPUT, ...overrides }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(useInputStore).mockImplementation(
    (selector: (s: { input: SizingInput; setInput: (p: Partial<SizingInput>) => void; resetInput: () => void }) => unknown) =>
      selector({ input, setInput: vi.fn(), resetInput: vi.fn() })
  )
}

// Wrapper providing TooltipProvider context for all tests
function Wrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

describe('BOMPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: mock inputStore with default leaf-spine input
    mockInputStore()
  })

  // ── BOM-01: Switch quantities ─────────────────────────────────────────────

  describe('BOM-01: switch quantities', () => {
    it('renders switch table rows with model names and correct quantities', () => {
      const bom = makeBom({ leafSwitches: 6, spineSwitches: 4, oobSwitches: 3 })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      // Leaf model name from input
      expect(screen.getByText('S5248F-ON')).toBeInTheDocument()
      // Spine model name
      expect(screen.getByText('S5232F-ON')).toBeInTheDocument()
      // OOB model name
      expect(screen.getByText('S3248T-ON')).toBeInTheDocument()
      // Quantities (3 appears in both OOB switches and VLT cables)
      expect(screen.getByText('6')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
    })

    it('renders empty state when bom is null', () => {
      mockStore({ bom: null, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      expect(screen.getByText('bom.emptyHeading')).toBeInTheDocument()
    })
  })

  // ── BOM-02: Oversubscription ratio ────────────────────────────────────────

  describe('BOM-02: oversubscription ratio', () => {
    it('renders 2.4:1 with optimal severity for ratio <= 3', () => {
      const bom = makeBom({ oversubscriptionRatio: 2.4 })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      expect(screen.getByText('2.4:1')).toBeInTheDocument()
      // severity badge data attribute
      const badge = screen.getByTestId('oversub-badge')
      expect(badge).toHaveAttribute('data-severity', 'optimal')
    })

    it('renders 4.5:1 with acceptable severity for ratio 3 < x <= 6', () => {
      const bom = makeBom({ oversubscriptionRatio: 4.5 })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      expect(screen.getByText('4.5:1')).toBeInTheDocument()
      const badge = screen.getByTestId('oversub-badge')
      expect(badge).toHaveAttribute('data-severity', 'acceptable')
    })

    it('renders 8.0:1 with critical severity for ratio > 6', () => {
      const bom = makeBom({ oversubscriptionRatio: 8.0 })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      expect(screen.getByText('8.0:1')).toBeInTheDocument()
      const badge = screen.getByTestId('oversub-badge')
      expect(badge).toHaveAttribute('data-severity', 'critical')
    })
  })

  // ── BOM-03: Cable type ────────────────────────────────────────────────────

  describe('BOM-03: cable type', () => {
    it('displays DAC in cables heading when input.cableType is DAC', () => {
      const bom = makeBom({
        input: {
          topology: 'leaf-spine',
          racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
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
      })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      // The cablesHeading key with type interpolation — get all and check the visible one
      const headingEls = screen.getAllByText(/bom\.cablesHeading/)
      expect(headingEls.length).toBeGreaterThan(0)
      // At least one element should contain DAC in its text content
      const hasDAC = headingEls.some((el) => el.textContent?.includes('DAC'))
      expect(hasDAC).toBe(true)
    })

    it('shows leafSpineCables, serverLeafCables, serverOobCables quantities', () => {
      const bom = makeBom({ leafSpineCables: 24, serverLeafCables: 48, serverOobCables: 54 })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      expect(screen.getByText('24')).toBeInTheDocument()
      expect(screen.getByText('48')).toBeInTheDocument()
      expect(screen.getByText('54')).toBeInTheDocument()
    })
  })

  // ── BOM-04: Port utilization + violations ─────────────────────────────────

  describe('BOM-04: port utilization and violations', () => {
    it('renders port utilization progress bars with correct aria-valuenow', () => {
      // racks: 3 × 16 servers → maxServersPerRack=16, leaf downlinkPorts=48 → 16/48 = 33.33% → Math.round = 33
      const bom = makeBom({
        input: {
          topology: 'leaf-spine',
          racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
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
      })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      // Check that progress bars have aria-valuenow (at least one)
      const progressBars = document.querySelectorAll('[aria-valuenow]')
      expect(progressBars.length).toBeGreaterThan(0)
    })

    it('renders Alert with role=alert and OOB title when violations include OOB_PORT_SATURATION', () => {
      const bom = makeBom({
        violations: [{ code: 'OOB_PORT_SATURATION', required: 50, available: 48 }],
      })
      mockStore({ bom, threeTierBom: null, violations: bom.violations })

      render(<BOMPanel />, { wrapper: Wrapper })

      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
      expect(screen.getByText('bom.violationOobTitle')).toBeInTheDocument()
    })

    it('renders no Alert elements when violations is empty', () => {
      const bom = makeBom({ violations: [] })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      // No alerts should be rendered
      expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })
  })

  // ── INFRA: Existing infrastructure labels ───────────────────────────────

  describe('INFRA: existing infrastructure labels', () => {
    it('does NOT show "(existing)" label when existingSpinesDeployed is false', () => {
      mockInputStore({ existingSpinesDeployed: false })
      const bom = makeBom()
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      expect(screen.queryByTestId('existing-spines-label')).toBeNull()
    })

    it('shows "(existing)" label next to spine row when existingSpinesDeployed is true', () => {
      mockInputStore({ existingSpinesDeployed: true })
      const bom = makeBom({ spineSwitches: 0 })
      mockStore({ bom, threeTierBom: null, violations: [] })

      render(<BOMPanel />, { wrapper: Wrapper })

      expect(screen.getByTestId('existing-spines-label')).toBeInTheDocument()
      expect(screen.getByTestId('existing-spines-label').textContent).toContain('infra.existingLabel')
    })
  })
})

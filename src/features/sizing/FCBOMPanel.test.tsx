import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { FCBOMPanel } from './fc/FCBOMPanel'
import { useFCResultStore } from '@/store/fcResultStore'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { FCNetworkBOM, FCConstraintViolation } from '@/domain/schemas/fc-bom'

// Mock the fcResultStore to inject controlled BOM data
vi.mock('@/store/fcResultStore', () => ({
  useFCResultStore: vi.fn(),
}))

// Mock react-i18next — return key names directly for assertion
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

// Helper: returns a valid FCNetworkBOM with overridable fields
function makeBom(overrides: Partial<FCNetworkBOM> = {}): FCNetworkBOM {
  return {
    fabricASwitches: 2,
    fabricBSwitches: 2,
    hostPortsPerFabric: 48,
    storagePortsPerFabric: 2,
    islPortsPerFabric: 4,
    podLicensesRequired: 2,
    fcOpticsCount: 96,
    islCables: 4,
    fanInRatio: 3.5,
    islOversubscriptionRatio: 1.0,
    violations: [],
    input: {
      racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
      hbaPortsPerServer: 2,
      storageTargetPorts: 4,
      storageArrayCount: 1,
      fcSwitchModel: 'G720',
      islPortsPerSwitch: 4,
      rackSize: '42U',
      serverUHeight: '1U',
    },
    ...overrides,
  }
}

// Helper: mock useFCResultStore with a given state using selector-compatible pattern
function mockStore(bom: FCNetworkBOM | null, violations: FCConstraintViolation[] = []) {
  vi.mocked(useFCResultStore).mockImplementation((selector) =>
    selector({ bom, violations })
  )
}

// Wrapper providing TooltipProvider context for all tests
function Wrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

describe('FCBOMPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Empty state ──────────────────────────────────────────────────────────

  it('renders empty-state card with fcbom.emptyHeading when bom is null', () => {
    mockStore(null)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    expect(screen.getByText('fcbom.emptyHeading')).toBeInTheDocument()
    expect(screen.getByText('fcbom.emptyBody')).toBeInTheDocument()
  })

  // ── Fabric switch counts ─────────────────────────────────────────────────

  it('renders Fabric A switch count from bom.fabricASwitches', () => {
    const bom = makeBom({ fabricASwitches: 3 })
    mockStore(bom)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    expect(screen.getByText('fcbom.roleFabricA')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders Fabric B switch count from bom.fabricBSwitches', () => {
    const bom = makeBom({ fabricBSwitches: 3 })
    mockStore(bom)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    expect(screen.getByText('fcbom.roleFabricB')).toBeInTheDocument()
    // Both fabricASwitches and fabricBSwitches are 3 — at least one '3' present
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
  })

  // ── ISL cables ───────────────────────────────────────────────────────────

  it('renders ISL cable count from bom.islCables', () => {
    const bom = makeBom({ islCables: 8 })
    mockStore(bom)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    expect(screen.getByText('fcbom.islCables')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  // ── FC optics ────────────────────────────────────────────────────────────

  it('renders FC optics count from bom.fcOpticsCount', () => {
    const bom = makeBom({ fcOpticsCount: 120 })
    mockStore(bom)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    expect(screen.getByText('fcbom.fcOpticsCount')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
  })

  // ── POD licenses: visible row, not hidden ────────────────────────────────

  it('renders podLicensesRequired as a visible labeled row (not tooltip or footnote)', () => {
    const bom = makeBom({ podLicensesRequired: 7 })
    mockStore(bom)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    // The label row must be visible (proves it's not hidden behind a tooltip)
    expect(screen.getByText('fcbom.podLicenseLabel')).toBeInTheDocument()
    // The count 7 should appear in the document (fanInRatio=3.5:1 does not contain 7)
    const elements = screen.getAllByText(/7/)
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })

  // ── Fan-in ratio ─────────────────────────────────────────────────────────

  it('renders fanInRatio value', () => {
    const bom = makeBom({ fanInRatio: 3.5 })
    mockStore(bom)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    expect(screen.getByText('fcbom.fanInHeading')).toBeInTheDocument()
    expect(screen.getByText('3.5:1')).toBeInTheDocument()
  })

  // ── Violations ───────────────────────────────────────────────────────────

  it('FC_PORT_SATURATION violation renders Alert with role="alert"', () => {
    const bom = makeBom({
      violations: [{ code: 'FC_PORT_SATURATION', requiredPorts: 100, availablePorts: 48 }],
    })
    mockStore(bom, bom.violations)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    expect(screen.getByText('fcbom.violationPortSatTitle')).toBeInTheDocument()
  })

  it('FC_OVERSUBSCRIPTION_EXCEEDED violation renders Alert with role="alert"', () => {
    const bom = makeBom({
      violations: [{ code: 'FC_OVERSUBSCRIPTION_EXCEEDED', ratio: 8.5, maxRatio: 7 }],
    })
    mockStore(bom, bom.violations)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    expect(screen.getByText('fcbom.violationOversubTitle')).toBeInTheDocument()
  })

  it('FC_ISL_UNDERPROVISIONED violation renders Alert with role="alert"', () => {
    const bom = makeBom({
      violations: [{ code: 'FC_ISL_UNDERPROVISIONED', islsAvailable: 2, islsRequired: 4 }],
    })
    mockStore(bom, bom.violations)

    render(<FCBOMPanel />, { wrapper: Wrapper })

    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThan(0)
    expect(screen.getByText('fcbom.violationIslTitle')).toBeInTheDocument()
  })

  it('renders no Alert when violations array is empty', () => {
    const bom = makeBom({ violations: [] })
    mockStore(bom, [])

    render(<FCBOMPanel />, { wrapper: Wrapper })

    expect(screen.queryByRole('alert')).toBeNull()
  })
})

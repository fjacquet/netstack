import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FCInputForm } from './fc/FCInputForm'
import { useFCInputStore } from '@/store/fcInputStore'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { FCSizingInput } from '@/domain/schemas/fc-input'

// Local shape matching FCInputState (avoid importing unexported type)
interface MockFCState {
  input: FCSizingInput
  setInput: (partial: Partial<FCSizingInput>) => void
  resetInput: () => void
}

// Radix UI Select calls scrollIntoView on mount — mock it for jsdom compatibility
Element.prototype.scrollIntoView = vi.fn()

// Mock the fcInputStore to inject controlled FC input data
vi.mock('@/store/fcInputStore', () => ({
  useFCInputStore: vi.fn(),
}))

// Mock react-i18next — return key names directly for assertion
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}))

// Helper: returns a valid FCSizingInput with overridable fields
function makeInput(overrides: Partial<FCSizingInput> = {}): FCSizingInput {
  return {
    racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
    hbaPortsPerServer: 2,
    storageTargetPorts: 4,
    storageArrayCount: 1,
    fcSwitchModel: 'G720',
    islPortsPerSwitch: 4,
    rackSize: '42U',
    serverUHeight: '1U',
    ...overrides,
  }
}

// Helper: mock useFCInputStore with a given state
function mockStore(
  input: FCSizingInput,
  setInput: (partial: Partial<FCSizingInput>) => void,
  resetInput: () => void
) {
  vi.mocked(useFCInputStore).mockImplementation(
    (selector: (s: MockFCState) => unknown) =>
      selector({ input, setInput, resetInput })
  )
}

// Wrapper providing TooltipProvider context for all tests
function Wrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

describe('FCInputForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── FC-10: HBA ports per server field ────────────────────────────────────

  it('renders a field labelled fc.hbaPortsPerServer', () => {
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput(), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    expect(screen.getByText('fc.hbaPortsPerServer')).toBeInTheDocument()
  })

  // ── FC-10: Storage target ports field ────────────────────────────────────

  it('renders a field labelled fc.storageTargetPorts', () => {
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput(), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    expect(screen.getByText('fc.storageTargetPorts')).toBeInTheDocument()
  })

  // ── FC-10: Storage array count field ─────────────────────────────────────

  it('renders a field labelled fc.storageArrayCount', () => {
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput(), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    expect(screen.getByText('fc.storageArrayCount')).toBeInTheDocument()
  })

  // ── FC-10: ISL ports per switch field ────────────────────────────────────

  it('renders a field labelled fc.islPortsPerSwitch', () => {
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput(), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    expect(screen.getByText('fc.islPortsPerSwitch')).toBeInTheDocument()
  })

  // ── FC-10: FC switch model selector with exactly 9 options ───────────────

  it('renders FC switch model selector with exactly 9 options: G710, G720, G730, X7-4, X7-8, 7850, G820, X8-4, X8-8', async () => {
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput(), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    // Open the FC switch model select to expose options in the DOM
    // The fcSwitchModel select trigger shows the current model value
    const selectTriggers = screen.getAllByRole('combobox')
    // The fcSwitchModel select is labeled by 'fc.switchModel' — find by associated label
    const switchModelLabel = screen.getByText('fc.switchModel')
    const switchModelTrigger = selectTriggers.find((el) => {
      const labelFor = switchModelLabel.getAttribute('for')
      return labelFor ? el.id === labelFor : el.closest('[data-slot="form-item"]') === switchModelLabel.closest('[data-slot="form-item"]')
    }) ?? selectTriggers[0]
    await act(async () => {
      fireEvent.click(switchModelTrigger)
    })

    // All 9 model IDs must appear as selectable options
    const expectedModels = ['G710', 'G720', 'G730', 'X7-4', 'X7-8', '7850', 'G820', 'X8-4', 'X8-8']
    for (const model of expectedModels) {
      expect(screen.getByRole('option', { name: model })).toBeInTheDocument()
    }
    // Exactly 9 options
    expect(screen.getAllByRole('option')).toHaveLength(9)
  })

  // ── FC-10: Rack configuration section ────────────────────────────────────

  it('renders a rack count section labelled sizing.rackConfigHeading', () => {
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput(), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    expect(screen.getByText('sizing.rackConfigHeading')).toBeInTheDocument()
  })

  // ── FC-10: Reset button ───────────────────────────────────────────────────

  it('renders a reset button labelled fc.resetButton', () => {
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput(), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    expect(screen.getByText('fc.resetButton')).toBeInTheDocument()
  })

  // ── FC-10: Changing hbaPortsPerServer calls setInput ─────────────────────

  it('changing hbaPortsPerServer to 4 calls setInput with { hbaPortsPerServer: 4 }', async () => {
    vi.useFakeTimers()
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput({ hbaPortsPerServer: 2 }), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    const hbaInput = screen.getByTestId('hba-ports-per-server')
    await act(async () => {
      fireEvent.change(hbaInput, { target: { value: '4' } })
      vi.runAllTimers()
    })

    // setInput must be called with the correct partial — not the full object
    expect(setInput).toHaveBeenCalledWith(expect.objectContaining({ hbaPortsPerServer: 4 }))
    vi.useRealTimers()
  })

  // ── FC-10: Clicking reset button calls resetInput ─────────────────────────

  it('clicking reset button calls resetInput', () => {
    const setInput = vi.fn()
    const resetInput = vi.fn()
    mockStore(makeInput(), setInput, resetInput)

    render(<FCInputForm />, { wrapper: Wrapper })

    const resetBtn = screen.getByText('fc.resetButton')
    fireEvent.click(resetBtn)

    expect(resetInput).toHaveBeenCalledTimes(1)
  })
})

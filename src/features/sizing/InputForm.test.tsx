import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { InputForm } from './InputForm'
import { useInputStore } from '@/store/inputStore'
import type { SizingInput } from '@/domain/schemas/input'

// Mock the inputStore to inject controlled state
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

/** Returns a default SizingInput with optional overrides */
function makeInput(overrides: Partial<SizingInput> = {}): SizingInput {
  return {
    racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
    portsPerServerFrontend: 1,
    portsPerServerBackend: 1,
    activeUplinksPerLeaf: 4,
    connectivityType: '25G',
    cableType: 'DAC',
    leafModel: 'S5248F-ON',
    spineModel: 'S5232F-ON',
    borderLeafModel: 'none',
    borderLeafCount: 0,
    rackSize: '42U',
    serverUHeight: '1U',
    switchPositioning: 'ToR' as const,
    ...overrides,
  }
}

const setInputMock = vi.fn()
const resetInputMock = vi.fn()

/** Set up useInputStore mock with the given input */
function mockStore(input: SizingInput) {
  vi.mocked(useInputStore).mockImplementation(
    (selector: (s: { input: SizingInput; setInput: typeof setInputMock; resetInput: typeof resetInputMock }) => unknown) =>
      selector({ input, setInput: setInputMock, resetInput: resetInputMock })
  )
}

beforeEach(() => {
  setInputMock.mockClear()
  resetInputMock.mockClear()
})

describe('InputForm', () => {
  // RACK-01: explicit rack count input
  it('renders rack count input with value from store', () => {
    mockStore(makeInput())
    render(<InputForm />)
    const rackCountInput = screen.getByTestId('rack-count')
    expect(rackCountInput).toBeInTheDocument()
    expect((rackCountInput as HTMLInputElement).value).toBe('3')
  })

  it('renders per-rack server count inputs matching racks array length', () => {
    mockStore(makeInput())
    render(<InputForm />)
    expect(screen.getByTestId('rack-server-0')).toBeInTheDocument()
    expect(screen.getByTestId('rack-server-1')).toBeInTheDocument()
    expect(screen.getByTestId('rack-server-2')).toBeInTheDocument()
    expect(screen.queryByTestId('rack-server-3')).toBeNull()
  })

  it('shows correct number of rack server inputs when store has 5 racks', () => {
    mockStore(makeInput({
      racks: [
        { serverCount: 10 },
        { serverCount: 20 },
        { serverCount: 15 },
        { serverCount: 30 },
        { serverCount: 5 },
      ],
    }))
    render(<InputForm />)
    expect(screen.getByTestId('rack-server-0')).toBeInTheDocument()
    expect(screen.getByTestId('rack-server-4')).toBeInTheDocument()
    expect(screen.queryByTestId('rack-server-5')).toBeNull()
    const countInput = screen.getByTestId('rack-count')
    expect((countInput as HTMLInputElement).value).toBe('5')
  })

  // RACK-02: per-rack variable server counts
  it('renders different server counts per rack from store', () => {
    mockStore(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 20 }, { serverCount: 30 }],
    }))
    render(<InputForm />)
    expect((screen.getByTestId('rack-server-0') as HTMLInputElement).value).toBe('10')
    expect((screen.getByTestId('rack-server-1') as HTMLInputElement).value).toBe('20')
    expect((screen.getByTestId('rack-server-2') as HTMLInputElement).value).toBe('30')
  })

  it('shows total server count summary', () => {
    mockStore(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 20 }, { serverCount: 30 }],
    }))
    render(<InputForm />)
    // The total key is rendered as "sizing.totalServersDisplay:{"count":60}"
    expect(screen.getByText(/60/)).toBeInTheDocument()
  })

  // PORT-01: frontend port count
  it('renders frontend port count input with store value', () => {
    mockStore(makeInput({ portsPerServerFrontend: 2 }))
    render(<InputForm />)
    const input = screen.getByTestId('ports-frontend') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('2')
  })

  it('frontend port input has min=0 and max=8', () => {
    mockStore(makeInput())
    render(<InputForm />)
    const input = screen.getByTestId('ports-frontend') as HTMLInputElement
    expect(input.min).toBe('0')
    expect(input.max).toBe('8')
  })

  // PORT-02: backend port count
  it('renders backend port count input with store value', () => {
    mockStore(makeInput({ portsPerServerBackend: 3 }))
    render(<InputForm />)
    const input = screen.getByTestId('ports-backend') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('3')
  })

  it('backend port input has min=0 and max=8', () => {
    mockStore(makeInput())
    render(<InputForm />)
    const input = screen.getByTestId('ports-backend') as HTMLInputElement
    expect(input.min).toBe('0')
    expect(input.max).toBe('8')
  })

  // UPLN-01: active uplinks selector
  it('renders active uplinks input with store value', () => {
    mockStore(makeInput({ activeUplinksPerLeaf: 2 }))
    render(<InputForm />)
    const input = screen.getByTestId('active-uplinks') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('2')
  })

  it('uplink input max reflects S5248F-ON uplinkPorts (4)', () => {
    mockStore(makeInput({ leafModel: 'S5248F-ON', activeUplinksPerLeaf: 4 }))
    render(<InputForm />)
    const input = screen.getByTestId('active-uplinks') as HTMLInputElement
    expect(input.max).toBe('4')
  })

  it('uplink input max reflects S5212F-ON uplinkPorts (3)', () => {
    mockStore(makeInput({ leafModel: 'S5212F-ON', activeUplinksPerLeaf: 3 }))
    render(<InputForm />)
    const input = screen.getByTestId('active-uplinks') as HTMLInputElement
    expect(input.max).toBe('3')
  })

  it('uplink input max reflects S5296F-ON uplinkPorts (8)', () => {
    mockStore(makeInput({ leafModel: 'S5296F-ON', activeUplinksPerLeaf: 4 }))
    render(<InputForm />)
    const input = screen.getByTestId('active-uplinks') as HTMLInputElement
    expect(input.max).toBe('8')
  })

  // Section heading rendering
  it('renders all form section headings', () => {
    mockStore(makeInput())
    render(<InputForm />)
    expect(screen.getByText('sizing.rackConfigHeading')).toBeInTheDocument()
    expect(screen.getByText('sizing.serverConnectivityHeading')).toBeInTheDocument()
    expect(screen.getByText('sizing.networkConfigHeading')).toBeInTheDocument()
    expect(screen.getByText('sizing.physicalHeading')).toBeInTheDocument()
  })

  // Reset button
  it('renders reset button', () => {
    mockStore(makeInput())
    render(<InputForm />)
    expect(screen.getByText('sizing.resetButton')).toBeInTheDocument()
  })
})

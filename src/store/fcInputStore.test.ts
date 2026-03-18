// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useFCInputStore } from './fcInputStore'
import type { FCSizingInput } from '@/domain/schemas/fc-input'

// Inline default — keeps test self-contained and documents expected shape
const DEFAULT_FC_INPUT: FCSizingInput = {
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  hbaPortsPerServer: 2,
  storageTargetPorts: 4,
  storageArrayCount: 1,
  fcSwitchModel: 'G720',
  islPortsPerSwitch: 4,
  rackSize: '42U',
  serverUHeight: '1U',
}

describe('fcInputStore', () => {
  beforeEach(() => {
    useFCInputStore.setState({ input: DEFAULT_FC_INPUT })
  })

  it('has correct default values: G720 model and 2 HBA ports', () => {
    const { input } = useFCInputStore.getState()
    expect(input.fcSwitchModel).toBe('G720')
    expect(input.hbaPortsPerServer).toBe(2)
  })

  it('setInput updates only the specified field, leaving others unchanged', () => {
    useFCInputStore.getState().setInput({ hbaPortsPerServer: 4 })
    const { input } = useFCInputStore.getState()
    expect(input.hbaPortsPerServer).toBe(4)
    // Other fields must remain at defaults
    expect(input.fcSwitchModel).toBe('G720')
    expect(input.storageTargetPorts).toBe(4)
    expect(input.racks).toHaveLength(3)
  })

  it('resetInput restores to DEFAULT_FC_INPUT', () => {
    useFCInputStore.getState().setInput({ hbaPortsPerServer: 8, fcSwitchModel: 'G820' })
    useFCInputStore.getState().resetInput()
    const { input } = useFCInputStore.getState()
    expect(input.hbaPortsPerServer).toBe(DEFAULT_FC_INPUT.hbaPortsPerServer)
    expect(input.fcSwitchModel).toBe(DEFAULT_FC_INPUT.fcSwitchModel)
  })

  it('persists under key netstack-fc-input', () => {
    useFCInputStore.getState().setInput({ hbaPortsPerServer: 4 })
    const raw = window.localStorage.getItem('netstack-fc-input')
    expect(raw).not.toBeNull()
  })
})

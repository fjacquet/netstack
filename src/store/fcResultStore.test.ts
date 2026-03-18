// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useFCInputStore } from './fcInputStore'
import { useFCResultStore } from './fcResultStore'
import type { FCSizingInput } from '@/domain/schemas/fc-input'

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
  preferredGeneration: 'any',
}

describe('fcResultStore (derived from fcInputStore)', () => {
  beforeEach(() => {
    useFCInputStore.setState({ input: DEFAULT_FC_INPUT })
  })

  it('bom is not null after initialization', () => {
    const { bom } = useFCResultStore.getState()
    expect(bom).not.toBeNull()
  })

  it('bom.input.racks has length 1 after setting single rack', () => {
    useFCInputStore.getState().setInput({
      racks: [{ serverCount: 32 }],
    })
    const { bom } = useFCResultStore.getState()
    expect(bom).not.toBeNull()
    expect(bom!.input.racks).toHaveLength(1)
  })

  it('violations is an array (may be empty in stub mode)', () => {
    const { bom } = useFCResultStore.getState()
    expect(bom).not.toBeNull()
    expect(Array.isArray(bom!.violations)).toBe(true)
  })
})

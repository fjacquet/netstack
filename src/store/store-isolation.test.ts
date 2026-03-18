// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useInputStore } from './inputStore'
import { useFCInputStore } from './fcInputStore'
import type { SizingInput } from '@/domain/schemas/input'
import type { FCSizingInput } from '@/domain/schemas/fc-input'

// Ethereum (Ethernet) store default — matches inputStore.ts DEFAULT_INPUT
const DEFAULT_ETH_INPUT: SizingInput = {
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
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
}

// FC store default — matches DEFAULT_FC_INPUT in fc-input schema
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

describe('store isolation: FC and Ethernet stores are independent', () => {
  beforeEach(() => {
    useInputStore.setState({ input: DEFAULT_ETH_INPUT })
    useFCInputStore.setState({ input: DEFAULT_FC_INPUT })
  })

  it('mutating fcInputStore (racks: 100 servers) leaves Ethernet inputStore byte-for-byte unchanged', () => {
    const ethBefore = JSON.stringify(useInputStore.getState().input)

    useFCInputStore.getState().setInput({
      racks: [{ serverCount: 100 }],
    })

    const ethAfter = JSON.stringify(useInputStore.getState().input)
    expect(ethAfter).toBe(ethBefore)
  })

  it('mutating Ethernet inputStore (racks: 200 servers) leaves useFCInputStore byte-for-byte unchanged', () => {
    const fcBefore = JSON.stringify(useFCInputStore.getState().input)

    useInputStore.getState().setInput({
      racks: [{ serverCount: 200 }],
    })

    const fcAfter = JSON.stringify(useFCInputStore.getState().input)
    expect(fcAfter).toBe(fcBefore)
  })

  it('netstack-input localStorage key does not contain fcSwitchModel after FC mutation', () => {
    useFCInputStore.getState().setInput({ fcSwitchModel: 'G820' })

    const ethRaw = window.localStorage.getItem('netstack-input')
    // ethRaw may be null if persist hasn't flushed yet in test env, but must not contain FC fields
    if (ethRaw !== null) {
      expect(ethRaw).not.toContain('fcSwitchModel')
    }
  })

  it('netstack-fc-input localStorage key does not contain leafModel after FC write', () => {
    useFCInputStore.getState().setInput({ hbaPortsPerServer: 4 })

    const fcRaw = window.localStorage.getItem('netstack-fc-input')
    if (fcRaw !== null) {
      expect(fcRaw).not.toContain('leafModel')
    }
  })
})

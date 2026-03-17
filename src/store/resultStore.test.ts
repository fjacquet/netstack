import { describe, it, expect, beforeEach } from 'vitest'
import { useInputStore } from './inputStore'
import { useResultStore } from './resultStore'

describe('resultStore (derived from inputStore)', () => {
  beforeEach(() => {
    // Reset stores to default state
    useInputStore.setState({
      input: {
        totalServers: 48,
        serversPerRack: 16,
        connectivityType: '25G',
        cableType: 'DAC',
        leafModel: 'S5248F-ON',
        rackSize: '42U',
      },
    })
  })

  it('computes BOM from default input on initialization', () => {
    const { bom } = useResultStore.getState()
    expect(bom).not.toBeNull()
    expect(bom!.racks).toBe(3) // ceil(48/16) = 3
    expect(bom!.leafSwitches).toBe(6) // 3 * 2
  })

  it('recomputes BOM when inputStore changes', () => {
    useInputStore.getState().setInput({ totalServers: 96 })
    const { bom } = useResultStore.getState()
    expect(bom).not.toBeNull()
    expect(bom!.racks).toBe(6) // ceil(96/16) = 6
    expect(bom!.leafSwitches).toBe(12) // 6 * 2
  })

  it('updates violations when input triggers constraint', () => {
    useInputStore.getState().setInput({ serversPerRack: 48, cableType: 'DAC', totalServers: 480 })
    const { violations } = useResultStore.getState()
    // serversPerRack=48 + 2 = 50 > 48 OOB ports => OOB_PORT_SATURATION
    expect(violations.some((v) => v.code === 'OOB_PORT_SATURATION')).toBe(true)
  })

  it('reflects leafModel change in BOM cable counts', () => {
    useInputStore.getState().setInput({ leafModel: 'S5212F-ON' })
    const { bom } = useResultStore.getState()
    expect(bom).not.toBeNull()
    // S5212F-ON has uplinkPorts=3, 2 spines → min(2,3)=2 links per leaf
    expect(bom!.leafSpineCables).toBe(bom!.leafSwitches * Math.min(bom!.spineSwitches, 3))
  })
})

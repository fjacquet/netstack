import { describe, it, expect, beforeEach } from 'vitest'
import { useInputStore } from './inputStore'
import { useResultStore } from './resultStore'

describe('resultStore (derived from inputStore)', () => {
  beforeEach(() => {
    // Reset stores to default state (3 racks × 16 = 48 servers)
    useInputStore.setState({
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
      },
    })
  })

  it('computes BOM from default input on initialization', () => {
    const { bom } = useResultStore.getState()
    expect(bom).not.toBeNull()
    expect(bom!.racks).toBe(3) // 3 racks in array
    expect(bom!.leafSwitches).toBe(6) // 3 * 2
  })

  it('recomputes BOM when inputStore changes (add a rack)', () => {
    useInputStore.getState().setInput({
      racks: [
        { serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 },
        { serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 },
      ],
    })
    const { bom } = useResultStore.getState()
    expect(bom).not.toBeNull()
    expect(bom!.racks).toBe(6) // 6 racks in array
    expect(bom!.leafSwitches).toBe(12) // 6 * 2
  })

  it('updates violations when input triggers constraint', () => {
    // 10 racks × 48 servers = triggers DAC_DISTANCE_ADVISORY (> 8 racks) and OOB_PORT_SATURATION (48+2=50>48)
    useInputStore.getState().setInput({
      racks: Array.from({ length: 10 }, () => ({ serverCount: 48 })),
      cableType: 'DAC',
    })
    const { violations } = useResultStore.getState()
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

// ---------------------------------------------------------------------------
// INFRA: Existing infrastructure toggle
// ---------------------------------------------------------------------------
describe('INFRA: Existing infrastructure toggle', () => {
  beforeEach(() => {
    useInputStore.setState({
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
      },
    })
  })

  it('Clos: existingSpinesDeployed=true zeros spineSwitches in BOM', () => {
    // First verify baseline: spines > 0 with toggle off
    const { bom: bomOff } = useResultStore.getState()
    expect(bomOff).not.toBeNull()
    expect(bomOff!.spineSwitches).toBeGreaterThan(0)

    // Enable toggle
    useInputStore.getState().setInput({ existingSpinesDeployed: true })
    const { bom: bomOn } = useResultStore.getState()
    expect(bomOn).not.toBeNull()
    expect(bomOn!.spineSwitches).toBe(0)
  })

  it('Clos: existingSpinesDeployed=true leaves leafSpineCables unchanged', () => {
    const { bom: bomOff } = useResultStore.getState()
    const cablesOff = bomOff!.leafSpineCables

    useInputStore.getState().setInput({ existingSpinesDeployed: true })
    const { bom: bomOn } = useResultStore.getState()
    expect(bomOn!.leafSpineCables).toBe(cablesOff)
  })

  it('Clos: existingSpinesDeployed=true leaves oversubscriptionRatio unchanged', () => {
    const { bom: bomOff } = useResultStore.getState()
    const ratioOff = bomOff!.oversubscriptionRatio

    useInputStore.getState().setInput({ existingSpinesDeployed: true })
    const { bom: bomOn } = useResultStore.getState()
    expect(bomOn!.oversubscriptionRatio).toBeCloseTo(ratioOff)
  })

  it('Three-Tier: existingCoreDeployed=true zeros coreSwitches in BOM', () => {
    // Switch to three-tier topology
    useInputStore.getState().setInput({
      topology: 'three-tier',
      existingCoreDeployed: false,
    })
    const { threeTierBom: bomOff } = useResultStore.getState()
    expect(bomOff).not.toBeNull()
    expect(bomOff!.coreSwitches).toBeGreaterThan(0)

    // Enable toggle
    useInputStore.getState().setInput({ existingCoreDeployed: true })
    const { threeTierBom: bomOn } = useResultStore.getState()
    expect(bomOn).not.toBeNull()
    expect(bomOn!.coreSwitches).toBe(0)
  })

  it('Three-Tier: existingCoreDeployed=true leaves aggrCoreCables unchanged', () => {
    useInputStore.getState().setInput({
      topology: 'three-tier',
      existingCoreDeployed: false,
    })
    const { threeTierBom: bomOff } = useResultStore.getState()
    const cablesOff = bomOff!.aggrCoreCables

    useInputStore.getState().setInput({ existingCoreDeployed: true })
    const { threeTierBom: bomOn } = useResultStore.getState()
    expect(bomOn!.aggrCoreCables).toBe(cablesOff)
  })

  it('Three-Tier: existingCoreDeployed=true leaves oversubscription ratios unchanged', () => {
    useInputStore.getState().setInput({
      topology: 'three-tier',
      existingCoreDeployed: false,
    })
    const { threeTierBom: bomOff } = useResultStore.getState()
    const accessRatioOff = bomOff!.accessToAggrOversubscription
    const aggrRatioOff = bomOff!.aggrToCoreOversubscription

    useInputStore.getState().setInput({ existingCoreDeployed: true })
    const { threeTierBom: bomOn } = useResultStore.getState()
    expect(bomOn!.accessToAggrOversubscription).toBeCloseTo(accessRatioOff)
    expect(bomOn!.aggrToCoreOversubscription).toBeCloseTo(aggrRatioOff)
  })
})

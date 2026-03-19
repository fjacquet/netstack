import { describe, it, expect } from 'vitest'
import { buildRackDevices } from './buildRackDevices'
import type { NetworkBOM } from '@/domain/schemas/bom'

/** Minimal mock BOM: 48 servers (3 racks × 16), S5248F-ON leaf, ToR */
const mockBOM: NetworkBOM = {
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
  oversubscriptionRatio: 4,
  switchPositioning: 'ToR',
  recommendedCableLengthM: 2,
  violations: [],
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
}

/** Helper: create a BOM with the given serverUHeight and serverCount for rack 0 */
function bomWithUHeight(serverUHeight: '1U' | '2U' | '4U' | '8U', serverCount = 3): NetworkBOM {
  return {
    ...mockBOM,
    input: {
      ...mockBOM.input,
      serverUHeight,
      racks: [{ serverCount }],
    },
  }
}

/**
 * Helper: create a minimal BOM with a given switchPositioning.
 * Self-contained — does not import from sizing.ts or sizing.test.ts.
 */
function makeBom(positioning: 'ToR' | 'MoR' | 'BoR', racks = 2): NetworkBOM {
  const rackList = Array.from({ length: racks }, () => ({ serverCount: 16 }))
  return {
    racks,
    networkRacks: 1,
    leafSwitches: racks * 2,
    spineSwitches: 4,
    oobSwitches: racks,
    borderLeafSwitches: 0,
    leafSpineCables: racks * 2 * 4,
    serverLeafCables: racks * 16,
    serverOobCables: racks * 18,
    sfp28Count: 0,
    qsfp28Count: 0,
    vltCables: racks,
    oversubscriptionRatio: 3,
    switchPositioning: positioning,
    recommendedCableLengthM: positioning === 'ToR' ? 2 : positioning === 'MoR' ? 1 : 2,
    violations: [],
    input: {
      topology: 'leaf-spine',
      racks: rackList,
      portsPerServerFrontend: 1,
      portsPerServerBackend: 1,
      connectivityType: '25G',
      cableType: positioning === 'ToR' ? 'DAC' : 'AOC',
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
      switchPositioning: positioning,
      existingSpinesDeployed: false,
      existingCoreDeployed: false,
    },
  }
}

describe('buildRackDevices', () => {
  it('returns exactly 19 devices for rack 0 (3 switches + 16 servers at 1U)', () => {
    const devices = buildRackDevices(mockBOM, 0)
    expect(devices).toHaveLength(19) // 3 switches + 16 servers
  })

  it('BoR: OOB is at slot 1 (U1)', () => {
    const bom = makeBom('BoR')
    const devices = buildRackDevices(bom, 0)
    const u1 = devices.find((d) => d.uSlot === 1)
    expect(u1?.model).toBe('S3248T-ON')
    expect(u1?.role).toBe('oob')
  })

  it('OOB device has usedPorts = rack serverCount + 2 and totalPorts = 48', () => {
    const devices = buildRackDevices(mockBOM, 0)
    const oob = devices.find((d) => d.role === 'oob')
    expect(oob?.usedPorts).toBe(18) // 16 + 2
    expect(oob?.totalPorts).toBe(48)
  })

  it('all three positioning modes include 2 leaf devices in the server rack', () => {
    for (const pos of ['ToR', 'MoR', 'BoR'] as const) {
      const bom = makeBom(pos)
      const devices = buildRackDevices(bom, 0)
      const leafDevices = devices.filter((d) => d.role === 'leaf')
      expect(leafDevices).toHaveLength(2)
    }
  })

  it('Leaf devices have usedPorts = rack serverCount and totalPorts = 48 (S5248F-ON downlinkPorts)', () => {
    const devices = buildRackDevices(mockBOM, 0)
    const leafDevices = devices.filter((d) => d.role === 'leaf')
    expect(leafDevices).toHaveLength(2)
    for (const leaf of leafDevices) {
      expect(leaf.usedPorts).toBe(16)
      expect(leaf.totalPorts).toBe(48)
    }
  })

  it('Device IDs contain the rack index', () => {
    const devices0 = buildRackDevices(mockBOM, 0)
    const devices2 = buildRackDevices(mockBOM, 2)
    for (const d of devices0) {
      expect(d.id).toContain('rack-0')
    }
    for (const d of devices2) {
      expect(d.id).toContain('rack-2')
    }
  })

  it('Device IDs follow the expected pattern: rack-N-role-index', () => {
    const devices = buildRackDevices(mockBOM, 0)
    const ids = devices.map((d) => d.id)
    expect(ids).toContain('rack-0-oob-0')
    expect(ids).toContain('rack-0-leaf-1')
    expect(ids).toContain('rack-0-leaf-0')
  })

  it('all switch devices have uHeight=1', () => {
    const devices = buildRackDevices(mockBOM, 0)
    for (const d of devices.filter((d) => d.role !== 'server')) {
      expect(d.uHeight).toBe(1)
    }
  })

  it('uses rack-specific serverCount for usedPorts when rackIndex is provided', () => {
    const varDensityBOM: NetworkBOM = {
      ...mockBOM,
      input: {
        ...mockBOM.input,
        racks: [{ serverCount: 10 }, { serverCount: 20 }, { serverCount: 30 }],
      },
    }
    const devices0 = buildRackDevices(varDensityBOM, 0)
    const devices1 = buildRackDevices(varDensityBOM, 1)
    const devices2 = buildRackDevices(varDensityBOM, 2)

    const oob0 = devices0.find((d) => d.role === 'oob')
    const oob1 = devices1.find((d) => d.role === 'oob')
    const oob2 = devices2.find((d) => d.role === 'oob')

    expect(oob0?.usedPorts).toBe(12) // 10 + 2
    expect(oob1?.usedPorts).toBe(22) // 20 + 2
    expect(oob2?.usedPorts).toBe(32) // 30 + 2
  })
})

describe('server devices', () => {
  it('3 servers at 1U returns 6 devices total (3 switches + 3 servers)', () => {
    const devices = buildRackDevices(bomWithUHeight('1U', 3), 0)
    expect(devices).toHaveLength(6)
  })

  it('server devices have role="server"', () => {
    const devices = buildRackDevices(bomWithUHeight('1U', 3), 0)
    const servers = devices.filter((d) => d.role === 'server')
    expect(servers).toHaveLength(3)
  })

  it('server labels are "Server 1", "Server 2", "Server 3"', () => {
    const devices = buildRackDevices(bomWithUHeight('1U', 3), 0)
    const servers = devices.filter((d) => d.role === 'server')
    const labels = servers.map((s) => s.label).sort()
    expect(labels).toEqual(['Server 1', 'Server 2', 'Server 3'])
  })

  it('0 servers returns only 3 switch devices', () => {
    const devices = buildRackDevices(bomWithUHeight('1U', 0), 0)
    expect(devices).toHaveLength(3)
    expect(devices.every((d) => d.role !== 'server')).toBe(true)
  })

  it('server device IDs follow pattern rack-N-server-M', () => {
    const devices = buildRackDevices(bomWithUHeight('1U', 2), 0)
    const servers = devices.filter((d) => d.role === 'server')
    const ids = servers.map((s) => s.id)
    expect(ids).toContain('rack-0-server-0')
    expect(ids).toContain('rack-0-server-1')
  })
})

describe('buildRackDevices — positioning aware', () => {
  // BoR: Bottom of Rack — OOB+leaves grouped at physical bottom
  it('BoR: OOB at U1, Leaf B at U2, Leaf A at U3 (grouped at bottom)', () => {
    const bom = makeBom('BoR')
    const devices = buildRackDevices(bom, 0)
    const oob = devices.find((d) => d.role === 'oob')
    const leafA = devices.find((d) => d.role === 'leaf' && d.label.includes('Leaf A'))
    const leafB = devices.find((d) => d.role === 'leaf' && d.label.includes('Leaf B'))
    expect(oob?.uSlot).toBe(1)
    expect(leafB?.uSlot).toBe(2)
    expect(leafA?.uSlot).toBe(3)
  })

  it('BoR: first server starts at uSlot=4', () => {
    const bom = makeBom('BoR')
    const devices = buildRackDevices(bom, 0)
    const servers = devices.filter((d) => d.role === 'server').sort((a, b) => a.uSlot - b.uSlot)
    expect(servers.length).toBeGreaterThan(0)
    expect(servers[0].uSlot).toBe(4)
  })

  // ToR: Top of Rack — OOB+leaves grouped at physical top (42U rack)
  it('ToR: OOB at U40, Leaf B at U41, Leaf A at U42 (grouped at top)', () => {
    const bom = makeBom('ToR')
    const devices = buildRackDevices(bom, 0)
    const oob = devices.find((d) => d.role === 'oob')
    const leafA = devices.find((d) => d.role === 'leaf' && d.label.includes('Leaf A'))
    const leafB = devices.find((d) => d.role === 'leaf' && d.label.includes('Leaf B'))
    expect(leafA?.uSlot).toBe(42)
    expect(leafB?.uSlot).toBe(41)
    expect(oob?.uSlot).toBe(40)
  })

  it('ToR: first server starts at uSlot=1 (below the switch group)', () => {
    const bom = makeBom('ToR')
    const devices = buildRackDevices(bom, 0)
    const servers = devices.filter((d) => d.role === 'server').sort((a, b) => a.uSlot - b.uSlot)
    expect(servers.length).toBeGreaterThan(0)
    expect(servers[0].uSlot).toBe(1)
  })

  it('ToR: no server occupies the switch group slots (U40–U42)', () => {
    const bom = makeBom('ToR')
    const devices = buildRackDevices(bom, 0)
    const servers = devices.filter((d) => d.role === 'server')
    expect(servers.every((s) => s.uSlot < 40)).toBe(true)
  })

  // MoR: Middle of Rack — OOB+leaves grouped at mid-rack (42U: U20/U21/U22)
  it('MoR: OOB at U20, Leaf B at U21, Leaf A at U22 in a 42U rack (grouped at middle)', () => {
    const bom = makeBom('MoR')
    const devices = buildRackDevices(bom, 0)
    const oob = devices.find((d) => d.role === 'oob')
    const leafA = devices.find((d) => d.role === 'leaf' && d.label.includes('Leaf A'))
    const leafB = devices.find((d) => d.role === 'leaf' && d.label.includes('Leaf B'))
    expect(oob?.uSlot).toBe(20)
    expect(leafB?.uSlot).toBe(21)
    expect(leafA?.uSlot).toBe(22)
  })

  it('MoR: no server occupies the switch group slots (U20–U22)', () => {
    const bom = makeBom('MoR')
    const devices = buildRackDevices(bom, 0)
    const servers = devices.filter((d) => d.role === 'server')
    expect(servers.every((s) => s.uSlot < 20 || s.uSlot > 22)).toBe(true)
  })

  it('all positioning modes include exactly 3 switch devices (OOB + 2 leaves)', () => {
    for (const pos of ['ToR', 'MoR', 'BoR'] as const) {
      const bom = makeBom(pos)
      const devices = buildRackDevices(bom, 0)
      const switchDevices = devices.filter((d) => d.role !== 'server')
      expect(switchDevices).toHaveLength(3)
    }
  })

  it('all positioning modes: OOB is always adjacent to leaves (within 2 slots)', () => {
    for (const pos of ['ToR', 'MoR', 'BoR'] as const) {
      const bom = makeBom(pos)
      const devices = buildRackDevices(bom, 0)
      const oob = devices.find((d) => d.role === 'oob')!
      const leaves = devices.filter((d) => d.role === 'leaf')
      for (const leaf of leaves) {
        expect(Math.abs(oob.uSlot - leaf.uSlot)).toBeLessThanOrEqual(2)
      }
    }
  })
})

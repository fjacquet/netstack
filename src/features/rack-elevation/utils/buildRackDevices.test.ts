import { describe, it, expect } from 'vitest'
import { buildRackDevices } from './buildRackDevices'
import { buildPositioningRackDevices } from './buildPositioningRackDevices'
import type { NetworkBOM } from '@/domain/schemas/bom'

/** Minimal mock BOM: 48 servers (3 racks × 16), S5248F-ON leaf */
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
  recommendedCableLengthM: 3,
  violations: [],
  input: {
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
    switchPositioning: 'ToR',
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
 * Helper: create a minimal 2-rack BOM with a given switchPositioning.
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
    recommendedCableLengthM: positioning === 'ToR' ? 3 : positioning === 'MoR' ? 15 : 30,
    violations: [],
    input: {
      racks: rackList,
      portsPerServerFrontend: 1,
      portsPerServerBackend: 1,
      activeUplinksPerLeaf: 4,
      connectivityType: '25G',
      cableType: positioning === 'ToR' ? 'DAC' : 'AOC',
      leafModel: 'S5248F-ON',
      spineModel: 'S5232F-ON',
      borderLeafModel: 'none',
      borderLeafCount: 0,
      rackSize: '42U',
      serverUHeight: '1U',
      switchPositioning: positioning,
    },
  }
}

describe('buildRackDevices', () => {
  it('returns exactly 19 devices for rack 0 (3 switches + 16 servers at 1U)', () => {
    const devices = buildRackDevices(mockBOM, 0)
    expect(devices).toHaveLength(19) // 3 switches + 16 servers
  })

  it('U1 is OOB (S3248T-ON) at slot 1', () => {
    const devices = buildRackDevices(mockBOM, 0)
    const u1 = devices.find((d) => d.uSlot === 1)
    expect(u1).toBeDefined()
    expect(u1?.model).toBe('S3248T-ON')
    expect(u1?.role).toBe('oob')
  })

  it('U2 is Leaf B at slot 2', () => {
    const devices = buildRackDevices(mockBOM, 0)
    const u2 = devices.find((d) => d.uSlot === 2)
    expect(u2).toBeDefined()
    expect(u2?.model).toBe('S5248F-ON')
    expect(u2?.role).toBe('leaf')
    expect(u2?.label).toContain('Leaf B')
  })

  it('U3 is Leaf A at slot 3', () => {
    const devices = buildRackDevices(mockBOM, 0)
    const u3 = devices.find((d) => d.uSlot === 3)
    expect(u3).toBeDefined()
    expect(u3?.model).toBe('S5248F-ON')
    expect(u3?.role).toBe('leaf')
    expect(u3?.label).toContain('Leaf A')
  })

  it('OOB device has usedPorts = rack serverCount + 2 and totalPorts = 48', () => {
    const devices = buildRackDevices(mockBOM, 0)
    const oob = devices.find((d) => d.role === 'oob')
    expect(oob?.usedPorts).toBe(18) // 16 + 2
    expect(oob?.totalPorts).toBe(48)
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
    // Variable density mock: rack 0 has 10 servers, rack 1 has 20, rack 2 has 30
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

    const leaf0 = devices0.find((d) => d.role === 'leaf' && d.uSlot === 3)
    const leaf1 = devices1.find((d) => d.role === 'leaf' && d.uSlot === 3)
    const leaf2 = devices2.find((d) => d.role === 'leaf' && d.uSlot === 3)

    expect(leaf0?.usedPorts).toBe(10)
    expect(leaf1?.usedPorts).toBe(20)
    expect(leaf2?.usedPorts).toBe(30)
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

  it('server uSlots start at 4 and stack for 1U', () => {
    const devices = buildRackDevices(bomWithUHeight('1U', 3), 0)
    const servers = devices.filter((d) => d.role === 'server').sort((a, b) => a.uSlot - b.uSlot)
    expect(servers[0].uSlot).toBe(4)
    expect(servers[1].uSlot).toBe(5)
    expect(servers[2].uSlot).toBe(6)
  })

  it('2 servers at 2U: uSlot=4 uHeight=2, uSlot=6 uHeight=2', () => {
    const devices = buildRackDevices(bomWithUHeight('2U', 2), 0)
    const servers = devices.filter((d) => d.role === 'server').sort((a, b) => a.uSlot - b.uSlot)
    expect(servers).toHaveLength(2)
    expect(servers[0].uSlot).toBe(4)
    expect(servers[0].uHeight).toBe(2)
    expect(servers[1].uSlot).toBe(6)
    expect(servers[1].uHeight).toBe(2)
  })

  it('1 server at 4U: uSlot=4 uHeight=4', () => {
    const devices = buildRackDevices(bomWithUHeight('4U', 1), 0)
    const servers = devices.filter((d) => d.role === 'server')
    expect(servers).toHaveLength(1)
    expect(servers[0].uSlot).toBe(4)
    expect(servers[0].uHeight).toBe(4)
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
  it('ToR: devices include OOB + Leaf B + Leaf A before servers (3 switch devices)', () => {
    const bom = makeBom('ToR')
    const devices = buildRackDevices(bom, 0)
    const switchDevices = devices.filter((d) => d.role !== 'server')
    expect(switchDevices).toHaveLength(3)
  })

  it('ToR: Leaf A is at uSlot=3, Leaf B is at uSlot=2', () => {
    const bom = makeBom('ToR')
    const devices = buildRackDevices(bom, 0)
    const leafA = devices.find((d) => d.role === 'leaf' && d.uSlot === 3)
    const leafB = devices.find((d) => d.role === 'leaf' && d.uSlot === 2)
    expect(leafA).toBeDefined()
    expect(leafB).toBeDefined()
  })

  it('ToR: first server starts at uSlot=4', () => {
    const bom = makeBom('ToR')
    const devices = buildRackDevices(bom, 0)
    const servers = devices.filter((d) => d.role === 'server')
    expect(servers.length).toBeGreaterThan(0)
    expect(servers[0].uSlot).toBe(4)
  })

  it('MoR: only 1 switch device before servers (OOB only)', () => {
    const bom = makeBom('MoR')
    const devices = buildRackDevices(bom, 0)
    const switchDevices = devices.filter((d) => d.role !== 'server')
    expect(switchDevices).toHaveLength(1)
    expect(switchDevices[0].role).toBe('oob')
  })

  it('MoR: OOB remains at uSlot=1', () => {
    const bom = makeBom('MoR')
    const devices = buildRackDevices(bom, 0)
    const oob = devices.find((d) => d.role === 'oob')
    expect(oob).toBeDefined()
    expect(oob!.uSlot).toBe(1)
  })

  it('MoR: first server starts at uSlot=2', () => {
    const bom = makeBom('MoR')
    const devices = buildRackDevices(bom, 0)
    const servers = devices.filter((d) => d.role === 'server')
    expect(servers.length).toBeGreaterThan(0)
    expect(servers[0].uSlot).toBe(2)
  })

  it('BoR: only 1 switch device (OOB only), same as MoR', () => {
    const bom = makeBom('BoR')
    const devices = buildRackDevices(bom, 0)
    const switchDevices = devices.filter((d) => d.role !== 'server')
    expect(switchDevices).toHaveLength(1)
    expect(switchDevices[0].role).toBe('oob')
  })
})

describe('buildPositioningRackDevices', () => {
  it('returns 2 × bom.racks leaf devices (one pair per server rack)', () => {
    const bom = makeBom('MoR', 2)
    const devices = buildPositioningRackDevices(bom)
    expect(devices).toHaveLength(4) // 2 racks × 2 leaves
    expect(devices.every((d) => d.role === 'leaf')).toBe(true)
  })

  it('labels contain "Rack 1" and "Rack 2" for a 2-rack BOM', () => {
    const bom = makeBom('MoR', 2)
    const devices = buildPositioningRackDevices(bom)
    const labels = devices.map((d) => d.label)
    expect(labels.some((l) => l.includes('Rack 1'))).toBe(true)
    expect(labels.some((l) => l.includes('Rack 2'))).toBe(true)
  })
})

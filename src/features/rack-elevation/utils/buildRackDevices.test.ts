import { describe, it, expect } from 'vitest'
import { buildRackDevices } from './buildRackDevices'
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
  violations: [],
  input: {
    racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
    portsPerServerFrontend: 1,
    portsPerServerBackend: 1,
    connectivityType: '25G',
    cableType: 'DAC',
    leafModel: 'S5248F-ON',
    spineModel: 'S5232F-ON',
    borderLeafModel: 'none',
    borderLeafCount: 0,
    rackSize: '42U',
  },
}

describe('buildRackDevices', () => {
  it('returns exactly 3 devices for rack 0', () => {
    const devices = buildRackDevices(mockBOM, 0)
    expect(devices).toHaveLength(3)
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

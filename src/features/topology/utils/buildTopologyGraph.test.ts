import { describe, it, expect } from 'vitest'
import { buildTopologyGraph } from './buildTopologyGraph'
import type { NetworkBOM } from '@/domain/schemas/bom'

/**
 * Mock BOM for 3 racks:
 *   48 servers total, 16 per rack
 *   Leaf: S5248F-ON (48 downlink, 4 uplink)
 *   Spine: S5232F-ON (32 ports)
 *   OOB: S3248T-ON (48 ports)
 *
 *   racks = ceil(48/16) = 3
 *   leafSwitches = 2 × 3 = 6
 *   spineSwitches = max(2, ceil(6/32)) = 2
 *   oobSwitches = 3 × ceil((16+2)/48) = 3 × 1 = 3
 */
const mockBOM: NetworkBOM = {
  racks: 3,
  leafSwitches: 6,
  spineSwitches: 2,
  oobSwitches: 3,
  leafSpineCables: 24,    // 6 leafs × 4 uplinks
  serverLeafCables: 48,   // 48 servers
  serverOobCables: 54,    // 48 servers + 6 leafs
  sfp28Count: 0,
  qsfp28Count: 0,
  vltCables: 3,           // 3 leaf pairs
  oversubscriptionRatio: 4,
  violations: [],
  input: {
    totalServers: 48,
    serversPerRack: 16,
    connectivityType: '25G',
    cableType: 'DAC',
    leafModel: 'S5248F-ON',
    rackSize: '42U',
  },
}

describe('buildTopologyGraph', () => {
  it('returns correct total node count for 3 racks (2 spine + 6 leaf + 3 rack + 3 OOB = 14)', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    expect(nodes).toHaveLength(14)
  })

  it('returns correct spine node count', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    const spines = nodes.filter(n => n.id.startsWith('spine-'))
    expect(spines).toHaveLength(2)
  })

  it('returns correct leaf node count', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    const leafs = nodes.filter(n => n.id.startsWith('leaf-'))
    expect(leafs).toHaveLength(6)
  })

  it('returns correct rack node count', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    const racks = nodes.filter(n => n.id.startsWith('rack-'))
    expect(racks).toHaveLength(3)
  })

  it('returns correct OOB node count', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    const oobs = nodes.filter(n => n.id.startsWith('oob-'))
    expect(oobs).toHaveLength(3)
  })

  it('returns at least 24 edges (12 leaf-spine + 6 server-leaf + 3 server-oob + 3 VLT)', () => {
    const { edges } = buildTopologyGraph(mockBOM)
    // leaf-spine: 6 leafs × 2 spines = 12 edges
    // server-leaf: 3 racks × 2 leafs = 6 edges
    // server-oob: 3 racks × 1 OOB = 3 edges
    // VLT: 3 leaf pairs = 3 edges
    // Total: 24
    expect(edges.length).toBeGreaterThanOrEqual(24)
  })

  it('has correct edge counts by type', () => {
    const { edges } = buildTopologyGraph(mockBOM)
    // VLT edges have dashed style (strokeDasharray)
    const vltEdges = edges.filter(e => e.id.startsWith('vlt-'))
    expect(vltEdges).toHaveLength(3)

    const leafSpineEdges = edges.filter(e => e.id.startsWith('ls-'))
    expect(leafSpineEdges).toHaveLength(12) // 6 leafs × 2 spines

    const serverLeafEdges = edges.filter(e => e.id.startsWith('sl-'))
    expect(serverLeafEdges).toHaveLength(6) // 3 racks × 2 leafs

    const serverOobEdges = edges.filter(e => e.id.startsWith('so-'))
    expect(serverOobEdges).toHaveLength(3) // 3 racks × 1 OOB
  })

  it('is deterministic: two calls with same BOM produce identical node positions', () => {
    const result1 = buildTopologyGraph(mockBOM)
    const result2 = buildTopologyGraph(mockBOM)
    expect(result1.nodes.map(n => ({ id: n.id, position: n.position }))).toEqual(
      result2.nodes.map(n => ({ id: n.id, position: n.position }))
    )
  })

  it('places spine nodes at y=80', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    const spines = nodes.filter(n => n.id.startsWith('spine-'))
    spines.forEach(s => expect(s.position.y).toBe(80))
  })

  it('places leaf nodes at y=240', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    const leafs = nodes.filter(n => n.id.startsWith('leaf-'))
    leafs.forEach(l => expect(l.position.y).toBe(240))
  })

  it('places rack nodes at y=420', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    const racks = nodes.filter(n => n.id.startsWith('rack-'))
    racks.forEach(r => expect(r.position.y).toBe(420))
  })

  it('uses correct node id patterns', () => {
    const { nodes } = buildTopologyGraph(mockBOM)
    const ids = nodes.map(n => n.id)
    expect(ids).toContain('spine-0')
    expect(ids).toContain('spine-1')
    expect(ids).toContain('leaf-0')
    expect(ids).toContain('leaf-5')
    expect(ids).toContain('rack-0')
    expect(ids).toContain('rack-2')
    expect(ids).toContain('oob-0')
    expect(ids).toContain('oob-2')
  })
})

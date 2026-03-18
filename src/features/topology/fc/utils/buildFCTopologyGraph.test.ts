import { describe, it, expect } from 'vitest'
import { buildFCTopologyGraph } from './buildFCTopologyGraph'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'

/**
 * Mock BOM for 2 FC switches per fabric:
 *   fabricASwitches: 2 (Fabric A)
 *   fabricBSwitches: 2 (Fabric B — always equals fabricASwitches)
 *   islPortsPerFabric: 2 (2 ISL links per fabric)
 *   model: G720
 */
const mockFCBOM: FCNetworkBOM = {
  fabricASwitches: 2,
  fabricBSwitches: 2,
  hostPortsPerFabric: 20,
  storagePortsPerFabric: 2,
  islPortsPerFabric: 2,
  podLicensesRequired: 0,
  fcOpticsCount: 48,
  islCables: 4,
  fanInRatio: 10,
  islOversubscriptionRatio: 1.0,
  violations: [],
  input: {
    racks: [{ serverCount: 10 }],
    hbaPortsPerServer: 2,
    storageTargetPorts: 4,
    storageArrayCount: 1,
    fcSwitchModel: 'G720',
    islPortsPerSwitch: 2,
    rackSize: '42U',
    serverUHeight: '1U',
    preferredGeneration: 'any',
  },
}

describe('buildFCTopologyGraph', () => {
  it('returns fabricA subgraph with nodes.length === bom.fabricASwitches', () => {
    const { fabricA } = buildFCTopologyGraph(mockFCBOM)
    expect(fabricA.nodes).toHaveLength(mockFCBOM.fabricASwitches)
  })

  it('returns fabricB subgraph with nodes.length === bom.fabricBSwitches', () => {
    const { fabricB } = buildFCTopologyGraph(mockFCBOM)
    expect(fabricB.nodes).toHaveLength(mockFCBOM.fabricBSwitches)
  })

  it('all fabricA node IDs match /^fc-a-\\d+$/', () => {
    const { fabricA } = buildFCTopologyGraph(mockFCBOM)
    fabricA.nodes.forEach(node => {
      expect(node.id).toMatch(/^fc-a-\d+$/)
    })
  })

  it('all fabricB node IDs match /^fc-b-\\d+$/', () => {
    const { fabricB } = buildFCTopologyGraph(mockFCBOM)
    fabricB.nodes.forEach(node => {
      expect(node.id).toMatch(/^fc-b-\d+$/)
    })
  })

  it('no cross-fabric edges — fabricA edges only reference fabricA node IDs; fabricB edges only reference fabricB node IDs', () => {
    const { fabricA, fabricB } = buildFCTopologyGraph(mockFCBOM)

    const fabricANodeIds = new Set(fabricA.nodes.map(n => n.id))
    const fabricBNodeIds = new Set(fabricB.nodes.map(n => n.id))

    // fabricA edges must only reference fabricA nodes
    fabricA.edges.forEach(edge => {
      expect(fabricANodeIds.has(edge.source)).toBe(true)
      expect(fabricANodeIds.has(edge.target)).toBe(true)
    })

    // fabricB edges must only reference fabricB nodes
    fabricB.edges.forEach(edge => {
      expect(fabricBNodeIds.has(edge.source)).toBe(true)
      expect(fabricBNodeIds.has(edge.target)).toBe(true)
    })
  })

  it('fabricA ISL edge count === bom.islPortsPerFabric', () => {
    const { fabricA } = buildFCTopologyGraph(mockFCBOM)
    const islEdges = fabricA.edges.filter(e => e.id.startsWith('isl-a-'))
    expect(islEdges).toHaveLength(mockFCBOM.islPortsPerFabric)
  })

  it('fabricB ISL edge count === bom.islPortsPerFabric', () => {
    const { fabricB } = buildFCTopologyGraph(mockFCBOM)
    const islEdges = fabricB.edges.filter(e => e.id.startsWith('isl-b-'))
    expect(islEdges).toHaveLength(mockFCBOM.islPortsPerFabric)
  })

  it('is deterministic — two calls with same BOM produce identical node positions', () => {
    const result1 = buildFCTopologyGraph(mockFCBOM)
    const result2 = buildFCTopologyGraph(mockFCBOM)
    expect(result1.fabricA.nodes.map(n => ({ id: n.id, position: n.position }))).toEqual(
      result2.fabricA.nodes.map(n => ({ id: n.id, position: n.position }))
    )
    expect(result1.fabricB.nodes.map(n => ({ id: n.id, position: n.position }))).toEqual(
      result2.fabricB.nodes.map(n => ({ id: n.id, position: n.position }))
    )
  })

  it('single-switch fabric (fabricASwitches=1, islPortsPerFabric=0) renders 1 node and 0 ISL edges — no crash', () => {
    const singleSwitchBOM: FCNetworkBOM = {
      ...mockFCBOM,
      fabricASwitches: 1,
      fabricBSwitches: 1,
      islPortsPerFabric: 0,
      islCables: 0,
    }
    const { fabricA, fabricB } = buildFCTopologyGraph(singleSwitchBOM)
    expect(fabricA.nodes).toHaveLength(1)
    expect(fabricB.nodes).toHaveLength(1)
    expect(fabricA.edges.filter(e => e.id.startsWith('isl-a-'))).toHaveLength(0)
    expect(fabricB.edges.filter(e => e.id.startsWith('isl-b-'))).toHaveLength(0)
  })

  it('node data has model field matching input.fcSwitchModel', () => {
    const { fabricA, fabricB } = buildFCTopologyGraph(mockFCBOM)
    fabricA.nodes.forEach(node => {
      expect(node.data.model).toBe(mockFCBOM.input.fcSwitchModel)
    })
    fabricB.nodes.forEach(node => {
      expect(node.data.model).toBe(mockFCBOM.input.fcSwitchModel)
    })
  })
})

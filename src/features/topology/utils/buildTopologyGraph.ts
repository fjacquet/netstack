import type { Node, Edge } from '@xyflow/react'
import type { NetworkBOM } from '@/domain/schemas/bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { SwitchNodeData, RackNodeData, TopologyGraphResult } from '../types'

const TIER_Y = { spine: 80, leaf: 240, rack: 420, oob: 300 } as const

/**
 * Pure function: NetworkBOM → { nodes, edges }
 *
 * Produces a deterministic 3-tier topology graph:
 *   - Spine nodes at top (y=80)
 *   - Leaf nodes in middle (y=240)
 *   - OOB nodes below leafs (y=300)
 *   - Rack nodes at bottom (y=420)
 *
 * Edges:
 *   - leaf-spine: each leaf connects to each spine (id: ls-{leaf}-{spine})
 *   - server-leaf: each rack connects to its 2 leaf switches (id: sl-{rack}-{leaf})
 *   - server-oob: each rack connects to its OOB switch (id: so-{rack}-{oob})
 *   - VLT: dashed edge between each leaf pair (id: vlt-{rack})
 */
export function buildTopologyGraph(bom: NetworkBOM, canvasWidth = 1200): TopologyGraphResult {
  const xPos = (count: number, index: number) => (canvasWidth / (count + 1)) * (index + 1)

  const leafSpec = SWITCH_CATALOG[bom.input.leafModel]
  const spineSpec = SWITCH_CATALOG['S5232F-ON']
  const oobSpec = SWITCH_CATALOG['S3248T-ON']

  // --- Spine nodes ---
  const spineNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.spineSwitches },
    (_, i) => ({
      id: `spine-${i}`,
      type: 'switchNode' as const,
      position: { x: xPos(bom.spineSwitches, i), y: TIER_Y.spine },
      data: {
        model: 'S5232F-ON',
        role: 'spine' as const,
        usedPorts: bom.leafSwitches,
        totalPorts: spineSpec.downlinkPorts,
      },
    })
  )

  // --- Leaf nodes ---
  const leafNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.leafSwitches },
    (_, i) => ({
      id: `leaf-${i}`,
      type: 'switchNode' as const,
      position: { x: xPos(bom.leafSwitches, i), y: TIER_Y.leaf },
      data: {
        model: bom.input.leafModel,
        role: 'leaf' as const,
        usedPorts: bom.input.serversPerRack,
        totalPorts: leafSpec.downlinkPorts,
        rackIndex: Math.floor(i / 2),
      },
    })
  )

  // --- OOB nodes (one per rack) ---
  const oobNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.oobSwitches },
    (_, i) => ({
      id: `oob-${i}`,
      type: 'switchNode' as const,
      position: { x: xPos(bom.oobSwitches, i), y: TIER_Y.oob },
      data: {
        model: 'S3248T-ON',
        role: 'oob' as const,
        usedPorts: bom.input.serversPerRack + 2,
        totalPorts: oobSpec.downlinkPorts,
        rackIndex: i,
      },
    })
  )

  // --- Rack nodes ---
  const rackNodes: Node<RackNodeData>[] = Array.from(
    { length: bom.racks },
    (_, i) => ({
      id: `rack-${i}`,
      type: 'rackNode' as const,
      position: { x: xPos(bom.racks, i), y: TIER_Y.rack },
      data: {
        rackIndex: i,
        serverCount: bom.input.serversPerRack,
      },
    })
  )

  const nodes: Node<SwitchNodeData | RackNodeData>[] = [
    ...spineNodes,
    ...leafNodes,
    ...oobNodes,
    ...rackNodes,
  ]

  // --- Edges ---
  const edges: Edge[] = []

  // Leaf-spine edges: each leaf connects to each spine
  for (let li = 0; li < bom.leafSwitches; li++) {
    for (let si = 0; si < bom.spineSwitches; si++) {
      edges.push({
        id: `ls-${li}-${si}`,
        source: `leaf-${li}`,
        target: `spine-${si}`,
        type: 'default',
        style: {
          stroke: 'hsl(var(--foreground))',
          strokeOpacity: 0.4,
          strokeWidth: 1.5,
        },
      })
    }
  }

  // Server-leaf edges: each rack connects to its 2 leaf switches
  for (let ri = 0; ri < bom.racks; ri++) {
    const leafA = ri * 2
    const leafB = ri * 2 + 1
    edges.push({
      id: `sl-${ri}-a`,
      source: `rack-${ri}`,
      target: `leaf-${leafA}`,
      type: 'straight',
      style: { strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))' },
    })
    if (leafB < bom.leafSwitches) {
      edges.push({
        id: `sl-${ri}-b`,
        source: `rack-${ri}`,
        target: `leaf-${leafB}`,
        type: 'straight',
        style: { strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))' },
      })
    }
  }

  // Server-OOB edges: each rack connects to its OOB switch
  for (let ri = 0; ri < bom.racks; ri++) {
    if (ri < bom.oobSwitches) {
      edges.push({
        id: `so-${ri}`,
        source: `rack-${ri}`,
        target: `oob-${ri}`,
        type: 'straight',
        style: { strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))' },
      })
    }
  }

  // VLT edges: dashed edge between each leaf pair
  for (let ri = 0; ri < bom.racks; ri++) {
    const leafA = ri * 2
    const leafB = ri * 2 + 1
    if (leafB < bom.leafSwitches) {
      edges.push({
        id: `vlt-${ri}`,
        source: `leaf-${leafA}`,
        target: `leaf-${leafB}`,
        type: 'default',
        style: {
          stroke: 'hsl(213, 94%, 68%)',
          strokeWidth: 2,
          strokeDasharray: '5 5',
        },
      })
    }
  }

  return { nodes, edges }
}

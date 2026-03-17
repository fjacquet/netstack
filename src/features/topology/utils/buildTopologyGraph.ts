import type { Node, Edge } from '@xyflow/react'
import type { NetworkBOM } from '@/domain/schemas/bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { SwitchNodeData, RackNodeData, TopologyGraphResult } from '../types'

const TIER_Y = { spine: 80, borderLeaf: 160, leaf: 280, oob: 340, rack: 460 } as const

/**
 * Pure function: NetworkBOM → { nodes, edges }
 *
 * Produces a deterministic multi-tier topology graph:
 *   - Spine nodes at top (y=80)
 *   - Border leaf nodes below spines (y=160) — only if borderLeafSwitches > 0
 *   - Leaf nodes in middle (y=280)
 *   - OOB nodes below leafs (y=340)
 *   - Rack nodes at bottom (y=460)
 */
export function buildTopologyGraph(bom: NetworkBOM, canvasWidth = 1200): TopologyGraphResult {
  const xPos = (count: number, index: number) => (canvasWidth / (count + 1)) * (index + 1)

  const leafSpec = SWITCH_CATALOG[bom.input.leafModel]
  const spineSpec = SWITCH_CATALOG[bom.input.spineModel]
  const oobSpec = SWITCH_CATALOG['S3248T-ON']

  // --- Spine nodes ---
  const spineNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.spineSwitches },
    (_, i) => ({
      id: `spine-${i}`,
      type: 'switchNode' as const,
      position: { x: xPos(bom.spineSwitches, i), y: TIER_Y.spine },
      data: {
        model: bom.input.spineModel,
        role: 'spine' as const,
        usedPorts: Math.ceil(bom.leafSwitches / bom.spineSwitches),
        totalPorts: spineSpec.downlinkPorts,
      },
    })
  )

  // --- Border leaf nodes (only if configured) ---
  const borderLeafNodes: Node<SwitchNodeData>[] = bom.borderLeafSwitches > 0
    ? Array.from(
        { length: bom.borderLeafSwitches },
        (_, i) => ({
          id: `border-${i}`,
          type: 'switchNode' as const,
          position: { x: xPos(bom.borderLeafSwitches, i), y: TIER_Y.borderLeaf },
          data: {
            model: bom.input.borderLeafModel !== 'none' ? bom.input.borderLeafModel : bom.input.leafModel,
            role: 'border' as const,
            usedPorts: 0,
            totalPorts: SWITCH_CATALOG[bom.input.borderLeafModel !== 'none' ? bom.input.borderLeafModel : bom.input.leafModel].downlinkPorts,
          },
        })
      )
    : []

  // --- Leaf nodes ---
  const leafNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.leafSwitches },
    (_, i) => {
      const rackIdx = Math.floor(i / 2)
      // Last rack may have fewer servers
      const serversInThisRack = rackIdx < bom.racks - 1
        ? bom.input.serversPerRack
        : bom.input.totalServers - (bom.racks - 1) * bom.input.serversPerRack
      return {
        id: `leaf-${i}`,
        type: 'switchNode' as const,
        position: { x: xPos(bom.leafSwitches, i), y: TIER_Y.leaf },
        data: {
          model: bom.input.leafModel,
          role: 'leaf' as const,
          usedPorts: serversInThisRack,
          totalPorts: leafSpec.downlinkPorts,
          rackIndex: rackIdx,
        },
      }
    }
  )

  // --- OOB nodes (one per rack) ---
  const oobNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.oobSwitches },
    (_, i) => {
      const serversInThisRack = i < bom.racks - 1
        ? bom.input.serversPerRack
        : bom.input.totalServers - (bom.racks - 1) * bom.input.serversPerRack
      return {
        id: `oob-${i}`,
        type: 'switchNode' as const,
        position: { x: xPos(bom.oobSwitches, i), y: TIER_Y.oob },
        data: {
          model: 'S3248T-ON',
          role: 'oob' as const,
          usedPorts: serversInThisRack + 2,
          totalPorts: oobSpec.downlinkPorts,
          rackIndex: i,
        },
      }
    }
  )

  // --- Rack nodes (with correct per-rack server count) ---
  const rackNodes: Node<RackNodeData>[] = Array.from(
    { length: bom.racks },
    (_, i) => {
      const serversInThisRack = i < bom.racks - 1
        ? bom.input.serversPerRack
        : bom.input.totalServers - (bom.racks - 1) * bom.input.serversPerRack
      return {
        id: `rack-${i}`,
        type: 'rackNode' as const,
        position: { x: xPos(bom.racks, i), y: TIER_Y.rack },
        data: {
          rackIndex: i,
          serverCount: serversInThisRack,
        },
      }
    }
  )

  const nodes: Node<SwitchNodeData | RackNodeData>[] = [
    ...spineNodes,
    ...borderLeafNodes,
    ...leafNodes,
    ...oobNodes,
    ...rackNodes,
  ]

  // --- Edges ---
  const edges: Edge[] = []

  // Border-spine edges: each border leaf connects to each spine
  for (let bi = 0; bi < bom.borderLeafSwitches; bi++) {
    for (let si = 0; si < bom.spineSwitches; si++) {
      edges.push({
        id: `bs-${bi}-${si}`,
        source: `border-${bi}`,
        target: `spine-${si}`,
        type: 'default',
        style: {
          stroke: 'hsl(var(--foreground))',
          strokeOpacity: 0.5,
          strokeWidth: 2,
          strokeDasharray: '8 4',
        },
      })
    }
  }

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

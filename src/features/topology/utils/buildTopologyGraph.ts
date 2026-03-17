import type { Node, Edge } from '@xyflow/react'
import type { NetworkBOM } from '@/domain/schemas/bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { SwitchNodeData, RackNodeData, TopologyGraphResult } from '../types'

// Y positions for each tier
const Y = { spine: 0, leaf: 160, oob: 280, rack: 400 } as const

// Rack column width and shared infrastructure spacing
const RACK_COL_WIDTH = 320
const NODE_GAP = 140

/**
 * Pure function: NetworkBOM → { nodes, edges }
 *
 * Layout strategy: rack-based columns
 *   - Each rack gets a vertical column with its leaf pair + OOB
 *   - Spines and border leafs are centered above all rack columns
 *   - This prevents edge crossings within a rack group
 */
export function buildTopologyGraph(bom: NetworkBOM): TopologyGraphResult {
  const leafSpec = SWITCH_CATALOG[bom.input.leafModel]
  const spineSpec = SWITCH_CATALOG[bom.input.spineModel]
  const oobSpec = SWITCH_CATALOG['S3248T-ON']

  // Total canvas width based on rack count
  const totalWidth = Math.max(bom.racks * RACK_COL_WIDTH, 600)
  const rackStartX = (totalWidth - (bom.racks - 1) * RACK_COL_WIDTH) / 2

  // Center-distribute shared infrastructure (spines, border leafs) above rack columns
  const centerX = (count: number, index: number) =>
    (totalWidth / (count + 1)) * (index + 1)

  // Per-rack column X positions
  const rackX = (rackIdx: number) => rackStartX + rackIdx * RACK_COL_WIDTH

  // --- Spine nodes (centered) ---
  const spineNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.spineSwitches },
    (_, i) => ({
      id: `spine-${i}`,
      type: 'switchNode' as const,
      position: { x: centerX(bom.spineSwitches, i), y: Y.spine },
      data: {
        model: bom.input.spineModel,
        role: 'spine' as const,
        usedPorts: Math.ceil(bom.leafSwitches / bom.spineSwitches),
        totalPorts: spineSpec.downlinkPorts,
      },
    })
  )

  // --- Border leaf nodes (same Y as leafs, positioned after last rack column) ---
  const borderStartX = rackStartX + bom.racks * RACK_COL_WIDTH
  const borderLeafNodes: Node<SwitchNodeData>[] = bom.borderLeafSwitches > 0
    ? Array.from(
        { length: bom.borderLeafSwitches },
        (_, i) => ({
          id: `border-${i}`,
          type: 'switchNode' as const,
          position: { x: borderStartX + i * NODE_GAP, y: Y.leaf },
          data: {
            model: bom.input.borderLeafModel !== 'none' ? bom.input.borderLeafModel : bom.input.leafModel,
            role: 'border' as const,
            usedPorts: 0,
            totalPorts: SWITCH_CATALOG[bom.input.borderLeafModel !== 'none' ? bom.input.borderLeafModel : bom.input.leafModel].downlinkPorts,
          },
        })
      )
    : []

  // --- Per-rack nodes: leaf pair + OOB + rack ---
  const leafNodes: Node<SwitchNodeData>[] = []
  const oobNodes: Node<SwitchNodeData>[] = []
  const rackNodes: Node<RackNodeData>[] = []

  for (let ri = 0; ri < bom.racks; ri++) {
    const cx = rackX(ri)
    const serversInRack = ri < bom.racks - 1
      ? bom.input.serversPerRack
      : bom.input.totalServers - (bom.racks - 1) * bom.input.serversPerRack

    // Leaf A (left of rack center)
    leafNodes.push({
      id: `leaf-${ri * 2}`,
      type: 'switchNode' as const,
      position: { x: cx - NODE_GAP / 2, y: Y.leaf },
      data: {
        model: bom.input.leafModel,
        role: 'leaf' as const,
        usedPorts: serversInRack,
        totalPorts: leafSpec.downlinkPorts,
        rackIndex: ri,
      },
    })

    // Leaf B (right of rack center)
    if (ri * 2 + 1 < bom.leafSwitches) {
      leafNodes.push({
        id: `leaf-${ri * 2 + 1}`,
        type: 'switchNode' as const,
        position: { x: cx + NODE_GAP / 2, y: Y.leaf },
        data: {
          model: bom.input.leafModel,
          role: 'leaf' as const,
          usedPorts: serversInRack,
          totalPorts: leafSpec.downlinkPorts,
          rackIndex: ri,
        },
      })
    }

    // OOB (centered in rack column)
    if (ri < bom.oobSwitches) {
      oobNodes.push({
        id: `oob-${ri}`,
        type: 'switchNode' as const,
        position: { x: cx, y: Y.oob },
        data: {
          model: 'S3248T-ON',
          role: 'oob' as const,
          usedPorts: serversInRack + 2,
          totalPorts: oobSpec.downlinkPorts,
          rackIndex: ri,
        },
      })
    }

    // Rack node (centered in rack column)
    rackNodes.push({
      id: `rack-${ri}`,
      type: 'rackNode' as const,
      position: { x: cx, y: Y.rack },
      data: {
        rackIndex: ri,
        serverCount: serversInRack,
      },
    })
  }

  const nodes: Node<SwitchNodeData | RackNodeData>[] = [
    ...spineNodes,
    ...borderLeafNodes,
    ...leafNodes,
    ...oobNodes,
    ...rackNodes,
  ]

  // --- Edges ---
  const edges: Edge[] = []

  // Border-spine edges
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

  // Leaf-spine edges
  for (let li = 0; li < bom.leafSwitches; li++) {
    for (let si = 0; si < bom.spineSwitches; si++) {
      edges.push({
        id: `ls-${li}-${si}`,
        source: `leaf-${li}`,
        target: `spine-${si}`,
        type: 'default',
        style: {
          stroke: 'hsl(var(--foreground))',
          strokeOpacity: 0.3,
          strokeWidth: 1,
        },
      })
    }
  }

  // Per-rack edges: rack → leaf pair, rack → OOB, VLT between leaf pair
  for (let ri = 0; ri < bom.racks; ri++) {
    const leafA = ri * 2
    const leafB = ri * 2 + 1

    // Rack → Leaf A
    edges.push({
      id: `sl-${ri}-a`,
      source: `rack-${ri}`,
      target: `leaf-${leafA}`,
      type: 'straight',
      style: { strokeWidth: 1.5, stroke: 'hsl(var(--muted-foreground))' },
    })

    // Rack → Leaf B
    if (leafB < bom.leafSwitches) {
      edges.push({
        id: `sl-${ri}-b`,
        source: `rack-${ri}`,
        target: `leaf-${leafB}`,
        type: 'straight',
        style: { strokeWidth: 1.5, stroke: 'hsl(var(--muted-foreground))' },
      })
    }

    // Rack → OOB
    if (ri < bom.oobSwitches) {
      edges.push({
        id: `so-${ri}`,
        source: `rack-${ri}`,
        target: `oob-${ri}`,
        type: 'straight',
        style: { strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.5 },
      })
    }

    // VLT between leaf pair (dashed blue)
    if (leafB < bom.leafSwitches) {
      edges.push({
        id: `vlt-${ri}`,
        source: `leaf-${leafA}`,
        target: `leaf-${leafB}`,
        type: 'straight',
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

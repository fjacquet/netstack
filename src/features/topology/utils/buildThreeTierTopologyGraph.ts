import type { Node, Edge } from '@xyflow/react'
import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { SwitchSpec } from '@/domain/catalog/types'
import type { SwitchNodeData, RackNodeData, TopologyGraphResult } from '../types'

// Y positions for each tier (4-tier hierarchy + OOB)
const Y = { core: 0, aggr: 160, access: 320, rack: 440, oob: 560 } as const

// Rack column width and shared infrastructure spacing
const RACK_COL_WIDTH = 320
const NODE_GAP = 140

/**
 * Pure function: ThreeTierBOM -> { nodes, edges }
 *
 * Layout strategy: rack-based columns (same approach as Clos buildTopologyGraph)
 *   - Each rack gets a vertical column with its access pair + OOB
 *   - Core and aggregation switches are centered above all rack columns
 *   - Border leafs (if any) are positioned after the last rack column
 */
export function buildThreeTierTopologyGraph(bom: ThreeTierBOM): TopologyGraphResult {
  const accessSpec = SWITCH_CATALOG[bom.input.accessModel] as SwitchSpec
  const aggrSpec = SWITCH_CATALOG[bom.input.aggregationModel] as SwitchSpec
  const coreSpec = SWITCH_CATALOG[bom.input.coreModel] as SwitchSpec
  const oobSpec = SWITCH_CATALOG['S3248T-ON'] as SwitchSpec

  // Total canvas width based on rack count
  const totalWidth = Math.max(bom.racks * RACK_COL_WIDTH, 600)
  const rackStartX = (totalWidth - (bom.racks - 1) * RACK_COL_WIDTH) / 2

  // Center-distribute shared infrastructure (core, aggregation) above rack columns
  const centerX = (count: number, index: number) =>
    (totalWidth / (count + 1)) * (index + 1)

  // Per-rack column X positions
  const rackX = (rackIdx: number) => rackStartX + rackIdx * RACK_COL_WIDTH

  // --- Core nodes (centered at Y.core) ---
  const coreNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.coreSwitches },
    (_, i) => ({
      id: `core-${i}`,
      type: 'switchNode' as const,
      position: { x: centerX(bom.coreSwitches, i), y: Y.core },
      data: {
        model: bom.input.coreModel,
        role: 'core' as const,
        usedPorts: Math.ceil(
          bom.aggregationSwitches * bom.input.activeUplinksPerAggregation / bom.coreSwitches
        ),
        totalPorts: coreSpec.downlinkPorts,
      },
    })
  )

  // --- Aggregation nodes (centered at Y.aggr) ---
  const aggrNodes: Node<SwitchNodeData>[] = Array.from(
    { length: bom.aggregationSwitches },
    (_, i) => ({
      id: `aggr-${i}`,
      type: 'switchNode' as const,
      position: { x: centerX(bom.aggregationSwitches, i), y: Y.aggr },
      data: {
        model: bom.input.aggregationModel,
        role: 'aggregation' as const,
        usedPorts: Math.ceil(
          bom.accessSwitches * bom.input.activeUplinksPerAccess / bom.aggregationSwitches
        ),
        totalPorts: aggrSpec.downlinkPorts,
      },
    })
  )

  // --- Border leaf nodes (same Y as access, positioned after last rack column) ---
  const borderStartX = rackStartX + bom.racks * RACK_COL_WIDTH
  const borderLeafNodes: Node<SwitchNodeData>[] = bom.borderLeafSwitches > 0
    ? Array.from(
        { length: bom.borderLeafSwitches },
        (_, i) => ({
          id: `border-${i}`,
          type: 'switchNode' as const,
          position: { x: borderStartX + i * NODE_GAP, y: Y.access },
          data: {
            model: bom.input.borderLeafModel !== 'none' ? bom.input.borderLeafModel : bom.input.accessModel,
            role: 'border' as const,
            usedPorts: 0,
            totalPorts: (SWITCH_CATALOG[bom.input.borderLeafModel !== 'none' ? bom.input.borderLeafModel : bom.input.accessModel] as SwitchSpec).downlinkPorts,
          },
        })
      )
    : []

  // --- Per-rack nodes: access pair + OOB + rack ---
  const accessNodes: Node<SwitchNodeData>[] = []
  const oobNodes: Node<SwitchNodeData>[] = []
  const rackNodes: Node<RackNodeData>[] = []

  for (let ri = 0; ri < bom.racks; ri++) {
    const cx = rackX(ri)
    // Per-rack server count from racks array; fallback to 0 if out of bounds
    const serversInRack = bom.input.racks[ri]?.serverCount ?? 0

    // Access A (left of rack center)
    accessNodes.push({
      id: `access-${ri * 2}`,
      type: 'switchNode' as const,
      position: { x: cx - NODE_GAP / 2, y: Y.access },
      data: {
        model: bom.input.accessModel,
        role: 'access' as const,
        usedPorts: serversInRack,
        totalPorts: accessSpec.downlinkPorts,
        rackIndex: ri,
      },
    })

    // Access B (right of rack center)
    if (ri * 2 + 1 < bom.accessSwitches) {
      accessNodes.push({
        id: `access-${ri * 2 + 1}`,
        type: 'switchNode' as const,
        position: { x: cx + NODE_GAP / 2, y: Y.access },
        data: {
          model: bom.input.accessModel,
          role: 'access' as const,
          usedPorts: serversInRack,
          totalPorts: accessSpec.downlinkPorts,
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
    ...coreNodes,
    ...aggrNodes,
    ...borderLeafNodes,
    ...accessNodes,
    ...oobNodes,
    ...rackNodes,
  ]

  // --- Edges ---
  const edges: Edge[] = []

  // Aggregation-to-core edges (thicker gray, strokeWidth: 2.5 to distinguish backbone)
  for (let ai = 0; ai < bom.aggregationSwitches; ai++) {
    for (let ci = 0; ci < bom.coreSwitches; ci++) {
      edges.push({
        id: `ac-${ai}-${ci}`,
        source: `aggr-${ai}`,
        target: `core-${ci}`,
        type: 'default',
        style: {
          stroke: 'hsl(var(--foreground))',
          strokeOpacity: 0.4,
          strokeWidth: 2.5,
        },
      })
    }
  }

  // Access-to-aggregation edges (thin gray, strokeWidth: 1.5)
  for (let xi = 0; xi < bom.accessSwitches; xi++) {
    for (let ai = 0; ai < bom.aggregationSwitches; ai++) {
      edges.push({
        id: `xa-${xi}-${ai}`,
        source: `access-${xi}`,
        target: `aggr-${ai}`,
        type: 'default',
        style: {
          stroke: 'hsl(var(--foreground))',
          strokeOpacity: 0.3,
          strokeWidth: 1.5,
        },
      })
    }
  }

  // Border-to-core edges (dashed, strokeDasharray: '8 4')
  for (let bi = 0; bi < bom.borderLeafSwitches; bi++) {
    for (let ci = 0; ci < bom.coreSwitches; ci++) {
      edges.push({
        id: `bc-${bi}-${ci}`,
        source: `border-${bi}`,
        target: `core-${ci}`,
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

  // Per-rack edges: rack -> access pair, rack -> OOB, VLT between access pair
  for (let ri = 0; ri < bom.racks; ri++) {
    const accessA = ri * 2
    const accessB = ri * 2 + 1

    // Rack -> Access A
    edges.push({
      id: `ra-${ri}-a`,
      source: `rack-${ri}`,
      target: `access-${accessA}`,
      type: 'straight',
      style: { strokeWidth: 1.5, stroke: 'hsl(var(--muted-foreground))' },
    })

    // Rack -> Access B
    if (accessB < bom.accessSwitches) {
      edges.push({
        id: `ra-${ri}-b`,
        source: `rack-${ri}`,
        target: `access-${accessB}`,
        type: 'straight',
        style: { strokeWidth: 1.5, stroke: 'hsl(var(--muted-foreground))' },
      })
    }

    // Rack -> OOB
    if (ri < bom.oobSwitches) {
      edges.push({
        id: `ro-${ri}`,
        source: `rack-${ri}`,
        target: `oob-${ri}`,
        type: 'straight',
        style: { strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.5 },
      })
    }

    // VLT between access pair (dashed blue)
    if (accessB < bom.accessSwitches) {
      edges.push({
        id: `vlt-${ri}`,
        source: `access-${accessA}`,
        target: `access-${accessB}`,
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

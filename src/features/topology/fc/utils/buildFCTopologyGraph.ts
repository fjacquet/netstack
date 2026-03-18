import type { Node, Edge } from '@xyflow/react'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'
import type { FCSwitchNodeData, FCTopologySubgraph, FCTopologyGraphResult } from '../../types'

// Horizontal spacing between FC switches
const SWITCH_SPACING = 200

/**
 * Build a single fabric subgraph for N switches with M ISL edges.
 *
 * Layout: horizontal row of switches, evenly spaced at x = i * SWITCH_SPACING, y = 0.
 * ISL edges: connect adjacent switches in sequence (linear chain).
 *   - For N switches and M ISL ports: create min(M, N-1) ISL edges.
 *   - Single-switch case (N=1) or M=0: no ISL edges (no crash).
 */
function buildFabricSubgraph(
  fabric: 'A' | 'B',
  switchCount: number,
  islPortsPerFabric: number,
  model: string,
  hostPortsPerFabric: number,
  islPortsPerSwitch: number,
): FCTopologySubgraph {
  const prefix = fabric === 'A' ? 'fc-a' : 'fc-b'
  const islEdgePrefix = fabric === 'A' ? 'isl-a' : 'isl-b'
  const islColor = fabric === 'A' ? 'hsl(213, 94%, 55%)' : 'hsl(32, 95%, 55%)'

  // Per-switch port usage
  const usedPortsPerSwitch = switchCount > 0
    ? Math.ceil(hostPortsPerFabric / switchCount)
    : 0

  // Build switch nodes in horizontal row
  const nodes: Node<FCSwitchNodeData>[] = Array.from({ length: switchCount }, (_, i) => ({
    id: `${prefix}-${i}`,
    type: 'fcSwitchNode' as const,
    position: { x: i * SWITCH_SPACING, y: 0 },
    data: {
      model,
      fabric,
      usedPorts: usedPortsPerSwitch,
      totalPorts: usedPortsPerSwitch,
      islPorts: islPortsPerSwitch,
    },
  }))

  // Build ISL edges:
  //   - Linear chain (M < N): 0→1, 1→2, ... up to M edges
  //   - Ring (M >= N): 0→1, 1→2, ..., N-1→0 — N edges total
  //   - Single-switch (N=1) or M=0: 0 edges
  const islEdgeCount = switchCount <= 1 || islPortsPerFabric === 0
    ? 0
    : islPortsPerFabric >= switchCount
      ? switchCount   // ring: N edges
      : islPortsPerFabric  // linear chain: M edges

  const isRing = islPortsPerFabric >= switchCount && switchCount > 1
  const edges: Edge[] = Array.from({ length: islEdgeCount }, (_, i) => ({
    id: `${islEdgePrefix}-${i}`,
    source: `${prefix}-${i}`,
    // Ring: last node connects back to node 0; linear: i → i+1
    target: isRing ? `${prefix}-${(i + 1) % switchCount}` : `${prefix}-${i + 1}`,
    type: 'default' as const,
    style: {
      strokeDasharray: '5 5',
      strokeWidth: 2,
      stroke: islColor,
    },
  }))

  return { nodes, edges }
}

/**
 * Pure function: FCNetworkBOM → { fabricA, fabricB } topology subgraphs
 *
 * Cross-fabric isolation is guaranteed by construction: Fabric A nodes use
 * 'fc-a-*' IDs and Fabric B nodes use 'fc-b-*' IDs. No edge can cross fabrics
 * because each subgraph is built independently with its own namespaced IDs.
 *
 * ISL edge count uses bom.islPortsPerFabric — NOT bom.islCables (which is
 * total across both fabrics).
 */
export function buildFCTopologyGraph(bom: FCNetworkBOM): FCTopologyGraphResult {
  const model = bom.input.fcSwitchModel
  const islPortsPerSwitch = bom.input.islPortsPerSwitch

  const fabricA = buildFabricSubgraph(
    'A',
    bom.fabricASwitches,
    bom.islPortsPerFabric,
    model,
    bom.hostPortsPerFabric,
    islPortsPerSwitch,
  )

  const fabricB = buildFabricSubgraph(
    'B',
    bom.fabricBSwitches,
    bom.islPortsPerFabric,
    model,
    bom.hostPortsPerFabric,
    islPortsPerSwitch,
  )

  return { fabricA, fabricB }
}

export type { FCTopologySubgraph, FCTopologyGraphResult }

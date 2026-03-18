import type { Node, Edge } from '@xyflow/react'

export type SwitchNodeData = {
  model: string
  role: 'spine' | 'leaf' | 'oob' | 'border' | 'access' | 'aggregation' | 'core'
  usedPorts: number
  totalPorts: number
  rackIndex?: number
}

export type RackNodeData = {
  rackIndex: number
  serverCount: number
  label?: string
}

export type TopologyGraphResult = {
  nodes: Node<SwitchNodeData | RackNodeData>[]
  edges: Edge[]
}

export type FCSwitchNodeData = {
  model: string        // e.g. 'G720' — from input.fcSwitchModel
  fabric: 'A' | 'B'   // drives color scheme in FCTopologyCanvas
  usedPorts: number    // host + storage + ISL ports consumed on this switch
  totalPorts: number   // effective ports (proxy based on demand)
  islPorts: number     // ISL port count for this switch instance
}

export type FCTopologySubgraph = {
  nodes: Node<FCSwitchNodeData>[]
  edges: Edge[]
}

export type FCTopologyGraphResult = {
  fabricA: FCTopologySubgraph
  fabricB: FCTopologySubgraph
}

import type { Node, Edge } from '@xyflow/react'

export type SwitchNodeData = {
  model: string
  role: 'spine' | 'leaf' | 'oob' | 'border'
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

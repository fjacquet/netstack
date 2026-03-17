import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { Server } from 'lucide-react'
import type { RackNodeData } from '../types'

type RackNodeType = Node<RackNodeData, 'rackNode'>

/**
 * Custom ReactFlow node for a rack / server grouping.
 * Renders rack index label and server count.
 * Only has a target handle (top) — receives edges from leaf and OOB switches.
 */
export function RackNode({ data }: NodeProps<RackNodeType>) {
  return (
    <div className="rounded-lg bg-secondary border border-border p-2 min-w-[100px] shadow-sm hover:shadow-md transition-shadow cursor-pointer select-none">
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col items-center gap-0.5">
        <Server size={18} className="text-foreground/70" />
        <span className="text-[12px] font-semibold leading-tight text-foreground text-center">
          Rack {data.rackIndex + 1}
        </span>
        <span className="text-[12px] leading-tight text-muted-foreground text-center">
          {data.serverCount} servers
        </span>
      </div>
    </div>
  )
}

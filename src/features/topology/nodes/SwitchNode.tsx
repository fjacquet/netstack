import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { Network, Share2, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SwitchNodeData } from '../types'
import { getSaturationBorderClass } from '../utils/saturation'

type SwitchNodeType = Node<SwitchNodeData, 'switchNode'>

const roleIcons = {
  leaf: Network,
  spine: Share2,
  oob: Monitor,
} as const

/**
 * Custom ReactFlow node for spine/leaf/OOB switches.
 * Renders role icon, model name, role label, and port utilization.
 * Border color reflects port saturation (green < 80%, amber >= 80%, red >= 100%).
 * Background fill varies by role (blue/purple/gray).
 */
export function SwitchNode({ data }: NodeProps<SwitchNodeType>) {
  const { t } = useTranslation()
  const Icon = roleIcons[data.role]

  const roleColor =
    data.role === 'leaf'
      ? 'bg-[hsl(213_94%_92%)] dark:bg-[hsl(213_94%_20%)]'
      : data.role === 'spine'
        ? 'bg-[hsl(270_91%_92%)] dark:bg-[hsl(270_91%_20%)]'
        : 'bg-muted'

  const borderColor = getSaturationBorderClass(data.usedPorts, data.totalPorts)

  return (
    <div
      role="button"
      aria-label={t('topology.nodeAriaLabel', { model: data.model, role: data.role })}
      className={[
        'rounded-lg p-2 min-w-[120px] min-h-[64px] shadow-sm hover:shadow-md transition-shadow',
        'border-2 hover:border-[3px] cursor-pointer select-none',
        roleColor,
        borderColor,
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex flex-col items-center gap-0.5">
        <Icon size={18} className="text-foreground/70" />
        <span className="font-mono text-[12px] leading-tight text-foreground/90 text-center">
          {data.model}
        </span>
        <span className="text-[12px] font-semibold leading-tight text-foreground capitalize text-center">
          {data.role}
        </span>
        <span className="text-[12px] leading-tight text-muted-foreground text-center">
          {data.usedPorts}/{data.totalPorts} ports
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

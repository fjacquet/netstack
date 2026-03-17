import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getSaturationBorderClass } from '@/features/topology/utils/saturation'
import type { RackDevice as RackDeviceType } from './types'

interface RackDeviceProps {
  device: RackDeviceType
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, device: RackDeviceType) => void
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void
  onMoveUp?: (device: RackDeviceType) => void
  onMoveDown?: (device: RackDeviceType) => void
}

export function RackDevice({ device, onDragStart, onDragEnd, onMoveUp, onMoveDown }: RackDeviceProps) {
  const [isDragging, setIsDragging] = useState(false)

  const borderClass = getSaturationBorderClass(device.usedPorts, device.totalPorts)

  const roleColorClass =
    device.role === 'leaf'
      ? 'bg-[hsl(213_94%_80%)] dark:bg-[hsl(213_94%_28%)]'
      : device.role === 'spine'
        ? 'bg-[hsl(270_91%_80%)] dark:bg-[hsl(270_91%_28%)]'
        : device.role === 'border'
          ? 'bg-[hsl(142_76%_80%)] dark:bg-[hsl(142_76%_28%)]'
          : 'bg-muted'

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('text/plain', device.id)
    setIsDragging(true)
    onDragStart?.(e, device)
  }

  function handleDragEnd(e: React.DragEvent<HTMLDivElement>) {
    setIsDragging(false)
    onDragEnd?.(e)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onMoveUp?.(device)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onMoveDown?.(device)
    }
  }

  return (
    <div
      draggable="true"
      role="button"
      tabIndex={0}
      aria-label={`${device.model} at U${device.uSlot} — press to select and use arrow keys to move`}
      className={cn(
        'h-10 w-full rounded cursor-grab select-none',
        'flex items-center px-3 gap-2',
        'border-3 transition-all',
        roleColorClass,
        borderClass,
        isDragging && 'opacity-50 cursor-grabbing',
      )}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
    >
      <span className="font-mono text-xs font-medium shrink-0">{device.model}</span>
      <span className="text-xs text-foreground/80 truncate">{device.label}</span>
    </div>
  )
}

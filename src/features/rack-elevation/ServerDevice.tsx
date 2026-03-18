import { cn } from '@/lib/utils'

interface ServerDeviceProps {
  serverNumber: number
  uHeight: number
  uSlot: number
}

export function ServerDevice({ serverNumber, uHeight, uSlot }: ServerDeviceProps) {
  return (
    <div
      style={{ height: `${uHeight * 40}px` }}
      className={cn(
        'w-full rounded select-none',
        'flex items-center px-3 gap-2 relative',
        'border-2 border-border',
        'bg-[hsl(25_95%_80%)] dark:bg-[hsl(25_95%_28%)]',
      )}
      role="img"
      aria-label={`Server ${serverNumber}, ${uHeight}U, at U${uSlot}`}
    >
      <span className="text-xs text-foreground/80 truncate">
        Server {serverNumber}
      </span>
      {uHeight > 1 && (
        <span className="text-[10px] absolute top-0.5 right-1 text-foreground/60">
          {uHeight}U
        </span>
      )}
    </div>
  )
}

import { cn } from '@/lib/utils'
import type { RackDevice as RackDeviceType } from './types'
import { RackDevice } from './RackDevice'

interface RackFrameProps {
  devices: RackDeviceType[]
  rackUnits: number
  onReorder: (devices: RackDeviceType[]) => void
}

/**
 * Visual rack frame with U-slot grid.
 *
 * U-slots are numbered bottom-to-top (U1 at bottom) but rendered top-to-bottom visually.
 * Empty slots show a dashed border with muted background.
 * Devices are drag-and-droppable to different U-slots.
 */
export function RackFrame({ devices, rackUnits, onReorder }: RackFrameProps) {
  const totalSlots = rackUnits

  // U-slot numbers go from totalSlots (top, displayed first) down to 1 (bottom, displayed last)
  const slotNumbers = Array.from({ length: totalSlots }, (_, i) => totalSlots - i)

  function getDeviceAtSlot(uSlot: number): RackDeviceType | undefined {
    return devices.find((d) => d.uSlot === uSlot)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetSlot: number) {
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    const draggedDevice = devices.find((d) => d.id === draggedId)
    if (!draggedDevice) return

    // If dropped on an occupied slot, snap back — no change
    const occupant = getDeviceAtSlot(targetSlot)
    if (occupant && occupant.id !== draggedId) return

    // Same slot — no change needed
    if (draggedDevice.uSlot === targetSlot) return

    // Swap the uSlot
    const updated = devices.map((d) =>
      d.id === draggedId ? { ...d, uSlot: targetSlot } : d,
    )
    onReorder(updated)
  }

  function handleMoveUp(device: RackDeviceType) {
    const nextSlot = device.uSlot + 1
    if (nextSlot > totalSlots) return

    const occupant = getDeviceAtSlot(nextSlot)
    let updated: RackDeviceType[]

    if (occupant) {
      // Swap with occupant
      updated = devices.map((d) => {
        if (d.id === device.id) return { ...d, uSlot: nextSlot }
        if (d.id === occupant.id) return { ...d, uSlot: device.uSlot }
        return d
      })
    } else {
      updated = devices.map((d) =>
        d.id === device.id ? { ...d, uSlot: nextSlot } : d,
      )
    }
    onReorder(updated)
  }

  function handleMoveDown(device: RackDeviceType) {
    const prevSlot = device.uSlot - 1
    if (prevSlot < 1) return

    const occupant = getDeviceAtSlot(prevSlot)
    let updated: RackDeviceType[]

    if (occupant) {
      // Swap with occupant
      updated = devices.map((d) => {
        if (d.id === device.id) return { ...d, uSlot: prevSlot }
        if (d.id === occupant.id) return { ...d, uSlot: device.uSlot }
        return d
      })
    } else {
      updated = devices.map((d) =>
        d.id === device.id ? { ...d, uSlot: prevSlot } : d,
      )
    }
    onReorder(updated)
  }

  return (
    <div
      className={cn(
        'w-80 mx-auto rounded border-4 border-border',
        'overflow-hidden',
      )}
      role="region"
      aria-label="Rack elevation view"
    >
      {slotNumbers.map((uSlot) => {
        const device = getDeviceAtSlot(uSlot)

        return (
          <div
            key={uSlot}
            className="flex items-center h-11"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, uSlot)}
          >
            {/* U-slot label column — 32px wide, right-aligned */}
            <div className="w-8 shrink-0 flex items-center justify-end pr-1">
              <span className="text-xs text-muted-foreground leading-none">
                U{uSlot}
              </span>
            </div>

            {/* Device or empty slot */}
            <div className="flex-1 h-10 mx-1">
              {device ? (
                <RackDevice
                  device={device}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ) : (
                <div
                  className={cn(
                    'h-full rounded',
                    'border border-dashed border-border',
                    'bg-muted/30',
                  )}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

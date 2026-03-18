import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useResultStore } from '@/store/resultStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildRackDevices, buildNetworkRackDevices } from './utils/buildRackDevices'
import { buildPositioningRackDevices } from './utils/buildPositioningRackDevices'
import { RackFrame } from './RackFrame'
import { RackCapacityBadge } from './RackCapacityBadge'
import type { RackDevice } from './types'

/**
 * RackElevationTab — shows a per-rack physical device layout.
 *
 * Rack types:
 * - Server racks (index 0..N-1): leaf pair + OOB per rack
 * - Network racks (index -1..-N): spines + border leafs
 */
export function RackElevationTab() {
  const { t } = useTranslation()

  const bom = useResultStore(useShallow((s) => s.bom))

  const [selectedRack, setSelectedRack] = useState('0')
  const [devices, setDevices] = useState<RackDevice[]>([])

  // When rack count changes (BOM update), reset to first rack
  useEffect(() => {
    if (!bom) {
      setDevices([])
      setSelectedRack('0')
    }
  }, [bom?.racks]) // eslint-disable-line react-hooks/exhaustive-deps

  // When positioning changes back to ToR, reset from positioning rack view to first server rack
  useEffect(() => {
    if (bom?.input.switchPositioning === 'ToR' && selectedRack === 'positioning') {
      setSelectedRack('0')
    }
  }, [bom?.input.switchPositioning]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild devices whenever BOM or selectedRack changes
  useEffect(() => {
    if (!bom) {
      setDevices([])
      return
    }
    if (selectedRack === 'positioning') {
      // Positioning rack: centralized leaf switches for MoR/BoR mode
      setDevices(buildPositioningRackDevices(bom))
    } else if (selectedRack.startsWith('net-')) {
      // Network rack
      setDevices(buildNetworkRackDevices(bom))
    } else {
      const rackIdx = Number(selectedRack)
      const safeIdx = rackIdx < bom.racks ? rackIdx : 0
      setDevices(buildRackDevices(bom, safeIdx))
    }
  }, [bom, selectedRack])

  function handleRackChange(value: string) {
    setSelectedRack(value)
  }

  function handleReorder(updated: RackDevice[]) {
    setDevices(updated)
  }

  // Empty state — no BOM computed yet
  if (!bom) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-sm w-full">
          <CardHeader>
            <CardTitle className="text-lg">{t('rack.emptyHeading')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('rack.emptyBody')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const rackUnits = parseInt(bom.input.rackSize)

  // Compute used U and overflow for the selected rack
  const usedU = devices.reduce((sum, d) => sum + d.uHeight, 0)
  const overflow = usedU > rackUnits

  return (
    <div className="flex h-full flex-col">
      {/* Rack selector bar */}
      <div className="h-12 flex items-center gap-2 px-4 border-b">
        <span className="text-sm font-medium shrink-0">{t('rack.selectorLabel')}:</span>
        <Select
          value={selectedRack}
          onValueChange={handleRackChange}
          aria-label="Select rack to view"
        >
          <SelectTrigger className="w-56 h-9" aria-label="Select rack to view">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: bom.racks }, (_, i) => (
              <SelectItem key={`srv-${i}`} value={String(i)}>
                {t('rack.serverRack', { n: i + 1 })}
              </SelectItem>
            ))}
            {bom.networkRacks > 0 && Array.from({ length: bom.networkRacks }, (_, i) => (
              <SelectItem key={`net-${i}`} value={`net-${i}`}>
                {t('rack.networkRack', { n: i + 1 })}
              </SelectItem>
            ))}
            {bom.input.switchPositioning !== 'ToR' && (
              <SelectItem value="positioning">
                {t('rack.positioningRack', { type: bom.input.switchPositioning })}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <RackCapacityBadge usedU={usedU} totalU={rackUnits} />
      </div>

      {/* Rack frame with scroll */}
      <ScrollArea className="flex-1">
        <div className="py-6">
          <RackFrame devices={devices} rackUnits={rackUnits} onReorder={handleReorder} overflow={overflow} />
        </div>
      </ScrollArea>
    </div>
  )
}

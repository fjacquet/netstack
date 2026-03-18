import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useThreeTierResultStore } from '@/store/threeTierResultStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buildThreeTierRackDevices, buildThreeTierNetworkRackDevices } from './utils/buildThreeTierRackDevices'
import { RackFrame } from './RackFrame'
import { RackCapacityBadge } from './RackCapacityBadge'
import type { RackDevice } from './types'

/**
 * ThreeTierRackElevationTab -- rack elevation for standalone three-tier mode.
 *
 * Shows two rack categories:
 * 1. Server racks: access switch pair + OOB per rack (with correct uHeight for Z-series)
 * 2. Network racks: aggregation + core switches (+ border leafs if any)
 */
export function ThreeTierRackElevationTab() {
  const { t } = useTranslation()

  const bom = useThreeTierResultStore(useShallow((s) => s.bom))

  const [selectedRack, setSelectedRack] = useState('0')
  const [devices, setDevices] = useState<RackDevice[]>([])

  // When rack count changes (BOM update), reset to first rack
  useEffect(() => {
    if (!bom) {
      setDevices([])
      setSelectedRack('0')
    }
  }, [bom?.racks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild devices whenever BOM or selectedRack changes
  useEffect(() => {
    if (!bom) {
      setDevices([])
      return
    }
    if (selectedRack.startsWith('net-')) {
      // Network rack
      setDevices(buildThreeTierNetworkRackDevices(bom))
    } else {
      const rackIdx = Number(selectedRack)
      const safeIdx = rackIdx < bom.racks ? rackIdx : 0
      setDevices(buildThreeTierRackDevices(bom, safeIdx))
    }
  }, [bom, selectedRack])

  function handleRackChange(value: string) {
    setSelectedRack(value)
  }

  function handleReorder(updated: RackDevice[]) {
    setDevices(updated)
  }

  // Empty state -- no BOM computed yet
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
            {/* Server racks */}
            <SelectGroup>
              <SelectLabel>{t('rack.serverRacks', { defaultValue: 'Server Racks' })}</SelectLabel>
              {Array.from({ length: bom.racks }, (_, i) => (
                <SelectItem key={`srv-${i}`} value={String(i)}>
                  {t('rack.serverRack', { n: i + 1 })}
                </SelectItem>
              ))}
            </SelectGroup>

            {/* Network racks (aggregation + core switches) */}
            {bom.networkRacks > 0 && (
              <SelectGroup>
                <SelectLabel>{t('rack.networkRacks', { defaultValue: 'Network Racks' })}</SelectLabel>
                {Array.from({ length: bom.networkRacks }, (_, i) => (
                  <SelectItem key={`net-${i}`} value={`net-${i}`}>
                    {t('rack.networkRack', { n: i + 1 })}
                  </SelectItem>
                ))}
              </SelectGroup>
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

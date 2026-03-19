import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useResultStore } from '@/store/resultStore'
import { useInputStore } from '@/store/inputStore'
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
import { buildRackDevices, buildNetworkRackDevices } from './utils/buildRackDevices'
import { buildThreeTierRackDevices, buildThreeTierNetworkRackDevices } from './utils/buildThreeTierRackDevices'
import { RackFrame } from './RackFrame'
import { RackCapacityBadge } from './RackCapacityBadge'
import type { RackDevice } from './types'

/**
 * RackElevationTab -- topology-aware rack elevation display.
 *
 * Dispatches to Clos or Three-Tier device building based on input.topology.
 *
 * Rack types:
 * - Server racks (index 0..N-1): leaf/access pair + OOB per rack
 * - Network racks (index -1..-N): spines/core/aggregation + border leafs
 */
export function RackElevationTab() {
  const { t } = useTranslation()

  const { bom, threeTierBom } = useResultStore(
    useShallow((s) => ({ bom: s.bom, threeTierBom: s.threeTierBom }))
  )
  const topology = useInputStore(useShallow((s) => s.input.topology))

  const [selectedRack, setSelectedRack] = useState('0')
  const [devices, setDevices] = useState<RackDevice[]>([])

  const activeBom = topology === 'three-tier' ? threeTierBom : bom

  // When rack count changes (BOM update), reset to first rack
  useEffect(() => {
    if (!activeBom) {
      setDevices([])
      setSelectedRack('0')
    }
  }, [activeBom?.racks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild devices whenever BOM or selectedRack changes
  useEffect(() => {
    if (!activeBom) {
      setDevices([])
      return
    }
    if (selectedRack.startsWith('net-')) {
      // Network rack
      if (topology === 'three-tier' && threeTierBom) {
        setDevices(buildThreeTierNetworkRackDevices(threeTierBom))
      } else if (bom) {
        setDevices(buildNetworkRackDevices(bom))
      }
    } else {
      const rackIdx = Number(selectedRack)
      const safeIdx = rackIdx < activeBom.racks ? rackIdx : 0
      if (topology === 'three-tier' && threeTierBom) {
        setDevices(buildThreeTierRackDevices(threeTierBom, safeIdx))
      } else if (bom) {
        setDevices(buildRackDevices(bom, safeIdx))
      }
    }
  }, [bom, threeTierBom, topology, selectedRack])

  function handleRackChange(value: string) {
    setSelectedRack(value)
  }

  function handleReorder(updated: RackDevice[]) {
    setDevices(updated)
  }

  // Empty state -- no BOM computed yet
  if (!activeBom) {
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

  const rackUnits = parseInt(activeBom.input.rackSize)

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
              {Array.from({ length: activeBom.racks }, (_, i) => (
                <SelectItem key={`srv-${i}`} value={String(i)}>
                  {t('rack.serverRack', { n: i + 1 })}
                </SelectItem>
              ))}
            </SelectGroup>

            {/* Network racks */}
            {activeBom.networkRacks > 0 && (
              <SelectGroup>
                <SelectLabel>{t('rack.networkRacks', { defaultValue: 'Network Racks' })}</SelectLabel>
                {Array.from({ length: activeBom.networkRacks }, (_, i) => (
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

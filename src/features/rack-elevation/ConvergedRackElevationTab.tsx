import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useConvergedResultStore } from '@/store/convergedResultStore'
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
import { buildFCNetworkRackDevices } from './utils/buildConvergedRackDevices'
import { RackFrame } from './RackFrame'
import { RackCapacityBadge } from './RackCapacityBadge'
import type { RackDevice } from './types'

/**
 * ConvergedRackElevationTab -- rack elevation for converged mode.
 *
 * Shows three rack categories:
 * 1. Server racks: Ethernet leaf pair + OOB (from ethernetBom)
 * 2. Ethernet network racks: spines + border leafs (from ethernetBom)
 * 3. FC network racks: Brocade switches in dedicated racks (from fcBom, when FC enabled)
 *
 * CONV-09: Rack elevation showing server racks with Ethernet overhead plus dedicated FC racks.
 * FC network racks only appear when bom.fcBom is non-null (hbaPortsPerServer > 0).
 */
export function ConvergedRackElevationTab() {
  const { t } = useTranslation()

  const bom = useConvergedResultStore(useShallow((s) => s.bom))

  const [selectedRack, setSelectedRack] = useState('0')
  const [devices, setDevices] = useState<RackDevice[]>([])

  // When rack count changes (BOM update), reset to first rack
  useEffect(() => {
    if (!bom) {
      setDevices([])
      setSelectedRack('0')
    }
  }, [bom?.ethernetBom?.racks, bom?.threeTierBom?.racks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild devices whenever BOM or selectedRack changes
  useEffect(() => {
    if (!bom) {
      setDevices([])
      return
    }
    // Guard: need at least one Ethernet BOM variant
    if (!bom.ethernetBom && !bom.threeTierBom) {
      setDevices([])
      return
    }
    if (selectedRack.startsWith('fc-net-')) {
      // FC network rack
      if (bom.fcBom) {
        const positioning = bom.threeTierBom
          ? bom.threeTierBom.input.switchPositioning
          : bom.ethernetBom!.input.switchPositioning
        const rackSizeU = bom.threeTierBom
          ? parseInt(bom.threeTierBom.input.rackSize, 10)
          : parseInt(bom.ethernetBom!.input.rackSize, 10)
        setDevices(buildFCNetworkRackDevices(bom.fcBom, positioning, rackSizeU))
      } else {
        setDevices([])
      }
    } else if (selectedRack.startsWith('eth-net-') || selectedRack.startsWith('tt-net-')) {
      // Network rack: three-tier or Clos
      if (bom.threeTierBom) {
        setDevices(buildThreeTierNetworkRackDevices(bom.threeTierBom))
      } else if (bom.ethernetBom) {
        setDevices(buildNetworkRackDevices(bom.ethernetBom))
      }
    } else {
      // Server rack (numeric index)
      const rackIdx = Number(selectedRack)
      if (bom.threeTierBom) {
        const safeIdx = rackIdx < bom.threeTierBom.racks ? rackIdx : 0
        setDevices(buildThreeTierRackDevices(bom.threeTierBom, safeIdx))
      } else if (bom.ethernetBom) {
        const safeIdx = rackIdx < bom.ethernetBom.racks ? rackIdx : 0
        setDevices(buildRackDevices(bom.ethernetBom, safeIdx))
      }
    }
  }, [bom, selectedRack])

  function handleRackChange(value: string) {
    setSelectedRack(value)
  }

  function handleReorder(updated: RackDevice[]) {
    setDevices(updated)
  }

  // Empty state -- no BOM computed yet
  if (!bom || (!bom.ethernetBom && !bom.threeTierBom)) {
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
  const hasFc = bom.fcBom !== null

  // Rack counts from the active topology
  const serverRackCount = bom.threeTierBom ? bom.threeTierBom.racks : bom.ethernetBom ? bom.ethernetBom.racks : 0
  const networkRackCount = bom.threeTierBom ? bom.threeTierBom.networkRacks : bom.ethernetBom ? bom.ethernetBom.networkRacks : 0
  const networkRackPrefix = bom.threeTierBom ? 'tt-net-' : 'eth-net-'

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
              {Array.from({ length: serverRackCount }, (_, i) => (
                <SelectItem key={`srv-${i}`} value={String(i)}>
                  {t('rack.serverRack', { n: i + 1 })}
                </SelectItem>
              ))}
            </SelectGroup>

            {/* Network racks (Clos or Three-Tier) */}
            {networkRackCount > 0 && (
              <SelectGroup>
                <SelectLabel>
                  {bom.threeTierBom
                    ? t('rack.ethernetNetworkRacks', { defaultValue: 'Three-Tier Network' })
                    : t('rack.ethernetNetworkRacks', { defaultValue: 'Ethernet Network' })}
                </SelectLabel>
                {Array.from({ length: networkRackCount }, (_, i) => (
                  <SelectItem key={`${networkRackPrefix}${i}`} value={`${networkRackPrefix}${i}`}>
                    {t('rack.networkRack', { n: i + 1 })}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {/* FC network racks (only when FC enabled) */}
            {hasFc && (
              <SelectGroup>
                <SelectLabel>{t('rack.fcNetworkRacks', { defaultValue: 'FC Network' })}</SelectLabel>
                <SelectItem value="fc-net-0">
                  {t('rack.fcNetworkRack', { n: 1, defaultValue: 'FC Network Rack 1' })}
                </SelectItem>
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

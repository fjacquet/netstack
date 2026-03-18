import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { SwitchSpec } from '@/domain/catalog/types'
import type { RackDevice } from '../types'
import { positionDeviceGroup } from './buildRackDevices'

/**
 * Build the list of rack devices for a given server rack index from a ThreeTierBOM.
 *
 * Same approach as buildRackDevices (Clos/Ethernet) but uses access switches
 * instead of leaf switches. CRITICAL: reads uHeight from SWITCH_CATALOG for
 * Z-series 2U switches.
 *
 * Device placement follows the same ToR/MoR/BoR positioning pattern.
 *
 * @param bom - The computed ThreeTierBOM
 * @param rackIndex - Zero-based rack index
 * @returns Ordered array of RackDevice objects for this rack
 */
export function buildThreeTierRackDevices(bom: ThreeTierBOM, rackIndex: number): RackDevice[] {
  const accessModel = bom.input.accessModel
  const accessSpec = SWITCH_CATALOG[accessModel] as SwitchSpec
  const oobSpec = SWITCH_CATALOG['S3248T-ON'] as SwitchSpec
  const positioning = bom.input.switchPositioning

  const rackConfig = bom.input.racks[rackIndex]
  const serverCount = rackConfig?.serverCount ?? 0
  const serverUHeight = parseInt(bom.input.serverUHeight, 10)
  const rackSizeU = parseInt(bom.input.rackSize, 10)

  // Access switch uHeight from catalog (Z9264F-ON is 2U!)
  const accessUHeight = accessSpec.uHeight ?? 1

  let oobSlot: number
  let accessBSlot: number
  let accessASlot: number

  if (positioning === 'BoR') {
    // Bottom of Rack: OOB + access switches grouped at physical bottom
    oobSlot = 1
    accessBSlot = 1 + 1 // OOB is 1U
    accessASlot = accessBSlot + accessUHeight
  } else if (positioning === 'ToR') {
    // Top of Rack: access switches + OOB grouped at physical top
    accessASlot = rackSizeU - accessUHeight + 1
    accessBSlot = accessASlot - accessUHeight
    oobSlot = accessBSlot - 1 // OOB is always 1U
  } else {
    // Middle of Rack: OOB + access switches grouped at mid-rack
    const groupU = 1 + 2 * accessUHeight // OOB(1U) + 2 access switches
    const midU = Math.floor((rackSizeU - groupU) / 2) + 1
    oobSlot = midU
    accessBSlot = midU + 1
    accessASlot = accessBSlot + accessUHeight
  }

  const devices: RackDevice[] = [
    {
      id: `rack-${rackIndex}-oob-0`,
      model: 'S3248T-ON',
      role: 'oob',
      label: 'OOB Management',
      uSlot: oobSlot,
      uHeight: 1,
      usedPorts: serverCount + 2,
      totalPorts: oobSpec.downlinkPorts,
    },
    {
      id: `rack-${rackIndex}-access-1`,
      model: accessModel,
      role: 'access',
      label: `Access B (${positioning})`,
      uSlot: accessBSlot,
      uHeight: accessUHeight,
      usedPorts: serverCount,
      totalPorts: accessSpec.downlinkPorts,
    },
    {
      id: `rack-${rackIndex}-access-0`,
      model: accessModel,
      role: 'access',
      label: `Access A (${positioning})`,
      uSlot: accessASlot,
      uHeight: accessUHeight,
      usedPorts: serverCount,
      totalPorts: accessSpec.downlinkPorts,
    },
  ]

  // Build reserved slots set (accounting for multi-U devices)
  const reservedSlots = new Set<number>()
  for (const d of devices) {
    for (let u = d.uSlot; u < d.uSlot + d.uHeight; u++) {
      reservedSlots.add(u)
    }
  }

  // Servers fill remaining slots, skipping reserved switch slots
  let currentUSlot = 1
  for (let s = 0; s < serverCount; s++) {
    while (reservedSlots.has(currentUSlot)) currentUSlot++
    devices.push({
      id: `rack-${rackIndex}-server-${s}`,
      model: '',
      role: 'server',
      label: `Server ${s + 1}`,
      uSlot: currentUSlot,
      uHeight: serverUHeight,
      usedPorts: 0,
      totalPorts: 0,
    })
    // Mark all U-slots consumed by this multi-U server
    for (let u = currentUSlot; u < currentUSlot + serverUHeight; u++) {
      reservedSlots.add(u)
    }
    currentUSlot += serverUHeight
  }

  return devices
}

/**
 * Build devices for the three-tier network rack (aggregation + core + border leafs).
 * Uses positionDeviceGroup from buildRackDevices for consistent ToR/MoR/BoR placement.
 *
 * @param bom - The computed ThreeTierBOM
 * @returns Ordered array of RackDevice objects for the network rack
 */
export function buildThreeTierNetworkRackDevices(bom: ThreeTierBOM): RackDevice[] {
  const aggrSpec = SWITCH_CATALOG[bom.input.aggregationModel] as SwitchSpec
  const coreSpec = SWITCH_CATALOG[bom.input.coreModel] as SwitchSpec
  const positioning = bom.input.switchPositioning
  const rackSizeU = parseInt(bom.input.rackSize, 10)

  // Collect all devices first (without uSlot), then position them
  const rawDevices: Omit<RackDevice, 'uSlot'>[] = []

  // Aggregation switches
  for (let i = 0; i < bom.aggregationSwitches; i++) {
    rawDevices.push({
      id: `net-aggr-${i}`,
      model: bom.input.aggregationModel,
      role: 'aggregation',
      label: `Aggregation ${i + 1}`,
      uHeight: aggrSpec.uHeight ?? 1,
      usedPorts: Math.ceil(bom.accessSwitches * bom.input.activeUplinksPerAccess / bom.aggregationSwitches),
      totalPorts: aggrSpec.downlinkPorts,
    })
  }

  // Core switches
  for (let i = 0; i < bom.coreSwitches; i++) {
    rawDevices.push({
      id: `net-core-${i}`,
      model: bom.input.coreModel,
      role: 'core',
      label: `Core ${i + 1}`,
      uHeight: coreSpec.uHeight ?? 1,
      usedPorts: Math.ceil(bom.aggregationSwitches * bom.input.activeUplinksPerAggregation / bom.coreSwitches),
      totalPorts: coreSpec.downlinkPorts,
    })
  }

  // Border leaf switches (if any)
  if (bom.borderLeafSwitches > 0 && bom.input.borderLeafModel !== 'none') {
    const borderSpec = SWITCH_CATALOG[bom.input.borderLeafModel] as SwitchSpec
    for (let i = 0; i < bom.borderLeafSwitches; i++) {
      rawDevices.push({
        id: `net-border-${i}`,
        model: bom.input.borderLeafModel,
        role: 'border',
        label: `Border Leaf ${i + 1}`,
        uHeight: borderSpec.uHeight ?? 1,
        usedPorts: 0,
        totalPorts: borderSpec.downlinkPorts,
      })
    }
  }

  return positionDeviceGroup(rawDevices, positioning, rackSizeU)
}

import { FC_SWITCH_CATALOG } from '@/domain/catalog/brocade'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'
import type { RackDevice } from '../types'
import { positionDeviceGroup } from './buildRackDevices'

/**
 * Build rack devices for FC network racks (dedicated Brocade switch racks).
 *
 * FC directors are 8-14U; they go in dedicated racks per data center standard practice.
 * Fabric A switches placed first, Fabric B switches after (vertical separation).
 *
 * Placement follows the same ToR/MoR/BoR positioning as server and network racks.
 *
 * U-heights come from FC_SWITCH_CATALOG -- never hardcoded:
 *   G710: 1U, G720: 1U, G730: 2U, X7-4: 8U, X7-8: 14U,
 *   7850: 1U, G820: 1U, X8-4: 9U, X8-8: 14U
 *
 * Port usage per switch is computed by dividing total fabric demand by switch count,
 * avoiding inflated numbers for multi-switch fabrics.
 */
export function buildFCNetworkRackDevices(
  fcBom: FCNetworkBOM,
  positioning: 'ToR' | 'MoR' | 'BoR' = 'ToR',
  rackSizeU = 42,
): RackDevice[] {
  const model = fcBom.input.fcSwitchModel
  const spec = FC_SWITCH_CATALOG[model]
  const uHeight = spec.uHeight

  // Per-switch port usage
  const totalDemandPerFabric = fcBom.hostPortsPerFabric + fcBom.storagePortsPerFabric + fcBom.islPortsPerFabric

  const usedPortsFabricA = fcBom.fabricASwitches > 0
    ? Math.ceil(totalDemandPerFabric / fcBom.fabricASwitches)
    : 0

  const usedPortsFabricB = fcBom.fabricBSwitches > 0
    ? Math.ceil(totalDemandPerFabric / fcBom.fabricBSwitches)
    : 0

  // Collect all devices first
  const rawDevices: Omit<RackDevice, 'uSlot'>[] = []

  // Fabric A switches
  for (let i = 0; i < fcBom.fabricASwitches; i++) {
    rawDevices.push({
      id: `fc-net-a-${i}`,
      model,
      role: 'fc-switch',
      label: `Fabric A - ${model} #${i + 1}`,
      uHeight,
      usedPorts: usedPortsFabricA,
      totalPorts: spec.totalPorts,
    })
  }

  // Fabric B switches after Fabric A
  for (let i = 0; i < fcBom.fabricBSwitches; i++) {
    rawDevices.push({
      id: `fc-net-b-${i}`,
      model,
      role: 'fc-switch',
      label: `Fabric B - ${model} #${i + 1}`,
      uHeight,
      usedPorts: usedPortsFabricB,
      totalPorts: spec.totalPorts,
    })
  }

  return positionDeviceGroup(rawDevices, positioning, rackSizeU)
}

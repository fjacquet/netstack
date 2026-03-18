import type { NetworkBOM } from '@/domain/schemas/bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { RackDevice } from '../types'

/**
 * Build devices for a MoR/BoR positioning rack.
 *
 * In Middle-of-Row (MoR) and Bottom-of-Row (BoR) positioning, leaf switches
 * are removed from individual server racks and placed in a dedicated positioning
 * rack at the centre or end of the row. This rack holds a redundant ToR pair
 * (leaf A + leaf B) for every server rack in the row.
 *
 * Returns 2 × bom.racks leaf devices, labelled by source rack number.
 *
 * @param bom - The computed NetworkBOM
 * @returns Ordered array of RackDevice objects for the positioning rack
 */
export function buildPositioningRackDevices(bom: NetworkBOM): RackDevice[] {
  const leafModel = bom.input.leafModel
  const leafSpec = SWITCH_CATALOG[leafModel]
  const devices: RackDevice[] = []
  let uSlot = 1

  for (let rackIndex = 0; rackIndex < bom.racks; rackIndex++) {
    const rackConfig = bom.input.racks[rackIndex]
    const serverCount = rackConfig?.serverCount ?? 0
    const rackLabel = `Rack ${rackIndex + 1}`

    devices.push({
      id: `pos-rack-${rackIndex}-leaf-0`,
      model: leafModel,
      role: 'leaf',
      label: `Leaf A — ${rackLabel}`,
      uSlot: uSlot++,
      uHeight: 1,
      usedPorts: serverCount,
      totalPorts: leafSpec.downlinkPorts,
    })
    devices.push({
      id: `pos-rack-${rackIndex}-leaf-1`,
      model: leafModel,
      role: 'leaf',
      label: `Leaf B — ${rackLabel}`,
      uSlot: uSlot++,
      uHeight: 1,
      usedPorts: serverCount,
      totalPorts: leafSpec.downlinkPorts,
    })
  }

  return devices
}

import type { NetworkBOM } from '@/domain/schemas/bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { RackDevice } from '../types'

/**
 * Build the list of rack devices for a given rack index from a NetworkBOM.
 *
 * Switch positioning is rack-level: OOB and leaves are grouped together within
 * each server rack. The group position depends on ToR/MoR/BoR selection.
 *
 * U-slot convention (matches RackFrame): U1 = physical bottom, U(rackSize) = physical top.
 * The visual renders U(rackSize) at the top of the screen and U1 at the bottom.
 *
 * Device placement by positioning (OOB always adjacent to leaves):
 *   ToR (Top of Rack):    OOB at U(n-2), Leaf B at U(n-1), Leaf A at U(n), servers U1 upward
 *   MoR (Middle of Rack): OOB at U(n/2-1), Leaf B at U(n/2), Leaf A at U(n/2+1), servers fill around
 *   BoR (Bottom of Rack): OOB at U1, Leaf B at U2, Leaf A at U3, servers U4 upward
 *
 * @param bom - The computed NetworkBOM containing input parameters and counts
 * @param rackIndex - Zero-based rack index (used for device IDs and per-rack server count)
 * @returns Ordered array of RackDevice objects for this rack
 */
export function buildRackDevices(bom: NetworkBOM, rackIndex: number): RackDevice[] {
  const leafModel = bom.input.leafModel
  const leafSpec = SWITCH_CATALOG[leafModel]
  const oobSpec = SWITCH_CATALOG['S3248T-ON']
  const positioning = bom.input.switchPositioning

  const rackConfig = bom.input.racks[rackIndex]
  const serverCount = rackConfig?.serverCount ?? 0
  const uHeight = parseInt(bom.input.serverUHeight, 10)
  const rackSizeU = parseInt(bom.input.rackSize, 10)

  let oobSlot: number
  let leafBSlot: number
  let leafASlot: number

  if (positioning === 'BoR') {
    // Bottom of Rack: OOB + leaves grouped at physical bottom
    oobSlot = 1
    leafBSlot = 2
    leafASlot = 3
  } else if (positioning === 'ToR') {
    // Top of Rack: OOB + leaves grouped at physical top
    leafASlot = rackSizeU
    leafBSlot = rackSizeU - 1
    oobSlot = rackSizeU - 2
  } else {
    // Middle of Rack: OOB + leaves grouped at mid-rack
    const midU = Math.floor(rackSizeU / 2)
    leafASlot = midU + 1
    leafBSlot = midU
    oobSlot = midU - 1
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
      id: `rack-${rackIndex}-leaf-1`,
      model: leafModel,
      role: 'leaf',
      label: `Leaf B (${positioning})`,
      uSlot: leafBSlot,
      uHeight: 1,
      usedPorts: serverCount,
      totalPorts: leafSpec.downlinkPorts,
    },
    {
      id: `rack-${rackIndex}-leaf-0`,
      model: leafModel,
      role: 'leaf',
      label: `Leaf A (${positioning})`,
      uSlot: leafASlot,
      uHeight: 1,
      usedPorts: serverCount,
      totalPorts: leafSpec.downlinkPorts,
    },
  ]

  // Servers fill remaining slots, skipping the three switch slots
  const reservedSlots = new Set([oobSlot, leafBSlot, leafASlot])
  let currentUSlot = 1
  for (let s = 0; s < serverCount; s++) {
    while (reservedSlots.has(currentUSlot)) currentUSlot++
    devices.push({
      id: `rack-${rackIndex}-server-${s}`,
      model: '',
      role: 'server',
      label: `Server ${s + 1}`,
      uSlot: currentUSlot,
      uHeight,
      usedPorts: 0,
      totalPorts: 0,
    })
    currentUSlot += uHeight
  }

  return devices
}

/**
 * Build devices for a network rack (spines + border leafs).
 * Placed bottom-to-top: spines first, then border leafs above.
 */
export function buildNetworkRackDevices(bom: NetworkBOM): RackDevice[] {
  const spineSpec = SWITCH_CATALOG[bom.input.spineModel]
  const devices: RackDevice[] = []
  let uSlot = 1

  for (let i = 0; i < bom.spineSwitches; i++) {
    devices.push({
      id: `net-spine-${i}`,
      model: bom.input.spineModel,
      role: 'spine',
      label: `Spine ${i + 1}`,
      uSlot: uSlot++,
      uHeight: 1,
      usedPorts: Math.ceil(bom.leafSwitches / bom.spineSwitches),
      totalPorts: spineSpec.downlinkPorts,
    })
  }

  if (bom.borderLeafSwitches > 0 && bom.input.borderLeafModel !== 'none') {
    const borderSpec = SWITCH_CATALOG[bom.input.borderLeafModel]
    for (let i = 0; i < bom.borderLeafSwitches; i++) {
      devices.push({
        id: `net-border-${i}`,
        model: bom.input.borderLeafModel,
        role: 'border',
        label: `Border Leaf ${i + 1}`,
        uSlot: uSlot++,
        uHeight: 1,
        usedPorts: 0,
        totalPorts: borderSpec.downlinkPorts,
      })
    }
  }

  return devices
}

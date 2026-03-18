import type { NetworkBOM } from '@/domain/schemas/bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { RackDevice } from '../types'

/**
 * Build the list of rack devices for a given rack index from a NetworkBOM.
 *
 * RACK-03: Uses rack-specific serverCount from input.racks[rackIndex] for
 * accurate per-rack port utilization display. Falls back to 0 if rackIndex
 * is out of bounds (defensive guard for edge cases).
 *
 * Default device placement (bottom-to-top):
 *   U1: OOB switch (S3248T-ON)
 *   U2: Leaf B (second of redundant ToR pair)
 *   U3: Leaf A (first of redundant ToR pair)
 *
 * @param bom - The computed NetworkBOM containing input parameters and counts
 * @param rackIndex - Zero-based rack index (used for device IDs and per-rack server count)
 * @returns Ordered array of RackDevice objects for this rack
 */
export function buildRackDevices(bom: NetworkBOM, rackIndex: number): RackDevice[] {
  const leafModel = bom.input.leafModel
  const leafSpec = SWITCH_CATALOG[leafModel]
  const oobSpec = SWITCH_CATALOG['S3248T-ON']

  // Per-rack server count for accurate port utilization (RACK-03)
  const rackConfig = bom.input.racks[rackIndex]
  const serverCount = rackConfig?.serverCount ?? 0

  const devices: RackDevice[] = [
    {
      id: `rack-${rackIndex}-oob-0`,
      model: 'S3248T-ON',
      role: 'oob',
      label: 'OOB Management',
      uSlot: 1,
      uHeight: 1,
      usedPorts: serverCount + 2,
      totalPorts: oobSpec.downlinkPorts,
    },
    {
      id: `rack-${rackIndex}-leaf-1`,
      model: leafModel,
      role: 'leaf',
      label: 'Leaf B (ToR)',
      uSlot: 2,
      uHeight: 1,
      usedPorts: serverCount,
      totalPorts: leafSpec.downlinkPorts,
    },
    {
      id: `rack-${rackIndex}-leaf-0`,
      model: leafModel,
      role: 'leaf',
      label: 'Leaf A (ToR)',
      uSlot: 3,
      uHeight: 1,
      usedPorts: serverCount,
      totalPorts: leafSpec.downlinkPorts,
    },
  ]

  // Server devices above switches — starting at U4
  const uHeight = parseInt(bom.input.serverUHeight, 10)
  let currentUSlot = 4
  for (let s = 0; s < serverCount; s++) {
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

  // Spines at bottom
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

  // Border leafs above spines
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

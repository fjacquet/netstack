import type { NetworkBOM } from '@/domain/schemas/bom'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import type { RackDevice } from '../types'

/**
 * Build the list of rack devices for a given rack index from a NetworkBOM.
 *
 * Default device placement (bottom-to-top):
 *   U1: OOB switch (S3248T-ON)
 *   U2: Leaf B (second of redundant ToR pair)
 *   U3: Leaf A (first of redundant ToR pair)
 *
 * @param bom - The computed NetworkBOM containing input parameters and counts
 * @param rackIndex - Zero-based rack index (used for device IDs)
 * @returns Ordered array of RackDevice objects for this rack
 */
export function buildRackDevices(bom: NetworkBOM, rackIndex: number): RackDevice[] {
  const leafModel = bom.input.leafModel
  const leafSpec = SWITCH_CATALOG[leafModel]
  const oobSpec = SWITCH_CATALOG['S3248T-ON']

  const devices: RackDevice[] = [
    {
      id: `rack-${rackIndex}-oob-0`,
      model: 'S3248T-ON',
      role: 'oob',
      label: 'OOB Management',
      uSlot: 1,
      usedPorts: bom.input.serversPerRack + 2,
      totalPorts: oobSpec.downlinkPorts,
    },
    {
      id: `rack-${rackIndex}-leaf-1`,
      model: leafModel,
      role: 'leaf',
      label: 'Leaf B (ToR)',
      uSlot: 2,
      usedPorts: bom.input.serversPerRack,
      totalPorts: leafSpec.downlinkPorts,
    },
    {
      id: `rack-${rackIndex}-leaf-0`,
      model: leafModel,
      role: 'leaf',
      label: 'Leaf A (ToR)',
      uSlot: 3,
      usedPorts: bom.input.serversPerRack,
      totalPorts: leafSpec.downlinkPorts,
    },
  ]

  return devices
}

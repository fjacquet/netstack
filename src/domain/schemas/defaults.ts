/**
 * Domain-layer default input constants.
 * These are the canonical defaults for each sizing mode.
 * Exported for use by the store layer and tests — single source of truth.
 *
 * v9 (Phase 25): Added rackPitchMm, racksAdjacent, patchPanelDistanceM geometry fields.
 */

import type { SizingInput } from './input';
import type { ThreeTierSizingInput } from './three-tier-input';
import type { ConvergedSizingInput } from './converged-input';

/**
 * Default Ethernet (Clos leaf-spine) sizing input.
 * 3 racks × 16 servers = 48 servers total (equivalent to old scalar default).
 */
export const DEFAULT_ETH_INPUT: SizingInput = {
  topology: 'leaf-spine',
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  connectivityType: '25G',
  cableType: 'DAC',
  // Clos-specific defaults
  activeUplinksPerLeaf: 4,
  leafModel: 'S5248F-ON',
  spineModel: 'S5232F-ON',
  // Three-tier defaults
  accessModel: 'S5248F-ON',
  activeUplinksPerAccess: 4,
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
  // Shared defaults
  borderLeafModel: 'none',
  borderLeafCount: 0,
  rackSize: '42U',
  serverUHeight: '1U',
  switchPositioning: 'ToR',
  // Brownfield defaults
  existingSpinesDeployed: false,
  existingCoreDeployed: false,
  // v9 geometry fields (Phase 25)
  rackPitchMm: 600,
  racksAdjacent: true,
  patchPanelDistanceM: 1,
};

/**
 * Default Three-Tier sizing input.
 * Used when the topology is 'three-tier' (Core/Aggregation/Access).
 */
export const DEFAULT_THREE_TIER_INPUT: ThreeTierSizingInput = {
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  connectivityType: '25G',
  cableType: 'DAC',
  accessModel: 'S5248F-ON',
  activeUplinksPerAccess: 4,
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
  borderLeafModel: 'none',
  borderLeafCount: 0,
  rackSize: '42U',
  serverUHeight: '1U',
  switchPositioning: 'ToR',
  existingCoreDeployed: false,
  // v9 geometry fields (Phase 25)
  rackPitchMm: 600,
  racksAdjacent: true,
  patchPanelDistanceM: 1,
};

/**
 * Default Converged (Ethernet + FC) sizing input.
 * FC is optional: hbaPortsPerServer=0 disables FC fabric calculation.
 */
export const DEFAULT_CONVERGED_INPUT: ConvergedSizingInput = {
  topology: 'leaf-spine',
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  rackSize: '42U',
  serverUHeight: '1U',
  // Ethernet fields
  portsPerServerFrontend: 1,
  portsPerServerBackend: 1,
  activeUplinksPerLeaf: 4,
  connectivityType: '25G',
  cableType: 'DAC',
  leafModel: 'S5248F-ON',
  spineModel: 'S5232F-ON',
  borderLeafModel: 'none',
  borderLeafCount: 0,
  switchPositioning: 'ToR',
  // Three-tier fields
  accessModel: 'S5248F-ON',
  aggregationModel: 'Z9264F-ON',
  activeUplinksPerAggregation: 4,
  coreModel: 'Z9332F-ON',
  // Brownfield defaults
  existingSpinesDeployed: false,
  existingCoreDeployed: false,
  // v9 geometry fields (Phase 25)
  rackPitchMm: 600,
  racksAdjacent: true,
  patchPanelDistanceM: 1,
  // FC fields (disabled by default)
  hbaPortsPerServer: 0,
  storageTargetPorts: 4,
  storageArrayCount: 1,
  fcSwitchModel: 'G720',
  islPortsPerSwitch: 4,
  preferredGeneration: 'any',
};

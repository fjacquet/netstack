/**
 * Converged sizing engine -- composes Ethernet/ThreeTier + FC engines.
 *
 * calculateConvergedBOM(input: ConvergedSizingInput): ConvergedBOM
 *
 * Pure function: same input always produces the same output.
 * COMPOSES existing engines -- does NOT rewrite or duplicate their logic.
 *
 * Key behavior (TENG-01):
 *   - topology='leaf-spine': calls calculateBOM() for the Ethernet portion (ethernetBom)
 *   - topology='three-tier': calls calculateThreeTierBOM() for the 3-tier portion (threeTierBom)
 *   - FC is independent of topology: calls calculateFCBOM() when hbaPortsPerServer > 0 (CONV-04)
 *   - Combines violations from the active topology engine + FC into a single array (CONV-05)
 */

import { calculateBOM } from './sizing';
import { calculateThreeTierBOM } from './three-tier-sizing';
import { calculateFCBOM } from './fc-sizing';
import type { SizingInput } from '../schemas/input';
import type { ThreeTierSizingInput } from '../schemas/three-tier-input';
import type { FCSizingInput } from '../schemas/fc-input';
import type { ConvergedSizingInput } from '../schemas/converged-input';
import type { ConvergedBOM } from '../schemas/converged-bom';
import type { NetworkBOM } from '../schemas/bom';
import type { ThreeTierBOM } from '../schemas/three-tier-bom';

/**
 * Extract SizingInput from ConvergedSizingInput.
 * Maps converged fields to the Ethernet (Clos) engine's expected shape.
 */
function toEthernetInput(input: ConvergedSizingInput): SizingInput {
  return {
    topology: input.topology ?? 'leaf-spine',
    racks: input.racks,
    portsPerServerFrontend: input.portsPerServerFrontend,
    portsPerServerBackend: input.portsPerServerBackend,
    connectivityType: input.connectivityType,
    cableType: input.cableType,
    // Clos-specific
    activeUplinksPerLeaf: input.activeUplinksPerLeaf,
    leafModel: input.leafModel,
    spineModel: input.spineModel,
    // Three-tier fields (carried through for type completeness)
    accessModel: input.accessModel,
    activeUplinksPerAccess: input.activeUplinksPerLeaf, // reuse leaf uplinks for access
    aggregationModel: input.aggregationModel,
    activeUplinksPerAggregation: input.activeUplinksPerAggregation,
    coreModel: input.coreModel,
    // Shared
    borderLeafModel: input.borderLeafModel,
    borderLeafCount: input.borderLeafCount,
    rackSize: input.rackSize,
    serverUHeight: input.serverUHeight,
    switchPositioning: input.switchPositioning,
  };
}

/**
 * Extract ThreeTierSizingInput from ConvergedSizingInput.
 * Maps converged fields to the three-tier engine's expected shape.
 * activeUplinksPerLeaf is reused as activeUplinksPerAccess (same purpose).
 */
function toThreeTierInput(input: ConvergedSizingInput): ThreeTierSizingInput {
  return {
    racks: input.racks,
    portsPerServerFrontend: input.portsPerServerFrontend,
    portsPerServerBackend: input.portsPerServerBackend,
    connectivityType: input.connectivityType,
    cableType: input.cableType,
    accessModel: input.accessModel,
    activeUplinksPerAccess: input.activeUplinksPerLeaf, // reuse leaf uplinks for access
    aggregationModel: input.aggregationModel,
    activeUplinksPerAggregation: input.activeUplinksPerAggregation,
    coreModel: input.coreModel,
    borderLeafModel: input.borderLeafModel,
    borderLeafCount: input.borderLeafCount,
    rackSize: input.rackSize,
    serverUHeight: input.serverUHeight,
    switchPositioning: input.switchPositioning,
  };
}

/**
 * Extract FCSizingInput from ConvergedSizingInput.
 * Maps converged fields to the FC engine's expected shape.
 * IMPORTANT: hbaPortsPerServer is passed as-is -- caller must ensure > 0.
 */
function toFCInput(input: ConvergedSizingInput): FCSizingInput {
  return {
    racks: input.racks,
    hbaPortsPerServer: input.hbaPortsPerServer,
    storageTargetPorts: input.storageTargetPorts,
    storageArrayCount: input.storageArrayCount,
    fcSwitchModel: input.fcSwitchModel,
    islPortsPerSwitch: input.islPortsPerSwitch,
    rackSize: input.rackSize,
    serverUHeight: input.serverUHeight,
    preferredGeneration: input.preferredGeneration,
  };
}

/**
 * Calculate a combined topology + FC Bill of Materials.
 *
 * Pure function: composes topology engine (Clos or Three-Tier) and FC engine.
 * Topology selector (TENG-01):
 *   - 'leaf-spine': ethernetBom populated, threeTierBom null
 *   - 'three-tier': threeTierBom populated, ethernetBom null
 * FC is independent: hbaPortsPerServer > 0 enables FC regardless of topology.
 *
 * @param input - Validated converged sizing parameters
 * @returns ConvergedBOM with topology sub-BOM, optional FC sub-BOM, and combined violations
 */
export function calculateConvergedBOM(input: ConvergedSizingInput): ConvergedBOM {
  const topology = input.topology ?? 'leaf-spine';

  // ── Topology branching (TENG-01) ───────────────────────────────────────────
  let ethernetBom: NetworkBOM | null = null;
  let threeTierBom: ThreeTierBOM | null = null;

  if (topology === 'three-tier') {
    threeTierBom = calculateThreeTierBOM(toThreeTierInput(input));
  } else {
    ethernetBom = calculateBOM(toEthernetInput(input));
  }

  // ── FC is independent of topology (CONV-04) ───────────────────────────────
  const fcEnabled = input.hbaPortsPerServer > 0;
  const fcBom = fcEnabled ? calculateFCBOM(toFCInput(input)) : null;

  // ── Combine violations from active topology engine + FC (CONV-05) ──────────
  const violations = [
    ...(ethernetBom?.violations ?? []),
    ...(threeTierBom?.violations ?? []),
    ...(fcBom?.violations ?? []),
  ];

  return {
    topology,
    ethernetBom,
    threeTierBom,
    fcBom,
    violations,
    input,
  };
}

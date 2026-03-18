/**
 * Converged sizing engine -- composes Ethernet + FC engines.
 *
 * calculateConvergedBOM(input: ConvergedSizingInput): ConvergedBOM
 *
 * Pure function: same input always produces the same output.
 * COMPOSES existing engines -- does NOT rewrite or duplicate their logic.
 *
 * Key behavior:
 *   - Always calls calculateBOM() for the Ethernet portion
 *   - Calls calculateFCBOM() only when hbaPortsPerServer > 0 (CONV-04)
 *   - Combines violations from both engines into a single array (CONV-05)
 */

import { calculateBOM } from './sizing';
import { calculateFCBOM } from './fc-sizing';
import type { SizingInput } from '../schemas/input';
import type { FCSizingInput } from '../schemas/fc-input';
import type { ConvergedSizingInput } from '../schemas/converged-input';
import type { ConvergedBOM } from '../schemas/converged-bom';

/**
 * Extract SizingInput from ConvergedSizingInput.
 * Maps converged fields to the Ethernet engine's expected shape.
 */
function toEthernetInput(input: ConvergedSizingInput): SizingInput {
  return {
    racks: input.racks,
    portsPerServerFrontend: input.portsPerServerFrontend,
    portsPerServerBackend: input.portsPerServerBackend,
    activeUplinksPerLeaf: input.activeUplinksPerLeaf,
    connectivityType: input.connectivityType,
    cableType: input.cableType,
    leafModel: input.leafModel,
    spineModel: input.spineModel,
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
 * Calculate a combined Ethernet + FC Bill of Materials.
 *
 * Pure function: composes calculateBOM() and calculateFCBOM().
 * When hbaPortsPerServer=0, FC portion is skipped entirely (CONV-04).
 *
 * @param input - Validated converged sizing parameters
 * @returns ConvergedBOM with both sub-BOMs and combined violations
 */
export function calculateConvergedBOM(input: ConvergedSizingInput): ConvergedBOM {
  // Always compute Ethernet BOM
  const ethernetBom = calculateBOM(toEthernetInput(input));

  // FC BOM only when FC is enabled (hbaPortsPerServer > 0)
  const fcEnabled = input.hbaPortsPerServer > 0;
  const fcBom = fcEnabled ? calculateFCBOM(toFCInput(input)) : null;

  // Combine violations from both engines (CONV-05)
  const violations = [
    ...ethernetBom.violations,
    ...(fcBom?.violations ?? []),
  ];

  return {
    ethernetBom,
    fcBom,
    violations,
    input,
  };
}

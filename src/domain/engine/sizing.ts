/**
 * Core sizing engine — pure function with no side effects.
 *
 * calculateBOM(input: SizingInput): NetworkBOM
 *
 * All port counts reference SWITCH_CATALOG constants — never hardcoded inline.
 * Formulas implement the Dell Leaf-Spine reference design:
 *   - Two redundant ToR leaf switches per rack
 *   - Full-mesh non-blocking spine (scales with leaf count)
 *   - OOB management switch per rack with saturation check
 */

import { SWITCH_CATALOG } from '../catalog/hardware';
import type { SizingInput } from '../schemas/input';
import type { ConstraintViolation, NetworkBOM } from '../schemas/bom';

// Fixed catalog aliases — spine and OOB never vary
const SPINE = SWITCH_CATALOG['S5232F-ON'];
const OOB = SWITCH_CATALOG['S3248T-ON'];

/**
 * Calculate the full Bill of Materials for a Dell SONiC Leaf-Spine deployment.
 *
 * Pure function: same input always produces the same output. No side effects.
 *
 * @param input - Validated sizing parameters (totalServers, serversPerRack, etc.)
 * @returns Complete NetworkBOM with switch counts, cable quantities, and violations
 */
export function calculateBOM(input: SizingInput): NetworkBOM {
  // ─── Dynamic leaf selection from input ───────────────────────────────────
  const LEAF = SWITCH_CATALOG[input.leafModel];

  // ─── Rack Count (SIZE-02) ─────────────────────────────────────────────────
  const racks = Math.ceil(input.totalServers / input.serversPerRack);

  // ─── Leaf Switches (SIZE-03) — 2 redundant ToR switches per rack ──────────
  const leafSwitches = racks * 2;

  // ─── Spine Switches (SIZE-04) — scales with leaf count ───────────────────
  // max(uplinkPorts, ceil(leafSwitches / spinePortCount))
  // Ensures full non-blocking connectivity at any scale
  const spineSwitches = Math.max(
    LEAF.uplinkPorts,
    Math.ceil(leafSwitches / SPINE.downlinkPorts),
  );

  // ─── OOB Switches (SIZE-05) ───────────────────────────────────────────────
  // Each rack needs: serversPerRack + 2 management ports (2 ToR leaf switches)
  const oobPortsRequired = input.serversPerRack + 2;
  const oobSwitchesPerRack = Math.ceil(oobPortsRequired / OOB.downlinkPorts);
  const oobSwitches = racks * oobSwitchesPerRack;

  // ─── Cable Quantities (link model, not port sum) ──────────────────────────
  // leafSpineCables: each leaf has uplinkPorts connections to the spine tier
  const leafSpineCables = leafSwitches * LEAF.uplinkPorts;
  // serverLeafCables: one cable per server (connected to one of the two ToR leafs)
  const serverLeafCables = input.totalServers;
  // serverOobCables: every server + every leaf switch gets an OOB management port
  const serverOobCables = input.totalServers + leafSwitches;

  // ─── SFP Transceivers (fiber only — 2 per cable link) ────────────────────
  const sfpCount =
    input.cableType === 'fiber'
      ? 2 * (leafSpineCables + serverLeafCables)
      : 0;

  // ─── Oversubscription Ratio ───────────────────────────────────────────────
  // (serversPerRack × server link speed) / (spineSwitches × leaf uplink speed)
  const uplinkBandwidth = spineSwitches * (LEAF.uplinkSpeedGbE ?? 0);
  const oversubscriptionRatio =
    uplinkBandwidth > 0
      ? (input.serversPerRack * LEAF.downlinkSpeedGbE) / uplinkBandwidth
      : 0;

  // ─── Constraint Violations ───────────────────────────────────────────────
  const violations: ConstraintViolation[] = [];

  // SPINE_CAPACITY_EXCEEDED: more leafs than a single spine tier can connect
  if (leafSwitches > SPINE.downlinkPorts) {
    violations.push({
      code: 'SPINE_CAPACITY_EXCEEDED',
      leafCount: leafSwitches,
      maxLeafs: SPINE.downlinkPorts,
    });
  }

  // OOB_PORT_SATURATION: OOB ports required exceed one switch's capacity
  if (oobPortsRequired > OOB.downlinkPorts) {
    violations.push({
      code: 'OOB_PORT_SATURATION',
      required: oobPortsRequired,
      available: OOB.downlinkPorts,
    });
  }

  // DAC_DISTANCE_ADVISORY: DAC cables are reliable only at short distances
  if (input.cableType === 'DAC' && racks > 8) {
    violations.push({
      code: 'DAC_DISTANCE_ADVISORY',
      rackCount: racks,
      cableType: 'DAC',
    });
  }

  return {
    racks,
    leafSwitches,
    spineSwitches,
    oobSwitches,
    leafSpineCables,
    serverLeafCables,
    serverOobCables,
    sfpCount,
    oversubscriptionRatio,
    violations,
    input,
  };
}

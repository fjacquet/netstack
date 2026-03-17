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
 *
 * RACK-03: Input uses racks array; engine derives rack count, totalServers,
 * and maxServersPerRack from the array rather than scalar fields.
 */

import { SWITCH_CATALOG } from '../catalog/hardware';
import type { SizingInput } from '../schemas/input';
import type { ConstraintViolation, NetworkBOM } from '../schemas/bom';

// OOB model is fixed (not selectable)
const OOB = SWITCH_CATALOG['S3248T-ON'];

/**
 * Calculate the full Bill of Materials for a Dell SONiC Leaf-Spine deployment.
 *
 * Pure function: same input always produces the same output. No side effects.
 *
 * @param input - Validated sizing parameters (racks array, connectivity, cable type, etc.)
 * @returns Complete NetworkBOM with switch counts, cable quantities, and violations
 */
export function calculateBOM(input: SizingInput): NetworkBOM {
  // ─── Dynamic model selection from input ──────────────────────────────────
  const LEAF = SWITCH_CATALOG[input.leafModel];
  const SPINE = SWITCH_CATALOG[input.spineModel];

  // ─── Rack Count (RACK-03) — derived from racks array length ───────────────
  const racks = input.racks.length;

  // ─── Server Totals (RACK-03) — derived from racks array ──────────────────
  const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0);

  // ─── Worst-case rack (RACK-03) — for OOB saturation + oversubscription ───
  // maxServersPerRack determines port requirements for the densest rack.
  // An empty rack array is rejected by schema, but guard with fallback 0.
  const maxServersPerRack = input.racks.length > 0
    ? Math.max(...input.racks.map(r => r.serverCount))
    : 0;

  // ─── Leaf Switches (SIZE-03) — 2 redundant ToR switches per rack ──────────
  const leafSwitches = racks * 2;

  // ─── Spine Switches (SIZE-04) — scales with leaf count ───────────────────
  // min 2 for redundancy, scales up when leafs exceed spine port capacity
  const spineSwitches = Math.max(
    2,
    Math.ceil(leafSwitches / SPINE.downlinkPorts),
  );

  // ─── OOB Switches (SIZE-05) ───────────────────────────────────────────────
  // Each rack needs: maxServersPerRack + 2 management ports (2 ToR leaf switches)
  // Using worst-case rack to ensure every rack's OOB needs are met.
  const oobPortsRequired = maxServersPerRack + 2;
  const oobSwitchesPerRack = Math.ceil(oobPortsRequired / OOB.downlinkPorts);
  const oobSwitches = racks * oobSwitchesPerRack;

  // ─── Border Leaf Switches (WAN/uplink connectivity) ──────────────────────
  const borderLeafSwitches =
    input.borderLeafModel !== 'none' ? input.borderLeafCount : 0;

  // ─── Network Racks (for spines + border leafs) ──────────────────────────
  // 1U per switch, typically 1 rack holds all network devices
  const rackSizeU = parseInt(input.rackSize);
  const networkDeviceCount = spineSwitches + borderLeafSwitches;
  const networkRacks = networkDeviceCount > 0 ? Math.ceil(networkDeviceCount / rackSizeU) : 0;

  // ─── Cable Quantities (link model, not port sum) ──────────────────────────
  // leafSpineCables: each leaf connects to each spine once (1 link per leaf-spine pair)
  // limited by leaf uplink ports if fewer than spine count
  const linksPerLeaf = Math.min(spineSwitches, LEAF.uplinkPorts);
  const leafSpineCables = leafSwitches * linksPerLeaf;
  // serverLeafCables: frontend port multiplier × totalServers (PORT-03)
  const serverLeafCables = totalServers * input.portsPerServerFrontend;
  // serverOobCables: backend port multiplier × servers + leaf switches (PORT-03)
  const serverOobCables = totalServers * input.portsPerServerBackend + leafSwitches;

  // ─── Transceivers (fiber only — 2 per cable link, type depends on speed) ──
  // Server-leaf links are 25G → SFP28; leaf-spine links are 100G → QSFP28
  const sfp28Count =
    input.cableType === 'fiber' ? 2 * serverLeafCables : 0;
  const qsfp28Count =
    input.cableType === 'fiber' ? 2 * leafSpineCables : 0;

  // ─── VLT Interconnect Cables ────────────────────────────────────────────
  // Each rack has a redundant leaf pair connected via VLT (2 QSFP28-DD cables per pair)
  const vltCables = racks * 2;

  // ─── Oversubscription Ratio ───────────────────────────────────────────────
  // (maxServersPerRack × server link speed) / (spineSwitches × leaf uplink speed)
  // Uses worst-case rack to represent the highest-density rack's oversubscription.
  const uplinkBandwidth = spineSwitches * (LEAF.uplinkSpeedGbE ?? 0);
  const oversubscriptionRatio =
    uplinkBandwidth > 0
      ? (maxServersPerRack * LEAF.downlinkSpeedGbE) / uplinkBandwidth
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
  // Uses maxServersPerRack (worst-case rack) for accurate saturation detection.
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
    networkRacks,
    leafSwitches,
    spineSwitches,
    oobSwitches,
    borderLeafSwitches,
    leafSpineCables,
    serverLeafCables,
    serverOobCables,
    sfp28Count,
    qsfp28Count,
    vltCables,
    oversubscriptionRatio,
    violations,
    input,
  };
}

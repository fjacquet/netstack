/**
 * Three-Tier sizing engine -- pure function with no side effects.
 *
 * calculateThreeTierBOM(input: ThreeTierSizingInput): ThreeTierBOM
 *
 * All port counts reference SWITCH_CATALOG constants -- never hardcoded inline.
 * Formulas implement the Dell Core/Aggregation/Access reference design:
 *   - Two redundant ToR access switches per rack (TENG-02)
 *   - Aggregation tier scales with access uplink demand (TENG-03)
 *   - Core tier scales with aggregation uplink demand (TENG-04)
 *   - Per-boundary oversubscription ratios (TENG-05)
 *   - Cable BOM for all inter-tier links (TENG-06)
 *
 * Symmetric port handling for Z-series: uplinkPorts=0 means total ports are split
 * logically between uplink and downlink based on user-specified uplink counts.
 */

import { SWITCH_CATALOG } from '../catalog/hardware';
import type { SwitchSpec } from '../catalog/types';
import type { ThreeTierSizingInput } from '../schemas/three-tier-input';
import type { ThreeTierBOM } from '../schemas/three-tier-bom';
import type { ThreeTierConstraintViolation } from '../schemas/three-tier-bom';

// OOB model is fixed (not selectable)
const OOB = SWITCH_CATALOG['S3248T-ON'];

/**
 * Calculate the full Bill of Materials for a Dell three-tier (Core/Aggregation/Access) deployment.
 *
 * Pure function: same input always produces the same output. No side effects.
 *
 * @param input - Validated three-tier sizing parameters
 * @returns Complete ThreeTierBOM with switch counts, cable quantities, and violations
 */
export function calculateThreeTierBOM(input: ThreeTierSizingInput): ThreeTierBOM {
  // --- Dynamic model selection from input ---
  // Cast to SwitchSpec to access optional fields (uplinkSpeedGbE, uHeight) uniformly
  const ACCESS: SwitchSpec = SWITCH_CATALOG[input.accessModel];
  const AGGR: SwitchSpec = SWITCH_CATALOG[input.aggregationModel];
  const CORE: SwitchSpec = SWITCH_CATALOG[input.coreModel];

  // --- Rack Count -- derived from racks array length ---
  const racks = input.racks.length;

  // --- Server Totals -- derived from racks array ---
  const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0);

  // --- Worst-case rack -- for OOB saturation + oversubscription ---
  const maxServersPerRack = input.racks.length > 0
    ? Math.max(...input.racks.map(r => r.serverCount))
    : 0;

  // --- TENG-02: Access Switches = 2 redundant ToR switches per rack ---
  const accessSwitches = racks * 2;

  // --- Effective uplinks per access switch ---
  // For switches with dedicated uplinks (S5248F-ON etc): min(user, uplinkPorts)
  // For symmetric switches (Z9264F-ON with uplinkPorts=0): min(user, downlinkPorts)
  const accessMaxUplinks = ACCESS.uplinkPorts > 0 ? ACCESS.uplinkPorts : ACCESS.downlinkPorts;
  const effectiveUplinksPerAccess = Math.min(input.activeUplinksPerAccess, accessMaxUplinks);

  // --- Effective uplinks per aggregation switch ---
  // All aggregation models are symmetric (uplinkPorts=0) or have explicit uplinks
  const aggrMaxUplinks = AGGR.uplinkPorts > 0 ? AGGR.uplinkPorts : AGGR.downlinkPorts;
  const effectiveUplinksPerAggr = Math.min(input.activeUplinksPerAggregation, aggrMaxUplinks);

  // --- Effective aggregation downlinks ---
  // Downlinks available after reserving uplink ports
  const effectiveAggrDownlinks = (AGGR.uplinkPorts > 0 ? AGGR.downlinkPorts : AGGR.downlinkPorts) - effectiveUplinksPerAggr;

  // --- TENG-03: Aggregation Switches ---
  // ceil(totalAccessUplinks / effectiveAggrDownlinks), min 2 for redundancy
  const totalAccessUplinks = accessSwitches * effectiveUplinksPerAccess;
  const aggregationSwitches = effectiveAggrDownlinks > 0
    ? Math.max(2, Math.ceil(totalAccessUplinks / effectiveAggrDownlinks))
    : 2;

  // --- TENG-04: Core Switches ---
  // ceil(totalAggrUplinks / coreDownlinks), min 2 for redundancy
  // Core has no upstream, so all ports are downlinks.
  const totalAggrUplinks = aggregationSwitches * effectiveUplinksPerAggr;
  const coreSwitches = CORE.downlinkPorts > 0
    ? Math.max(2, Math.ceil(totalAggrUplinks / CORE.downlinkPorts))
    : 2;

  // --- OOB Switches ---
  const oobPortsRequired = maxServersPerRack + 2;
  const oobSwitchesPerRack = Math.ceil(oobPortsRequired / OOB.downlinkPorts);
  const oobSwitches = racks * oobSwitchesPerRack;

  // --- Border Leaf Switches ---
  const borderLeafSwitches = input.borderLeafModel !== 'none' ? input.borderLeafCount : 0;

  // --- Network Racks ---
  const rackSizeU = parseInt(input.rackSize);
  const networkDeviceCount = aggregationSwitches + coreSwitches + borderLeafSwitches;
  const networkRacks = networkDeviceCount > 0 ? Math.ceil(networkDeviceCount / rackSizeU) : 0;

  // --- TENG-06: Cable BOM ---
  const serverAccessCables = totalServers * input.portsPerServerFrontend;
  const accessAggrCables = accessSwitches * effectiveUplinksPerAccess;
  const aggrCoreCables = aggregationSwitches * effectiveUplinksPerAggr;
  const serverOobCables = totalServers * input.portsPerServerBackend + accessSwitches;
  const vltCables = racks * 2;

  // --- TENG-05: Oversubscription Ratios ---
  // Access uplink speed: use uplinkSpeedGbE if available, else downlinkSpeedGbE (symmetric)
  const accessUplinkSpeed = ACCESS.uplinkSpeedGbE ?? ACCESS.downlinkSpeedGbE;
  const accessDownlinkBandwidth = maxServersPerRack * ACCESS.downlinkSpeedGbE;
  const accessUplinkBandwidth = effectiveUplinksPerAccess * accessUplinkSpeed;
  const accessToAggrOversubscription = accessUplinkBandwidth > 0
    ? accessDownlinkBandwidth / accessUplinkBandwidth
    : 0;

  // Aggregation oversubscription: downlink bandwidth vs uplink bandwidth
  const aggrDownlinkBandwidth = effectiveAggrDownlinks * AGGR.downlinkSpeedGbE;
  const aggrUplinkBandwidth = effectiveUplinksPerAggr * (AGGR.uplinkSpeedGbE ?? AGGR.downlinkSpeedGbE);
  const aggrToCoreOversubscription = aggrUplinkBandwidth > 0
    ? aggrDownlinkBandwidth / aggrUplinkBandwidth
    : 0;

  // --- Transceivers (fiber only -- 2 per cable link) ---
  const isFiber = input.cableType === 'fiber';
  // SFP28 for 25G server-access links
  const sfp28Count = isFiber && ACCESS.downlinkSpeedGbE === 25 ? 2 * serverAccessCables : 0;
  // QSFP28 for 100G access-aggr links
  const qsfp28Count = isFiber && accessUplinkSpeed === 100 ? 2 * accessAggrCables : 0;
  // QSFP56-DD for 400G aggr-core links
  const aggrCoreSpeed = AGGR.uplinkSpeedGbE ?? AGGR.downlinkSpeedGbE;
  const qsfp56ddCount = isFiber && aggrCoreSpeed === 400 ? 2 * aggrCoreCables : 0;

  // --- Cable Length Map ---
  const cableLengthMap: Record<ThreeTierSizingInput['switchPositioning'], number> = {
    ToR: 2,
    MoR: 1,
    BoR: 2,
  };
  const recommendedCableLengthM = cableLengthMap[input.switchPositioning];

  // --- Constraint Violations ---
  const violations: ThreeTierConstraintViolation[] = [];

  // AGGREGATION_CAPACITY_EXCEEDED
  const totalAggrDownlinks = aggregationSwitches * effectiveAggrDownlinks;
  if (totalAccessUplinks > totalAggrDownlinks) {
    violations.push({
      code: 'AGGREGATION_CAPACITY_EXCEEDED',
      accessUplinks: totalAccessUplinks,
      aggrDownlinks: totalAggrDownlinks,
    });
  }

  // CORE_CAPACITY_EXCEEDED
  const totalCoreDownlinks = coreSwitches * CORE.downlinkPorts;
  if (totalAggrUplinks > totalCoreDownlinks) {
    violations.push({
      code: 'CORE_CAPACITY_EXCEEDED',
      aggrUplinks: totalAggrUplinks,
      coreDownlinks: totalCoreDownlinks,
    });
  }

  // OOB_PORT_SATURATION
  if (oobPortsRequired > OOB.downlinkPorts) {
    violations.push({
      code: 'OOB_PORT_SATURATION',
      required: oobPortsRequired,
      available: OOB.downlinkPorts,
    });
  }

  // DAC_DISTANCE_ADVISORY
  if (input.cableType === 'DAC' && racks > 8) {
    violations.push({
      code: 'DAC_DISTANCE_ADVISORY',
      rackCount: racks,
      cableType: 'DAC',
    });
  }

  // RACK_CAPACITY_EXCEEDED
  // Switch overhead per rack: OOB(1U) + 2 access switches (1U each typically, 2U for Z9264F-ON)
  const accessUHeight = ACCESS.uHeight ?? 1;
  const overheadU = 1 + 2 * accessUHeight; // OOB(1U) + 2 * access switch
  const uHeightInt = parseInt(input.serverUHeight, 10);
  for (let i = 0; i < input.racks.length; i++) {
    const usedU = overheadU + input.racks[i].serverCount * uHeightInt;
    if (usedU > rackSizeU) {
      violations.push({
        code: 'RACK_CAPACITY_EXCEEDED',
        rackNumber: i + 1,
        usedU,
        totalU: rackSizeU,
      });
    }
  }

  return {
    racks,
    networkRacks,
    accessSwitches,
    aggregationSwitches,
    coreSwitches,
    oobSwitches,
    borderLeafSwitches,
    serverAccessCables,
    accessAggrCables,
    aggrCoreCables,
    serverOobCables,
    vltCables,
    sfp28Count,
    qsfp28Count,
    qsfp56ddCount,
    accessToAggrOversubscription,
    aggrToCoreOversubscription,
    switchPositioning: input.switchPositioning,
    recommendedCableLengthM,
    violations,
    input,
  };
}

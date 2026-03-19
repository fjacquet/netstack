/**
 * FC Fibre Channel sizing engine.
 *
 * calculateFCBOM(input: FCSizingInput): FCNetworkBOM
 *
 * Five-step pure function:
 *   1. Server totals from racks array
 *   2. Per-fabric port demand (host + storage, split across dual fabrics)
 *   3. Effective ports via POD licensing model + switch count
 *   4. ISL count via bandwidth fan-in formula (NOT Ethernet uplink multiplier)
 *   5. Violations + final BOM assembly
 *
 * DUAL-FABRIC INVARIANT: fabricBSwitches is always identical to fabricASwitches.
 * Fabric A and Fabric B are symmetrical by design — they are never computed independently.
 *
 * @module fc-sizing
 */

import { FC_SWITCH_CATALOG } from '../catalog/brocade';
import { computeFCIslLengthM } from './cable-length';
import type { FCSizingInput } from '../schemas/fc-input';
import type { FCConstraintViolation, FCNetworkBOM } from '../schemas/fc-bom';

/** Broadcom recommended maximum host-to-storage fan-in ratio (SAN Design Guide, Nov 2025) */
const FC_FAN_IN_MAX = 7;

// ─── Helper: POD License Calculation ──────────────────────────────────────────

/**
 * Compute the effective port count per switch and POD licenses required per switch.
 *
 * Directors (podLicenseUnit === 0) use all totalPorts as base-licensed — no POD licenses.
 * Fixed-port switches (G710, G720, G730, G820) start at basePorts; POD licenses unlock
 * additional ports in increments of podLicenseUnit, up to totalPorts.
 *
 * @param portsNeededPerSwitch - Device ports needed per switch (host + storage, not ISL)
 * @param basePorts - Ports active with factory license
 * @param totalPorts - Maximum ports available with full POD unlock
 * @param podLicenseUnit - Ports per POD license increment (0 for directors)
 * @returns effectivePorts and podLicensesRequired per switch
 */
function computeEffectivePorts(
  portsNeededPerSwitch: number,
  basePorts: number,
  totalPorts: number,
  podLicenseUnit: number,
): { effectivePorts: number; podLicensesRequired: number } {
  // Director branch: all ports are base-licensed, no POD model
  if (podLicenseUnit === 0) {
    return { effectivePorts: totalPorts, podLicensesRequired: 0 };
  }
  // Within base capacity: no POD licenses needed
  if (portsNeededPerSwitch <= basePorts) {
    return { effectivePorts: basePorts, podLicensesRequired: 0 };
  }
  // POD branch: unlock incremental port groups until demand is met or totalPorts reached
  const extraPortsNeeded = portsNeededPerSwitch - basePorts;
  const podCount = Math.ceil(extraPortsNeeded / podLicenseUnit);
  const effectivePorts = Math.min(basePorts + podCount * podLicenseUnit, totalPorts);
  return { effectivePorts, podLicensesRequired: podCount };
}

// ─── Helper: ISL Count via Bandwidth Fan-In Formula ───────────────────────────

/**
 * Calculate ISL count using the bandwidth-based fan-in formula.
 *
 * The ISL bandwidth must support the traffic from hosts to storage without exceeding
 * the target fan-in ratio. Each ISL carries one full-speed link.
 * Minimum 2 ISLs is always enforced (Broadcom minimum for redundancy).
 *
 * Source: Broadcom SAN Design and Best Practices, Nov 2025
 *
 * @param hostPortsPerFabric - Total host-facing ports in one fabric
 * @param storagePortsPerFabric - Total storage-facing ports in one fabric
 * @param switchSpeedGbps - Port speed of the selected FC switch model
 * @param targetFanIn - Maximum host:storage ratio (default: FC_FAN_IN_MAX = 7)
 * @returns ISL count (integer, minimum 2)
 */
function calculateIslCount(
  hostPortsPerFabric: number,
  _storagePortsPerFabric: number,
  switchSpeedGbps: number,
  targetFanIn: number = FC_FAN_IN_MAX,
): number {
  // ISLs must carry host-originated traffic up to the fan-in ratio limit.
  // Formula: requiredIslBandwidth = hostBandwidth / targetFanIn
  // This scales correctly with host count — more hosts require more ISL bandwidth.
  const hostBandwidth = hostPortsPerFabric * switchSpeedGbps;
  const requiredIslBandwidth = hostBandwidth / targetFanIn;
  // Each ISL carries one full-speed link; enforce minimum 2 for redundancy
  return Math.max(2, Math.ceil(requiredIslBandwidth / switchSpeedGbps));
}

// ─── Main Engine ───────────────────────────────────────────────────────────────

/**
 * Calculate the FC Bill of Materials for a Brocade FC deployment.
 *
 * Pure function — no side effects. All port arithmetic uses catalog fields from
 * FC_SWITCH_CATALOG; never hardcoded values. The returned FCNetworkBOM includes
 * required fields: podLicensesRequired, fanInRatio, islOversubscriptionRatio.
 *
 * @param input - Validated FC sizing parameters (FCSizingInput)
 * @returns FCNetworkBOM with all fields computed (never zero-value stub)
 */
export function calculateFCBOM(input: FCSizingInput): FCNetworkBOM {
  const SW = FC_SWITCH_CATALOG[input.fcSwitchModel];

  // ─── Step 1: Server totals ──────────────────────────────────────────────────
  const totalServers = input.racks.reduce((sum, r) => sum + r.serverCount, 0);

  // ─── Step 2: Per-fabric port demand ────────────────────────────────────────
  //
  // Dual-fabric splits HBA ports evenly using floor() — conservative for odd HBA counts.
  // Example: hbaPortsPerServer=2 → 1 port per fabric per server (standard deployment).
  // Example: hbaPortsPerServer=3 → floor(3/2)=1 port per fabric (odd port is unassigned).
  const hostPortsPerFabric = totalServers * Math.floor(input.hbaPortsPerServer / 2);

  // Storage target ports split across both fabrics (ceil to avoid underprovisioning).
  const storagePortsPerFabric = Math.ceil(
    (input.storageArrayCount * input.storageTargetPorts) / 2,
  );

  // ─── Step 3: Effective ports and switch count (two-pass) ───────────────────
  //
  // Pass 1: Check if a single switch can handle total demand WITHOUT ISL reservation.
  // Single-switch fabrics have no inter-switch links — no ISL ports needed.
  const totalDemand = hostPortsPerFabric + storagePortsPerFabric;
  const { effectivePorts: fullEffectivePorts, podLicensesRequired: podLicensesPerSwitch } =
    computeEffectivePorts(totalDemand, SW.basePorts, SW.totalPorts, SW.podLicenseUnit);

  const isSingleSwitch = totalDemand <= fullEffectivePorts;

  let fabricSwitchCount: number;
  if (isSingleSwitch) {
    // Single-switch fabric: no ISL ports needed, all effective ports are device ports
    fabricSwitchCount = 1;
  } else {
    // Pass 2: Multi-switch fabric — apply ISL port reservation and recompute
    const effectiveIslPerSwitchPass2 = Math.min(input.islPortsPerSwitch, SW.maxIslPorts);
    const devicePortsPerSwitch = Math.max(1, fullEffectivePorts - effectiveIslPerSwitchPass2);
    fabricSwitchCount = Math.max(1, Math.ceil(totalDemand / devicePortsPerSwitch));
  }

  // Total POD licenses: per-switch count × switches in both fabrics
  const podLicensesRequired = podLicensesPerSwitch * fabricSwitchCount * 2;

  // ─── Step 4: ISL count via bandwidth fan-in formula ────────────────────────
  //
  // ISLs only exist in multi-switch fabrics. Single-switch fabric = 0 ISLs.
  // ISL count is derived from the bandwidth-based fan-in ratio (Broadcom 7:1 default).
  // This is NOT the Ethernet uplink formula (switchCount × islPortsPerSwitch).
  const effectiveIslPerSwitch = fabricSwitchCount > 1
    ? Math.min(input.islPortsPerSwitch, SW.maxIslPorts)
    : 0;
  const islCount = fabricSwitchCount > 1
    ? calculateIslCount(hostPortsPerFabric, storagePortsPerFabric, SW.speedGbps)
    : 0;

  // ISL cables span both fabrics (one cable connects fabric A switch to fabric B switch)
  const islCables = islCount * 2;

  // ─── Step 5: Optics count ──────────────────────────────────────────────────
  //
  // 2 optics per cable (one at each end) × total links per fabric × 2 fabrics.
  const totalLinksPerFabric = hostPortsPerFabric + storagePortsPerFabric + islCount;
  const fcOpticsCount = totalLinksPerFabric * 2 * 2;

  // ─── Step 6: Ratios ────────────────────────────────────────────────────────
  const fanInRatio =
    storagePortsPerFabric > 0 ? hostPortsPerFabric / storagePortsPerFabric : 0;
  const islOversubscriptionRatio = islCount > 0 ? hostPortsPerFabric / islCount : 0;

  // ─── Step 7: Violations ────────────────────────────────────────────────────
  const violations: FCConstraintViolation[] = [];

  // FC_OVERSUBSCRIPTION_EXCEEDED: host-to-storage fan-in exceeds Broadcom 7:1 recommendation
  if (fanInRatio > FC_FAN_IN_MAX) {
    // Minimum total storage target ports (both fabrics) to satisfy the fan-in constraint
    const minStoragePorts = Math.ceil(hostPortsPerFabric / FC_FAN_IN_MAX) * 2;
    violations.push({
      code: 'FC_OVERSUBSCRIPTION_EXCEEDED',
      ratio: fanInRatio,
      maxRatio: FC_FAN_IN_MAX,
      minStoragePorts,
    });
  }

  // FC_PORT_SATURATION: demand exceeds the switch model's total port capacity.
  // Uses fullEffectivePorts (no ISL reservation) — ISL ports don't apply to saturation check
  // because this violation fires when the model is fundamentally too small regardless of ISL config.
  if (totalDemand > fullEffectivePorts) {
    violations.push({
      code: 'FC_PORT_SATURATION',
      requiredPorts: totalDemand,
      availablePorts: fullEffectivePorts,
    });
  }

  // FC_ISL_UNDERPROVISIONED: user provisioned fewer ISL ports than the fan-in formula requires.
  // Only fires for multi-switch fabrics — single-switch fabrics have no ISLs by design.
  if (fabricSwitchCount > 1 && effectiveIslPerSwitch < islCount) {
    violations.push({
      code: 'FC_ISL_UNDERPROVISIONED',
      islsAvailable: effectiveIslPerSwitch,
      islsRequired: islCount,
    });
  }

  // ─── Step 8: ISL cable length (Phase 26, CABLE-04) ─────────────────────────
  const islCableLengthSkuM = computeFCIslLengthM();

  // ─── Return FCNetworkBOM ───────────────────────────────────────────────────
  //
  // DUAL-FABRIC INVARIANT: fabricBSwitches === fabricASwitches (always)
  return {
    fabricASwitches: fabricSwitchCount,
    fabricBSwitches: fabricSwitchCount,
    hostPortsPerFabric,
    storagePortsPerFabric,
    islPortsPerFabric: islCount,
    switchPortsPerFabric: fullEffectivePorts,
    podLicensesRequired,
    fcOpticsCount,
    islCables,
    fanInRatio,
    islOversubscriptionRatio,
    violations,
    input,
    islCableLengthSkuM,
  };
}

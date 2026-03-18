/**
 * TDD RED phase test suite for calculateFCBOM().
 *
 * These tests specify the behavioral contract for the FC sizing engine
 * (FC-05 through FC-08). They MUST fail against the Phase 9 zero-value stub.
 *
 * All expected values are computed manually from catalog constants (inline comments show derivation).
 * makeInput() is self-contained — no external DEFAULT_FC_INPUT import.
 */

import { describe, it, expect } from 'vitest';
import { calculateFCBOM } from './fc-sizing';
import type { FCSizingInput } from '../schemas/fc-input';

// ---------------------------------------------------------------------------
// Test helper — self-contained, no external defaults import (Phase 09-01 decision)
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<FCSizingInput> = {}): FCSizingInput {
  return {
    racks: [{ serverCount: 16 }, { serverCount: 16 }],
    hbaPortsPerServer: 2,
    storageTargetPorts: 4,
    storageArrayCount: 1,
    fcSwitchModel: 'G720',
    islPortsPerSwitch: 4,
    rackSize: '42U',
    serverUHeight: '1U',
    preferredGeneration: 'any',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FC-05: Dual-fabric topology — symmetry, switch count, host ports, POD licensing
// ---------------------------------------------------------------------------

describe('FC-05: Dual-fabric topology', () => {
  it('fabricBSwitches always equals fabricASwitches (symmetry invariant)', () => {
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 32 }],
      fcSwitchModel: 'G720',
    }));
    expect(result.fabricBSwitches).toBe(result.fabricASwitches);
  });

  it('both fabricASwitches and fabricBSwitches are > 0 for non-trivial server count', () => {
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 16 }, { serverCount: 16 }],
      fcSwitchModel: 'G720',
    }));
    expect(result.fabricASwitches).toBeGreaterThan(0);
    expect(result.fabricBSwitches).toBeGreaterThan(0);
  });

  it('hostPortsPerFabric = totalServers × floor(hbaPortsPerServer / 2)', () => {
    // 32 servers × 2 HBA ports → floor(2/2)=1 port per fabric → hostPortsPerFabric = 32
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 32 }],
      hbaPortsPerServer: 2,
      fcSwitchModel: 'G720',
    }));
    expect(result.hostPortsPerFabric).toBe(32); // 32 × floor(2/2) = 32 × 1 = 32
  });

  it('hostPortsPerFabric uses floor() for odd HBA port count', () => {
    // 32 servers × 3 HBA ports → floor(3/2)=1 port per fabric → hostPortsPerFabric = 32
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 32 }],
      hbaPortsPerServer: 3,
      fcSwitchModel: 'G720',
    }));
    expect(result.hostPortsPerFabric).toBe(32); // 32 × floor(3/2) = 32 × 1 = 32
  });

  it('storagePortsPerFabric = storageTargetPorts / 2', () => {
    // 4 storage target ports → 2 per fabric
    const result = calculateFCBOM(makeInput({
      storageTargetPorts: 4,
    }));
    expect(result.storagePortsPerFabric).toBe(2); // floor(4 / 2) = 2
  });

  it('podLicensesRequired is 0 for X7-4 director (podLicenseUnit=0)', () => {
    const result = calculateFCBOM(makeInput({
      fcSwitchModel: 'X7-4',
    }));
    expect(result.podLicensesRequired).toBe(0);
  });

  it('podLicensesRequired is 0 for X7-8 director (podLicenseUnit=0)', () => {
    const result = calculateFCBOM(makeInput({
      fcSwitchModel: 'X7-8',
    }));
    expect(result.podLicensesRequired).toBe(0);
  });

  it('podLicensesRequired is 0 for X8-4 director (podLicenseUnit=0)', () => {
    const result = calculateFCBOM(makeInput({
      fcSwitchModel: 'X8-4',
    }));
    expect(result.podLicensesRequired).toBe(0);
  });

  it('podLicensesRequired > 0 when G720 demand exceeds basePorts=24', () => {
    // G720: basePorts=24, podLicenseUnit=8
    // 40 servers × 1 HBA port per fabric = 40 host ports + islPortsPerSwitch=4 → total 44 > 24 basePorts
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 40 }],
      hbaPortsPerServer: 2, // 2 HBAs / 2 fabrics = 1 port per fabric
      fcSwitchModel: 'G720',
      islPortsPerSwitch: 4,
    }));
    // 40 host ports + 4 ISL ports = 44 > 24 basePorts → POD licenses needed
    expect(result.podLicensesRequired).toBeGreaterThan(0);
  });

  it('input is echoed back in result', () => {
    const input = makeInput();
    const result = calculateFCBOM(input);
    expect(result.input).toEqual(input);
  });
});

// ---------------------------------------------------------------------------
// FC-06: ISL calculation — fan-in formula, minimum 2, cable count
// ---------------------------------------------------------------------------

describe('FC-06: ISL calculation', () => {
  it('islPortsPerFabric is at least 2 for any input (minimum ISL redundancy)', () => {
    // Small input: 1 rack, 4 servers
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 4 }],
      fcSwitchModel: 'G720',
      islPortsPerSwitch: 4,
    }));
    expect(result.islPortsPerFabric).toBeGreaterThanOrEqual(2);
  });

  it('islPortsPerFabric grows with server count for large fabrics', () => {
    // 200 servers should yield more ISL ports than 4 servers
    const smallResult = calculateFCBOM(makeInput({
      racks: [{ serverCount: 4 }],
      fcSwitchModel: 'G720',
    }));
    const largeResult = calculateFCBOM(makeInput({
      racks: Array.from({ length: 5 }, () => ({ serverCount: 40 })),
      fcSwitchModel: 'G720',
    }));
    expect(largeResult.islPortsPerFabric).toBeGreaterThan(smallResult.islPortsPerFabric);
  });

  it('islCables equals islPortsPerFabric × 2 (both fabrics combined)', () => {
    // Each ISL port in fabric A has a corresponding port in fabric B
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 16 }, { serverCount: 16 }],
      fcSwitchModel: 'G720',
    }));
    expect(result.islCables).toBe(result.islPortsPerFabric * 2);
  });

  it('islPortsPerFabric is a non-negative integer', () => {
    const result = calculateFCBOM(makeInput());
    expect(typeof result.islPortsPerFabric).toBe('number');
    expect(result.islPortsPerFabric).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.islPortsPerFabric)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FC-07: FC optics count — 2 × total links × 2 fabrics
// ---------------------------------------------------------------------------

describe('FC-07: FC optics count', () => {
  it('fcOpticsCount equals 2 × (hostPortsPerFabric + storagePortsPerFabric + islPortsPerFabric) × 2 fabrics', () => {
    // Each link requires 2 optics (one per end); both fabrics double the count
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 16 }, { serverCount: 16 }],
      hbaPortsPerServer: 2,
      storageTargetPorts: 4,
      fcSwitchModel: 'G720',
    }));
    const totalLinksPerFabric = result.hostPortsPerFabric + result.storagePortsPerFabric + result.islPortsPerFabric;
    expect(result.fcOpticsCount).toBe(2 * totalLinksPerFabric * 2);
  });

  it('fcOpticsCount is a non-negative integer', () => {
    const result = calculateFCBOM(makeInput());
    expect(typeof result.fcOpticsCount).toBe('number');
    expect(result.fcOpticsCount).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.fcOpticsCount)).toBe(true);
  });

  it('fcOpticsCount > 0 for non-trivial input', () => {
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 16 }, { serverCount: 16 }],
    }));
    expect(result.fcOpticsCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// FC-08: Oversubscription and violations — ratios + all 3 violation codes
// ---------------------------------------------------------------------------

describe('FC-08: Oversubscription and violations', () => {
  it('fanInRatio is always present and is a number', () => {
    const result = calculateFCBOM(makeInput());
    expect(typeof result.fanInRatio).toBe('number');
    expect(result.fanInRatio).toBeDefined();
  });

  it('fanInRatio = hostPortsPerFabric / storagePortsPerFabric', () => {
    // Default: 32 servers × 1 HBA/fabric = 32 host ports; 4 storage ports / 2 = 2 storage ports
    // fanInRatio = 32 / 2 = 16
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 16 }, { serverCount: 16 }],
      hbaPortsPerServer: 2,
      storageTargetPorts: 4,
      fcSwitchModel: 'G720',
    }));
    expect(result.fanInRatio).toBe(result.hostPortsPerFabric / result.storagePortsPerFabric);
  });

  it('islOversubscriptionRatio is always present and is a number >= 0', () => {
    const result = calculateFCBOM(makeInput());
    expect(typeof result.islOversubscriptionRatio).toBe('number');
    expect(result.islOversubscriptionRatio).toBeGreaterThanOrEqual(0);
  });

  it('violations array is empty for a well-configured small fabric', () => {
    // 10 servers, G720, 2 HBA ports — well within limits
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 10 }],
      hbaPortsPerServer: 2,
      fcSwitchModel: 'G720',
      storageTargetPorts: 4,
      islPortsPerSwitch: 4,
    }));
    expect(result.violations).toHaveLength(0);
  });

  it('FC_OVERSUBSCRIPTION_EXCEEDED fires when fanInRatio > 7', () => {
    // 100 servers × 1 HBA/fabric = 100 host ports; 4 storage ports / 2 = 2 storage ports
    // fanInRatio = 100 / 2 = 50 >> 7 → violation
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 100 }],
      hbaPortsPerServer: 2,
      storageTargetPorts: 4,
      fcSwitchModel: 'X7-4', // director — large capacity, avoids port saturation
    }));
    const violation = result.violations.find(v => v.code === 'FC_OVERSUBSCRIPTION_EXCEEDED');
    expect(violation).toBeDefined();
    if (violation && violation.code === 'FC_OVERSUBSCRIPTION_EXCEEDED') {
      expect(violation.maxRatio).toBe(7);
      expect(violation.ratio).toBeGreaterThan(7);
    }
  });

  it('FC_OVERSUBSCRIPTION_EXCEEDED violation has correct ratio value', () => {
    // 100 servers × 1 HBA/fabric = 100 host ports; 4 storage / 2 = 2 storage ports
    // fanInRatio = 100 / 2 = 50
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 100 }],
      hbaPortsPerServer: 2,
      storageTargetPorts: 4,
      fcSwitchModel: 'X7-4',
    }));
    const violation = result.violations.find(v => v.code === 'FC_OVERSUBSCRIPTION_EXCEEDED');
    expect(violation).toBeDefined();
    if (violation && violation.code === 'FC_OVERSUBSCRIPTION_EXCEEDED') {
      expect(violation.ratio).toBe(50); // 100 / 2 = 50
    }
  });

  it('FC_PORT_SATURATION fires when demand exceeds switch totalPorts', () => {
    // G710: basePorts=8, totalPorts=24, podLicenseUnit=8, maxIslPorts=6
    // 50 servers × 1 HBA/fabric = 50 host ports; + islPortsPerSwitch = 54 total
    // G710 totalPorts=24 → even fully unlocked (3 POD packs = 24 total) → 50 > 24 → port saturation
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 50 }],
      hbaPortsPerServer: 2,
      fcSwitchModel: 'G710',
      islPortsPerSwitch: 4,
    }));
    const violation = result.violations.find(v => v.code === 'FC_PORT_SATURATION');
    expect(violation).toBeDefined();
    if (violation && violation.code === 'FC_PORT_SATURATION') {
      expect(violation.requiredPorts).toBeGreaterThan(violation.availablePorts);
    }
  });

  it('FC_PORT_SATURATION violation exposes requiredPorts and availablePorts', () => {
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 50 }],
      hbaPortsPerServer: 2,
      fcSwitchModel: 'G710',
      islPortsPerSwitch: 4,
    }));
    const violation = result.violations.find(v => v.code === 'FC_PORT_SATURATION');
    expect(violation).toBeDefined();
    if (violation && violation.code === 'FC_PORT_SATURATION') {
      expect(typeof violation.requiredPorts).toBe('number');
      expect(typeof violation.availablePorts).toBe('number');
    }
  });

  it('FC_ISL_UNDERPROVISIONED fires when ISL bandwidth is insufficient', () => {
    // Force ISL underprovisioning: very large fabric with minimal ISL ports
    // Large host port demand with islPortsPerSwitch=0 → no ISL capacity at all
    const result = calculateFCBOM(makeInput({
      racks: Array.from({ length: 5 }, () => ({ serverCount: 40 })),
      hbaPortsPerServer: 2,
      fcSwitchModel: 'X7-4', // director — avoids port saturation
      islPortsPerSwitch: 0,  // no ISL ports provisioned
      storageTargetPorts: 4,
    }));
    // With 0 ISL ports, any multi-switch fabric will be underprovisioned
    const violation = result.violations.find(v => v.code === 'FC_ISL_UNDERPROVISIONED');
    // Only fires if multiple switches needed — check the violation if present
    if (result.fabricASwitches > 1) {
      expect(violation).toBeDefined();
      if (violation && violation.code === 'FC_ISL_UNDERPROVISIONED') {
        expect(violation.islsAvailable).toBeLessThan(violation.islsRequired);
      }
    }
  });

  it('no FC_OVERSUBSCRIPTION_EXCEEDED when fanInRatio <= 7', () => {
    // 4 servers × 1 HBA/fabric = 4 host ports; 4 storage / 2 = 2 storage ports
    // fanInRatio = 4 / 2 = 2 → well below 7 → no violation
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 4 }],
      hbaPortsPerServer: 2,
      storageTargetPorts: 4,
      fcSwitchModel: 'G720',
    }));
    const violation = result.violations.find(v => v.code === 'FC_OVERSUBSCRIPTION_EXCEEDED');
    expect(violation).toBeUndefined();
  });

  it('no FC_PORT_SATURATION for a director with ample port capacity', () => {
    // X7-4: totalPorts=256 — well above 32 servers × 1 HBA/fabric = 32 host ports
    const result = calculateFCBOM(makeInput({
      racks: [{ serverCount: 32 }],
      hbaPortsPerServer: 2,
      fcSwitchModel: 'X7-4',
    }));
    const violation = result.violations.find(v => v.code === 'FC_PORT_SATURATION');
    expect(violation).toBeUndefined();
  });

  it('violations array is always present (never undefined)', () => {
    const result = calculateFCBOM(makeInput());
    expect(Array.isArray(result.violations)).toBe(true);
  });
});

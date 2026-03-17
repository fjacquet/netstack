/**
 * Unit tests for the sizing engine (calculateBOM).
 * Covers all formula categories: rack, leaf, spine, OOB, cables, oversubscription, DAC advisory.
 * Updated for racks-array input shape (RACK-03).
 */

import { describe, it, expect } from 'vitest';
import { calculateBOM } from './sizing';
import type { SizingInput } from '../schemas/input';

// ---------------------------------------------------------------------------
// Test helper — reduces boilerplate across all tests
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<SizingInput> = {}): SizingInput {
  return {
    racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
    connectivityType: '25G',
    cableType: 'DAC',
    leafModel: 'S5248F-ON',
    spineModel: 'S5232F-ON',
    borderLeafModel: 'none',
    borderLeafCount: 0,
    rackSize: '42U',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SIZE-02 — Rack Count
// ---------------------------------------------------------------------------
describe('SIZE-02: Rack Count', () => {
  it('4 racks array [3,3,3,1] = 4 racks (equivalent to ceil(10/3))', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 3 }, { serverCount: 3 }, { serverCount: 3 }, { serverCount: 1 }],
      cableType: 'DAC',
    }));
    expect(result.racks).toBe(4);
  });

  it('5 racks array with 20 each = 5 racks (equivalent to ceil(100/20))', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 5 }, () => ({ serverCount: 20 })),
      cableType: 'AOC',
    }));
    expect(result.racks).toBe(5);
  });

  it('1 rack with 48 servers = 1 rack (equivalent to ceil(48/48))', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 48 }],
      cableType: 'fiber',
    }));
    expect(result.racks).toBe(1);
  });

  it('racks.length determines rack count (not division)', () => {
    // 3 racks regardless of server counts
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 20 }, { serverCount: 30 }],
    }));
    expect(result.racks).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// SIZE-03 — Leaf Count (always 2 × racks)
// ---------------------------------------------------------------------------
describe('SIZE-03: Leaf Count', () => {
  it('2 racks → 4 leafs', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }, { serverCount: 20 }],
      cableType: 'fiber',
    }));
    expect(result.leafSwitches).toBe(4);
  });

  it('1 rack → 2 leafs', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'fiber',
    }));
    expect(result.leafSwitches).toBe(2);
  });

  it('5 racks → 10 leafs', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 5 }, () => ({ serverCount: 20 })),
      cableType: 'fiber',
    }));
    expect(result.leafSwitches).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// SIZE-04 — Spine Scaling
// ---------------------------------------------------------------------------
describe('SIZE-04: Spine Scaling', () => {
  it('2 leafs (1 rack) → 2 spines (minimum for redundancy)', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'fiber',
    }));
    expect(result.spineSwitches).toBe(2);
  });

  it('40 leafs (20 racks) → 2 spines: max(2, ceil(40/32)) = max(2,2) = 2', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 20 }, () => ({ serverCount: 20 })),
      cableType: 'fiber',
    }));
    expect(result.spineSwitches).toBe(2);
  });

  it('130 leafs (65 racks) → 5 spines: max(2, ceil(130/32)) = max(2,5) = 5', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 65 }, () => ({ serverCount: 20 })),
      cableType: 'fiber',
    }));
    expect(result.spineSwitches).toBe(5);
  });

  it('spine count is always at least 2 for redundancy', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'fiber',
    }));
    expect(result.spineSwitches).toBeGreaterThanOrEqual(2);
  });

  it('SPINE_CAPACITY_EXCEEDED violation when leafSwitches > 32', () => {
    // 20 racks → 40 leafs > 32 → violation
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 20 }, () => ({ serverCount: 20 })),
      cableType: 'fiber',
    }));
    const violation = result.violations.find(v => v.code === 'SPINE_CAPACITY_EXCEEDED');
    expect(violation).toBeDefined();
    if (violation && violation.code === 'SPINE_CAPACITY_EXCEEDED') {
      expect(violation.leafCount).toBe(40);
      expect(violation.maxLeafs).toBe(32);
    }
  });

  it('no SPINE_CAPACITY_EXCEEDED violation when leafSwitches <= 32', () => {
    // 10 racks → 20 leafs ≤ 32 → no violation
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 10 }, () => ({ serverCount: 20 })),
      cableType: 'fiber',
    }));
    const violation = result.violations.find(v => v.code === 'SPINE_CAPACITY_EXCEEDED');
    expect(violation).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SIZE-05 — OOB Switches
// ---------------------------------------------------------------------------
describe('SIZE-05: OOB Switches', () => {
  it('1 rack with 10 servers → 1 OOB switch (10+2=12, ceil(12/48)=1)', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'fiber',
    }));
    expect(result.oobSwitches).toBe(1);
  });

  it('1 rack with 46 servers → 1 OOB switch (46+2=48, exactly at limit, NO violation)', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 46 }],
      cableType: 'fiber',
    }));
    expect(result.oobSwitches).toBe(1);
    const oobViolation = result.violations.find(v => v.code === 'OOB_PORT_SATURATION');
    expect(oobViolation).toBeUndefined();
  });

  it('1 rack with 47 servers → 2 OOB switches (47+2=49 > 48), WITH OOB_PORT_SATURATION violation', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 47 }],
      cableType: 'fiber',
    }));
    expect(result.oobSwitches).toBe(2);
    const oobViolation = result.violations.find(v => v.code === 'OOB_PORT_SATURATION');
    expect(oobViolation).toBeDefined();
    if (oobViolation && oobViolation.code === 'OOB_PORT_SATURATION') {
      expect(oobViolation.required).toBe(49);
      expect(oobViolation.available).toBe(48);
    }
  });

  it('3 racks with 20 servers each → 3 OOB switches', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }, { serverCount: 20 }, { serverCount: 20 }],
      cableType: 'fiber',
    }));
    expect(result.oobSwitches).toBe(3);
  });

  it('OOB saturation uses max(serverCount) across racks (worst-case rack)', () => {
    // racks have [10, 20, 47] — worst case is 47 → 47+2=49 > 48 → violation
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 20 }, { serverCount: 47 }],
      cableType: 'fiber',
    }));
    const oobViolation = result.violations.find(v => v.code === 'OOB_PORT_SATURATION');
    expect(oobViolation).toBeDefined();
    if (oobViolation && oobViolation.code === 'OOB_PORT_SATURATION') {
      expect(oobViolation.required).toBe(49); // max(47) + 2
    }
  });

  it('OOB no saturation when all racks have <= 46 servers', () => {
    // all racks have ≤ 46 → max+2 ≤ 48 → no violation
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 20 }, { serverCount: 46 }],
      cableType: 'fiber',
    }));
    const oobViolation = result.violations.find(v => v.code === 'OOB_PORT_SATURATION');
    expect(oobViolation).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SIZE-06 — Pure Function
// ---------------------------------------------------------------------------
describe('SIZE-06: Pure Function', () => {
  it('same input called twice returns deeply equal output', () => {
    const input = makeInput({
      racks: Array.from({ length: 5 }, () => ({ serverCount: 10 })),
      cableType: 'fiber',
    });
    const result1 = calculateBOM(input);
    const result2 = calculateBOM(input);
    expect(result1).toEqual(result2);
  });
});

// ---------------------------------------------------------------------------
// Cable Quantities (link-based model)
// ---------------------------------------------------------------------------
describe('Cable Quantities (link-based model)', () => {
  it('1 rack: 2 leafs × 2 spines = 4 leaf-spine cables', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
    }));
    // 1 rack → 2 leafs → 2 spines (min) → 2 leafs × 2 links = 4
    expect(result.leafSpineCables).toBe(4);
  });

  it('2 racks: 4 leafs × 2 spines = 8 leaf-spine cables', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }, { serverCount: 20 }],
      cableType: 'fiber',
    }));
    // 2 racks → 4 leafs → 2 spines → 4 × 2 = 8
    expect(result.leafSpineCables).toBe(8);
  });

  it('4 racks: 8 leafs × 2 spines = 16 leaf-spine cables', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 20 })),
      cableType: 'fiber',
    }));
    // 4 racks → 8 leafs → 2 spines → 8 × 2 = 16
    expect(result.leafSpineCables).toBe(16);
  });

  it('serverLeafCables = totalServers (sum of all racks.serverCount)', () => {
    // 4 racks × 12 each = 48 total servers → 48 server-leaf cables
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'fiber',
    }));
    expect(result.serverLeafCables).toBe(48);
  });

  it('serverOobCables = totalServers + leafSwitches', () => {
    // 4 racks × 12 each = 48 servers → 8 leafs → serverOobCables = 48 + 8 = 56
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'fiber',
    }));
    // 4 racks → 8 leafs; serverOobCables = 48 + 8 = 56
    expect(result.serverOobCables).toBe(56);
  });

  it('serverLeafCables = sum of serverCount across variable-density racks', () => {
    // racks: [10, 20, 30] = 60 total servers
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 20 }, { serverCount: 30 }],
      cableType: 'fiber',
    }));
    expect(result.serverLeafCables).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Oversubscription Ratio
// ---------------------------------------------------------------------------
describe('Oversubscription Ratio', () => {
  it('48 servers at 25G with 2 spines: (48×25) / (2×100) = 6.0', () => {
    // 1 rack of 48 servers → 2 leafs → 2 spines (minimum)
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 48 }],
      cableType: 'fiber',
    }));
    expect(result.oversubscriptionRatio).toBeCloseTo(6.0);
  });

  it('10 servers at 25G with 2 spines: (10×25) / (2×100) = 1.25', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'fiber',
    }));
    expect(result.oversubscriptionRatio).toBeCloseTo(1.25);
  });

  it('oversubscriptionRatio is present in every BOM result', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 5 }, () => ({ serverCount: 20 })),
      cableType: 'fiber',
    }));
    expect(result.oversubscriptionRatio).toBeDefined();
    expect(typeof result.oversubscriptionRatio).toBe('number');
  });

  it('oversubscription uses maxServersPerRack (worst-case rack)', () => {
    // racks: [10, 48] — worst case is 48 → (48×25) / (2×100) = 6.0
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 48 }],
      cableType: 'fiber',
    }));
    expect(result.oversubscriptionRatio).toBeCloseTo(6.0);
  });
});

// ---------------------------------------------------------------------------
// DAC Distance Advisory
// ---------------------------------------------------------------------------
describe('DAC Distance Advisory', () => {
  it('DAC cable type with racks > 8 → DAC_DISTANCE_ADVISORY violation', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 9 }, () => ({ serverCount: 10 })),
      cableType: 'DAC',
    }));
    // 9 racks > 8 → violation
    const violation = result.violations.find(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(violation).toBeDefined();
    if (violation && violation.code === 'DAC_DISTANCE_ADVISORY') {
      expect(violation.rackCount).toBe(9);
      expect(violation.cableType).toBe('DAC');
    }
  });

  it('DAC cable type with racks <= 8 → no DAC_DISTANCE_ADVISORY', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 8 }, () => ({ serverCount: 10 })),
      cableType: 'DAC',
    }));
    // 8 racks ≤ 8 → no violation
    const violation = result.violations.find(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(violation).toBeUndefined();
  });

  it('AOC cable type with racks > 8 → no DAC_DISTANCE_ADVISORY (only DAC triggers it)', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 9 }, () => ({ serverCount: 10 })),
      cableType: 'AOC',
    }));
    const violation = result.violations.find(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(violation).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Input echoed back on result
// ---------------------------------------------------------------------------
describe('Input in BOM', () => {
  it('BOM result includes the original input', () => {
    const input = makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
    });
    const result = calculateBOM(input);
    expect(result.input).toEqual(input);
  });
});

// ---------------------------------------------------------------------------
// SFP Transceivers (fiber only)
// ---------------------------------------------------------------------------
describe('Transceivers (fiber only) and VLT', () => {
  it('fiber → sfp28Count = 2 × serverLeafCables, qsfp28Count = 2 × leafSpineCables', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
    }));
    // 1 rack → 2 leafs → 2 spines → 4 leaf-spine cables (QSFP28), 20 server-leaf cables (SFP28)
    expect(bom.sfp28Count).toBe(40);   // 2 × 20
    expect(bom.qsfp28Count).toBe(8);   // 2 × 4
  });

  it('DAC → sfp28Count = 0, qsfp28Count = 0', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'DAC',
    }));
    expect(bom.sfp28Count).toBe(0);
    expect(bom.qsfp28Count).toBe(0);
  });

  it('AOC → sfp28Count = 0, qsfp28Count = 0', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'AOC',
    }));
    expect(bom.sfp28Count).toBe(0);
    expect(bom.qsfp28Count).toBe(0);
  });

  it('VLT cables = 2 per leaf pair (QSFP28-DD)', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }, { serverCount: 20 }, { serverCount: 20 }],
      cableType: 'DAC',
    }));
    // 3 racks → 3 leaf pairs → 6 VLT cables
    expect(bom.vltCables).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// leafModel selection
// ---------------------------------------------------------------------------
describe('leafModel selection', () => {
  it('uses S5224F-ON when selected (3 racks → 6 leafs)', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
      leafModel: 'S5224F-ON',
    }));
    // S5224F-ON has uplinkPorts=4, same as S5248F-ON, so cable count is same
    expect(bom.leafSwitches).toBe(6); // 3 racks * 2
  });

  it('uses S5212F-ON uplinkPorts (3) capped by spine count for cable calculations', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
      leafModel: 'S5212F-ON',
    }));
    // S5212F-ON has uplinkPorts=3, 2 spines → min(2,3)=2 links per leaf
    expect(bom.leafSpineCables).toBe(bom.leafSwitches * Math.min(bom.spineSwitches, 3));
  });
});

// ---------------------------------------------------------------------------
// NEW: Variable density rack configurations (RACK-03)
// ---------------------------------------------------------------------------
describe('RACK-03: Variable density rack configurations', () => {
  it('racks with [10, 20, 30] produces 60 total servers, 3 racks', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 20 }, { serverCount: 30 }],
    }));
    expect(bom.racks).toBe(3);
    expect(bom.serverLeafCables).toBe(60); // 10 + 20 + 30
  });

  it('single rack with 48 servers produces same result as 1-rack uniform config', () => {
    const bom1 = calculateBOM(makeInput({ racks: [{ serverCount: 48 }] }));
    const bom2 = calculateBOM(makeInput({ racks: [{ serverCount: 48 }] }));
    expect(bom1.racks).toBe(1);
    expect(bom2.racks).toBe(1);
    expect(bom1.serverLeafCables).toBe(48);
    expect(bom1).toEqual(bom2);
  });

  it('racks array can have different server counts per rack (variable density)', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 5 }, { serverCount: 10 }, { serverCount: 15 }, { serverCount: 20 }],
    }));
    expect(bom.racks).toBe(4);
    expect(bom.serverLeafCables).toBe(50); // 5 + 10 + 15 + 20
    expect(bom.leafSwitches).toBe(8); // 4 racks × 2
  });
});

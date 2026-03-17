/**
 * Unit tests for the sizing engine (calculateBOM).
 * Covers all formula categories: rack, leaf, spine, OOB, cables, oversubscription, DAC advisory.
 * Written in RED phase — calculateBOM does not exist yet.
 */

import { describe, it, expect } from 'vitest';
import { calculateBOM } from './sizing';

// ---------------------------------------------------------------------------
// SIZE-02 — Rack Count
// ---------------------------------------------------------------------------
describe('SIZE-02: Rack Count', () => {
  it('ceil(10 servers / 3 per rack) = 4 racks', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 3,
      connectivityType: '25G',
      cableType: 'DAC',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.racks).toBe(4);
  });

  it('ceil(100 / 20) = 5 racks', () => {
    const result = calculateBOM({
      totalServers: 100,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'AOC',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.racks).toBe(5);
  });

  it('ceil(48 / 48) = 1 rack (exact division)', () => {
    const result = calculateBOM({
      totalServers: 48,
      serversPerRack: 48,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.racks).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SIZE-03 — Leaf Count (always 2 × racks)
// ---------------------------------------------------------------------------
describe('SIZE-03: Leaf Count', () => {
  it('2 racks → 4 leafs', () => {
    const result = calculateBOM({
      totalServers: 40,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.leafSwitches).toBe(4);
  });

  it('1 rack → 2 leafs', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.leafSwitches).toBe(2);
  });

  it('5 racks → 10 leafs', () => {
    const result = calculateBOM({
      totalServers: 100,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.leafSwitches).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// SIZE-04 — Spine Scaling
// ---------------------------------------------------------------------------
describe('SIZE-04: Spine Scaling', () => {
  it('2 leafs (1 rack) → 2 spines (minimum for redundancy)', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.spineSwitches).toBe(2);
  });

  it('40 leafs (20 racks) → 2 spines: max(2, ceil(40/32)) = max(2,2) = 2', () => {
    const result = calculateBOM({
      totalServers: 400,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.spineSwitches).toBe(2);
  });

  it('130 leafs (65 racks) → 5 spines: max(2, ceil(130/32)) = max(2,5) = 5', () => {
    const result = calculateBOM({
      totalServers: 1300,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.spineSwitches).toBe(5);
  });

  it('spine count is always at least 2 for redundancy', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.spineSwitches).toBeGreaterThanOrEqual(2);
  });

  it('SPINE_CAPACITY_EXCEEDED violation when leafSwitches > 32', () => {
    // 20 racks → 40 leafs > 32 → violation
    const result = calculateBOM({
      totalServers: 400,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    const violation = result.violations.find(v => v.code === 'SPINE_CAPACITY_EXCEEDED');
    expect(violation).toBeDefined();
    if (violation && violation.code === 'SPINE_CAPACITY_EXCEEDED') {
      expect(violation.leafCount).toBe(40);
      expect(violation.maxLeafs).toBe(32);
    }
  });

  it('no SPINE_CAPACITY_EXCEEDED violation when leafSwitches <= 32', () => {
    // 10 racks → 20 leafs ≤ 32 → no violation
    const result = calculateBOM({
      totalServers: 200,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    const violation = result.violations.find(v => v.code === 'SPINE_CAPACITY_EXCEEDED');
    expect(violation).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// SIZE-05 — OOB Switches
// ---------------------------------------------------------------------------
describe('SIZE-05: OOB Switches', () => {
  it('1 rack with 10 servers → 1 OOB switch (10+2=12, ceil(12/48)=1)', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 10,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.oobSwitches).toBe(1);
  });

  it('1 rack with 46 servers → 1 OOB switch (46+2=48, exactly at limit, NO violation)', () => {
    const result = calculateBOM({
      totalServers: 46,
      serversPerRack: 46,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.oobSwitches).toBe(1);
    const oobViolation = result.violations.find(v => v.code === 'OOB_PORT_SATURATION');
    expect(oobViolation).toBeUndefined();
  });

  it('1 rack with 47 servers → 2 OOB switches (47+2=49 > 48), WITH OOB_PORT_SATURATION violation', () => {
    const result = calculateBOM({
      totalServers: 47,
      serversPerRack: 47,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.oobSwitches).toBe(2);
    const oobViolation = result.violations.find(v => v.code === 'OOB_PORT_SATURATION');
    expect(oobViolation).toBeDefined();
    if (oobViolation && oobViolation.code === 'OOB_PORT_SATURATION') {
      expect(oobViolation.required).toBe(49);
      expect(oobViolation.available).toBe(48);
    }
  });

  it('3 racks with 20 servers each → 3 OOB switches', () => {
    const result = calculateBOM({
      totalServers: 60,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.oobSwitches).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// SIZE-06 — Pure Function
// ---------------------------------------------------------------------------
describe('SIZE-06: Pure Function', () => {
  it('same input called twice returns deeply equal output', () => {
    const input = {
      totalServers: 50,
      serversPerRack: 10,
      connectivityType: '25G' as const,
      cableType: 'fiber' as const,
      leafModel: 'S5248F-ON' as const,
      rackSize: '42U' as const,
    };
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
    const result = calculateBOM({
      totalServers: 20,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    // 1 rack → 2 leafs → 2 spines (min) → 2 leafs × 2 links = 4
    expect(result.leafSpineCables).toBe(4);
  });

  it('2 racks: 4 leafs × 2 spines = 8 leaf-spine cables', () => {
    const result = calculateBOM({
      totalServers: 40,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    // 2 racks → 4 leafs → 2 spines → 4 × 2 = 8
    expect(result.leafSpineCables).toBe(8);
  });

  it('4 racks: 8 leafs × 2 spines = 16 leaf-spine cables', () => {
    const result = calculateBOM({
      totalServers: 80,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    // 4 racks → 8 leafs → 2 spines → 8 × 2 = 16
    expect(result.leafSpineCables).toBe(16);
  });

  it('serverLeafCables = totalServers (one cable per server)', () => {
    const result = calculateBOM({
      totalServers: 48,
      serversPerRack: 12,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.serverLeafCables).toBe(48);
  });

  it('serverOobCables = totalServers + leafSwitches', () => {
    const result = calculateBOM({
      totalServers: 48,
      serversPerRack: 12,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    // 4 racks → 8 leafs; serverOobCables = 48 + 8 = 56
    expect(result.serverOobCables).toBe(56);
  });
});

// ---------------------------------------------------------------------------
// Oversubscription Ratio
// ---------------------------------------------------------------------------
describe('Oversubscription Ratio', () => {
  it('48 servers at 25G with 2 spines: (48×25) / (2×100) = 6.0', () => {
    // 1 rack of 48 servers → 2 leafs → 2 spines (minimum)
    const result = calculateBOM({
      totalServers: 48,
      serversPerRack: 48,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.oversubscriptionRatio).toBeCloseTo(6.0);
  });

  it('10 servers at 25G with 2 spines: (10×25) / (2×100) = 1.25', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 10,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.oversubscriptionRatio).toBeCloseTo(1.25);
  });

  it('oversubscriptionRatio is present in every BOM result', () => {
    const result = calculateBOM({
      totalServers: 100,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(result.oversubscriptionRatio).toBeDefined();
    expect(typeof result.oversubscriptionRatio).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// DAC Distance Advisory
// ---------------------------------------------------------------------------
describe('DAC Distance Advisory', () => {
  it('DAC cable type with racks > 8 → DAC_DISTANCE_ADVISORY violation', () => {
    const result = calculateBOM({
      totalServers: 90,
      serversPerRack: 10,
      connectivityType: '25G',
      cableType: 'DAC',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    // 9 racks > 8 → violation
    const violation = result.violations.find(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(violation).toBeDefined();
    if (violation && violation.code === 'DAC_DISTANCE_ADVISORY') {
      expect(violation.rackCount).toBe(9);
      expect(violation.cableType).toBe('DAC');
    }
  });

  it('DAC cable type with racks <= 8 → no DAC_DISTANCE_ADVISORY', () => {
    const result = calculateBOM({
      totalServers: 80,
      serversPerRack: 10,
      connectivityType: '25G',
      cableType: 'DAC',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    // 8 racks ≤ 8 → no violation
    const violation = result.violations.find(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(violation).toBeUndefined();
  });

  it('AOC cable type with racks > 8 → no DAC_DISTANCE_ADVISORY (only DAC triggers it)', () => {
    const result = calculateBOM({
      totalServers: 90,
      serversPerRack: 10,
      connectivityType: '25G',
      cableType: 'AOC',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    const violation = result.violations.find(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(violation).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Input echoed back on result
// ---------------------------------------------------------------------------
describe('Input in BOM', () => {
  it('BOM result includes the original input', () => {
    const input = {
      totalServers: 20,
      serversPerRack: 20,
      connectivityType: '25G' as const,
      cableType: 'fiber' as const,
      leafModel: 'S5248F-ON' as const,
      rackSize: '42U' as const,
    };
    const result = calculateBOM(input);
    expect(result.input).toEqual(input);
  });
});

// ---------------------------------------------------------------------------
// SFP Transceivers (fiber only)
// ---------------------------------------------------------------------------
describe('Transceivers (fiber only) and VLT', () => {
  it('fiber → sfp28Count = 2 × serverLeafCables, qsfp28Count = 2 × leafSpineCables', () => {
    const bom = calculateBOM({
      totalServers: 20,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    // 1 rack → 2 leafs → 2 spines → 4 leaf-spine cables (QSFP28), 20 server-leaf cables (SFP28)
    expect(bom.sfp28Count).toBe(40);   // 2 × 20
    expect(bom.qsfp28Count).toBe(8);   // 2 × 4
  });

  it('DAC → sfp28Count = 0, qsfp28Count = 0', () => {
    const bom = calculateBOM({
      totalServers: 20,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'DAC',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(bom.sfp28Count).toBe(0);
    expect(bom.qsfp28Count).toBe(0);
  });

  it('AOC → sfp28Count = 0, qsfp28Count = 0', () => {
    const bom = calculateBOM({
      totalServers: 20,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'AOC',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    expect(bom.sfp28Count).toBe(0);
    expect(bom.qsfp28Count).toBe(0);
  });

  it('VLT cables = 2 per leaf pair (QSFP28-DD)', () => {
    const bom = calculateBOM({
      totalServers: 60,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'DAC',
      leafModel: 'S5248F-ON',
      rackSize: '42U',
    });
    // 3 racks → 3 leaf pairs → 6 VLT cables
    expect(bom.vltCables).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// leafModel selection
// ---------------------------------------------------------------------------
describe('leafModel selection', () => {
  it('uses S5224F-ON when selected (3 racks → 6 leafs)', () => {
    const bom = calculateBOM({ totalServers: 48, serversPerRack: 16, connectivityType: '25G', cableType: 'DAC', leafModel: 'S5224F-ON', rackSize: '42U' })
    // S5224F-ON has uplinkPorts=4, same as S5248F-ON, so cable count is same
    // But oversubscription uses downlinkSpeedGbE=25 and the selected leaf's properties
    expect(bom.leafSwitches).toBe(6) // 3 racks * 2
  })

  it('uses S5212F-ON uplinkPorts (3) capped by spine count for cable calculations', () => {
    const bom = calculateBOM({ totalServers: 48, serversPerRack: 16, connectivityType: '25G', cableType: 'DAC', leafModel: 'S5212F-ON', rackSize: '42U' })
    // S5212F-ON has uplinkPorts=3, 2 spines → min(2,3)=2 links per leaf
    expect(bom.leafSpineCables).toBe(bom.leafSwitches * Math.min(bom.spineSwitches, 3))
  })
})

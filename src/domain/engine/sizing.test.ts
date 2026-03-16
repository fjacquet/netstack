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
    });
    expect(result.racks).toBe(4);
  });

  it('ceil(100 / 20) = 5 racks', () => {
    const result = calculateBOM({
      totalServers: 100,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'AOC',
    });
    expect(result.racks).toBe(5);
  });

  it('ceil(48 / 48) = 1 rack (exact division)', () => {
    const result = calculateBOM({
      totalServers: 48,
      serversPerRack: 48,
      connectivityType: '25G',
      cableType: 'fiber',
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
    });
    expect(result.leafSwitches).toBe(4);
  });

  it('1 rack → 2 leafs', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.leafSwitches).toBe(2);
  });

  it('5 racks → 10 leafs', () => {
    const result = calculateBOM({
      totalServers: 100,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.leafSwitches).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// SIZE-04 — Spine Scaling
// ---------------------------------------------------------------------------
describe('SIZE-04: Spine Scaling', () => {
  it('2 leafs (1 rack) → 4 spines (minimum = uplinkPorts = 4)', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.spineSwitches).toBe(4);
  });

  it('40 leafs (20 racks) → 4 spines: max(4, ceil(40/32)) = max(4,2) = 4', () => {
    const result = calculateBOM({
      totalServers: 400,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.spineSwitches).toBe(4);
  });

  it('130 leafs (65 racks) → 5 spines: max(4, ceil(130/32)) = max(4,5) = 5', () => {
    const result = calculateBOM({
      totalServers: 1300,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.spineSwitches).toBe(5);
  });

  it('spine count is NEVER 2 — explicit 20-rack test', () => {
    const result = calculateBOM({
      totalServers: 400,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.spineSwitches).not.toBe(2);
    expect(result.spineSwitches).toBeGreaterThanOrEqual(4);
  });

  it('SPINE_CAPACITY_EXCEEDED violation when leafSwitches > 32', () => {
    // 20 racks → 40 leafs > 32 → violation
    const result = calculateBOM({
      totalServers: 400,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
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
    });
    expect(result.oobSwitches).toBe(1);
  });

  it('1 rack with 46 servers → 1 OOB switch (46+2=48, exactly at limit, NO violation)', () => {
    const result = calculateBOM({
      totalServers: 46,
      serversPerRack: 46,
      connectivityType: '25G',
      cableType: 'fiber',
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
  it('1 rack: 2 leafs × 4 uplinks = 8 leaf-spine cables', () => {
    const result = calculateBOM({
      totalServers: 20,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.leafSpineCables).toBe(8);
  });

  it('2 racks: 4 leafs × 4 uplinks = 16 leaf-spine cables', () => {
    const result = calculateBOM({
      totalServers: 40,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.leafSpineCables).toBe(16);
  });

  it('4 racks: 8 leafs × 4 uplinks = 32 leaf-spine cables', () => {
    const result = calculateBOM({
      totalServers: 80,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.leafSpineCables).toBe(32);
  });

  it('serverLeafCables = totalServers (one cable per server)', () => {
    const result = calculateBOM({
      totalServers: 48,
      serversPerRack: 12,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.serverLeafCables).toBe(48);
  });

  it('serverOobCables = totalServers + leafSwitches', () => {
    const result = calculateBOM({
      totalServers: 48,
      serversPerRack: 12,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    // 4 racks → 8 leafs; serverOobCables = 48 + 8 = 56
    expect(result.serverOobCables).toBe(56);
  });
});

// ---------------------------------------------------------------------------
// Oversubscription Ratio
// ---------------------------------------------------------------------------
describe('Oversubscription Ratio', () => {
  it('48 servers at 25G with 4 spines: (48×25) / (4×100) = 3.0', () => {
    // 1 rack of 48 servers → 2 leafs → 4 spines
    const result = calculateBOM({
      totalServers: 48,
      serversPerRack: 48,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.oversubscriptionRatio).toBeCloseTo(3.0);
  });

  it('10 servers at 25G with 4 spines: (10×25) / (4×100) = 0.625', () => {
    const result = calculateBOM({
      totalServers: 10,
      serversPerRack: 10,
      connectivityType: '25G',
      cableType: 'fiber',
    });
    expect(result.oversubscriptionRatio).toBeCloseTo(0.625);
  });

  it('oversubscriptionRatio is present in every BOM result', () => {
    const result = calculateBOM({
      totalServers: 100,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'fiber',
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
    };
    const result = calculateBOM(input);
    expect(result.input).toEqual(input);
  });
});

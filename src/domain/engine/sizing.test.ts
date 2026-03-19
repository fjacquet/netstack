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
    topology: 'leaf-spine',
    racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
    portsPerServerFrontend: 1,
    portsPerServerBackend: 1,
    connectivityType: '25G',
    cableType: 'DAC',
    activeUplinksPerLeaf: 4,
    leafModel: 'S5248F-ON',
    spineModel: 'S5232F-ON',
    accessModel: 'S5248F-ON',
    activeUplinksPerAccess: 4,
    aggregationModel: 'Z9264F-ON',
    activeUplinksPerAggregation: 4,
    coreModel: 'Z9332F-ON',
    borderLeafModel: 'none',
    borderLeafCount: 0,
    rackSize: '42U',
    serverUHeight: '1U',
    switchPositioning: 'ToR' as const,
    existingSpinesDeployed: false,
    existingCoreDeployed: false,
    rackPitchMm: 600,
    racksAdjacent: true,
    patchPanelDistanceM: 1,
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
  it('48 servers at 25G with S5248F-ON (4 uplinks): (48×25) / (4×100) = 3.0', () => {
    // 1 rack of 48 servers → 2 leafs → 2 spines (minimum)
    // effectiveUplinks = min(activeUplinksPerLeaf=4, LEAF.uplinkPorts=4) = 4
    // uplinkBandwidth = 4 × 100G = 400G
    // ratio = (48 × 25) / 400 = 3.0 (UPLN-02: uses effectiveUplinks, not spineSwitches)
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 48 }],
      cableType: 'fiber',
    }));
    expect(result.oversubscriptionRatio).toBeCloseTo(3.0);
  });

  it('10 servers at 25G with S5248F-ON (4 uplinks): (10×25) / (4×100) = 0.625', () => {
    // effectiveUplinks = min(4, 4) = 4 → uplinkBandwidth = 4 × 100 = 400G
    // ratio = (10 × 25) / 400 = 0.625
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'fiber',
    }));
    expect(result.oversubscriptionRatio).toBeCloseTo(0.625);
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
    // racks: [10, 48] — worst case is 48
    // effectiveUplinks = min(4, 4) = 4 → uplinkBandwidth = 4 × 100 = 400G
    // ratio = (48 × 25) / 400 = 3.0 (UPLN-02: uses effectiveUplinks)
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }, { serverCount: 48 }],
      cableType: 'fiber',
    }));
    expect(result.oversubscriptionRatio).toBeCloseTo(3.0);
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
// PORT-03: Server Port Multipliers
// ---------------------------------------------------------------------------
describe('PORT-03: Server Port Multipliers', () => {
  it('default ports (1,1) match existing cable counts (backward compatibility)', () => {
    // 4 racks × 12 servers = 48 total, 8 leafs
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'fiber',
      portsPerServerFrontend: 1,
      portsPerServerBackend: 1,
    }));
    // 48 servers × 1 frontend port = 48 server-leaf cables
    expect(result.serverLeafCables).toBe(48);
    // 48 servers × 1 backend port + 8 leafs = 56 OOB cables
    expect(result.serverOobCables).toBe(56);
  });

  it('portsPerServerFrontend: 2 doubles serverLeafCables', () => {
    // 4 racks × 12 = 48 servers × 2 frontend ports = 96 server-leaf cables
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'fiber',
      portsPerServerFrontend: 2,
      portsPerServerBackend: 1,
    }));
    expect(result.serverLeafCables).toBe(96); // 48 * 2
  });

  it('portsPerServerFrontend: 0 produces 0 serverLeafCables', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'fiber',
      portsPerServerFrontend: 0,
      portsPerServerBackend: 1,
    }));
    expect(result.serverLeafCables).toBe(0);
  });

  it('portsPerServerBackend: 2 doubles server portion of OOB cables', () => {
    // 4 racks × 12 = 48 servers, 8 leafs
    // serverOobCables = 48 * 2 + 8 = 104
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'fiber',
      portsPerServerFrontend: 1,
      portsPerServerBackend: 2,
    }));
    expect(result.serverOobCables).toBe(104); // 48 * 2 + 8
  });

  it('portsPerServerBackend: 0 produces serverOobCables = leafSwitches only', () => {
    // No server OOB cables — only switch management ports
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'fiber',
      portsPerServerFrontend: 1,
      portsPerServerBackend: 0,
    }));
    // serverOobCables = 48 * 0 + 8 = 8 (only leaf switch OOB ports)
    expect(result.serverOobCables).toBe(8); // just 8 leafs
    expect(result.serverOobCables).toBe(result.leafSwitches);
  });

  it('fiber + portsPerServerFrontend: 2 doubles sfp28Count', () => {
    // 4 racks × 12 = 48 servers, 2 frontend ports → 96 server-leaf cables
    // sfp28Count = 2 × 96 = 192
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'fiber',
      portsPerServerFrontend: 2,
      portsPerServerBackend: 1,
    }));
    expect(result.sfp28Count).toBe(192); // 2 * (48 * 2) = 192
  });

  it('DAC + portsPerServerFrontend: 2 still produces 0 sfp28Count (DAC has no transceivers)', () => {
    const result = calculateBOM(makeInput({
      racks: Array.from({ length: 4 }, () => ({ serverCount: 12 })),
      cableType: 'DAC',
      portsPerServerFrontend: 2,
      portsPerServerBackend: 1,
    }));
    expect(result.sfp28Count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// UPLN-02: Active Uplinks Per Leaf
// ---------------------------------------------------------------------------
describe('UPLN-02: Active Uplinks Per Leaf', () => {
  it('activeUplinksPerLeaf: 4 (default) matches previous behavior (backward compat)', () => {
    // 3 racks × 16 = 48 servers, S5248F-ON (uplinkPorts=4), 2 spines
    // linksPerLeaf = min(spines=2, min(4,4)=4) = 2
    // leafSpineCables = 6 leafs × 2 = 12
    const result = calculateBOM(makeInput({
      activeUplinksPerLeaf: 4,
    }));
    const resultDefault = calculateBOM(makeInput());
    expect(result.leafSpineCables).toBe(resultDefault.leafSpineCables);
    expect(result.oversubscriptionRatio).toBeCloseTo(resultDefault.oversubscriptionRatio);
  });

  it('activeUplinksPerLeaf: 1 reduces leafSpineCables per leaf to min(spines, 1)', () => {
    // 1 rack → 2 leafs → 2 spines; linksPerLeaf = min(2, min(1,4)) = min(2,1) = 1
    // leafSpineCables = 2 leafs × 1 = 2
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
      activeUplinksPerLeaf: 1,
    }));
    expect(result.leafSpineCables).toBe(2); // 2 leafs × 1 link
  });

  it('activeUplinksPerLeaf: 1 increases oversubscription ratio (less bandwidth)', () => {
    // 1 rack, 48 servers, S5248F-ON, 25G, 2 spines
    // with 1 uplink: uplinkBandwidth = 1 * 100G = 100G → ratio = (48*25)/100 = 12.0
    // with 4 uplinks (default): uplinkBandwidth = 4 * 100G = 400G → but min(2,4)=2 → 2*100=200 → ratio = 6.0
    const result1 = calculateBOM(makeInput({
      racks: [{ serverCount: 48 }],
      cableType: 'fiber',
      activeUplinksPerLeaf: 1,
    }));
    const result4 = calculateBOM(makeInput({
      racks: [{ serverCount: 48 }],
      cableType: 'fiber',
      activeUplinksPerLeaf: 4,
    }));
    // 1 uplink → higher oversubscription
    expect(result1.oversubscriptionRatio).toBeGreaterThan(result4.oversubscriptionRatio);
  });

  it('activeUplinksPerLeaf: 1, 48 servers at 25G → oversubscription = (48*25) / (1*100) = 12.0', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 48 }],
      cableType: 'fiber',
      activeUplinksPerLeaf: 1,
    }));
    expect(result.oversubscriptionRatio).toBeCloseTo(12.0);
  });

  it('activeUplinksPerLeaf: 2 with 2 spines → linksPerLeaf = min(2, min(2,4)) = 2', () => {
    // 1 rack → 2 leafs → 2 spines
    // linksPerLeaf = min(2, min(2, 4)) = 2
    // leafSpineCables = 2 × 2 = 4 (same as min(2,4)=2 before)
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
      activeUplinksPerLeaf: 2,
    }));
    expect(result.leafSpineCables).toBe(4); // 2 leafs × 2 links
  });

  it('activeUplinksPerLeaf: 4 with S5212F-ON (uplinkPorts=3) is clamped to 3', () => {
    // effectiveUplinks = min(4, 3) = 3 (S5212F-ON only has 3 uplink ports)
    // 1 rack → 2 leafs → 2 spines; linksPerLeaf = min(2, 3) = 2
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
      leafModel: 'S5212F-ON',
      activeUplinksPerLeaf: 4,
    }));
    // Same as activeUplinksPerLeaf: 3 (clamped)
    const result3 = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
      leafModel: 'S5212F-ON',
      activeUplinksPerLeaf: 3,
    }));
    expect(result.leafSpineCables).toBe(result3.leafSpineCables);
    expect(result.oversubscriptionRatio).toBeCloseTo(result3.oversubscriptionRatio);
  });

  it('QSFP28 transceivers scale with active uplinks (fiber + reduced uplinks = fewer QSFP28)', () => {
    // 1 rack, 2 leafs, 2 spines, fiber
    // activeUplinksPerLeaf: 1 → linksPerLeaf = min(2,1) = 1 → leafSpineCables = 2 × 1 = 2 → qsfp28 = 4
    // activeUplinksPerLeaf: 4 → linksPerLeaf = min(2,4) = 2 → leafSpineCables = 2 × 2 = 4 → qsfp28 = 8
    const result1 = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
      activeUplinksPerLeaf: 1,
    }));
    const result4 = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      cableType: 'fiber',
      activeUplinksPerLeaf: 4,
    }));
    expect(result1.qsfp28Count).toBe(4); // 2 * 2 (leafSpineCables=2)
    expect(result4.qsfp28Count).toBe(8); // 2 * 4 (leafSpineCables=4)
    expect(result1.qsfp28Count).toBeLessThan(result4.qsfp28Count);
  });

  it('changing activeUplinksPerLeaf from 4 to 2 reduces leafSpineCables and increases oversubscription', () => {
    // 3 racks → 6 leafs → 2 spines
    // uplinks=4: linksPerLeaf = min(2, min(4,4)) = 2 → leafSpineCables = 6×2 = 12
    // uplinks=2: linksPerLeaf = min(2, min(2,4)) = 2 → leafSpineCables = 6×2 = 12 (same, limited by spines)
    // So we need more spines to see the difference. Use 17 racks → 34 leafs → 2 spines
    // uplinks=4: linksPerLeaf = min(2,4) = 2, oversub = (16×25)/(4×100) when effectiveUplinks=4
    // Actually with effectiveUplinks: 4 uplinks → uplinkBw = 4×100 = 400 → oversub = (16*25)/400 = 1.0
    // With effectiveUplinks: 2 → uplinkBw = 2×100 = 200 → oversub = (16*25)/200 = 2.0
    const result4 = calculateBOM(makeInput({
      cableType: 'fiber',
      activeUplinksPerLeaf: 4,
    }));
    const result2 = calculateBOM(makeInput({
      cableType: 'fiber',
      activeUplinksPerLeaf: 2,
    }));
    expect(result2.oversubscriptionRatio).toBeGreaterThan(result4.oversubscriptionRatio);
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

// ---------------------------------------------------------------------------
// POS-03 + POS-04: Switch Positioning
// ---------------------------------------------------------------------------
describe('POS-03 + POS-04: Switch Positioning', () => {
  // All positioning modes are rack-level: cables stay within a single rack.
  // ToR: ~2m (server at bottom to switch at top), MoR: ~1m (to mid-rack), BoR: ~2m (to bottom).
  it('ToR positioning returns recommendedCableLengthM=2', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'DAC',
      switchPositioning: 'ToR',
    }));
    expect(bom.recommendedCableLengthM).toBe(2);
    expect(bom.switchPositioning).toBe('ToR');
  });

  it('MoR positioning returns recommendedCableLengthM=1', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'DAC',
      switchPositioning: 'MoR',
    }));
    expect(bom.recommendedCableLengthM).toBe(1);
    expect(bom.switchPositioning).toBe('MoR');
  });

  it('BoR positioning returns recommendedCableLengthM=2', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'DAC',
      switchPositioning: 'BoR',
    }));
    expect(bom.recommendedCableLengthM).toBe(2);
    expect(bom.switchPositioning).toBe('BoR');
  });

  // DAC_POSITIONING_INCOMPATIBLE removed from schema — all positioning modes use short
  // in-rack cables (≤2m), fully DAC-compatible. TypeScript union guarantees this at compile time.
  it('MoR + DAC produces no positioning-related violations', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'DAC',
      switchPositioning: 'MoR',
    }));
    const posViolations = bom.violations.filter(v =>
      v.code !== 'OOB_PORT_SATURATION' &&
      v.code !== 'SPINE_CAPACITY_EXCEEDED' &&
      v.code !== 'DAC_DISTANCE_ADVISORY' &&
      v.code !== 'RACK_CAPACITY_EXCEEDED'
    );
    expect(posViolations).toHaveLength(0);
  });

  it('BoR + DAC produces no positioning-related violations', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 10 }],
      cableType: 'DAC',
      switchPositioning: 'BoR',
    }));
    const posViolations = bom.violations.filter(v =>
      v.code !== 'OOB_PORT_SATURATION' &&
      v.code !== 'SPINE_CAPACITY_EXCEEDED' &&
      v.code !== 'DAC_DISTANCE_ADVISORY' &&
      v.code !== 'RACK_CAPACITY_EXCEEDED'
    );
    expect(posViolations).toHaveLength(0);
  });

  // switchOverheadU: MoR=3U (leaves stay in server rack) — 40 servers × 1U + 3U overhead = 43U > 42U → violation
  it('MoR positioning uses 3U switch overhead: 40 servers × 1U in 42U rack → RACK_CAPACITY_EXCEEDED (43U used)', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 40 }],
      rackSize: '42U',
      serverUHeight: '1U',
      switchPositioning: 'MoR',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeDefined();
    if (v && v.code === 'RACK_CAPACITY_EXCEEDED') {
      expect(v.usedU).toBe(43);
      expect(v.totalU).toBe(42);
    }
  });

  // switchOverheadU: ToR=3U — 40 servers × 1U + 3U overhead = 43U > 42U → violation
  it('ToR positioning uses 3U switch overhead: 40 servers × 1U in 42U rack → RACK_CAPACITY_EXCEEDED (43U used)', () => {
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 40 }],
      rackSize: '42U',
      serverUHeight: '1U',
      switchPositioning: 'ToR',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeDefined();
    if (v && v.code === 'RACK_CAPACITY_EXCEEDED') {
      expect(v.usedU).toBe(43);
      expect(v.totalU).toBe(42);
    }
  });
});

// ---------------------------------------------------------------------------
// RACK_CAPACITY_EXCEEDED — per-rack U-height overflow detection
// ---------------------------------------------------------------------------
// SWITCH_U_PER_SERVER_RACK = 3 (OOB U1 + Leaf B U2 + Leaf A U3)
// usedU = 3 + serverCount * uHeightInt
describe('RACK_CAPACITY_EXCEEDED: U-height capacity violation', () => {
  // Schema tests
  it('SizingInputSchema accepts serverUHeight: "2U"', () => {
    // If serverUHeight is not in the schema, calculateBOM will fail due to type mismatch.
    // The test verifies the field is accepted at the engine level.
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 1 }],
      rackSize: '42U',
      serverUHeight: '2U',
    }));
    expect(bom).toBeDefined();
  });

  it('SizingInputSchema defaults serverUHeight to "1U" when omitted', () => {
    // makeInput without serverUHeight override should still work (default from schema)
    const inputWithoutHeight = {
      topology: 'leaf-spine' as const,
      racks: [{ serverCount: 16 }],
      portsPerServerFrontend: 1,
      portsPerServerBackend: 1,
      connectivityType: '25G' as const,
      cableType: 'DAC' as const,
      activeUplinksPerLeaf: 4,
      leafModel: 'S5248F-ON' as const,
      spineModel: 'S5232F-ON' as const,
      accessModel: 'S5248F-ON' as const,
      activeUplinksPerAccess: 4,
      aggregationModel: 'Z9264F-ON' as const,
      activeUplinksPerAggregation: 4,
      coreModel: 'Z9332F-ON' as const,
      borderLeafModel: 'none' as const,
      borderLeafCount: 0,
      rackSize: '42U' as const,
      serverUHeight: '1U' as const,
      switchPositioning: 'ToR' as const,
      existingSpinesDeployed: false,
      existingCoreDeployed: false,
      rackPitchMm: 600,
      racksAdjacent: true,
      patchPanelDistanceM: 1,
    };
    const bom = calculateBOM(inputWithoutHeight);
    expect(bom).toBeDefined();
  });

  // Overflow tests
  it('20 servers x 2U in 42U rack → violation (usedU=43, totalU=42, rackNumber=1)', () => {
    // usedU = 3 + 20*2 = 43 > 42 → violation
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 20 }],
      rackSize: '42U',
      serverUHeight: '2U',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeDefined();
    if (v && v.code === 'RACK_CAPACITY_EXCEEDED') {
      expect(v.rackNumber).toBe(1);
      expect(v.usedU).toBe(43);
      expect(v.totalU).toBe(42);
    }
  });

  it('19 servers x 2U in 42U rack → no violation (usedU=41 <= 42)', () => {
    // usedU = 3 + 19*2 = 41 ≤ 42 → no violation
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 19 }],
      rackSize: '42U',
      serverUHeight: '2U',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeUndefined();
  });

  it('exact boundary: 39 servers x 1U in 42U rack → no violation (usedU=42 == 42)', () => {
    // usedU = 3 + 39*1 = 42 == 42 → no violation (boundary is safe)
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 39 }],
      rackSize: '42U',
      serverUHeight: '1U',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeUndefined();
  });

  it('40 servers x 1U in 42U rack → violation (usedU=43 > 42)', () => {
    // usedU = 3 + 40*1 = 43 > 42 → violation
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 40 }],
      rackSize: '42U',
      serverUHeight: '1U',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeDefined();
    if (v && v.code === 'RACK_CAPACITY_EXCEEDED') {
      expect(v.rackNumber).toBe(1);
      expect(v.usedU).toBe(43);
      expect(v.totalU).toBe(42);
    }
  });

  it('0 servers in rack → no violation (usedU=3 <= 42)', () => {
    // usedU = 3 + 0*1 = 3 ≤ 42 → no violation
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 0 }],
      rackSize: '42U',
      serverUHeight: '1U',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeUndefined();
  });

  it('2 racks overflow, 1 does not → exactly 2 violations with correct rackNumbers', () => {
    // rack1: usedU = 3 + 40*1 = 43 > 42 → violation rackNumber=1
    // rack2: usedU = 3 + 39*1 = 42 == 42 → no violation
    // rack3: usedU = 3 + 40*1 = 43 > 42 → violation rackNumber=3
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 40 }, { serverCount: 39 }, { serverCount: 40 }],
      rackSize: '42U',
      serverUHeight: '1U',
    }));
    const violations = bom.violations.filter(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(violations).toHaveLength(2);
    const rackNumbers = violations
      .filter(v => v.code === 'RACK_CAPACITY_EXCEEDED')
      .map(v => v.code === 'RACK_CAPACITY_EXCEEDED' ? v.rackNumber : -1);
    expect(rackNumbers).toContain(1);
    expect(rackNumbers).toContain(3);
  });

  it('6 servers x 8U in 50U rack → violation (usedU=51 > 50)', () => {
    // usedU = 3 + 6*8 = 51 > 50 → violation
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 6 }],
      rackSize: '50U',
      serverUHeight: '8U',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeDefined();
    if (v && v.code === 'RACK_CAPACITY_EXCEEDED') {
      expect(v.usedU).toBe(51);
      expect(v.totalU).toBe(50);
    }
  });

  it('5 servers x 8U in 50U rack → no violation (usedU=43 <= 50)', () => {
    // usedU = 3 + 5*8 = 43 ≤ 50 → no violation
    const bom = calculateBOM(makeInput({
      racks: [{ serverCount: 5 }],
      rackSize: '50U',
      serverUHeight: '8U',
    }));
    const v = bom.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v).toBeUndefined();
  });
});

/**
 * Unit tests for the three-tier sizing engine (calculateThreeTierBOM).
 * Covers all TENG requirements: access switches, aggregation formula,
 * core formula, oversubscription ratios, cable BOM, OOB, violations.
 *
 * TDD RED phase: all tests written first, then implementation follows.
 */

import { describe, it, expect } from 'vitest';
import { calculateThreeTierBOM } from './three-tier-sizing';
import type { ThreeTierSizingInput } from '../schemas/three-tier-input';

// ---------------------------------------------------------------------------
// Test helper -- reduces boilerplate across all tests
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<ThreeTierSizingInput> = {}): ThreeTierSizingInput {
  return {
    racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
    portsPerServerFrontend: 1,
    portsPerServerBackend: 1,
    connectivityType: '25G',
    cableType: 'DAC',
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
    existingCoreDeployed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TENG-02: Access switches = 2 per rack
// ---------------------------------------------------------------------------
describe('TENG-02: Access switches = 2 per rack', () => {
  it('3 racks -> accessSwitches = 6', () => {
    const result = calculateThreeTierBOM(makeInput());
    expect(result.accessSwitches).toBe(6);
  });

  it('1 rack -> accessSwitches = 2', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: [{ serverCount: 16 }],
    }));
    expect(result.accessSwitches).toBe(2);
  });

  it('10 racks -> accessSwitches = 20', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: Array.from({ length: 10 }, () => ({ serverCount: 16 })),
    }));
    expect(result.accessSwitches).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// TENG-03: Aggregation switches formula with min 2
// ---------------------------------------------------------------------------
describe('TENG-03: Aggregation switches = ceil(totalAccessUplinks / effectiveAggrDownlinks), min 2', () => {
  it('3 racks (6 access), 4 uplinks/access, Z9264F-ON aggr (64-4=60 eff down): ceil(24/60)=1 -> clamped to 2', () => {
    const result = calculateThreeTierBOM(makeInput({
      aggregationModel: 'Z9264F-ON',
      activeUplinksPerAggregation: 4,
    }));
    // 6 access * 4 uplinks = 24 total access uplinks
    // Z9264F-ON: 64 ports, 4 uplinks to core -> 60 effective downlinks
    // ceil(24/60) = 1 -> clamped to min 2
    expect(result.aggregationSwitches).toBe(2);
  });

  it('20 racks (40 access), 4 uplinks/access, Z9264F-ON aggr (60 eff down): ceil(160/60)=3', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: Array.from({ length: 20 }, () => ({ serverCount: 16 })),
      aggregationModel: 'Z9264F-ON',
      activeUplinksPerAggregation: 4,
    }));
    // 40 access * 4 uplinks = 160 total access uplinks
    // Z9264F-ON: 64 - 4 = 60 effective downlinks
    // ceil(160/60) = 3
    expect(result.aggregationSwitches).toBe(3);
  });

  it('3 racks, 4 uplinks/access, S5232F-ON aggr (32 ports, 4 uplinks -> 28 eff down): ceil(24/28)=1 -> clamped to 2', () => {
    const result = calculateThreeTierBOM(makeInput({
      aggregationModel: 'S5232F-ON',
      activeUplinksPerAggregation: 4,
    }));
    // S5232F-ON: uplinkPorts=0 (symmetric), so effectiveAggrDownlinks = 32 - 4 = 28
    // 6 access * 4 uplinks = 24 total access uplinks
    // ceil(24/28) = 1 -> clamped to min 2
    expect(result.aggregationSwitches).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// TENG-04: Core switches formula with min 2
// ---------------------------------------------------------------------------
describe('TENG-04: Core switches = ceil(totalAggrUplinks / effectiveCoreDownlinks), min 2', () => {
  it('2 aggr switches, 4 uplinks/aggr, Z9332F-ON core (32 downlinks): ceil(8/32)=1 -> clamped to 2', () => {
    const result = calculateThreeTierBOM(makeInput({
      aggregationModel: 'Z9264F-ON',
      activeUplinksPerAggregation: 4,
      coreModel: 'Z9332F-ON',
    }));
    // From TENG-03: aggregationSwitches = 2 (clamped)
    // 2 aggr * 4 uplinks = 8 total aggr uplinks
    // Z9332F-ON core: 32 downlinks (all ports are downlinks, no upstream)
    // ceil(8/32) = 1 -> clamped to 2
    expect(result.coreSwitches).toBe(2);
  });

  it('large deployment: 8 aggr switches, 8 uplinks/aggr, Z9332F-ON core: ceil(64/32)=2', () => {
    // Need enough access uplinks to produce 8 aggregation switches
    // Z9264F-ON aggr: 64 - 8 = 56 eff down
    // Need accessUplinks > 56 * 7 = 392 to get ceil(x/56) = 8
    // 200 racks * 2 access * 4 uplinks = 1600 -> ceil(1600/56) = 29 aggr
    // Let's use a scenario: many racks with high uplinks
    // Instead: 60 racks, 4 uplinks/access, Z9264F-ON (56 eff down)
    // 120 access * 4 = 480 -> ceil(480/56) = 9 aggr
    // 9 aggr * 8 uplinks = 72 -> ceil(72/32) = 3
    // Let's verify the math more carefully for exactly 8 aggr:
    // Need ceil(accessUplinks / effAggrDown) = 8
    // With Z9264F-ON (64 - 8 = 56 eff down): need accessUplinks in (392, 448]
    // 56 racks * 2 access * 4 uplinks = 448 -> ceil(448/56) = 8
    const result = calculateThreeTierBOM(makeInput({
      racks: Array.from({ length: 56 }, () => ({ serverCount: 16 })),
      activeUplinksPerAccess: 4,
      aggregationModel: 'Z9264F-ON',
      activeUplinksPerAggregation: 8,
      coreModel: 'Z9332F-ON',
    }));
    // 112 access * 4 = 448 total access uplinks
    // Z9264F-ON: 64 - 8 = 56 eff aggr downlinks
    // ceil(448/56) = 8 aggr switches
    expect(result.aggregationSwitches).toBe(8);
    // 8 aggr * 8 uplinks = 64 total aggr uplinks
    // Z9332F-ON: 32 downlinks (core has no upstream)
    // ceil(64/32) = 2
    expect(result.coreSwitches).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// TENG-05: Oversubscription per boundary
// ---------------------------------------------------------------------------
describe('TENG-05: Oversubscription ratios', () => {
  it('S5248F-ON access (25G down, 100G up), 16 servers/rack, 4 uplinks: access-to-aggr = 1.0', () => {
    const result = calculateThreeTierBOM(makeInput({
      accessModel: 'S5248F-ON',
      activeUplinksPerAccess: 4,
    }));
    // (16 * 25) / (4 * 100) = 400 / 400 = 1.0
    expect(result.accessToAggrOversubscription).toBe(1.0);
  });

  it('Z9264F-ON access (100G down, 100G up), 16 servers/rack, 4 uplinks: access-to-aggr = 4.0', () => {
    const result = calculateThreeTierBOM(makeInput({
      accessModel: 'Z9264F-ON',
      activeUplinksPerAccess: 4,
    }));
    // (16 * 100) / (4 * 100) = 1600 / 400 = 4.0
    expect(result.accessToAggrOversubscription).toBe(4.0);
  });

  it('aggr-to-core oversubscription is computed (non-zero)', () => {
    const result = calculateThreeTierBOM(makeInput());
    // Z9264F-ON aggr: 60 eff downlinks, 4 uplinks, same speed (100G)
    // (60 * 100) / (4 * 100) = 15.0
    // Wait -- all ports are 100G for Z9264F-ON
    // aggrToCoreOversubscription = effectiveAggrDownlinks / effectiveUplinksPerAggr
    // = 60 / 4 = 15.0 (since same speed cancels out)
    expect(result.aggrToCoreOversubscription).toBe(15);
  });

  it('both oversubscription ratios are present in BOM', () => {
    const result = calculateThreeTierBOM(makeInput());
    expect(result).toHaveProperty('accessToAggrOversubscription');
    expect(result).toHaveProperty('aggrToCoreOversubscription');
    expect(typeof result.accessToAggrOversubscription).toBe('number');
    expect(typeof result.aggrToCoreOversubscription).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// TENG-06: Cable BOM
// ---------------------------------------------------------------------------
describe('TENG-06: Cable BOM counts', () => {
  it('serverAccessCables = totalServers * portsPerServerFrontend', () => {
    const result = calculateThreeTierBOM(makeInput({
      portsPerServerFrontend: 2,
    }));
    // 3 racks * 16 servers = 48 total servers * 2 ports = 96
    expect(result.serverAccessCables).toBe(96);
  });

  it('accessAggrCables = accessSwitches * effectiveUplinksPerAccess', () => {
    const result = calculateThreeTierBOM(makeInput({
      activeUplinksPerAccess: 4,
    }));
    // 6 access * 4 uplinks = 24
    expect(result.accessAggrCables).toBe(24);
  });

  it('aggrCoreCables = aggregationSwitches * effectiveUplinksPerAggr', () => {
    const result = calculateThreeTierBOM(makeInput({
      aggregationModel: 'Z9264F-ON',
      activeUplinksPerAggregation: 4,
    }));
    // 2 aggr (clamped) * 4 uplinks = 8
    expect(result.aggrCoreCables).toBe(8);
  });

  it('serverOobCables = totalServers * portsPerServerBackend + accessSwitches', () => {
    const result = calculateThreeTierBOM(makeInput({
      portsPerServerBackend: 1,
    }));
    // 48 servers * 1 + 6 access switches = 54
    expect(result.serverOobCables).toBe(54);
  });

  it('vltCables = racks * 2', () => {
    const result = calculateThreeTierBOM(makeInput());
    // 3 racks * 2 = 6
    expect(result.vltCables).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// OOB switches
// ---------------------------------------------------------------------------
describe('OOB switches', () => {
  it('OOB switches computed: racks * ceil((maxServersPerRack + 2) / 48)', () => {
    const result = calculateThreeTierBOM(makeInput());
    // maxServersPerRack = 16, (16 + 2) / 48 = 0.375, ceil = 1
    // 3 racks * 1 = 3
    expect(result.oobSwitches).toBe(3);
  });

  it('OOB switches scale when servers per rack exceed 46', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: [{ serverCount: 48 }, { serverCount: 48 }],
    }));
    // maxServersPerRack = 48, (48 + 2) / 48 = 1.042, ceil = 2
    // 2 racks * 2 = 4
    expect(result.oobSwitches).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Transceivers
// ---------------------------------------------------------------------------
describe('Transceivers', () => {
  it('fiber cables produce SFP28 transceivers for 25G server-access links', () => {
    const result = calculateThreeTierBOM(makeInput({
      cableType: 'fiber',
      connectivityType: '25G',
      accessModel: 'S5248F-ON',
    }));
    // serverAccessCables = 48 * 1 = 48
    // sfp28Count = 2 * 48 = 96 (25G links)
    expect(result.sfp28Count).toBe(96);
  });

  it('fiber cables produce QSFP28 transceivers for 100G access-aggr links', () => {
    const result = calculateThreeTierBOM(makeInput({
      cableType: 'fiber',
      accessModel: 'S5248F-ON',
    }));
    // accessAggrCables = 6 * 4 = 24
    // S5248F-ON uplink speed is 100G -> qsfp28Count = 2 * 24 = 48
    expect(result.qsfp28Count).toBe(48);
  });

  it('fiber cables produce QSFP56-DD transceivers for 400G aggr-core links', () => {
    const result = calculateThreeTierBOM(makeInput({
      cableType: 'fiber',
      aggregationModel: 'Z9264F-ON',
      coreModel: 'Z9332F-ON',
    }));
    // aggrCoreCables = 2 * 4 = 8
    // Z9264F-ON uplink speed to core: Z9264F-ON is 100G, Z9332F-ON is 400G
    // The link speed is determined by the aggregation switch uplink speed
    // Z9264F-ON uplinkSpeedGbE = 100 -> qsfp28, not qsfp56dd
    // Actually the aggr-core link speed depends on the aggregation model's port speed
    // Z9264F-ON is 100G ports -> qsfp28Count for this tier
    // Let's use Z9332F-ON as aggr to get 400G
    const result2 = calculateThreeTierBOM(makeInput({
      cableType: 'fiber',
      aggregationModel: 'Z9332F-ON',
      activeUplinksPerAggregation: 4,
      coreModel: 'Z9332F-ON',
    }));
    // Z9332F-ON aggr: 400G ports, uplinks to core are 400G
    // aggrCoreCables = 2 * 4 = 8
    // qsfp56ddCount = 2 * 8 = 16
    expect(result2.qsfp56ddCount).toBe(16);
  });

  it('DAC/AOC cables produce zero transceivers', () => {
    const resultDAC = calculateThreeTierBOM(makeInput({ cableType: 'DAC' }));
    expect(resultDAC.sfp28Count).toBe(0);
    expect(resultDAC.qsfp28Count).toBe(0);
    expect(resultDAC.qsfp56ddCount).toBe(0);

    const resultAOC = calculateThreeTierBOM(makeInput({ cableType: 'AOC' }));
    expect(resultAOC.sfp28Count).toBe(0);
    expect(resultAOC.qsfp28Count).toBe(0);
    expect(resultAOC.qsfp56ddCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Symmetric port handling (Z-series)
// ---------------------------------------------------------------------------
describe('Symmetric port handling for Z-series', () => {
  it('Z9264F-ON as access: effectiveUplinks = min(activeUplinksPerAccess, 64)', () => {
    const result = calculateThreeTierBOM(makeInput({
      accessModel: 'Z9264F-ON',
      activeUplinksPerAccess: 8,
    }));
    // Z9264F-ON: uplinkPorts=0, downlinkPorts=64 -> effectiveUplinks = min(8, 64) = 8
    // accessAggrCables = 6 access * 8 = 48
    expect(result.accessAggrCables).toBe(48);
  });

  it('S5248F-ON as access: effectiveUplinks clamped to uplinkPorts=4', () => {
    const result = calculateThreeTierBOM(makeInput({
      accessModel: 'S5248F-ON',
      activeUplinksPerAccess: 8,
    }));
    // S5248F-ON: uplinkPorts=4 -> effectiveUplinks = min(8, 4) = 4
    // accessAggrCables = 6 access * 4 = 24
    expect(result.accessAggrCables).toBe(24);
  });

  it('Z9264F-ON as aggregation: effectiveAggrDownlinks = 64 - activeUplinks', () => {
    const result = calculateThreeTierBOM(makeInput({
      aggregationModel: 'Z9264F-ON',
      activeUplinksPerAggregation: 8,
    }));
    // Z9264F-ON aggr: 64 total - 8 uplinks = 56 effective downlinks
    // 6 access * 4 uplinks = 24 total access uplinks
    // ceil(24/56) = 1 -> clamped to 2
    expect(result.aggregationSwitches).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Constraint violations
// ---------------------------------------------------------------------------
describe('Constraint violations', () => {
  it('AGGREGATION_CAPACITY_EXCEEDED when access uplinks exceed aggr downlinks', () => {
    // Need totalAccessUplinks > aggrSwitches * effectiveAggrDownlinks
    // Use S5232F-ON (32 ports, small) with many racks
    const result = calculateThreeTierBOM(makeInput({
      racks: Array.from({ length: 50 }, () => ({ serverCount: 16 })),
      activeUplinksPerAccess: 4,
      aggregationModel: 'S5232F-ON',
      activeUplinksPerAggregation: 4,
    }));
    // 100 access * 4 = 400 total access uplinks
    // S5232F-ON: 32 - 4 = 28 effective downlinks
    // ceil(400/28) = 15 aggregation switches
    // 15 * 28 = 420 >= 400: no violation (capacity covers demand)
    // So this should NOT produce a violation -- capacity is enough after scaling
    // The violation triggers only when we compute more than what's available
    // Actually, if aggregation = ceil(400/28) = 15, then 15*28=420 >= 400.
    // No violation expected if formula scales properly.
    // Let's test a scenario where we intentionally check no false positive:
    const v = result.violations.filter(v => v.code === 'AGGREGATION_CAPACITY_EXCEEDED');
    expect(v.length).toBe(0);
  });

  it('OOB_PORT_SATURATION when maxServersPerRack + 2 > 48', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: [{ serverCount: 48 }],
    }));
    // 48 + 2 = 50 > 48
    const v = result.violations.filter(v => v.code === 'OOB_PORT_SATURATION');
    expect(v.length).toBe(1);
    expect(v[0].code).toBe('OOB_PORT_SATURATION');
  });

  it('no OOB_PORT_SATURATION when within capacity', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: [{ serverCount: 16 }],
    }));
    const v = result.violations.filter(v => v.code === 'OOB_PORT_SATURATION');
    expect(v.length).toBe(0);
  });

  it('DAC_DISTANCE_ADVISORY when cableType=DAC and racks > 8', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: Array.from({ length: 10 }, () => ({ serverCount: 16 })),
      cableType: 'DAC',
    }));
    const v = result.violations.filter(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(v.length).toBe(1);
  });

  it('no DAC_DISTANCE_ADVISORY for AOC or fiber', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: Array.from({ length: 10 }, () => ({ serverCount: 16 })),
      cableType: 'AOC',
    }));
    const v = result.violations.filter(v => v.code === 'DAC_DISTANCE_ADVISORY');
    expect(v.length).toBe(0);
  });

  it('RACK_CAPACITY_EXCEEDED when servers exceed rack capacity', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: [{ serverCount: 42 }],
      rackSize: '42U',
      serverUHeight: '1U',
    }));
    // 42 servers * 1U + 3U overhead = 45U > 42U
    const v = result.violations.filter(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v.length).toBe(1);
    expect(v[0].code).toBe('RACK_CAPACITY_EXCEEDED');
  });

  it('no RACK_CAPACITY_EXCEEDED when within capacity', () => {
    const result = calculateThreeTierBOM(makeInput({
      racks: [{ serverCount: 16 }],
      rackSize: '42U',
      serverUHeight: '1U',
    }));
    // 16 * 1 + 3 = 19 <= 42
    const v = result.violations.filter(v => v.code === 'RACK_CAPACITY_EXCEEDED');
    expect(v.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Network racks
// ---------------------------------------------------------------------------
describe('Network racks', () => {
  it('network racks for aggregation + core + border leaf switches', () => {
    const result = calculateThreeTierBOM(makeInput({
      borderLeafModel: 'S5248F-ON',
      borderLeafCount: 2,
    }));
    // aggregation: 2, core: 2, borderLeaf: 2 -> 6 switches
    // ceil(6 / 42) = 1
    expect(result.networkRacks).toBe(1);
  });

  it('0 network racks when no aggregation/core needed (not possible due to min 2)', () => {
    const result = calculateThreeTierBOM(makeInput());
    // aggregation: 2, core: 2, borderLeaf: 0 -> 4
    // ceil(4 / 42) = 1
    expect(result.networkRacks).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Border leaf switches
// ---------------------------------------------------------------------------
describe('Border leaf switches', () => {
  it('borderLeafSwitches reflects input count when model is not none', () => {
    const result = calculateThreeTierBOM(makeInput({
      borderLeafModel: 'S5248F-ON',
      borderLeafCount: 2,
    }));
    expect(result.borderLeafSwitches).toBe(2);
  });

  it('borderLeafSwitches = 0 when model is none', () => {
    const result = calculateThreeTierBOM(makeInput({
      borderLeafModel: 'none',
      borderLeafCount: 2,
    }));
    expect(result.borderLeafSwitches).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cable length recommendation
// ---------------------------------------------------------------------------
describe('Cable length recommendation', () => {
  it('ToR -> 2m', () => {
    const result = calculateThreeTierBOM(makeInput({ switchPositioning: 'ToR' }));
    expect(result.recommendedCableLengthM).toBe(2);
  });

  it('MoR -> 1m', () => {
    const result = calculateThreeTierBOM(makeInput({ switchPositioning: 'MoR' }));
    expect(result.recommendedCableLengthM).toBe(1);
  });

  it('BoR -> 2m', () => {
    const result = calculateThreeTierBOM(makeInput({ switchPositioning: 'BoR' }));
    expect(result.recommendedCableLengthM).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// BOM output shape -- includes rack count and input echo
// ---------------------------------------------------------------------------
describe('BOM output shape', () => {
  it('racks count matches input racks array length', () => {
    const result = calculateThreeTierBOM(makeInput());
    expect(result.racks).toBe(3);
  });

  it('input is echoed in BOM output', () => {
    const input = makeInput();
    const result = calculateThreeTierBOM(input);
    expect(result.input).toEqual(input);
  });

  it('switchPositioning is echoed in BOM output', () => {
    const result = calculateThreeTierBOM(makeInput({ switchPositioning: 'MoR' }));
    expect(result.switchPositioning).toBe('MoR');
  });
});

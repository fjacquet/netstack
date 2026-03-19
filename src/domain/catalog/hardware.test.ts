import { describe, it, expect } from 'vitest';
import { SWITCH_CATALOG } from './hardware';
import { CABLE_CATALOG } from './cables';

describe('SWITCH_CATALOG — model existence', () => {
  it('contains exactly 9 models', () => {
    const models = Object.keys(SWITCH_CATALOG);
    expect(models).toHaveLength(9);
    expect(models).toContain('S5248F-ON');
    expect(models).toContain('S5232F-ON');
    expect(models).toContain('S5224F-ON');
    expect(models).toContain('S5212F-ON');
    expect(models).toContain('S5296F-ON');
    expect(models).toContain('S3248T-ON');
    expect(models).toContain('Z9264F-ON');
    expect(models).toContain('Z9332F-ON');
    expect(models).toContain('Z9432F-ON');
  });
});

describe('SWITCH_CATALOG — S5248F-ON (leaf)', () => {
  it('has correct role', () => {
    expect(SWITCH_CATALOG['S5248F-ON'].role).toBe('leaf');
  });

  it('has 48 downlink ports at 25GbE', () => {
    expect(SWITCH_CATALOG['S5248F-ON'].downlinkPorts).toBe(48);
    expect(SWITCH_CATALOG['S5248F-ON'].downlinkSpeedGbE).toBe(25);
  });

  it('has 4 uplink ports at 100GbE', () => {
    expect(SWITCH_CATALOG['S5248F-ON'].uplinkPorts).toBe(4);
    expect(SWITCH_CATALOG['S5248F-ON'].uplinkSpeedGbE).toBe(100);
  });

  it('has max power 647W', () => {
    expect(SWITCH_CATALOG['S5248F-ON'].maxPowerW).toBe(647);
  });

  it('has tier access', () => {
    expect(SWITCH_CATALOG['S5248F-ON'].tier).toEqual(['access']);
  });
});

describe('SWITCH_CATALOG — S5232F-ON (spine)', () => {
  it('has correct role', () => {
    expect(SWITCH_CATALOG['S5232F-ON'].role).toBe('spine');
  });

  it('has 32 downlink ports at 100GbE', () => {
    expect(SWITCH_CATALOG['S5232F-ON'].downlinkPorts).toBe(32);
    expect(SWITCH_CATALOG['S5232F-ON'].downlinkSpeedGbE).toBe(100);
  });

  it('has 0 uplink ports (spine terminates)', () => {
    expect(SWITCH_CATALOG['S5232F-ON'].uplinkPorts).toBe(0);
  });

  it('has max power 635W', () => {
    expect(SWITCH_CATALOG['S5232F-ON'].maxPowerW).toBe(635);
  });

  it('has tier aggregation', () => {
    expect(SWITCH_CATALOG['S5232F-ON'].tier).toEqual(['aggregation']);
  });
});

describe('SWITCH_CATALOG — S5224F-ON (leaf)', () => {
  it('has correct role', () => {
    expect(SWITCH_CATALOG['S5224F-ON'].role).toBe('leaf');
  });

  it('has 24 downlink ports at 25GbE', () => {
    expect(SWITCH_CATALOG['S5224F-ON'].downlinkPorts).toBe(24);
    expect(SWITCH_CATALOG['S5224F-ON'].downlinkSpeedGbE).toBe(25);
  });

  it('has 4 uplink ports at 100GbE', () => {
    expect(SWITCH_CATALOG['S5224F-ON'].uplinkPorts).toBe(4);
    expect(SWITCH_CATALOG['S5224F-ON'].uplinkSpeedGbE).toBe(100);
  });

  it('has max power 455W', () => {
    expect(SWITCH_CATALOG['S5224F-ON'].maxPowerW).toBe(455);
  });

  it('has tier access', () => {
    expect(SWITCH_CATALOG['S5224F-ON'].tier).toEqual(['access']);
  });
});

describe('SWITCH_CATALOG — S5212F-ON (leaf)', () => {
  it('has correct role', () => {
    expect(SWITCH_CATALOG['S5212F-ON'].role).toBe('leaf');
  });

  it('has 12 downlink ports at 25GbE', () => {
    expect(SWITCH_CATALOG['S5212F-ON'].downlinkPorts).toBe(12);
    expect(SWITCH_CATALOG['S5212F-ON'].downlinkSpeedGbE).toBe(25);
  });

  it('has 3 uplink ports at 100GbE', () => {
    expect(SWITCH_CATALOG['S5212F-ON'].uplinkPorts).toBe(3);
    expect(SWITCH_CATALOG['S5212F-ON'].uplinkSpeedGbE).toBe(100);
  });

  it('has max power 304W', () => {
    expect(SWITCH_CATALOG['S5212F-ON'].maxPowerW).toBe(304);
  });

  it('has tier access', () => {
    expect(SWITCH_CATALOG['S5212F-ON'].tier).toEqual(['access']);
  });
});

describe('SWITCH_CATALOG — S5296F-ON (leaf)', () => {
  it('has correct role', () => {
    expect(SWITCH_CATALOG['S5296F-ON'].role).toBe('leaf');
  });

  it('has 96 downlink ports at 25GbE', () => {
    expect(SWITCH_CATALOG['S5296F-ON'].downlinkPorts).toBe(96);
    expect(SWITCH_CATALOG['S5296F-ON'].downlinkSpeedGbE).toBe(25);
  });

  it('has 8 uplink ports at 100GbE', () => {
    expect(SWITCH_CATALOG['S5296F-ON'].uplinkPorts).toBe(8);
    expect(SWITCH_CATALOG['S5296F-ON'].uplinkSpeedGbE).toBe(100);
  });

  it('has max power 893W', () => {
    expect(SWITCH_CATALOG['S5296F-ON'].maxPowerW).toBe(893);
  });

  it('has tier access', () => {
    expect(SWITCH_CATALOG['S5296F-ON'].tier).toEqual(['access']);
  });
});

describe('SWITCH_CATALOG — S3248T-ON (oob)', () => {
  it('has correct role', () => {
    expect(SWITCH_CATALOG['S3248T-ON'].role).toBe('oob');
  });

  it('has 48 downlink ports at 1GbE', () => {
    expect(SWITCH_CATALOG['S3248T-ON'].downlinkPorts).toBe(48);
    expect(SWITCH_CATALOG['S3248T-ON'].downlinkSpeedGbE).toBe(1);
  });

  it('has max power 550W', () => {
    expect(SWITCH_CATALOG['S3248T-ON'].maxPowerW).toBe(550);
  });

  it('has NO tier field (OOB only, not usable in 3-tier mode)', () => {
    expect(SWITCH_CATALOG['S3248T-ON']).not.toHaveProperty('tier');
  });
});

describe('SWITCH_CATALOG — Z9264F-ON (3-tier access/aggregation)', () => {
  const sw = SWITCH_CATALOG['Z9264F-ON'];

  it('has modelId Z9264F-ON', () => {
    expect(sw.modelId).toBe('Z9264F-ON');
  });

  it('has role leaf', () => {
    expect(sw.role).toBe('leaf');
  });

  it('has tier access and aggregation', () => {
    expect(sw.tier).toEqual(['access', 'aggregation']);
  });

  it('has 64 downlink ports at 100GbE', () => {
    expect(sw.downlinkPorts).toBe(64);
    expect(sw.downlinkSpeedGbE).toBe(100);
  });

  it('has 0 uplink ports (symmetric — split is logical)', () => {
    expect(sw.uplinkPorts).toBe(0);
  });

  it('has max power 750W', () => {
    expect(sw.maxPowerW).toBe(750);
  });

  it('has typical power 340W', () => {
    expect(sw.typicalPowerW).toBe(340);
  });

  it('has uHeight 2 (2U form factor)', () => {
    expect(sw.uHeight).toBe(2);
  });

  it('has switching capacity 12.8 Tbps', () => {
    expect(sw.switchingCapacityTbps).toBe(12.8);
  });
});

describe('SWITCH_CATALOG — Z9332F-ON (3-tier aggregation/core)', () => {
  const sw = SWITCH_CATALOG['Z9332F-ON'];

  it('has modelId Z9332F-ON', () => {
    expect(sw.modelId).toBe('Z9332F-ON');
  });

  it('has role spine', () => {
    expect(sw.role).toBe('spine');
  });

  it('has tier aggregation and core', () => {
    expect(sw.tier).toEqual(['aggregation', 'core']);
  });

  it('has 32 downlink ports at 400GbE', () => {
    expect(sw.downlinkPorts).toBe(32);
    expect(sw.downlinkSpeedGbE).toBe(400);
  });

  it('has 0 uplink ports (symmetric — split is logical)', () => {
    expect(sw.uplinkPorts).toBe(0);
  });

  it('has max power 1500W', () => {
    expect(sw.maxPowerW).toBe(1500);
  });

  it('has typical power 900W', () => {
    expect(sw.typicalPowerW).toBe(900);
  });

  it('has uHeight 1 (1U form factor)', () => {
    expect(sw.uHeight).toBe(1);
  });

  it('has switching capacity 25.6 Tbps', () => {
    expect(sw.switchingCapacityTbps).toBe(25.6);
  });
});

describe('SWITCH_CATALOG — Z9432F-ON (3-tier aggregation/core)', () => {
  const sw = SWITCH_CATALOG['Z9432F-ON'];

  it('has modelId Z9432F-ON', () => {
    expect(sw.modelId).toBe('Z9432F-ON');
  });

  it('has role spine', () => {
    expect(sw.role).toBe('spine');
  });

  it('has tier aggregation and core', () => {
    expect(sw.tier).toEqual(['aggregation', 'core']);
  });

  it('has 32 downlink ports at 400GbE', () => {
    expect(sw.downlinkPorts).toBe(32);
    expect(sw.downlinkSpeedGbE).toBe(400);
  });

  it('has 0 uplink ports (symmetric — split is logical)', () => {
    expect(sw.uplinkPorts).toBe(0);
  });

  it('has max power 1404W', () => {
    expect(sw.maxPowerW).toBe(1404);
  });

  it('has typical power 900W', () => {
    expect(sw.typicalPowerW).toBe(900);
  });

  it('has uHeight 1 (1U form factor)', () => {
    expect(sw.uHeight).toBe(1);
  });

  it('has switching capacity 25.6 Tbps', () => {
    expect(sw.switchingCapacityTbps).toBe(25.6);
  });
});

describe('CABLE_CATALOG', () => {
  it('contains DAC with maxDistanceM 3 (conservative 25G limit for backwards compat)', () => {
    expect(CABLE_CATALOG['DAC']).toBeDefined();
    expect(CABLE_CATALOG['DAC'].maxDistanceM).toBe(3);
  });

  it('contains AOC with maxDistanceM 30', () => {
    expect(CABLE_CATALOG['AOC']).toBeDefined();
    expect(CABLE_CATALOG['AOC'].maxDistanceM).toBe(30);
  });

  it('contains fiber with maxDistanceM 10000', () => {
    expect(CABLE_CATALOG['fiber']).toBeDefined();
    expect(CABLE_CATALOG['fiber'].maxDistanceM).toBe(10000);
  });

  it('DAC supports 25G and 100G speeds', () => {
    expect(CABLE_CATALOG['DAC'].speedGbE).toContain(25);
    expect(CABLE_CATALOG['DAC'].speedGbE).toContain(100);
  });

  it('DAC has per-speed limit: 25G = 3m (IEEE 802.3by)', () => {
    expect((CABLE_CATALOG['DAC'] as { maxDistanceBySpeed?: Record<number, number> }).maxDistanceBySpeed?.[25]).toBe(3);
  });

  it('DAC has per-speed limit: 100G = 5m (IEEE 802.3bj)', () => {
    expect((CABLE_CATALOG['DAC'] as { maxDistanceBySpeed?: Record<number, number> }).maxDistanceBySpeed?.[100]).toBe(5);
  });
});

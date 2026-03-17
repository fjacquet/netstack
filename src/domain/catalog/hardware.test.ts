import { describe, it, expect } from 'vitest';
import { SWITCH_CATALOG } from './hardware';
import { CABLE_CATALOG } from './cables';

describe('SWITCH_CATALOG — model existence', () => {
  it('contains exactly 6 models', () => {
    const models = Object.keys(SWITCH_CATALOG);
    expect(models).toHaveLength(6);
    expect(models).toContain('S5248F-ON');
    expect(models).toContain('S5232F-ON');
    expect(models).toContain('S5224F-ON');
    expect(models).toContain('S5212F-ON');
    expect(models).toContain('S3248T-ON');
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
});

describe('CABLE_CATALOG', () => {
  it('contains DAC with maxDistanceM 5', () => {
    expect(CABLE_CATALOG['DAC']).toBeDefined();
    expect(CABLE_CATALOG['DAC'].maxDistanceM).toBe(5);
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
});

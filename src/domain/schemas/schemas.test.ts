import { describe, it, expect } from 'vitest';
import { SizingInputSchema } from './input';
import { ConstraintViolationSchema, NetworkBOMSchema } from './bom';
import { SwitchSpecSchema } from './catalog';

describe('SizingInputSchema — rejection of invalid inputs', () => {
  it('rejects totalServers: 0', () => {
    const result = SizingInputSchema.safeParse({
      totalServers: 0,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'DAC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects totalServers: -1', () => {
    const result = SizingInputSchema.safeParse({
      totalServers: -1,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'DAC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects serversPerRack: 0', () => {
    const result = SizingInputSchema.safeParse({
      totalServers: 100,
      serversPerRack: 0,
      connectivityType: '25G',
      cableType: 'DAC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer totalServers (e.g., 10.5)', () => {
    const result = SizingInputSchema.safeParse({
      totalServers: 10.5,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'DAC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid connectivityType (e.g., 50G)', () => {
    const result = SizingInputSchema.safeParse({
      totalServers: 100,
      serversPerRack: 20,
      connectivityType: '50G',
      cableType: 'DAC',
    });
    expect(result.success).toBe(false);
  });
});

describe('SizingInputSchema — acceptance of valid inputs', () => {
  it('accepts valid input with 25G connectivity and DAC cable', () => {
    const result = SizingInputSchema.safeParse({
      totalServers: 100,
      serversPerRack: 20,
      connectivityType: '25G',
      cableType: 'DAC',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalServers).toBe(100);
      expect(result.data.serversPerRack).toBe(20);
      expect(result.data.connectivityType).toBe('25G');
      expect(result.data.cableType).toBe('DAC');
    }
  });

  it('accepts 100G connectivity with fiber cable', () => {
    const result = SizingInputSchema.safeParse({
      totalServers: 500,
      serversPerRack: 48,
      connectivityType: '100G',
      cableType: 'fiber',
    });
    expect(result.success).toBe(true);
  });

  it('accepts AOC cable type', () => {
    const result = SizingInputSchema.safeParse({
      totalServers: 50,
      serversPerRack: 10,
      connectivityType: '25G',
      cableType: 'AOC',
    });
    expect(result.success).toBe(true);
  });
});

describe('SizingInputSchema leafModel', () => {
  const baseInput = { totalServers: 48, serversPerRack: 16, connectivityType: '25G' as const, cableType: 'DAC' as const }

  it('accepts S5248F-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S5248F-ON' }).success).toBe(true)
  })
  it('accepts S5224F-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S5224F-ON' }).success).toBe(true)
  })
  it('accepts S5212F-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S5212F-ON' }).success).toBe(true)
  })
  it('rejects spine model S5232F-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S5232F-ON' }).success).toBe(false)
  })
  it('rejects OOB model S3248T-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S3248T-ON' }).success).toBe(false)
  })
  it('requires leafModel field', () => {
    expect(SizingInputSchema.safeParse(baseInput).success).toBe(false)
  })
})

describe('ConstraintViolationSchema — OOB_PORT_SATURATION variant', () => {
  it('accepts OOB_PORT_SATURATION with required and available fields', () => {
    const result = ConstraintViolationSchema.safeParse({
      code: 'OOB_PORT_SATURATION',
      required: 50,
      available: 48,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('OOB_PORT_SATURATION');
    }
  });

  it('rejects OOB_PORT_SATURATION with missing required field', () => {
    const result = ConstraintViolationSchema.safeParse({
      code: 'OOB_PORT_SATURATION',
      available: 48,
    });
    expect(result.success).toBe(false);
  });
});

describe('ConstraintViolationSchema — SPINE_CAPACITY_EXCEEDED variant', () => {
  it('accepts SPINE_CAPACITY_EXCEEDED with leafCount and maxLeafs fields', () => {
    const result = ConstraintViolationSchema.safeParse({
      code: 'SPINE_CAPACITY_EXCEEDED',
      leafCount: 36,
      maxLeafs: 32,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('SPINE_CAPACITY_EXCEEDED');
    }
  });
});

describe('ConstraintViolationSchema — DAC_DISTANCE_ADVISORY variant', () => {
  it('accepts DAC_DISTANCE_ADVISORY with rackCount and cableType fields', () => {
    const result = ConstraintViolationSchema.safeParse({
      code: 'DAC_DISTANCE_ADVISORY',
      rackCount: 10,
      cableType: 'DAC',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('DAC_DISTANCE_ADVISORY');
    }
  });

  it('rejects DAC_DISTANCE_ADVISORY with wrong cableType', () => {
    const result = ConstraintViolationSchema.safeParse({
      code: 'DAC_DISTANCE_ADVISORY',
      rackCount: 10,
      cableType: 'fiber',
    });
    expect(result.success).toBe(false);
  });
});

describe('NetworkBOMSchema — acceptance of complete valid BOM', () => {
  it('accepts a complete valid BOM object', () => {
    const validBOM = {
      racks: 5,
      leafSwitches: 10,
      spineSwitches: 4,
      oobSwitches: 5,
      leafSpineCables: 40,
      serverLeafCables: 100,
      serverOobCables: 110,
      oversubscriptionRatio: 3.0,
      violations: [],
      input: {
        totalServers: 100,
        serversPerRack: 20,
        connectivityType: '25G',
        cableType: 'DAC',
        leafModel: 'S5248F-ON',
      },
    };
    const result = NetworkBOMSchema.safeParse(validBOM);
    expect(result.success).toBe(true);
  });

  it('accepts a BOM with constraint violations', () => {
    const bomWithViolations = {
      racks: 10,
      leafSwitches: 20,
      spineSwitches: 4,
      oobSwitches: 10,
      leafSpineCables: 80,
      serverLeafCables: 470,
      serverOobCables: 490,
      oversubscriptionRatio: 5.875,
      violations: [
        { code: 'DAC_DISTANCE_ADVISORY', rackCount: 10, cableType: 'DAC' },
      ],
      input: {
        totalServers: 470,
        serversPerRack: 47,
        connectivityType: '25G',
        cableType: 'DAC',
        leafModel: 'S5248F-ON',
      },
    };
    const result = NetworkBOMSchema.safeParse(bomWithViolations);
    expect(result.success).toBe(true);
  });
});

describe('SwitchSpecSchema — runtime catalog validation', () => {
  it('validates a correct switch spec entry', () => {
    const result = SwitchSpecSchema.safeParse({
      modelId: 'S5248F-ON',
      role: 'leaf',
      downlinkPorts: 48,
      downlinkSpeedGbE: 25,
      uplinkPorts: 4,
      uplinkSpeedGbE: 100,
      maxPowerW: 647,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a switch spec with missing downlinkPorts', () => {
    const result = SwitchSpecSchema.safeParse({
      modelId: 'S5248F-ON',
      role: 'leaf',
      downlinkSpeedGbE: 25,
      uplinkPorts: 4,
      maxPowerW: 647,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a switch spec with invalid role', () => {
    const result = SwitchSpecSchema.safeParse({
      modelId: 'S5248F-ON',
      role: 'access',
      downlinkPorts: 48,
      downlinkSpeedGbE: 25,
      uplinkPorts: 4,
      maxPowerW: 647,
    });
    expect(result.success).toBe(false);
  });
});

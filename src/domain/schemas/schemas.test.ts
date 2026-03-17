import { describe, it, expect } from 'vitest';
import { SizingInputSchema } from './input';
import { ConstraintViolationSchema, NetworkBOMSchema } from './bom';
import { SwitchSpecSchema } from './catalog';

// Base valid input using racks array format
const baseInput = {
  racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
  connectivityType: '25G' as const,
  cableType: 'DAC' as const,
  leafModel: 'S5248F-ON' as const,
  spineModel: 'S5232F-ON' as const,
  borderLeafModel: 'none' as const,
  borderLeafCount: 0,
  rackSize: '42U' as const,
};

describe('SizingInputSchema — rejection of invalid inputs', () => {
  it('rejects empty racks array', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects serverCount: -1', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: [{ serverCount: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects serverCount: 501', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: [{ serverCount: 501 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer serverCount (e.g., 10.5)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: [{ serverCount: 10.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid connectivityType (e.g., 50G)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      connectivityType: '50G',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing racks field', () => {
    const { racks: _racks, ...noRacks } = baseInput;
    const result = SizingInputSchema.safeParse(noRacks);
    expect(result.success).toBe(false);
  });
});

describe('SizingInputSchema — acceptance of valid inputs', () => {
  it('accepts single rack with serverCount 10', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: [{ serverCount: 10 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.racks).toHaveLength(1);
      expect(result.data.racks[0].serverCount).toBe(10);
    }
  });

  it('accepts valid input with 25G connectivity and DAC cable', () => {
    const result = SizingInputSchema.safeParse({
      racks: [{ serverCount: 20 }, { serverCount: 20 }, { serverCount: 20 }, { serverCount: 20 }, { serverCount: 20 }],
      connectivityType: '25G',
      cableType: 'DAC',
      leafModel: 'S5248F-ON',
      spineModel: 'S5232F-ON',
      borderLeafModel: 'none',
      borderLeafCount: 0,
      rackSize: '42U',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.racks).toHaveLength(5);
      expect(result.data.connectivityType).toBe('25G');
      expect(result.data.cableType).toBe('DAC');
    }
  });

  it('accepts 100G connectivity with fiber cable', () => {
    const result = SizingInputSchema.safeParse({
      racks: Array.from({ length: 10 }, () => ({ serverCount: 48 })),
      connectivityType: '100G',
      cableType: 'fiber',
      leafModel: 'S5248F-ON',
      spineModel: 'S5232F-ON',
      borderLeafModel: 'none',
      borderLeafCount: 0,
      rackSize: '42U',
    });
    expect(result.success).toBe(true);
  });

  it('accepts AOC cable type', () => {
    const result = SizingInputSchema.safeParse({
      racks: [{ serverCount: 10 }, { serverCount: 10 }, { serverCount: 10 }, { serverCount: 10 }, { serverCount: 10 }],
      connectivityType: '25G',
      cableType: 'AOC',
      leafModel: 'S5248F-ON',
      spineModel: 'S5232F-ON',
      borderLeafModel: 'none',
      borderLeafCount: 0,
      rackSize: '42U',
    });
    expect(result.success).toBe(true);
  });

  it('accepts serverCount: 0 (empty rack is valid)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: [{ serverCount: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts serverCount: 500 (max)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: [{ serverCount: 500 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts racks array up to 200 elements', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: Array.from({ length: 200 }, () => ({ serverCount: 10 })),
    });
    expect(result.success).toBe(true);
  });

  it('rejects racks array with 201 elements (over max)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      racks: Array.from({ length: 201 }, () => ({ serverCount: 10 })),
    });
    expect(result.success).toBe(false);
  });
});

describe('SizingInputSchema leafModel', () => {
  it('accepts S5248F-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S5248F-ON' }).success).toBe(true);
  });
  it('accepts S5224F-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S5224F-ON' }).success).toBe(true);
  });
  it('accepts S5212F-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S5212F-ON' }).success).toBe(true);
  });
  it('rejects spine model S5232F-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S5232F-ON' }).success).toBe(false);
  });
  it('rejects OOB model S3248T-ON', () => {
    expect(SizingInputSchema.safeParse({ ...baseInput, leafModel: 'S3248T-ON' }).success).toBe(false);
  });
  it('requires leafModel field', () => {
    const { leafModel: _lm, ...noLeafModel } = baseInput;
    expect(SizingInputSchema.safeParse(noLeafModel).success).toBe(false);
  });
});

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
      networkRacks: 1,
      racks: 5,
      leafSwitches: 10,
      spineSwitches: 4,
      borderLeafSwitches: 0,
      oobSwitches: 5,
      leafSpineCables: 40,
      serverLeafCables: 100,
      serverOobCables: 110,
      sfp28Count: 0,
      qsfp28Count: 0,
      vltCables: 5,
      oversubscriptionRatio: 3.0,
      violations: [],
      input: {
        racks: [{ serverCount: 20 }, { serverCount: 20 }, { serverCount: 20 }, { serverCount: 20 }, { serverCount: 20 }],
        connectivityType: '25G',
        cableType: 'DAC',
        leafModel: 'S5248F-ON',
        spineModel: 'S5232F-ON',
        borderLeafModel: 'none',
        borderLeafCount: 0,
        rackSize: '42U',
      },
    };
    const result = NetworkBOMSchema.safeParse(validBOM);
    expect(result.success).toBe(true);
  });

  it('accepts a BOM with constraint violations', () => {
    const bomWithViolations = {
      networkRacks: 1,
      racks: 10,
      leafSwitches: 20,
      spineSwitches: 4,
      borderLeafSwitches: 0,
      oobSwitches: 10,
      leafSpineCables: 80,
      serverLeafCables: 470,
      serverOobCables: 490,
      sfp28Count: 0,
      qsfp28Count: 0,
      vltCables: 5,
      oversubscriptionRatio: 5.875,
      violations: [
        { code: 'DAC_DISTANCE_ADVISORY', rackCount: 10, cableType: 'DAC' },
      ],
      input: {
        racks: Array.from({ length: 10 }, () => ({ serverCount: 47 })),
        connectivityType: '25G',
        cableType: 'DAC',
        leafModel: 'S5248F-ON',
        spineModel: 'S5232F-ON',
        borderLeafModel: 'none',
        borderLeafCount: 0,
        rackSize: '42U',
      },
    };
    const result = NetworkBOMSchema.safeParse(bomWithViolations);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PORT-03: portsPerServerFrontend validation
// ---------------------------------------------------------------------------
describe('SizingInputSchema — portsPerServerFrontend validation', () => {
  it('accepts portsPerServerFrontend: 0 (minimum — zero ports means no data cables)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      portsPerServerFrontend: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts portsPerServerFrontend: 8 (maximum)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      portsPerServerFrontend: 8,
    });
    expect(result.success).toBe(true);
  });

  it('rejects portsPerServerFrontend: 9 (above max)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      portsPerServerFrontend: 9,
    });
    expect(result.success).toBe(false);
  });

  it('rejects portsPerServerFrontend: -1 (below min)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      portsPerServerFrontend: -1,
    });
    expect(result.success).toBe(false);
  });

  it('portsPerServerFrontend defaults to 1 when omitted', () => {
    const result = SizingInputSchema.safeParse({ ...baseInput });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.portsPerServerFrontend).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// PORT-03: portsPerServerBackend validation
// ---------------------------------------------------------------------------
describe('SizingInputSchema — portsPerServerBackend validation', () => {
  it('accepts portsPerServerBackend: 0 (minimum — zero OOB ports)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      portsPerServerBackend: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts portsPerServerBackend: 8 (maximum)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      portsPerServerBackend: 8,
    });
    expect(result.success).toBe(true);
  });

  it('rejects portsPerServerBackend: 9 (above max)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      portsPerServerBackend: 9,
    });
    expect(result.success).toBe(false);
  });

  it('rejects portsPerServerBackend: -1 (below min)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      portsPerServerBackend: -1,
    });
    expect(result.success).toBe(false);
  });

  it('portsPerServerBackend defaults to 1 when omitted', () => {
    const result = SizingInputSchema.safeParse({ ...baseInput });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.portsPerServerBackend).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// UPLN-02: activeUplinksPerLeaf validation
// ---------------------------------------------------------------------------
describe('SizingInputSchema — activeUplinksPerLeaf validation', () => {
  it('accepts activeUplinksPerLeaf: 1 (minimum)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      activeUplinksPerLeaf: 1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts activeUplinksPerLeaf: 8 (maximum)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      activeUplinksPerLeaf: 8,
    });
    expect(result.success).toBe(true);
  });

  it('rejects activeUplinksPerLeaf: 0 (below min)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      activeUplinksPerLeaf: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects activeUplinksPerLeaf: 9 (above max)', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      activeUplinksPerLeaf: 9,
    });
    expect(result.success).toBe(false);
  });

  it('activeUplinksPerLeaf defaults to 4 when omitted', () => {
    const result = SizingInputSchema.safeParse({ ...baseInput });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.activeUplinksPerLeaf).toBe(4);
    }
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

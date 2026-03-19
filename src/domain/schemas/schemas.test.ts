import { describe, it, expect } from 'vitest';
import { SizingInputSchema } from './input';
import { ConstraintViolationSchema, NetworkBOMSchema, AdvisorySchema } from './bom';
import { ThreeTierSizingInputSchema } from './three-tier-input';
import { ThreeTierBOMSchema } from './three-tier-bom';
import { ConvergedSizingInputSchema } from './converged-input';
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
      switchPositioning: 'ToR',
      recommendedCableLengthM: 2,
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
        switchPositioning: 'ToR',
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
      switchPositioning: 'ToR',
      recommendedCableLengthM: 2,
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
        switchPositioning: 'ToR',
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

// ---------------------------------------------------------------------------
// Phase 25 — Geometry fields on SizingInputSchema
// ---------------------------------------------------------------------------
describe('SizingInputSchema -- geometry fields', () => {
  it('defaults rackPitchMm=600, racksAdjacent=true, patchPanelDistanceM=1 when absent', () => {
    const result = SizingInputSchema.safeParse(baseInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rackPitchMm).toBe(600);
      expect(result.data.racksAdjacent).toBe(true);
      expect(result.data.patchPanelDistanceM).toBe(1);
    }
  });

  it('accepts custom geometry values', () => {
    const result = SizingInputSchema.safeParse({
      ...baseInput,
      rackPitchMm: 800,
      racksAdjacent: false,
      patchPanelDistanceM: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rackPitchMm).toBe(800);
      expect(result.data.racksAdjacent).toBe(false);
      expect(result.data.patchPanelDistanceM).toBe(5);
    }
  });

  it('rejects rackPitchMm below minimum (50 < 100)', () => {
    const result = SizingInputSchema.safeParse({ ...baseInput, rackPitchMm: 50 });
    expect(result.success).toBe(false);
  });

  it('rejects rackPitchMm above maximum (3000 > 2000)', () => {
    const result = SizingInputSchema.safeParse({ ...baseInput, rackPitchMm: 3000 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Phase 25 — Geometry fields on ThreeTierSizingInputSchema
// ---------------------------------------------------------------------------
const threeTierBase = {
  racks: [{ serverCount: 16 }, { serverCount: 16 }],
  connectivityType: '25G' as const,
  cableType: 'DAC' as const,
  accessModel: 'S5248F-ON' as const,
  aggregationModel: 'Z9264F-ON' as const,
  coreModel: 'Z9332F-ON' as const,
  borderLeafModel: 'none' as const,
  borderLeafCount: 0,
  rackSize: '42U' as const,
};

describe('ThreeTierSizingInputSchema -- geometry fields', () => {
  it('defaults rackPitchMm=600, racksAdjacent=true, patchPanelDistanceM=1 when absent', () => {
    const result = ThreeTierSizingInputSchema.safeParse(threeTierBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rackPitchMm).toBe(600);
      expect(result.data.racksAdjacent).toBe(true);
      expect(result.data.patchPanelDistanceM).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 25 — Geometry fields on ConvergedSizingInputSchema
// ---------------------------------------------------------------------------
const convergedBase = {
  racks: [{ serverCount: 16 }, { serverCount: 16 }],
  connectivityType: '25G' as const,
  cableType: 'DAC' as const,
  leafModel: 'S5248F-ON' as const,
  spineModel: 'S5232F-ON' as const,
  borderLeafModel: 'none' as const,
  borderLeafCount: 0,
  rackSize: '42U' as const,
  fcSwitchModel: 'G720' as const,
};

describe('ConvergedSizingInputSchema -- geometry fields', () => {
  it('defaults rackPitchMm=600, racksAdjacent=true, patchPanelDistanceM=1 when absent', () => {
    const result = ConvergedSizingInputSchema.safeParse(convergedBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rackPitchMm).toBe(600);
      expect(result.data.racksAdjacent).toBe(true);
      expect(result.data.patchPanelDistanceM).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 25 — AdvisorySchema and advisories[] on BOM schemas
// ---------------------------------------------------------------------------
describe('AdvisorySchema', () => {
  it('accepts PATCH_PANEL_RECOMMENDED with computedDistanceM and dacLimitM', () => {
    const result = AdvisorySchema.safeParse({
      code: 'PATCH_PANEL_RECOMMENDED',
      computedDistanceM: 4.2,
      dacLimitM: 3,
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown advisory code', () => {
    const result = AdvisorySchema.safeParse({
      code: 'UNKNOWN_ADVISORY',
      computedDistanceM: 1.0,
    });
    expect(result.success).toBe(false);
  });
});

describe('NetworkBOMSchema -- advisories field', () => {
  const baseBOM = {
    networkRacks: 1,
    racks: 3,
    leafSwitches: 6,
    spineSwitches: 2,
    borderLeafSwitches: 0,
    oobSwitches: 3,
    leafSpineCables: 24,
    serverLeafCables: 48,
    serverOobCables: 54,
    sfp28Count: 0,
    qsfp28Count: 0,
    vltCables: 3,
    oversubscriptionRatio: 3.0,
    switchPositioning: 'ToR' as const,
    recommendedCableLengthM: 2,
    violations: [],
    input: {
      racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
      connectivityType: '25G' as const,
      cableType: 'DAC' as const,
      leafModel: 'S5248F-ON' as const,
      spineModel: 'S5232F-ON' as const,
      borderLeafModel: 'none' as const,
      borderLeafCount: 0,
      rackSize: '42U' as const,
      switchPositioning: 'ToR' as const,
    },
  };

  it('accepts BOM with empty advisories array', () => {
    const result = NetworkBOMSchema.safeParse({ ...baseBOM, advisories: [] });
    expect(result.success).toBe(true);
  });

  it('accepts BOM with a valid PATCH_PANEL_RECOMMENDED advisory', () => {
    const result = NetworkBOMSchema.safeParse({
      ...baseBOM,
      advisories: [{ code: 'PATCH_PANEL_RECOMMENDED', computedDistanceM: 4.2, dacLimitM: 3 }],
    });
    expect(result.success).toBe(true);
  });

  it('defaults advisories to [] when absent', () => {
    const result = NetworkBOMSchema.safeParse(baseBOM);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.advisories).toEqual([]);
    }
  });
});

describe('ThreeTierBOMSchema -- advisories field', () => {
  const baseThreeTierBOM = {
    networkRacks: 1,
    racks: 2,
    accessSwitches: 4,
    aggregationSwitches: 2,
    coreSwitches: 2,
    oobSwitches: 2,
    borderLeafSwitches: 0,
    serverAccessCables: 32,
    accessAggrCables: 8,
    aggrCoreCables: 4,
    serverOobCables: 36,
    vltCables: 2,
    sfp28Count: 0,
    qsfp28Count: 0,
    qsfp56ddCount: 0,
    accessToAggrOversubscription: 2.0,
    aggrToCoreOversubscription: 1.0,
    switchPositioning: 'ToR' as const,
    recommendedCableLengthM: 2,
    violations: [],
    input: threeTierBase,
  };

  it('accepts ThreeTierBOM with empty advisories array', () => {
    const result = ThreeTierBOMSchema.safeParse({ ...baseThreeTierBOM, advisories: [] });
    expect(result.success).toBe(true);
  });

  it('defaults advisories to [] when absent', () => {
    const result = ThreeTierBOMSchema.safeParse(baseThreeTierBOM);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.advisories).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 25 — DAC_DISTANCE_ADVISORY computedDistanceM (optional field)
// ---------------------------------------------------------------------------
describe('ConstraintViolationSchema -- DAC_DISTANCE_ADVISORY computedDistanceM', () => {
  it('accepts DAC_DISTANCE_ADVISORY with optional computedDistanceM', () => {
    const result = ConstraintViolationSchema.safeParse({
      code: 'DAC_DISTANCE_ADVISORY',
      rackCount: 10,
      cableType: 'DAC',
      computedDistanceM: 6.5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts DAC_DISTANCE_ADVISORY without computedDistanceM', () => {
    const result = ConstraintViolationSchema.safeParse({
      code: 'DAC_DISTANCE_ADVISORY',
      rackCount: 10,
      cableType: 'DAC',
    });
    expect(result.success).toBe(true);
  });
});

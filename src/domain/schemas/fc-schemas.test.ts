/**
 * Zod schema tests for FC input and FC BOM.
 * These tests drive schema design — written before the schemas are implemented (TDD RED).
 *
 * Purpose: Validate that FCSizingInputSchema rejects invalid FC inputs (bad model, out-of-range ports)
 * and that FCNetworkBOMSchema enforces required computed fields like podLicensesRequired,
 * fanInRatio, and islOversubscriptionRatio.
 */

import { describe, it, expect } from 'vitest';
import { FCSizingInputSchema } from './fc-input';
import { FCNetworkBOMSchema, FCConstraintViolationSchema } from './fc-bom';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validInput = {
  racks: [{ serverCount: 10 }],
  hbaPortsPerServer: 2,
  storageTargetPorts: 4,
  storageArrayCount: 1,
  fcSwitchModel: 'G720',
  islPortsPerSwitch: 4,
  rackSize: '42U',
  serverUHeight: '1U',
};

const validBOM = {
  fabricASwitches: 2,
  fabricBSwitches: 2,
  hostPortsPerFabric: 20,
  storagePortsPerFabric: 2,
  islPortsPerFabric: 4,
  switchPortsPerFabric: 24,
  podLicensesRequired: 0,
  fcOpticsCount: 44,
  islCables: 4,
  fanInRatio: 10,
  islOversubscriptionRatio: 5,
  violations: [],
  input: validInput,
};

// ---------------------------------------------------------------------------
// FCSizingInputSchema tests
// ---------------------------------------------------------------------------

describe('FCSizingInputSchema', () => {
  it('parses a valid minimal input without error', () => {
    const result = FCSizingInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects hbaPortsPerServer: 0 (below min of 1)', () => {
    const result = FCSizingInputSchema.safeParse({ ...validInput, hbaPortsPerServer: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects hbaPortsPerServer: 9 (above max of 8)', () => {
    const result = FCSizingInputSchema.safeParse({ ...validInput, hbaPortsPerServer: 9 });
    expect(result.success).toBe(false);
  });

  it('rejects fcSwitchModel: INVALID_MODEL', () => {
    const result = FCSizingInputSchema.safeParse({ ...validInput, fcSwitchModel: 'INVALID_MODEL' });
    expect(result.success).toBe(false);
  });

  it('rejects empty racks array', () => {
    const result = FCSizingInputSchema.safeParse({ ...validInput, racks: [] });
    expect(result.success).toBe(false);
  });

  it('accepts all 9 valid fcSwitchModel values', () => {
    const validModels = ['G710', 'G720', 'G730', 'X7-4', 'X7-8', '7850', 'G820', 'X8-4', 'X8-8'];
    for (const model of validModels) {
      const result = FCSizingInputSchema.safeParse({ ...validInput, fcSwitchModel: model });
      expect(result.success, `Expected model '${model}' to be valid`).toBe(true);
    }
  });

  it('defaults hbaPortsPerServer to 2 when omitted', () => {
    const { hbaPortsPerServer: _omitted, ...inputWithoutHba } = validInput;
    const result = FCSizingInputSchema.safeParse(inputWithoutHba);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hbaPortsPerServer).toBe(2);
    }
  });

  it('defaults islPortsPerSwitch to 4 when omitted', () => {
    const { islPortsPerSwitch: _omitted, ...inputWithoutIsl } = validInput;
    const result = FCSizingInputSchema.safeParse(inputWithoutIsl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.islPortsPerSwitch).toBe(4);
    }
  });

  describe('preferredGeneration field', () => {
    it('defaults to "any" when omitted', () => {
      const result = FCSizingInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferredGeneration).toBe('any');
      }
    });

    it('accepts "gen7" as a valid value', () => {
      const result = FCSizingInputSchema.safeParse({ ...validInput, preferredGeneration: 'gen7' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferredGeneration).toBe('gen7');
      }
    });

    it('accepts "gen8" as a valid value', () => {
      const result = FCSizingInputSchema.safeParse({ ...validInput, preferredGeneration: 'gen8' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferredGeneration).toBe('gen8');
      }
    });

    it('accepts "any" as a valid value', () => {
      const result = FCSizingInputSchema.safeParse({ ...validInput, preferredGeneration: 'any' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.preferredGeneration).toBe('any');
      }
    });

    it('rejects an invalid value "invalid"', () => {
      const result = FCSizingInputSchema.safeParse({ ...validInput, preferredGeneration: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// FCNetworkBOMSchema tests
// ---------------------------------------------------------------------------

describe('FCNetworkBOMSchema', () => {
  it('parses a valid complete BOM without error', () => {
    const result = FCNetworkBOMSchema.safeParse(validBOM);
    expect(result.success).toBe(true);
  });

  it('rejects BOM missing podLicensesRequired (required field)', () => {
    const { podLicensesRequired: _omitted, ...bomWithout } = validBOM;
    const result = FCNetworkBOMSchema.safeParse(bomWithout);
    expect(result.success).toBe(false);
  });

  it('rejects BOM missing fanInRatio (required field)', () => {
    const { fanInRatio: _omitted, ...bomWithout } = validBOM;
    const result = FCNetworkBOMSchema.safeParse(bomWithout);
    expect(result.success).toBe(false);
  });

  it('rejects BOM missing islOversubscriptionRatio (required field)', () => {
    const { islOversubscriptionRatio: _omitted, ...bomWithout } = validBOM;
    const result = FCNetworkBOMSchema.safeParse(bomWithout);
    expect(result.success).toBe(false);
  });

  it('accepts violations array with FC_PORT_SATURATION violation', () => {
    const violation = {
      code: 'FC_PORT_SATURATION',
      requiredPorts: 100,
      availablePorts: 64,
    };
    const result = FCNetworkBOMSchema.safeParse({ ...validBOM, violations: [violation] });
    expect(result.success).toBe(true);
  });

  it('accepts violations array with FC_OVERSUBSCRIPTION_EXCEEDED violation', () => {
    const violation = {
      code: 'FC_OVERSUBSCRIPTION_EXCEEDED',
      ratio: 15,
      maxRatio: 7,
    };
    const result = FCNetworkBOMSchema.safeParse({ ...validBOM, violations: [violation] });
    expect(result.success).toBe(true);
  });

  it('accepts violations array with FC_ISL_UNDERPROVISIONED violation', () => {
    const violation = {
      code: 'FC_ISL_UNDERPROVISIONED',
      islsAvailable: 2,
      islsRequired: 4,
    };
    const result = FCNetworkBOMSchema.safeParse({ ...validBOM, violations: [violation] });
    expect(result.success).toBe(true);
  });

  it('rejects violations array with unknown code UNKNOWN_CODE', () => {
    const violation = {
      code: 'UNKNOWN_CODE',
      someField: 'value',
    };
    const result = FCNetworkBOMSchema.safeParse({ ...validBOM, violations: [violation] });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FCConstraintViolationSchema tests
// ---------------------------------------------------------------------------

describe('FCConstraintViolationSchema', () => {
  it('accepts FC_PORT_SATURATION violation object', () => {
    const result = FCConstraintViolationSchema.safeParse({
      code: 'FC_PORT_SATURATION',
      requiredPorts: 100,
      availablePorts: 64,
    });
    expect(result.success).toBe(true);
  });

  it('accepts FC_OVERSUBSCRIPTION_EXCEEDED violation object', () => {
    const result = FCConstraintViolationSchema.safeParse({
      code: 'FC_OVERSUBSCRIPTION_EXCEEDED',
      ratio: 15,
      maxRatio: 7,
    });
    expect(result.success).toBe(true);
  });

  it('accepts FC_ISL_UNDERPROVISIONED violation object', () => {
    const result = FCConstraintViolationSchema.safeParse({
      code: 'FC_ISL_UNDERPROVISIONED',
      islsAvailable: 2,
      islsRequired: 4,
    });
    expect(result.success).toBe(true);
  });

  it('rejects violation with unknown code', () => {
    const result = FCConstraintViolationSchema.safeParse({
      code: 'UNKNOWN_CODE',
      someField: 'value',
    });
    expect(result.success).toBe(false);
  });
});

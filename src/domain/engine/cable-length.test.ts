/**
 * TDD tests for the cable length library (cable-length.ts).
 * Covers CABLE-01 through CABLE-06 requirements.
 *
 * RED phase: written before cable-length.ts exists (module will fail to import).
 * GREEN phase: all tests pass after cable-length.ts is implemented.
 */

import { describe, it, expect } from 'vitest';
import {
  CABLE_SKU_LADDER,
  applySlackAndRoundToSku,
  deriveRackHeightM,
  withinRackCableLengthM,
  interRackCableLengthM,
  computeServerLeafLengthM,
  computeLeafSpineLengthM,
  computeVltLengthM,
  computeThreeTierLengthsM,
  computeFCIslLengthM,
} from './cable-length';

// ---------------------------------------------------------------------------
// CABLE_SKU_LADDER constant
// ---------------------------------------------------------------------------

describe('CABLE_SKU_LADDER', () => {
  it('equals [1, 3, 5, 10]', () => {
    expect(CABLE_SKU_LADDER).toEqual([1, 3, 5, 10]);
  });
});

// ---------------------------------------------------------------------------
// CABLE-05: applySlackAndRoundToSku
// ---------------------------------------------------------------------------

describe('CABLE-05: applySlackAndRoundToSku', () => {
  it('rawM=0.5 -> SKU 1m (0.575 < 1)', () => {
    expect(applySlackAndRoundToSku(0.5)).toBe(1);
  });

  it('rawM=1.0 -> SKU 3m (1.15 > 1, <= 3)', () => {
    expect(applySlackAndRoundToSku(1.0)).toBe(3);
  });

  it('rawM=2.5 -> SKU 3m (2.875 <= 3)', () => {
    expect(applySlackAndRoundToSku(2.5)).toBe(3);
  });

  it('rawM=2.7 -> SKU 5m (3.105 > 3, <= 5)', () => {
    expect(applySlackAndRoundToSku(2.7)).toBe(5);
  });

  it('rawM=4.3 -> SKU 5m (4.945 <= 5)', () => {
    expect(applySlackAndRoundToSku(4.3)).toBe(5);
  });

  it('rawM=4.4 -> SKU 10m (5.06 > 5, <= 10)', () => {
    expect(applySlackAndRoundToSku(4.4)).toBe(10);
  });

  it('rawM=8.7 -> SKU 10m (max cap, 10.005 >= 10)', () => {
    expect(applySlackAndRoundToSku(8.7)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// CABLE-06: deriveRackHeightM
// ---------------------------------------------------------------------------

describe('CABLE-06: deriveRackHeightM', () => {
  it('24U -> 1.067m (24 * 0.04445 = 1.0668 -> 1.067)', () => {
    expect(deriveRackHeightM('24U')).toBe(1.067);
  });

  it('42U -> 1.867m (42 * 0.04445 = 1.8669 -> 1.867)', () => {
    expect(deriveRackHeightM('42U')).toBe(1.867);
  });

  it('50U -> 2.223m (50 * 0.04445 = 2.2225 -> 2.223)', () => {
    expect(deriveRackHeightM('50U')).toBe(2.223);
  });
});

// ---------------------------------------------------------------------------
// CABLE-06: withinRackCableLengthM
// ---------------------------------------------------------------------------

describe('CABLE-06: withinRackCableLengthM', () => {
  it('ToR: rackHeight + 0.3 (server at bottom, switch at top)', () => {
    // 1.867 + 0.3 = 2.167
    expect(withinRackCableLengthM(1.867, 'ToR')).toBeCloseTo(2.167, 3);
  });

  it('MoR: rackHeight*0.5 + 0.3 (server at extreme, switch at mid)', () => {
    // 1.867 * 0.5 + 0.3 = 0.9335 + 0.3 = 1.2335
    expect(withinRackCableLengthM(1.867, 'MoR')).toBeCloseTo(1.2335, 3);
  });

  it('BoR: rackHeight + 0.3 (server at top, switch at bottom)', () => {
    // 1.867 + 0.3 = 2.167
    expect(withinRackCableLengthM(1.867, 'BoR')).toBeCloseTo(2.167, 3);
  });
});

// ---------------------------------------------------------------------------
// CABLE-06: interRackCableLengthM
// ---------------------------------------------------------------------------

describe('CABLE-06: interRackCableLengthM', () => {
  it('adjacent: pitch/1000 + 2*rackHeight', () => {
    // (600/1000) + 1.867*2 = 0.6 + 3.734 = 4.334
    expect(interRackCableLengthM(600, 1.867, true, 1)).toBeCloseTo(4.334, 3);
  });

  it('non-adjacent: patchPanel*2 + 2*rackHeight (5m patch panel distance)', () => {
    // 5*2 + 1.867*2 = 10 + 3.734 = 13.734
    expect(interRackCableLengthM(600, 1.867, false, 5)).toBeCloseTo(13.734, 3);
  });

  it('non-adjacent with 1m patch panel distance', () => {
    // 1*2 + 1.867*2 = 2 + 3.734 = 5.734
    expect(interRackCableLengthM(600, 1.867, false, 1)).toBeCloseTo(5.734, 3);
  });
});

// ---------------------------------------------------------------------------
// CABLE-01: computeServerLeafLengthM
// ---------------------------------------------------------------------------

describe('CABLE-01: computeServerLeafLengthM', () => {
  it('42U ToR returns SKU 3m (within-rack: 2.167m * 1.15 = 2.49 -> SKU 3m)', () => {
    const result = computeServerLeafLengthM({
      rackHeightM: 1.867,
      switchPositioning: 'ToR',
    });
    expect(result).toBe(3);
  });

  it('42U MoR returns SKU 3m (within-rack: 1.2335m * 1.15 = 1.419 -> SKU 3m)', () => {
    const result = computeServerLeafLengthM({
      rackHeightM: 1.867,
      switchPositioning: 'MoR',
    });
    expect(result).toBe(3);
  });

  it('42U BoR returns SKU 3m (same as ToR formula)', () => {
    const result = computeServerLeafLengthM({
      rackHeightM: 1.867,
      switchPositioning: 'BoR',
    });
    expect(result).toBe(3);
  });

  it('24U ToR returns SKU 3m (within-rack: 1.367m * 1.15 = 1.572 -> SKU 3m)', () => {
    const result = computeServerLeafLengthM({
      rackHeightM: 1.067,
      switchPositioning: 'ToR',
    });
    expect(result).toBe(3);
  });

  it('result is always a member of CABLE_SKU_LADDER', () => {
    const result = computeServerLeafLengthM({
      rackHeightM: 1.867,
      switchPositioning: 'ToR',
    });
    expect(CABLE_SKU_LADDER).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// CABLE-02: computeLeafSpineLengthM
// ---------------------------------------------------------------------------

describe('CABLE-02: computeLeafSpineLengthM', () => {
  it('3 racks adjacent at 600mm pitch returns a valid SKU value > 0', () => {
    const result = computeLeafSpineLengthM({
      rackPitchMm: 600,
      rackCount: 3,
      rackHeightM: 1.867,
      racksAdjacent: true,
      patchPanelDistanceM: 1,
    });
    expect(CABLE_SKU_LADDER).toContain(result);
    expect(result).toBeGreaterThan(0);
  });

  it('1 rack returns 0 (no inter-rack leaf-spine cables for single-rack)', () => {
    const result = computeLeafSpineLengthM({
      rackPitchMm: 600,
      rackCount: 1,
      rackHeightM: 1.867,
      racksAdjacent: true,
      patchPanelDistanceM: 1,
    });
    expect(result).toBe(0);
  });

  it('non-adjacent racks returns a valid SKU value', () => {
    const result = computeLeafSpineLengthM({
      rackPitchMm: 600,
      rackCount: 3,
      rackHeightM: 1.867,
      racksAdjacent: false,
      patchPanelDistanceM: 1,
    });
    expect(CABLE_SKU_LADDER).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// CABLE-02: computeVltLengthM
// ---------------------------------------------------------------------------

describe('CABLE-02: computeVltLengthM', () => {
  it('42U returns SKU 1m (within-rack VLT: 0.3m * 1.15 = 0.345 -> SKU 1m)', () => {
    const result = computeVltLengthM(1.867);
    expect(result).toBe(1);
  });

  it('24U returns SKU 1m (VLT is always short, independent of rack height)', () => {
    const result = computeVltLengthM(1.067);
    expect(result).toBe(1);
  });

  it('result is always a member of CABLE_SKU_LADDER', () => {
    const result = computeVltLengthM(1.867);
    expect(CABLE_SKU_LADDER).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// CABLE-03: computeThreeTierLengthsM
// ---------------------------------------------------------------------------

describe('CABLE-03: computeThreeTierLengthsM', () => {
  it('returns object with serverAccessSkuM, accessAggregationSkuM, aggregationCoreSkuM', () => {
    const result = computeThreeTierLengthsM({
      rackPitchMm: 600,
      rackCount: 3,
      rackHeightM: 1.867,
      switchPositioning: 'ToR',
      racksAdjacent: true,
      patchPanelDistanceM: 1,
    });
    expect(result).toHaveProperty('serverAccessSkuM');
    expect(result).toHaveProperty('accessAggregationSkuM');
    expect(result).toHaveProperty('aggregationCoreSkuM');
  });

  it('all three values are members of CABLE_SKU_LADDER', () => {
    const result = computeThreeTierLengthsM({
      rackPitchMm: 600,
      rackCount: 3,
      rackHeightM: 1.867,
      switchPositioning: 'ToR',
      racksAdjacent: true,
      patchPanelDistanceM: 1,
    });
    expect(CABLE_SKU_LADDER).toContain(result.serverAccessSkuM);
    expect(CABLE_SKU_LADDER).toContain(result.accessAggregationSkuM);
    expect(CABLE_SKU_LADDER).toContain(result.aggregationCoreSkuM);
  });

  it('server->access uses within-rack formula (shorter than inter-rack links)', () => {
    const result = computeThreeTierLengthsM({
      rackPitchMm: 600,
      rackCount: 3,
      rackHeightM: 1.867,
      switchPositioning: 'MoR',
      racksAdjacent: true,
      patchPanelDistanceM: 1,
    });
    // MoR within-rack shorter than inter-rack for same geometry
    expect(result.serverAccessSkuM).toBeLessThanOrEqual(result.accessAggregationSkuM);
  });

  it('aggregationCoreSkuM equals accessAggregationSkuM (same inter-rack formula)', () => {
    const result = computeThreeTierLengthsM({
      rackPitchMm: 600,
      rackCount: 3,
      rackHeightM: 1.867,
      switchPositioning: 'ToR',
      racksAdjacent: true,
      patchPanelDistanceM: 1,
    });
    expect(result.aggregationCoreSkuM).toBe(result.accessAggregationSkuM);
  });
});

// ---------------------------------------------------------------------------
// CABLE-04: computeFCIslLengthM
// ---------------------------------------------------------------------------

describe('CABLE-04: computeFCIslLengthM', () => {
  it('returns 5 (fixed conservative: ~3.5m raw + 15% slack = 4.025m -> SKU 5m)', () => {
    expect(computeFCIslLengthM()).toBe(5);
  });

  it('result is a member of CABLE_SKU_LADDER', () => {
    expect(CABLE_SKU_LADDER).toContain(computeFCIslLengthM());
  });
});

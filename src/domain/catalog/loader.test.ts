/**
 * Unit tests for catalog override merge (CAT-03).
 * Tests the mergeCatalog function that allows runtime extension of the hardware catalog.
 */

import { describe, it, expect } from 'vitest';
import { mergeCatalog } from './loader';
import { SWITCH_CATALOG } from './hardware';
import type { SwitchSpec } from './types';

const BASE_CATALOG: Record<string, SwitchSpec> = {
  'S5248F-ON': {
    modelId: 'S5248F-ON',
    role: 'leaf',
    downlinkPorts: 48,
    downlinkSpeedGbE: 25,
    uplinkPorts: 4,
    uplinkSpeedGbE: 100,
    additionalUplinkPorts: 2,
    maxPowerW: 647,
    typicalPowerW: 310,
    switchingCapacityTbps: 2.0,
  },
  'S5232F-ON': {
    modelId: 'S5232F-ON',
    role: 'spine',
    downlinkPorts: 32,
    downlinkSpeedGbE: 100,
    uplinkPorts: 0,
    maxPowerW: 635,
    typicalPowerW: 360,
    switchingCapacityTbps: 3.2,
  },
  'S3248T-ON': {
    modelId: 'S3248T-ON',
    role: 'oob',
    downlinkPorts: 48,
    downlinkSpeedGbE: 1,
    uplinkPorts: 4,
    uplinkSpeedGbE: 10,
    maxPowerW: 550,
  },
};

describe('mergeCatalog', () => {
  describe('Valid override — new model', () => {
    it('adds a new model from a valid JSON override', () => {
      const overrideJson = JSON.stringify({
        'Z9664F-ON': {
          modelId: 'Z9664F-ON',
          role: 'spine',
          downlinkPorts: 64,
          downlinkSpeedGbE: 400,
          uplinkPorts: 0,
          maxPowerW: 1200,
        },
      });
      const result = mergeCatalog(BASE_CATALOG, overrideJson);
      expect(Object.keys(result)).toHaveLength(4);
      expect(result['Z9664F-ON']).toBeDefined();
      expect(result['Z9664F-ON']?.modelId).toBe('Z9664F-ON');
      expect(result['Z9664F-ON']?.downlinkPorts).toBe(64);
    });
  });

  describe('Valid override — replace existing model', () => {
    it('replaces an existing model with updated fields from override', () => {
      const overrideJson = JSON.stringify({
        'S5248F-ON': {
          modelId: 'S5248F-ON',
          role: 'leaf',
          downlinkPorts: 48,
          downlinkSpeedGbE: 25,
          uplinkPorts: 4,
          uplinkSpeedGbE: 100,
          maxPowerW: 700,
        },
      });
      const result = mergeCatalog(BASE_CATALOG, overrideJson);
      expect(result['S5248F-ON']?.maxPowerW).toBe(700);
    });

    it('does not mutate the original base catalog object when replacing', () => {
      const frozenBase: Record<string, SwitchSpec> = { ...BASE_CATALOG };
      const originalMaxPowerW = frozenBase['S5248F-ON']?.maxPowerW;
      const overrideJson = JSON.stringify({
        'S5248F-ON': {
          modelId: 'S5248F-ON',
          role: 'leaf',
          downlinkPorts: 48,
          downlinkSpeedGbE: 25,
          uplinkPorts: 4,
          uplinkSpeedGbE: 100,
          maxPowerW: 700,
        },
      });
      mergeCatalog(frozenBase, overrideJson);
      expect(frozenBase['S5248F-ON']?.maxPowerW).toBe(originalMaxPowerW);
    });
  });

  describe('Invalid override — missing required field', () => {
    it('throws a ZodError when required field downlinkPorts is missing', () => {
      const overrideJson = JSON.stringify({
        'INVALID-MODEL': {
          modelId: 'INVALID-MODEL',
          role: 'leaf',
          // downlinkPorts is intentionally missing
          downlinkSpeedGbE: 25,
          uplinkPorts: 4,
          maxPowerW: 500,
        },
      });
      expect(() => mergeCatalog(BASE_CATALOG, overrideJson)).toThrow();
    });

    it('does not mutate the base catalog on invalid override', () => {
      const frozenBase: Record<string, SwitchSpec> = { ...BASE_CATALOG };
      const overrideJson = JSON.stringify({
        'INVALID-MODEL': {
          modelId: 'INVALID-MODEL',
          role: 'leaf',
          // downlinkPorts missing
          downlinkSpeedGbE: 25,
          uplinkPorts: 4,
          maxPowerW: 500,
        },
      });
      try { mergeCatalog(frozenBase, overrideJson); } catch { /* expected */ }
      expect(Object.keys(frozenBase)).toHaveLength(3);
    });
  });

  describe('Invalid override — wrong type', () => {
    it('throws a validation error when downlinkPorts is a string instead of number', () => {
      const overrideJson = JSON.stringify({
        'BAD-TYPE-MODEL': {
          modelId: 'BAD-TYPE-MODEL',
          role: 'leaf',
          downlinkPorts: '48',  // string instead of number
          downlinkSpeedGbE: 25,
          uplinkPorts: 4,
          maxPowerW: 500,
        },
      });
      expect(() => mergeCatalog(BASE_CATALOG, overrideJson)).toThrow();
    });
  });

  describe('Empty override', () => {
    it('returns a copy of the base catalog when override is undefined', () => {
      const result = mergeCatalog(BASE_CATALOG, undefined);
      expect(result).toEqual(BASE_CATALOG);
      expect(result).not.toBe(BASE_CATALOG); // new reference, not same object
    });

    it('returns a copy of the base catalog when override is an empty string', () => {
      const result = mergeCatalog(BASE_CATALOG, '');
      expect(result).toEqual(BASE_CATALOG);
      expect(result).not.toBe(BASE_CATALOG); // new reference
    });

    it('returns a copy of the base catalog when override JSON is an empty object', () => {
      const result = mergeCatalog(BASE_CATALOG, '{}');
      expect(result).toEqual(BASE_CATALOG);
      expect(result).not.toBe(BASE_CATALOG); // new reference
    });
  });

  describe('Malformed JSON string', () => {
    it('throws a parse error when overrideJson is not valid JSON', () => {
      expect(() => mergeCatalog(BASE_CATALOG, '{ not valid json')).toThrow();
    });
  });

  describe('Base catalog immutability — SWITCH_CATALOG', () => {
    it('never mutates SWITCH_CATALOG after a valid override', () => {
      const originalKeys = Object.keys(SWITCH_CATALOG);
      const overrideJson = JSON.stringify({
        'Z9664F-ON': {
          modelId: 'Z9664F-ON',
          role: 'spine',
          downlinkPorts: 64,
          downlinkSpeedGbE: 400,
          uplinkPorts: 0,
          maxPowerW: 1200,
        },
      });
      mergeCatalog(SWITCH_CATALOG, overrideJson);
      expect(Object.keys(SWITCH_CATALOG)).toEqual(originalKeys);
    });
  });

  describe('Partial overrides', () => {
    it('allows specifying only a subset of optional fields in the override', () => {
      // Override a leaf with only required + one optional field (no typicalPowerW)
      const overrideJson = JSON.stringify({
        'S5248F-ON': {
          modelId: 'S5248F-ON',
          role: 'leaf',
          downlinkPorts: 48,
          downlinkSpeedGbE: 25,
          uplinkPorts: 4,
          maxPowerW: 647,
          switchingCapacityTbps: 2.5,  // only this optional field
        },
      });
      const result = mergeCatalog(BASE_CATALOG, overrideJson);
      expect(result['S5248F-ON']?.switchingCapacityTbps).toBe(2.5);
      expect(result['S5248F-ON']?.typicalPowerW).toBeUndefined();
    });
  });
});

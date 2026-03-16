/**
 * Cable catalog — source of truth for cable types and distance limits.
 *
 * Used by the sizing engine for DAC_DISTANCE_ADVISORY constraint violations.
 * DAC cables are limited to 5m — flag for deployments with many racks (>8 racks).
 */

import type { CableSpec } from './types';

export const CABLE_CATALOG = {
  /** Direct Attach Copper — short range, lowest cost, lowest latency */
  DAC: {
    type: 'DAC',
    speedGbE: [25, 100],
    maxDistanceM: 5,
  },

  /** Active Optical Cable — medium range, moderate cost */
  AOC: {
    type: 'AOC',
    speedGbE: [25, 100],
    maxDistanceM: 30,
  },

  /** Fiber optic — long range, highest cost */
  fiber: {
    type: 'fiber',
    speedGbE: [25, 100],
    maxDistanceM: 10000,
  },
} as const satisfies Record<string, CableSpec>;

/** Union type of supported cable type identifiers */
export type CableTypeId = keyof typeof CABLE_CATALOG;

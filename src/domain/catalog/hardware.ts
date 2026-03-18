/**
 * Dell PowerSwitch hardware catalog — source of truth for all port counts and power specs.
 *
 * Source: Dell PowerSwitch S5200-ON Series and S3248T-ON Spec Sheets
 * Verified: 2026-03-16 (cross-referenced from multiple Dell-authorized reseller listings
 * and Dell EMC documentation)
 *
 * CRITICAL: All sizing engine formulas reference this catalog — never hardcode port counts inline.
 */

import type { SwitchSpec } from './types';

export const SWITCH_CATALOG = {
  /**
   * S5248F-ON — Primary Leaf switch (25G ToR)
   * 48 × 25GbE SFP28 server-facing + 4 × 100GbE QSFP28 spine uplinks
   * + 2 × 100GbE QSFP28-DD additional uplinks
   * Standard reference design: uplinkPorts=4 (4 × QSFP28 to spine)
   */
  'S5248F-ON': {
    modelId: 'S5248F-ON',
    role: 'leaf',
    tier: ['access'],
    downlinkPorts: 48,
    downlinkSpeedGbE: 25,
    uplinkPorts: 4,             // Standard reference: 4 × 100GbE QSFP28 to spine
    uplinkSpeedGbE: 100,
    additionalUplinkPorts: 2,   // 2 × QSFP28-DD for extended topologies
    maxPowerW: 647,
    typicalPowerW: 310,
    switchingCapacityTbps: 2.0,
  },

  /**
   * S5232F-ON — Spine switch (100G)
   * 32 × 100GbE QSFP28 leaf connections + 2 × 10GbE SFP+ management
   * uplinkPorts=0: spine terminates at this tier (no super-spine in v1)
   */
  'S5232F-ON': {
    modelId: 'S5232F-ON',
    role: 'spine',
    tier: ['aggregation'],
    downlinkPorts: 32,          // 32 × 100GbE QSFP28 — one connection per leaf
    downlinkSpeedGbE: 100,
    uplinkPorts: 0,             // Spine has no upstream; terminates at this tier
    maxPowerW: 635,
    typicalPowerW: 360,
    switchingCapacityTbps: 3.2,
  },

  /**
   * S5224F-ON — Half-density Leaf switch (25G ToR)
   * 24 × 25GbE SFP28 server-facing + 4 × 100GbE QSFP28 spine uplinks
   */
  'S5224F-ON': {
    modelId: 'S5224F-ON',
    role: 'leaf',
    tier: ['access'],
    downlinkPorts: 24,
    downlinkSpeedGbE: 25,
    uplinkPorts: 4,
    uplinkSpeedGbE: 100,
    maxPowerW: 455,
    switchingCapacityTbps: 1.08,
  },

  /**
   * S5212F-ON — Quarter-density Leaf switch (25G ToR, 1RU half-width)
   * 12 × 25GbE SFP28 server-facing + 3 × 100GbE QSFP28 spine uplinks
   */
  'S5212F-ON': {
    modelId: 'S5212F-ON',
    role: 'leaf',
    tier: ['access'],
    downlinkPorts: 12,
    downlinkSpeedGbE: 25,
    uplinkPorts: 3,
    uplinkSpeedGbE: 100,
    maxPowerW: 304,
    switchingCapacityTbps: 1.08,
  },

  /**
   * S5296F-ON — High-density Leaf switch (25G ToR, 2U)
   * 96 × 25GbE SFP28 server-facing + 8 × 100GbE QSFP28 spine uplinks
   * Double density of S5248F-ON — ideal for high-density racks
   */
  'S5296F-ON': {
    modelId: 'S5296F-ON',
    role: 'leaf',
    tier: ['access'],
    downlinkPorts: 96,
    downlinkSpeedGbE: 25,
    uplinkPorts: 8,
    uplinkSpeedGbE: 100,
    maxPowerW: 893,
    switchingCapacityTbps: 6.4,
  },

  /**
   * S3248T-ON — OOB Management switch (1G)
   * 48 × 1GbE RJ45 + 4 × 10GbE SFP+ uplinks + 2 × 100GbE QSFP28
   * OOB saturation threshold: serversPerRack + 2 (servers + 2 ToR leafs) > 48
   */
  'S3248T-ON': {
    modelId: 'S3248T-ON',
    role: 'oob',
    downlinkPorts: 48,          // 48 × 1GbE RJ45 — OOB management ports
    downlinkSpeedGbE: 1,
    uplinkPorts: 4,             // 4 × 10GbE SFP+ uplinks
    uplinkSpeedGbE: 10,
    maxPowerW: 550,
  },

  /**
   * Z9264F-ON — High-density 100G switch (2U)
   * 64 × 100GbE QSFP28 configurable ports (symmetric — uplink/downlink split is logical)
   * uplinkPorts=0: the engine computes effective splits from user-specified uplink counts
   */
  'Z9264F-ON': {
    modelId: 'Z9264F-ON',
    role: 'leaf',
    tier: ['access', 'aggregation'],
    downlinkPorts: 64,
    downlinkSpeedGbE: 100,
    uplinkPorts: 0,
    uplinkSpeedGbE: 100,
    maxPowerW: 750,
    typicalPowerW: 340,
    switchingCapacityTbps: 12.8,
    uHeight: 2,
  },

  /**
   * Z9332F-ON — 400G spine/core switch (1U)
   * 32 × 400GbE QSFP-DD configurable ports (symmetric — uplink/downlink split is logical)
   * uplinkPorts=0: the engine computes effective splits from user-specified uplink counts
   */
  'Z9332F-ON': {
    modelId: 'Z9332F-ON',
    role: 'spine',
    tier: ['aggregation', 'core'],
    downlinkPorts: 32,
    downlinkSpeedGbE: 400,
    uplinkPorts: 0,
    uplinkSpeedGbE: 400,
    maxPowerW: 1500,
    typicalPowerW: 900,
    switchingCapacityTbps: 25.6,
    uHeight: 1,
  },

  /**
   * Z9432F-ON — 400G spine/core switch (1U)
   * 32 × 400GbE QSFP-DD configurable ports (symmetric — uplink/downlink split is logical)
   * uplinkPorts=0: the engine computes effective splits from user-specified uplink counts
   */
  'Z9432F-ON': {
    modelId: 'Z9432F-ON',
    role: 'spine',
    tier: ['aggregation', 'core'],
    downlinkPorts: 32,
    downlinkSpeedGbE: 400,
    uplinkPorts: 0,
    uplinkSpeedGbE: 400,
    maxPowerW: 1404,
    typicalPowerW: 900,
    switchingCapacityTbps: 25.6,
    uHeight: 1,
  },
} as const satisfies Record<string, SwitchSpec>;

/** Union type of all supported switch model IDs */
export type SwitchModelId = keyof typeof SWITCH_CATALOG;

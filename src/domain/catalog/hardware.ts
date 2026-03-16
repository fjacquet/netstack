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
    downlinkPorts: 12,
    downlinkSpeedGbE: 25,
    uplinkPorts: 3,
    uplinkSpeedGbE: 100,
    maxPowerW: 304,
    switchingCapacityTbps: 1.08,
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
} as const satisfies Record<string, SwitchSpec>;

/** Union type of all supported switch model IDs */
export type SwitchModelId = keyof typeof SWITCH_CATALOG;

/**
 * Brocade / Broadcom FC switch and optics catalog — source of truth for all FC port counts,
 * POD licensing parameters, and optics specifications.
 *
 * Source: Broadcom TechDocs (docs.broadcom.com), Lenovo Press Brocade datasheets
 * Verified: 2026-03-18 (cross-referenced against Gen 7 and Gen 8 FC product briefs)
 *
 * CRITICAL: All FC sizing engine formulas reference this catalog — never hardcode port counts
 * inline. POD licensing fields (basePorts, podLicenseUnit, totalPorts) must remain consistent
 * with Phase 10 engine expectations.
 */

import type { FCSwitchSpec, FCOpticsSpec } from './fc-types';

export const FC_SWITCH_CATALOG = {
  /**
   * G710 — Entry-level Gen 7 FC switch (1U)
   * 24 × 64G SFP+ ports; base: 8 ports; POD unlock: 8 ports/license
   */
  'G710': {
    modelId: 'G710',
    generation: 7,
    speedGbps: 64,
    totalPorts: 24,
    basePorts: 8,
    podLicenseUnit: 8,
    maxIslPorts: 6,
    uHeight: 1,
    maxPowerW: 150,
    role: 'edge',
    formFactor: 'fixed',
  },

  /**
   * G720 — Mid-range Gen 7 FC switch (1U)
   * 64 × 64G ports (8 × SFP-DD + 48 × SFP+); base: 24 ports; POD unlock: 8 ports/license
   * SFP-DD ports each provide 2 FC lanes; sfpDDPorts=8 => 16 addressable ports from SFP-DD
   */
  'G720': {
    modelId: 'G720',
    generation: 7,
    speedGbps: 64,
    totalPorts: 64,
    basePorts: 24,
    podLicenseUnit: 8,
    maxIslPorts: 16,
    uHeight: 1,
    maxPowerW: 700,
    typicalPowerW: 349,
    role: 'edge',
    formFactor: 'fixed',
    sfpDDPorts: 8,
  },

  /**
   * G730 — High-density Gen 7 FC switch (2U)
   * 128 × 64G ports (16 × SFP-DD + 96 × SFP+); base: 48 ports; POD unlock: 8 ports/license
   */
  'G730': {
    modelId: 'G730',
    generation: 7,
    speedGbps: 64,
    totalPorts: 128,
    basePorts: 48,
    podLicenseUnit: 8,
    maxIslPorts: 32,
    uHeight: 2,
    maxPowerW: 1100,
    typicalPowerW: 969,
    role: 'edge',
    formFactor: 'fixed',
    sfpDDPorts: 16,
  },

  /**
   * X7-4 — Gen 7 Director, 4-slot chassis (8U)
   * 4 × FC64-64 blades = 256 data ports (Lenovo Press: 265 max incl. 9 ICL ports)
   * Directors use blade-based licensing; podLicenseUnit=0
   */
  'X7-4': {
    modelId: 'X7-4',
    generation: 7,
    speedGbps: 64,
    totalPorts: 256,
    basePorts: 256,
    podLicenseUnit: 0,
    maxIslPorts: 16,
    uHeight: 8,
    maxPowerW: 2000,
    role: 'director',
    formFactor: 'director',
    bladeSlotsCount: 4,
    portsPerBlade: 64,
  },

  /**
   * X7-8 — Gen 7 Director, 8-slot chassis (14U)
   * 8 × FC64-64 blades = 512 data ports
   * Directors use blade-based licensing; podLicenseUnit=0
   */
  'X7-8': {
    modelId: 'X7-8',
    generation: 7,
    speedGbps: 64,
    totalPorts: 512,
    basePorts: 512,
    podLicenseUnit: 0,
    maxIslPorts: 32,
    uHeight: 14,
    maxPowerW: 4000,
    role: 'director',
    formFactor: 'director',
    bladeSlotsCount: 8,
    portsPerBlade: 64,
  },

  /**
   * 7850 — Gen 7 Extension Switch / FC Gateway (1U)
   * 16 physical FC ports (8 × SFP-DD + 8 × SFP+ = 24 addressable); 18 GE WAN ports
   * Role: extension (FC-over-IP / FCIP WAN extension); maxIslPorts = 18 GE ports
   * podLicenseUnit=0: all FC ports base-licensed; WAN ports individually licensed
   */
  '7850': {
    modelId: '7850',
    generation: 7,
    speedGbps: 64,
    totalPorts: 24,
    basePorts: 24,
    podLicenseUnit: 0,
    maxIslPorts: 18,
    uHeight: 1,
    maxPowerW: 200,
    role: 'extension',
    formFactor: 'fixed',
  },

  /**
   * G820 — Entry/mid-range Gen 8 FC switch (1U)
   * 56 × 128G SFP+ ports; base: 24 ports; POD unlock: 8 ports/license
   */
  'G820': {
    modelId: 'G820',
    generation: 8,
    speedGbps: 128,
    totalPorts: 56,
    basePorts: 24,
    podLicenseUnit: 8,
    maxIslPorts: 16,
    uHeight: 1,
    maxPowerW: 650,
    typicalPowerW: 336,
    role: 'edge',
    formFactor: 'fixed',
  },

  /**
   * X8-4 — Gen 8 Director, 4-slot chassis (9U)
   * 4 × FC128-48 blades = 192 data ports
   * Directors use blade-based licensing; podLicenseUnit=0
   * TODO: Verify exact maxPowerW against Broadcom X8-4 datasheet when available
   */
  'X8-4': {
    modelId: 'X8-4',
    generation: 8,
    speedGbps: 128,
    totalPorts: 192,
    basePorts: 192,
    podLicenseUnit: 0,
    maxIslPorts: 16,
    uHeight: 9,
    maxPowerW: 2000,
    role: 'director',
    formFactor: 'director',
    bladeSlotsCount: 4,
    portsPerBlade: 48,
  },

  /**
   * X8-8 — Gen 8 Director, 8-slot chassis (14U)
   * 8 × FC128-48 blades = 384 data ports
   * Directors use blade-based licensing; podLicenseUnit=0
   * TODO: Verify exact maxPowerW against Broadcom X8-8 datasheet when available
   */
  'X8-8': {
    modelId: 'X8-8',
    generation: 8,
    speedGbps: 128,
    totalPorts: 384,
    basePorts: 384,
    podLicenseUnit: 0,
    maxIslPorts: 32,
    uHeight: 14,
    maxPowerW: 4000,
    role: 'director',
    formFactor: 'director',
    bladeSlotsCount: 8,
    portsPerBlade: 48,
  },
} as const satisfies Record<string, FCSwitchSpec>;

/** Union type of all supported Brocade FC switch model IDs */
export type FCSwitchModelId = keyof typeof FC_SWITCH_CATALOG;

// ---------------------------------------------------------------------------
// FC Optics Catalog
// ---------------------------------------------------------------------------

/**
 * Brocade / Broadcom FC optics catalog — short-wavelength OM4 multimode modules.
 *
 * All entries have protocol: 'fibre-channel' — structural discriminant that distinguishes
 * these from Ethernet optics in cables.ts.
 */
export const FC_OPTICS_CATALOG = {
  /**
   * 32G short-wavelength SFP28 — entry-level FC hosts and Gen 7 edge switches
   */
  'FC-32G-SW-SFP28': {
    protocol: 'fibre-channel' as const,
    speedGbps: 32,
    formFactor: 'SFP28',
    wavelengthNm: 850,
    connectorType: 'LC-duplex',
    maxDistanceM: 100,
    useCase: '32G short-wavelength, OM4 multimode, intra-rack',
  },

  /**
   * 64G short-wavelength SFP+ — Gen 7 switches (G720, G730, X7-4, X7-8)
   */
  'FC-64G-SW-SFP+': {
    protocol: 'fibre-channel' as const,
    speedGbps: 64,
    formFactor: 'SFP+',
    wavelengthNm: 850,
    connectorType: 'LC-duplex',
    maxDistanceM: 100,
    useCase: '64G short-wavelength, OM4 multimode, G720/G730',
  },

  /**
   * 128G short-wavelength SFP+ — Gen 8 switches (G820, X8-4, X8-8)
   */
  'FC-128G-SW-SFP+': {
    protocol: 'fibre-channel' as const,
    speedGbps: 128,
    formFactor: 'SFP+',
    wavelengthNm: 850,
    connectorType: 'LC-duplex',
    maxDistanceM: 100,
    useCase: '128G short-wavelength, OM4 multimode, G820',
  },
} as const satisfies Record<string, FCOpticsSpec>;

/** Union type of all supported FC optics module IDs */
export type FCOpticsId = keyof typeof FC_OPTICS_CATALOG;

/**
 * Domain types for the Fibre Channel hardware catalog.
 * All TypeScript types for FC switches and optics are defined here.
 *
 * These interfaces are the contract between the FC catalog (brocade.ts)
 * and the FC sizing engine (Phase 10). Changing field names here is a
 * schema-breaking change — coordinate with all consumers.
 */

/**
 * Specification for a Brocade FC switch model.
 *
 * POD licensing model:
 * - Fixed-port switches (G710, G720, G730, G820) ship with basePorts enabled.
 *   Additional ports are unlocked in podLicenseUnit increments (e.g., 8-port PODs).
 *   basePorts < totalPorts and podLicenseUnit > 0 for all fixed switches.
 * - Director switches (X7-4, X7-8, X8-4, X8-8) are blade-based.
 *   All blades are installed; port licensing is per-blade, not per-POD.
 *   podLicenseUnit=0 for all directors.
 */
export interface FCSwitchSpec {
  /** Switch model identifier (e.g., 'G720') */
  modelId: string;
  /** Hardware generation (7 = Gen 7 / Fibre Channel 64G, 8 = Gen 8 / Fibre Channel 128G) */
  generation: 7 | 8;
  /** Maximum native FC port speed in Gbps */
  speedGbps: 32 | 64 | 128;
  /** Total addressable port count when fully licensed */
  totalPorts: number;
  /** Ports active with factory (base) license — equal to totalPorts for directors */
  basePorts: number;
  /**
   * Port increment unlocked per POD license purchase.
   * Value is 0 for directors (blade-based, not port POD); >0 for fixed-port switches.
   */
  podLicenseUnit: number;
  /** Maximum number of ports usable as ISL (inter-switch links) */
  maxIslPorts: number;
  /** Rack unit height */
  uHeight: number;
  /** Maximum power consumption in Watts */
  maxPowerW: number;
  /** Typical/average power consumption in Watts */
  typicalPowerW?: number;
  /** FC role in the fabric topology */
  role: 'edge' | 'director' | 'extension';
  /** Physical form factor */
  formFactor: 'fixed' | 'director';
  /** Number of SFP-DD ports (each SFP-DD = 2 FC lanes, counted as 2 ports in totalPorts) */
  sfpDDPorts?: number;
  /** Number of line-card blade slots (directors only) */
  bladeSlotsCount?: number;
  /** FC ports per line-card blade (directors only) */
  portsPerBlade?: number;
}

/**
 * Specification for a Fibre Channel optics module.
 *
 * The `protocol: 'fibre-channel'` field is a structural discriminant —
 * it distinguishes FC optics from Ethernet optics (e.g., DAC/AOC in cables.ts).
 * Never assign an Ethernet optics object where FCOpticsSpec is expected.
 */
export interface FCOpticsSpec {
  /** Structural discriminant — never 'ethernet' */
  protocol: 'fibre-channel';
  /** FC line rate in Gbps */
  speedGbps: 32 | 64 | 128;
  /** Physical transceiver form factor */
  formFactor: 'SFP28' | 'SFP+' | 'SFP-DD' | 'QSFP';
  /** Laser wavelength in nanometers */
  wavelengthNm: number;
  /** Physical connector type */
  connectorType: 'LC-duplex' | 'SFP-DD';
  /** Maximum supported link distance in meters */
  maxDistanceM: number;
  /** Human-readable description of the primary use case */
  useCase: string;
}

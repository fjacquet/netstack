/**
 * Domain types for the hardware catalog.
 * All TypeScript types for switches and cables are defined here.
 */

/** Specification for a Dell PowerSwitch model */
export interface SwitchSpec {
  /** Switch model identifier (e.g., 'S5248F-ON') */
  modelId: string;
  /** Role in the Leaf-Spine topology */
  role: 'leaf' | 'spine' | 'oob';
  /** Number of server-facing (downlink) ports */
  downlinkPorts: number;
  /** Speed of each downlink port in GbE */
  downlinkSpeedGbE: number;
  /** Number of spine-facing (uplink) ports */
  uplinkPorts: number;
  /** Speed of each uplink port in GbE (optional for OOB/spine) */
  uplinkSpeedGbE?: number;
  /** Additional uplink ports (e.g., QSFP28-DD on S5248F-ON) */
  additionalUplinkPorts?: number;
  /** Maximum power consumption in Watts */
  maxPowerW: number;
  /** Typical/average power consumption in Watts */
  typicalPowerW?: number;
  /** Total switching capacity in Tbps */
  switchingCapacityTbps?: number;
  /** Valid roles in a 3-tier topology. Undefined = not usable in 3-tier mode. */
  tier?: ('access' | 'aggregation' | 'core')[];
  /** Rack unit height (default 1U if omitted, 2U for Z9264F-ON) */
  uHeight?: number;
}

/** Specification for a cable type */
export interface CableSpec {
  /** Cable technology */
  type: 'DAC' | 'AOC' | 'fiber';
  /** Supported link speeds in GbE */
  speedGbE: number[];
  /** Maximum supported distance in meters (conservative / backwards-compat value) */
  maxDistanceM: number;
  /** Per-speed maximum distance in metres. Key = speed in GbE. Only present on DAC. */
  maxDistanceBySpeed?: Record<number, number>;
}

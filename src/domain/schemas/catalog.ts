/**
 * Zod schema for runtime validation of hardware catalog entries.
 * Used when merging JSON override files into the base SWITCH_CATALOG (CAT-03).
 * Throws on invalid entries — fail fast, never silently corrupt the catalog.
 */

import { z } from 'zod';

export const SwitchSpecSchema = z.object({
  /** Switch model identifier */
  modelId: z.string().min(1),
  /** Role in the Leaf-Spine topology */
  role: z.enum(['leaf', 'spine', 'oob']),
  /** Number of server-facing (downlink) ports */
  downlinkPorts: z.number().int().min(0),
  /** Speed of each downlink port in GbE */
  downlinkSpeedGbE: z.number().int().min(0),
  /** Number of spine-facing (uplink) ports */
  uplinkPorts: z.number().int().min(0),
  /** Speed of each uplink port in GbE (optional for OOB/spine) */
  uplinkSpeedGbE: z.number().int().optional(),
  /** Additional uplink ports (e.g., QSFP28-DD ports) */
  additionalUplinkPorts: z.number().int().optional(),
  /** Maximum power consumption in Watts */
  maxPowerW: z.number().min(0),
  /** Typical/average power consumption in Watts */
  typicalPowerW: z.number().optional(),
  /** Total switching capacity in Tbps */
  switchingCapacityTbps: z.number().optional(),
});

/** Inferred TypeScript type — do not declare separately */
export type SwitchSpecInput = z.infer<typeof SwitchSpecSchema>;

/**
 * Zod schema for three-tier sizing engine input.
 * This schema is the single source of truth for the ThreeTierSizingInput TypeScript type.
 * Use z.infer<typeof ThreeTierSizingInputSchema> -- never declare the type separately.
 *
 * TENG-07: Independent model selectors for access, aggregation, and core tiers.
 * Each tier has its own switch model enum, allowing any valid combination.
 */

import { z } from 'zod';
import { RackConfigSchema } from './input';

/**
 * ThreeTierSizingInputSchema: Input contract for the three-tier sizing engine.
 * Reuses RackConfigSchema from Ethernet domain for per-rack server counts.
 */
export const ThreeTierSizingInputSchema = z.object({
  /**
   * Per-rack server configuration. Each element represents one rack.
   * Reuses Ethernet RackConfigSchema -- same physical racks, different topology.
   */
  racks: z.array(RackConfigSchema).min(1).max(200),

  /** Number of frontend (data/access-facing) ports per server (0-8, default 1) */
  portsPerServerFrontend: z.number().int().min(0).max(8).default(1),

  /** Number of backend (OOB-facing) ports per server (0-8, default 1) */
  portsPerServerBackend: z.number().int().min(0).max(8).default(1),

  /** Server-facing connectivity type */
  connectivityType: z.enum(['25G', '100G']),

  /** Cable type used for all inter-device connections */
  cableType: z.enum(['DAC', 'AOC', 'fiber']),

  /** Access tier switch model -- leaf-role models valid for server-facing connectivity */
  accessModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'Z9264F-ON']),

  /** Number of active uplinks per access switch to aggregation tier (1-64, default 4) */
  activeUplinksPerAccess: z.number().int().min(1).max(64).default(4),

  /** Aggregation tier switch model -- mid-tier models for inter-tier switching */
  aggregationModel: z.enum(['Z9264F-ON', 'Z9332F-ON', 'Z9432F-ON', 'S5232F-ON']),

  /** Number of active uplinks per aggregation switch to core tier (1-32, default 4) */
  activeUplinksPerAggregation: z.number().int().min(1).max(32).default(4),

  /** Core tier switch model -- high-capacity models for backbone connectivity */
  coreModel: z.enum(['Z9332F-ON', 'Z9432F-ON']),

  /** Border leaf switch model -- for WAN/uplink connectivity, or 'none' to omit */
  borderLeafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'none']),

  /** Number of border leaf switches (0 = no border leafs, typically 2 for redundancy) */
  borderLeafCount: z.number().int().min(0).max(4),

  /** Rack unit height -- standard rack sizes */
  rackSize: z.enum(['24U', '42U', '50U']),

  /** U-height of each server for rack elevation rendering (1U default) */
  serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),

  /** Switch placement mode -- affects rack overhead U-count, cable length advisory, and DAC compatibility */
  switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR'),
});

/** Inferred TypeScript type -- do not declare separately */
export type ThreeTierSizingInput = z.infer<typeof ThreeTierSizingInputSchema>;

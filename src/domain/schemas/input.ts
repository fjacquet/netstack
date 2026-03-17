/**
 * Zod schema for sizing engine input.
 * This schema is the single source of truth for the SizingInput TypeScript type.
 * Use z.infer<typeof SizingInputSchema> — never declare the type separately.
 *
 * RACK-03: SizingInput now uses a racks array where each element has its own
 * serverCount, enabling per-rack server density configuration.
 */

import { z } from 'zod';

/** Per-rack configuration: each rack tracks its own server count */
export const RackConfigSchema = z.object({
  /** Number of servers in this rack (0 = empty rack, max 500) */
  serverCount: z.number().int().min(0).max(500),
});

export const SizingInputSchema = z.object({
  /**
   * Per-rack server configuration. Each element represents one rack.
   * The engine derives:
   *   - rack count = racks.length
   *   - totalServers = sum(racks[].serverCount)
   *   - maxServersPerRack = max(racks[].serverCount)  — for OOB/oversubscription worst-case
   */
  racks: z.array(RackConfigSchema).min(1).max(200),
  /** Server-facing connectivity type */
  connectivityType: z.enum(['25G', '100G']),
  /** Cable type used for all inter-device connections */
  cableType: z.enum(['DAC', 'AOC', 'fiber']),
  /** Leaf switch model — only leaf-role models are valid (excludes spine and OOB) */
  leafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON']),
  /** Spine switch model — currently only S5232F-ON, extensible for future models */
  spineModel: z.enum(['S5232F-ON']),
  /** Border leaf switch model — same leaf models, used for WAN/uplink connectivity */
  borderLeafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'none']),
  /** Number of border leaf switches (0 = no border leafs, typically 2 for redundancy) */
  borderLeafCount: z.number().int().min(0).max(4),
  /** Rack unit height — standard rack sizes */
  rackSize: z.enum(['24U', '42U', '50U']),
});

/** Inferred TypeScript type — do not declare separately */
export type SizingInput = z.infer<typeof SizingInputSchema>;

/** Inferred TypeScript type for a single rack config */
export type RackConfig = z.infer<typeof RackConfigSchema>;

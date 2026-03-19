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
  /** Topology selector: 'leaf-spine' (Clos) or 'three-tier' (Core/Aggr/Access) */
  topology: z.enum(['leaf-spine', 'three-tier']).default('leaf-spine'),

  /**
   * Per-rack server configuration. Each element represents one rack.
   * The engine derives:
   *   - rack count = racks.length
   *   - totalServers = sum(racks[].serverCount)
   *   - maxServersPerRack = max(racks[].serverCount)  — for OOB/oversubscription worst-case
   */
  racks: z.array(RackConfigSchema).min(1).max(200),
  /** Number of frontend (data/leaf-facing) ports per server (0-8, default 1) */
  portsPerServerFrontend: z.number().int().min(0).max(8).default(1),
  /** Number of backend (OOB-facing) ports per server (0-8, default 1) */
  portsPerServerBackend: z.number().int().min(0).max(8).default(1),
  /** Server-facing connectivity type */
  connectivityType: z.enum(['25G', '100G']),
  /** Cable type used for all inter-device connections */
  cableType: z.enum(['DAC', 'AOC', 'fiber']),

  // ── Clos-specific fields (used when topology='leaf-spine') ──────────────────
  /** Number of active uplinks per leaf switch to spine (1-8, default 4).
   * The engine clamps this to the model's physical uplinkPorts at runtime. */
  activeUplinksPerLeaf: z.number().int().min(1).max(8).default(4),
  /** Leaf switch model — only leaf-role models are valid (excludes spine and OOB) */
  leafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON']),
  /** Spine switch model — currently only S5232F-ON, extensible for future models */
  spineModel: z.enum(['S5232F-ON']),

  // ── Three-tier fields (used when topology='three-tier') ─────────────────────
  /** Access tier switch model — leaf-role models valid for server-facing connectivity */
  accessModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'Z9264F-ON']).default('S5248F-ON'),
  /** Number of active uplinks per access switch to aggregation tier (1-64, default 4) */
  activeUplinksPerAccess: z.number().int().min(1).max(64).default(4),
  /** Aggregation tier switch model — mid-tier models for inter-tier switching */
  aggregationModel: z.enum(['Z9264F-ON', 'Z9332F-ON', 'Z9432F-ON', 'S5232F-ON']).default('Z9264F-ON'),
  /** Number of active uplinks per aggregation switch to core tier (1-32, default 4) */
  activeUplinksPerAggregation: z.number().int().min(1).max(32).default(4),
  /** Core tier switch model — high-capacity models for backbone connectivity */
  coreModel: z.enum(['Z9332F-ON', 'Z9432F-ON']).default('Z9332F-ON'),

  // ── Shared fields ───────────────────────────────────────────────────────────
  /** Border leaf switch model — same leaf models, used for WAN/uplink connectivity */
  borderLeafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'none']),
  /** Number of border leaf switches (0 = no border leafs, typically 2 for redundancy) */
  borderLeafCount: z.number().int().min(0).max(4),
  /** Rack unit height — standard rack sizes */
  rackSize: z.enum(['24U', '42U', '50U']),
  /** U-height of each server for rack elevation rendering (1U default) */
  serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),
  /** Switch placement mode — affects rack overhead U-count, cable length advisory, and DAC compatibility */
  switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR'),
  /** Brownfield: spines already deployed, exclude from BOM (Clos topology) */
  existingSpinesDeployed: z.boolean().default(false),
  /** Brownfield: core switches already deployed, exclude from BOM (Three-Tier topology) */
  existingCoreDeployed: z.boolean().default(false),
});

/** Inferred TypeScript type — do not declare separately */
export type SizingInput = z.infer<typeof SizingInputSchema>;

/** Inferred TypeScript type for a single rack config */
export type RackConfig = z.infer<typeof RackConfigSchema>;

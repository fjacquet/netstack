/**
 * Zod schema for converged sizing engine input.
 * This schema is the single source of truth for the ConvergedSizingInput TypeScript type.
 * Use z.infer<typeof ConvergedSizingInputSchema> -- never declare the type separately.
 *
 * CONV-02: Converged input accepts 1-4 Ethernet frontend ports and 0-8 FC HBA ports per server.
 * CONV-04: hbaPortsPerServer min=0 (FC is optional; standalone FC has min=1).
 *
 * Key differences from standalone schemas:
 *   - portsPerServerFrontend min=1 (converged always has Ethernet)
 *   - hbaPortsPerServer min=0 default=0 (FC is optional)
 *   - Shared racks, rackSize, serverUHeight appear once (not duplicated)
 */

import { z } from 'zod';
import { RackConfigSchema } from './input';

export const ConvergedSizingInputSchema = z.object({
  // --- Topology selector (TENG-01) ---
  /** Network topology: 'leaf-spine' (Clos) or 'three-tier' (Core/Aggregation/Access) */
  topology: z.enum(['leaf-spine', 'three-tier']).default('leaf-spine'),

  // --- Shared rack config (same physical racks for both fabrics) ---
  racks: z.array(RackConfigSchema).min(1).max(200),
  rackSize: z.enum(['24U', '42U', '50U']),
  serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),

  // --- Ethernet fields (from SizingInputSchema) ---
  /** Number of frontend (data/leaf-facing) ports per server (1-4, default 1) */
  portsPerServerFrontend: z.number().int().min(1).max(4).default(1),
  /** Number of backend (OOB-facing) ports per server (0-8, default 1) */
  portsPerServerBackend: z.number().int().min(0).max(8).default(1),
  /** Number of active uplinks per leaf switch to spine (1-8, default 4) */
  activeUplinksPerLeaf: z.number().int().min(1).max(8).default(4),
  /** Server-facing connectivity type */
  connectivityType: z.enum(['25G', '100G']),
  /** Cable type used for all inter-device connections */
  cableType: z.enum(['DAC', 'AOC', 'fiber']),
  /** Leaf switch model */
  leafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON']),
  /** Spine switch model */
  spineModel: z.enum(['S5232F-ON']),
  /** Border leaf switch model */
  borderLeafModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'none']),
  /** Number of border leaf switches (0 = no border leafs) */
  borderLeafCount: z.number().int().min(0).max(4),
  /** Switch placement mode */
  switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR'),

  // --- 3-tier fields (used when topology='three-tier'; ignored for 'leaf-spine') ---
  /** Access tier switch model (3-tier topology only) */
  accessModel: z.enum(['S5248F-ON', 'S5224F-ON', 'S5212F-ON', 'S5296F-ON', 'Z9264F-ON']).default('S5248F-ON'),
  /** Aggregation tier switch model (3-tier topology only) */
  aggregationModel: z.enum(['Z9264F-ON', 'Z9332F-ON', 'Z9432F-ON', 'S5232F-ON']).default('Z9264F-ON'),
  /** Number of active uplinks per aggregation switch to core (3-tier topology only) */
  activeUplinksPerAggregation: z.number().int().min(1).max(32).default(4),
  /** Core tier switch model (3-tier topology only) */
  coreModel: z.enum(['Z9332F-ON', 'Z9432F-ON']).default('Z9332F-ON'),

  // --- Brownfield toggles ---
  /** Brownfield: spines already deployed, exclude from BOM (Clos topology) */
  existingSpinesDeployed: z.boolean().default(false),
  /** Brownfield: core switches already deployed, exclude from BOM (Three-Tier topology) */
  existingCoreDeployed: z.boolean().default(false),

  // --- FC fields (from FCSizingInputSchema, but hbaPortsPerServer min=0) ---
  /** Number of HBA ports per server (0=FC disabled, 1-8=FC enabled). min=0 per CONV-04. */
  hbaPortsPerServer: z.number().int().min(0).max(8).default(0),
  /** Total FC target ports on all storage arrays combined */
  storageTargetPorts: z.number().int().min(2).max(128).default(4),
  /** Number of storage arrays in the fabric */
  storageArrayCount: z.number().int().min(1).max(32).default(1),
  /** Brocade FC switch model */
  fcSwitchModel: z.enum(['G710', 'G720', 'G730', 'X7-4', 'X7-8', '7850', 'G820', 'X8-4', 'X8-8']),
  /** Number of ISL ports reserved per switch */
  islPortsPerSwitch: z.number().int().min(0).max(32).default(4),
  /** Preferred Brocade generation filter */
  preferredGeneration: z.enum(['gen7', 'gen8', 'any']).default('any'),
});

/** Inferred TypeScript type -- do not declare separately */
export type ConvergedSizingInput = z.infer<typeof ConvergedSizingInputSchema>;

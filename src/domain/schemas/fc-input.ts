/**
 * Zod schema for FC sizing engine input.
 * This schema is the single source of truth for the FCSizingInput TypeScript type.
 * Use z.infer<typeof FCSizingInputSchema> — never declare the type separately.
 *
 * FC-01/FC-02: Supports all 9 Brocade FC switch models (Gen7 + Gen8).
 * FC-03: fcSwitchModel is used by the engine to look up POD licensing in FC_SWITCH_CATALOG.
 * FC-04: Includes 7850 FCIP extension switch model.
 */

import { z } from 'zod';
import { RackConfigSchema } from './input';

/**
 * FCSizingInputSchema: Input contract for the FC sizing engine.
 * Reuses RackConfigSchema from Ethernet domain for per-rack server counts.
 */
export const FCSizingInputSchema = z.object({
  /**
   * Per-rack server configuration. Each element represents one rack.
   * Reuses Ethernet RackConfigSchema — same physical racks, different network fabric.
   */
  racks: z.array(RackConfigSchema).min(1).max(200),

  /** Number of HBA ports per server facing the FC fabric (1-8, default 2 for dual-fabric) */
  hbaPortsPerServer: z.number().int().min(1).max(8).default(2),

  /** Total FC target ports on all storage arrays combined (2-128, default 4) */
  storageTargetPorts: z.number().int().min(2).max(128).default(4),

  /** Number of storage arrays in the fabric (1-32, default 1) */
  storageArrayCount: z.number().int().min(1).max(32).default(1),

  /**
   * Brocade FC switch model — determines port count, POD licensing, and ISL capacity.
   * Gen7 (64G): G710, G720, G730, X7-4, X7-8
   * Gen8 (128G): G820, X8-4, X8-8
   * FCIP: 7850
   */
  fcSwitchModel: z.enum(['G710', 'G720', 'G730', 'X7-4', 'X7-8', '7850', 'G820', 'X8-4', 'X8-8']),

  /** Number of ISL ports reserved per switch for inter-switch links (0-32, default 4) */
  islPortsPerSwitch: z.number().int().min(0).max(32).default(4),

  /** Rack unit height — standard rack sizes */
  rackSize: z.enum(['24U', '42U', '50U']),

  /** U-height of each server for rack elevation rendering (1U default) */
  serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),
});

/** Inferred TypeScript type — do not declare separately */
export type FCSizingInput = z.infer<typeof FCSizingInputSchema>;

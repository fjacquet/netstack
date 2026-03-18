/**
 * Zod schema for converged BOM output.
 * This schema is the single source of truth for the ConvergedBOM TypeScript type.
 * Use z.infer<typeof ConvergedBOMSchema> -- never declare the type separately.
 *
 * CONV-03: Combined BOM containing both Ethernet and FC sub-BOMs.
 * CONV-04: fcBom is nullable (null when hbaPortsPerServer=0).
 * CONV-05: violations is a union array of Ethernet, FC, and Three-Tier violations.
 * TENG-01: topology field and nullable ethernetBom/threeTierBom for topology switching.
 */

import { z } from 'zod';
import { NetworkBOMSchema, ConstraintViolationSchema } from './bom';
import { FCNetworkBOMSchema, FCConstraintViolationSchema } from './fc-bom';
import { ThreeTierBOMSchema, ThreeTierConstraintViolationSchema } from './three-tier-bom';
import { ConvergedSizingInputSchema } from './converged-input';

export const ConvergedBOMSchema = z.object({
  /** Network topology used for this BOM (echoed from input) */
  topology: z.enum(['leaf-spine', 'three-tier']),
  /** Ethernet BOM -- nullable (null when topology='three-tier') */
  ethernetBom: NetworkBOMSchema.nullable(),
  /** Three-Tier BOM -- nullable (null when topology='leaf-spine') */
  threeTierBom: ThreeTierBOMSchema.nullable(),
  /** FC BOM -- nullable (null when hbaPortsPerServer=0 per CONV-04) */
  fcBom: FCNetworkBOMSchema.nullable(),
  /** Combined violations from Ethernet, Three-Tier, and FC engines (CONV-05, TENG-01) */
  violations: z.array(
    z.union([ConstraintViolationSchema, FCConstraintViolationSchema, ThreeTierConstraintViolationSchema])
  ),
  /** Original converged input that produced this BOM */
  input: ConvergedSizingInputSchema,
});

/** Inferred TypeScript type -- do not declare separately */
export type ConvergedBOM = z.infer<typeof ConvergedBOMSchema>;

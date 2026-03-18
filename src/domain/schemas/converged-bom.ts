/**
 * Zod schema for converged BOM output.
 * This schema is the single source of truth for the ConvergedBOM TypeScript type.
 * Use z.infer<typeof ConvergedBOMSchema> -- never declare the type separately.
 *
 * CONV-03: Combined BOM containing both Ethernet and FC sub-BOMs.
 * CONV-04: fcBom is nullable (null when hbaPortsPerServer=0).
 * CONV-05: violations is a union array of both Ethernet and FC violations.
 */

import { z } from 'zod';
import { NetworkBOMSchema, ConstraintViolationSchema } from './bom';
import { FCNetworkBOMSchema, FCConstraintViolationSchema } from './fc-bom';
import { ConvergedSizingInputSchema } from './converged-input';

export const ConvergedBOMSchema = z.object({
  /** Ethernet BOM -- always present (converged always has Ethernet) */
  ethernetBom: NetworkBOMSchema,
  /** FC BOM -- nullable (null when hbaPortsPerServer=0 per CONV-04) */
  fcBom: FCNetworkBOMSchema.nullable(),
  /** Combined violations from both Ethernet and FC engines (CONV-05) */
  violations: z.array(
    z.union([ConstraintViolationSchema, FCConstraintViolationSchema])
  ),
  /** Original converged input that produced this BOM */
  input: ConvergedSizingInputSchema,
});

/** Inferred TypeScript type -- do not declare separately */
export type ConvergedBOM = z.infer<typeof ConvergedBOMSchema>;

/**
 * Zod schemas for NetworkBOM output and ConstraintViolation discriminated union.
 * These schemas are the single source of truth for all BOM-related TypeScript types.
 */

import { z } from 'zod';
import { SizingInputSchema } from './input';

/**
 * Typed discriminated union for domain constraint violations.
 * The engine emits these — the UI renders them.
 * Never use raw strings for domain errors.
 */
export const ConstraintViolationSchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('OOB_PORT_SATURATION'),
    /** Number of OOB ports required */
    required: z.number().int(),
    /** Number of OOB ports available on one S3248T-ON */
    available: z.number().int(),
  }),
  z.object({
    code: z.literal('SPINE_CAPACITY_EXCEEDED'),
    /** Current number of leaf switches */
    leafCount: z.number().int(),
    /** Maximum leaves a single spine tier can support */
    maxLeafs: z.number().int(),
  }),
  z.object({
    code: z.literal('DAC_DISTANCE_ADVISORY'),
    /** Number of racks in the deployment */
    rackCount: z.number().int(),
    /** Cable type that triggered the advisory (always DAC) */
    cableType: z.literal('DAC'),
  }),
]);

/** Inferred TypeScript type — do not declare separately */
export type ConstraintViolation = z.infer<typeof ConstraintViolationSchema>;

/**
 * Bill of Materials output schema.
 * oversubscriptionRatio is required from day one — adding it later breaks all consumers.
 */
export const NetworkBOMSchema = z.object({
  /** Number of racks: ceil(totalServers / serversPerRack) */
  racks: z.number().int().min(0),
  /** Number of leaf switches: 2 × racks (redundant ToR pair) */
  leafSwitches: z.number().int().min(0),
  /** Number of spine switches: max(uplinkPorts, ceil(leafSwitches / spinePortCount)) */
  spineSwitches: z.number().int().min(0),
  /** Number of OOB switches: racks × ceil(oobPortsRequired / 48) */
  oobSwitches: z.number().int().min(0),
  /** Leaf-to-spine cables: leafSwitches × uplinkPorts (link model, not port sum) */
  leafSpineCables: z.number().int().min(0),
  /** Server-to-leaf cables: one per server */
  serverLeafCables: z.number().int().min(0),
  /** Server-to-OOB cables: totalServers + leafSwitches */
  serverOobCables: z.number().int().min(0),
  /** Oversubscription ratio: serverBandwidth / uplinkBandwidth per rack */
  oversubscriptionRatio: z.number().min(0),
  /** Typed constraint violations produced by the sizing engine */
  violations: z.array(ConstraintViolationSchema),
  /** Original input that produced this BOM */
  input: SizingInputSchema,
});

/** Inferred TypeScript type — do not declare separately */
export type NetworkBOM = z.infer<typeof NetworkBOMSchema>;

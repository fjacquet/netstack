/**
 * Zod schemas for ThreeTierBOM output and ThreeTierConstraintViolation discriminated union.
 * These schemas are the single source of truth for all three-tier BOM-related TypeScript types.
 *
 * IMPORTANT: This file does NOT import from './bom' (Ethernet Clos domain).
 * Three-tier violations are a separate discriminated union -- never mixed with Ethernet violations.
 *
 * TENG-05: Per-boundary oversubscription (accessToAggr, aggrToCore) is REQUIRED.
 * TENG-06: Inter-tier cable counts (serverAccess, accessAggr, aggrCore) are REQUIRED.
 */

import { z } from 'zod';
import { ThreeTierSizingInputSchema } from './three-tier-input';

/**
 * Typed discriminated union for three-tier domain constraint violations.
 * The three-tier sizing engine emits these -- the UI renders them.
 * Never use raw strings for domain errors.
 */
export const ThreeTierConstraintViolationSchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('AGGREGATION_CAPACITY_EXCEEDED'),
    /** Total access-tier uplinks presented to aggregation tier */
    accessUplinks: z.number().int(),
    /** Available downlink ports on aggregation switches */
    aggrDownlinks: z.number().int(),
  }),
  z.object({
    code: z.literal('CORE_CAPACITY_EXCEEDED'),
    /** Total aggregation-tier uplinks presented to core tier */
    aggrUplinks: z.number().int(),
    /** Available downlink ports on core switches */
    coreDownlinks: z.number().int(),
  }),
  z.object({
    code: z.literal('OOB_PORT_SATURATION'),
    /** Number of OOB ports required */
    required: z.number().int(),
    /** Number of OOB ports available on one S3248T-ON */
    available: z.number().int(),
  }),
  z.object({
    code: z.literal('DAC_DISTANCE_ADVISORY'),
    /** Number of racks in the deployment */
    rackCount: z.number().int(),
    /** Cable type that triggered the advisory (always DAC) */
    cableType: z.literal('DAC'),
  }),
  z.object({
    code: z.literal('RACK_CAPACITY_EXCEEDED'),
    /** 1-based rack number that overflows */
    rackNumber: z.number().int(),
    /** Total U-height of all devices in this rack */
    usedU: z.number().int(),
    /** Physical U capacity of the rack */
    totalU: z.number().int(),
  }),
]);

/** Inferred TypeScript type -- do not declare separately */
export type ThreeTierConstraintViolation = z.infer<typeof ThreeTierConstraintViolationSchema>;

/**
 * Three-Tier Bill of Materials output schema.
 * accessToAggrOversubscription and aggrToCoreOversubscription are required from day one --
 * adding them as optional later would break all consumers.
 */
export const ThreeTierBOMSchema = z.object({
  /** Number of server racks */
  racks: z.number().int().min(0),

  /** Number of network racks for aggregation/core switches + border leafs */
  networkRacks: z.number().int().min(0),

  /** Number of access-tier switches (ToR pairs per rack) */
  accessSwitches: z.number().int().min(0),

  /** Number of aggregation-tier switches */
  aggregationSwitches: z.number().int().min(0),

  /** Number of core-tier switches */
  coreSwitches: z.number().int().min(0),

  /** Number of OOB management switches */
  oobSwitches: z.number().int().min(0),

  /** Number of border leaf switches for WAN connectivity */
  borderLeafSwitches: z.number().int().min(0),

  /** Server-to-access cables: one per server per frontend port */
  serverAccessCables: z.number().int().min(0),

  /** Access-to-aggregation inter-tier cables */
  accessAggrCables: z.number().int().min(0),

  /** Aggregation-to-core inter-tier cables */
  aggrCoreCables: z.number().int().min(0),

  /** Server-to-OOB management cables */
  serverOobCables: z.number().int().min(0),

  /** VLT interconnect cables: 1 per access switch pair */
  vltCables: z.number().int().min(0),

  /** SFP28 transceivers for 25G server-access fiber links (2 per link), 0 for DAC/AOC */
  sfp28Count: z.number().int().min(0),

  /** QSFP28 transceivers for 100G inter-tier fiber links (2 per link), 0 for DAC/AOC */
  qsfp28Count: z.number().int().min(0),

  /** QSFP56-DD transceivers for 400G inter-tier links (2 per link), NEW for Z-series */
  qsfp56ddCount: z.number().int().min(0),

  /** Access-to-aggregation oversubscription ratio (TENG-05) */
  accessToAggrOversubscription: z.number().min(0),

  /** Aggregation-to-core oversubscription ratio (TENG-05) */
  aggrToCoreOversubscription: z.number().min(0),

  /** Switch placement mode echoed from input */
  switchPositioning: z.enum(['ToR', 'MoR', 'BoR']),

  /** Recommended cable length in metres based on switch positioning */
  recommendedCableLengthM: z.number().int().min(0),

  /** Typed constraint violations produced by the three-tier sizing engine */
  violations: z.array(ThreeTierConstraintViolationSchema),

  /** Original input that produced this BOM */
  input: ThreeTierSizingInputSchema,
});

/** Inferred TypeScript type -- do not declare separately */
export type ThreeTierBOM = z.infer<typeof ThreeTierBOMSchema>;

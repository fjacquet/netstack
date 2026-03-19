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
    /** Computed cable run distance in metres */
    computedDistanceM: z.number(),
    /** Speed-specific DAC distance limit in metres (25G → 3m, 100G → 5m) */
    dacLimitM: z.number(),
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

/** Inferred TypeScript type — do not declare separately */
export type ConstraintViolation = z.infer<typeof ConstraintViolationSchema>;

/**
 * Advisory schema — informational warnings (amber) separate from constraint violations (red).
 * Advisories do not block design, they recommend improvements.
 */
export const AdvisorySchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('PATCH_PANEL_RECOMMENDED'),
    /** Computed cable run distance in metres */
    computedDistanceM: z.number(),
    /** DAC distance limit exceeded (speed-specific) */
    dacLimitM: z.number(),
  }),
]);

/** Inferred TypeScript type — do not declare separately */
export type Advisory = z.infer<typeof AdvisorySchema>;

/**
 * Bill of Materials output schema.
 * oversubscriptionRatio is required from day one — adding it later breaks all consumers.
 */
export const NetworkBOMSchema = z.object({
  /** Number of server racks: ceil(totalServers / serversPerRack) */
  racks: z.number().int().min(0),
  /** Number of network racks for spines + border leafs (typically 1) */
  networkRacks: z.number().int().min(0),
  /** Number of leaf switches: 2 × racks (redundant ToR pair) */
  leafSwitches: z.number().int().min(0),
  /** Number of spine switches: max(uplinkPorts, ceil(leafSwitches / spinePortCount)) */
  spineSwitches: z.number().int().min(0),
  /** Number of OOB switches: racks × ceil(oobPortsRequired / 48) */
  oobSwitches: z.number().int().min(0),
  /** Number of border leaf switches for WAN connectivity (0 if none selected) */
  borderLeafSwitches: z.number().int().min(0),
  /** Leaf-to-spine cables: leafSwitches × uplinkPorts (link model, not port sum) */
  leafSpineCables: z.number().int().min(0),
  /** Server-to-leaf cables: one per server */
  serverLeafCables: z.number().int().min(0),
  /** Server-to-OOB cables: totalServers + leafSwitches */
  serverOobCables: z.number().int().min(0),
  /** SFP28 transceivers for 25G server-leaf fiber links (2 per link), 0 for DAC/AOC */
  sfp28Count: z.number().int().min(0),
  /** QSFP28 transceivers for 100G leaf-spine fiber links (2 per link), 0 for DAC/AOC */
  qsfp28Count: z.number().int().min(0),
  /** VLT interconnect cables: 1 QSFP28-DD per leaf pair (racks × 1) */
  vltCables: z.number().int().min(0),
  /** Oversubscription ratio: serverBandwidth / uplinkBandwidth per rack */
  oversubscriptionRatio: z.number().min(0),
  /** Switch placement mode echoed from input */
  switchPositioning: z.enum(['ToR', 'MoR', 'BoR']),
  /** Recommended cable length in metres based on switch positioning (ToR=2, MoR=1, BoR=2) */
  recommendedCableLengthM: z.number().int().min(0),
  /** Typed constraint violations produced by the sizing engine */
  violations: z.array(ConstraintViolationSchema),
  /** Informational advisories (amber) — non-blocking recommendations */
  advisories: z.array(AdvisorySchema).default([]),
  /** Original input that produced this BOM */
  input: SizingInputSchema,
  /** Cable length schedule per link type (Phase 26) */
  cableSchedule: z.object({
    serverLeafSkuM: z.number().int(),
    leafSpineSkuM: z.number().int(),
    vltSkuM: z.number().int(),
  }).optional(),
});

/** Inferred TypeScript type — do not declare separately */
export type NetworkBOM = z.infer<typeof NetworkBOMSchema>;

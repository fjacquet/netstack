/**
 * Zod schemas for FCNetworkBOM output and FCConstraintViolation discriminated union.
 * These schemas are the single source of truth for all FC BOM-related TypeScript types.
 *
 * IMPORTANT: This file does NOT import from './bom' (Ethernet domain).
 * FC violations are a separate discriminated union — never mixed with Ethernet violations.
 *
 * podLicensesRequired, fanInRatio, and islOversubscriptionRatio are REQUIRED fields.
 * Adding them as optional later would break all consumers — they are required from day one.
 */

import { z } from 'zod';
import { FCSizingInputSchema } from './fc-input';

/**
 * Typed discriminated union for FC domain constraint violations.
 * The FC sizing engine emits these — the UI renders them.
 * Never use raw strings for domain errors.
 */
export const FCConstraintViolationSchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('FC_PORT_SATURATION'),
    /** Total FC host ports required across both fabrics */
    requiredPorts: z.number().int(),
    /** Available ports on the selected switch model (after ISL reservation) */
    availablePorts: z.number().int(),
  }),
  z.object({
    code: z.literal('FC_OVERSUBSCRIPTION_EXCEEDED'),
    /** Computed fan-in ratio (host ports / storage ports) */
    ratio: z.number(),
    /** Maximum acceptable fan-in ratio (typically 7:1 for Broadcom Gen7) */
    maxRatio: z.number(),
  }),
  z.object({
    code: z.literal('FC_ISL_UNDERPROVISIONED'),
    /** ISL ports available between switches in the fabric */
    islsAvailable: z.number().int(),
    /** Minimum ISLs required to avoid bottleneck */
    islsRequired: z.number().int(),
  }),
]);

/** Inferred TypeScript type — do not declare separately */
export type FCConstraintViolation = z.infer<typeof FCConstraintViolationSchema>;

/**
 * FC Bill of Materials output schema.
 * podLicensesRequired, fanInRatio, and islOversubscriptionRatio are required from day one —
 * making them optional later would break all consumers and require a schema migration.
 */
export const FCNetworkBOMSchema = z.object({
  /** Number of FC switches in Fabric A (primary fabric) */
  fabricASwitches: z.number().int().min(0),

  /** Number of FC switches in Fabric B (secondary fabric — always matches fabricASwitches) */
  fabricBSwitches: z.number().int().min(0),

  /** Total host-facing ports allocated per fabric (HBA ports × total servers) */
  hostPortsPerFabric: z.number().int().min(0),

  /** Total storage-facing ports per fabric (storageTargetPorts / 2) */
  storagePortsPerFabric: z.number().int().min(0),

  /** ISL ports provisioned per fabric */
  islPortsPerFabric: z.number().int().min(0),

  /**
   * Effective port capacity per switch after POD license expansion.
   * Equals totalPorts for directors (podLicenseUnit=0).
   * For fixed-port switches: basePorts + (podLicensesPerSwitch × podLicenseUnit).
   * Used in the BOM display to show users why N switches are sufficient.
   */
  switchPortsPerFabric: z.number().int().min(1),

  /**
   * Total POD license units required across all FC switches.
   * 0 if base port count is sufficient; positive integer otherwise.
   * REQUIRED — not optional. The engine must always compute and return this.
   */
  podLicensesRequired: z.number().int().min(0),

  /** Total FC SFP/SFP+ optics required (2 per cable × cable count) */
  fcOpticsCount: z.number().int().min(0),

  /** ISL cable count between switches across both fabrics */
  islCables: z.number().int().min(0),

  /**
   * Fan-in ratio: total host ports / total storage ports.
   * Broadcom recommended max is 7:1 for Gen7 switches.
   * REQUIRED — not optional. Always computed and returned by the engine.
   */
  fanInRatio: z.number().min(0),

  /**
   * ISL oversubscription ratio: traffic demand / ISL bandwidth.
   * Used to flag FC_ISL_UNDERPROVISIONED violations.
   * REQUIRED — not optional. Always computed and returned by the engine.
   */
  islOversubscriptionRatio: z.number().min(0),

  /** Typed constraint violations produced by the FC sizing engine */
  violations: z.array(FCConstraintViolationSchema),

  /** Original FC input that produced this BOM */
  input: FCSizingInputSchema,
});

/** Inferred TypeScript type — do not declare separately */
export type FCNetworkBOM = z.infer<typeof FCNetworkBOMSchema>;

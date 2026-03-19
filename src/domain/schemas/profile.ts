/**
 * Zod schema for named configuration profiles.
 * This schema is the single source of truth for the Profile TypeScript type.
 * Use z.infer<typeof ProfileSchema> -- never declare the type separately.
 *
 * CFG-01: Profiles capture mode, topology, date, name, version, and the full input state.
 * CFG-02: Profiles are serialized to/from localStorage as a JSON array.
 *
 * inputState uses z.record(z.string(), z.unknown()) to avoid circular coupling with
 * SizingInput / FCSizingInput / ConvergedSizingInput schemas.
 * The service layer handles type safety at the boundaries.
 */

import { z } from 'zod';

/** Schema for a single named configuration profile */
export const ProfileSchema = z.object({
  /** Unique profile identifier (UUID v4) */
  id: z.string().uuid(),
  /** User-assigned profile name (1-100 characters) */
  name: z.string().min(1).max(100),
  /** Sizing mode this profile was created in */
  mode: z.enum(['ethernet', 'fc', 'converged']),
  /** Network topology (only meaningful for ethernet/converged modes) */
  topology: z.enum(['leaf-spine', 'three-tier']).optional(),
  /** ISO 8601 timestamp when the profile was saved */
  date: z.string(),
  /** Schema version for future migration support */
  version: z.number().int().default(1),
  /** Summary field: total server count across all racks (for display in list) */
  serverCount: z.number().int().min(0),
  /** Full input state from the active store -- typed generically per mode */
  inputState: z.record(z.string(), z.unknown()),
});

/** Inferred TypeScript type -- do not declare separately */
export type Profile = z.infer<typeof ProfileSchema>;

/** Schema for a list of profiles (for localStorage validation) */
export const ProfileListSchema = z.array(ProfileSchema);

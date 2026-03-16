/**
 * Zod schema for sizing engine input.
 * This schema is the single source of truth for the SizingInput TypeScript type.
 * Use z.infer<typeof SizingInputSchema> — never declare the type separately.
 */

import { z } from 'zod';

export const SizingInputSchema = z.object({
  /** Total number of servers to accommodate */
  totalServers: z.number().int().min(1).max(10_000),
  /** Number of servers per rack (determines rack count and OOB port requirements) */
  serversPerRack: z.number().int().min(1).max(48),
  /** Server-facing connectivity type */
  connectivityType: z.enum(['25G', '100G']),
  /** Cable type used for all inter-device connections */
  cableType: z.enum(['DAC', 'AOC', 'fiber']),
});

/** Inferred TypeScript type — do not declare separately */
export type SizingInput = z.infer<typeof SizingInputSchema>;

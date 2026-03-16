/**
 * Catalog override loader — merges a JSON override file into the base hardware catalog.
 *
 * Purpose: CAT-03 — engineers can define custom switch models via a JSON file at runtime
 * without code changes. All override entries are validated with Zod before merging.
 *
 * Design contract:
 * - Pure function: never mutates base catalog
 * - Fail-fast: throws on invalid JSON or invalid schema entries
 * - Returns a new Record<string, SwitchSpec> — always a fresh object
 */

import { SwitchSpecSchema } from '../schemas/catalog';
import type { SwitchSpec } from './types';

/**
 * Merges a JSON override into the base hardware catalog.
 *
 * @param base - The base catalog to extend (e.g., SWITCH_CATALOG). Never mutated.
 * @param overrideJson - Optional JSON string mapping model IDs to SwitchSpec objects.
 *   - If undefined or empty string: returns a shallow copy of base.
 *   - If malformed JSON: throws a SyntaxError.
 *   - If any entry fails Zod validation: throws a ZodError.
 * @returns A new Record<string, SwitchSpec> with base entries plus validated overrides.
 */
export function mergeCatalog(
  base: Record<string, SwitchSpec>,
  overrideJson?: string
): Record<string, SwitchSpec> {
  // If no override provided, return a shallow copy (new reference, same values)
  if (overrideJson === undefined || overrideJson === '') {
    return { ...base };
  }

  // Parse JSON — let SyntaxError propagate naturally for malformed input
  const rawOverrides = JSON.parse(overrideJson) as Record<string, unknown>;

  // Validate each entry individually — fail fast on first invalid entry
  const validatedOverrides: Record<string, SwitchSpec> = {};
  for (const [modelId, entry] of Object.entries(rawOverrides)) {
    // SwitchSpecSchema.parse throws ZodError on invalid input
    const validated = SwitchSpecSchema.parse(entry);
    validatedOverrides[modelId] = validated;
  }

  // Spread ensures a new object — overrides replace base entries with same key
  return { ...base, ...validatedOverrides };
}

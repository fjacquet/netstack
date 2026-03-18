# ADR-0012: Extensible Hardware Catalog with JSON Override

## Status
Accepted

## Date
2026-03-17

## Context
NetStack's sizing engine references switch specifications (port counts, speeds, power) from a static TypeScript constant `SWITCH_CATALOG`. New hardware models (e.g., Dell S5296F-ON added in v2.0) would require code changes to add, which creates friction for rapid catalog updates.

## Decision
The hardware catalog is a **typed TypeScript constant** (`SWITCH_CATALOG`, `FC_SWITCH_CATALOG`) as the primary source of truth, with a **JSON override loader** that can inject or override entries at runtime from a user-supplied file. This enables:
- New switch models to be added via JSON without recompilation
- Lab/pre-release hardware to be tested before catalog inclusion
- The TypeScript types remain strict — overrides are validated against the same Zod schemas

## Consequences
- All engine code references `SWITCH_CATALOG[model]` — never inline specs
- The JSON override path is a power-user feature; the default catalog is always correct for known models
- Adding a new model still requires a code PR to be "official"; JSON override is a workaround path
- TypeScript types are inferred from the catalog shape, preventing schema drift

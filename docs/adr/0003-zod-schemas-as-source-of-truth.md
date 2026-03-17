# ADR-0003: Zod Schemas as Single Source of Truth for Types

## Status
Accepted

## Date
2026-03-17

## Context
TypeScript types can be defined manually via `interface`/`type` declarations, or inferred from runtime validation schemas. Maintaining both leads to drift.

## Decision
All domain types are **inferred from Zod v4 schemas** via `z.infer<>`. We never declare TypeScript types separately from their schemas.

## Consequences
- Single source of truth — schema and type are always in sync
- Runtime validation comes for free (user inputs, JSON catalog overrides)
- Slightly more verbose schema definitions compared to plain `interface`
- Zod is a required dependency (acceptable given its size and utility)

# ADR-0004: Zustand for State Management

## Status
Accepted

## Date
2026-03-17

## Context
React state management options include Context API, Redux, Zustand, Jotai, and others. The app needs persisted user inputs and derived BOM results.

## Decision
We chose **Zustand** because:
- Minimal boilerplate compared to Redux
- Built-in `persist` middleware for localStorage
- Simple subscription model for derived state (resultStore recomputes from inputStore)
- `useShallow` selector prevents infinite render loops

## Consequences
- Must always use `useShallow` from `zustand/shallow` in selectors
- Two stores: `inputStore` (persisted) and `resultStore` (derived)
- Store shape changes require migration logic for existing localStorage data

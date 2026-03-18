# Contributing to NetStack

## Prerequisites

- **Node.js** LTS (v20+)
- **npm** (ships with Node.js) -- do not use pnpm or yarn

## Setup

```bash
git clone https://github.com/fjacquet/netstack.git
cd netstack
npm install
npm run dev        # Start Vite dev server
```

## Development Workflow

1. Create a feature branch from `maincd`:
   ```bash
   git checkout maincd && git pull
   git checkout -b feat/my-feature
   ```
2. Make your changes.
3. Verify before pushing:
   ```bash
   npm run typecheck   # tsc --noEmit (must pass with zero errors)
   npm test            # vitest run (all tests must pass)
   npm run build       # full production build
   ```

## Architecture Rules

The codebase enforces a strict one-way import chain:

```
Domain (pure TS) --> Store (Zustand) --> Features (React components)
```

- **`src/domain/`** -- Pure TypeScript. Zero React imports. Testable with Vitest in a Node environment.
  - `catalog/` -- Hardware specs as typed constants.
  - `schemas/` -- Zod v4 schemas (single source of truth for types).
  - `engine/` -- Sizing logic as pure functions.
- **`src/store/`** -- Zustand v5 stores. May import from `domain/`, never from `features/`.
- **`src/features/`** -- React 19 components. May import from `domain/` and `store/`.

Never import upward (e.g., `domain/` must not import from `store/` or `features/`).

## Code Style

- **TypeScript strict** -- no `any`, ever. Use `unknown` and narrow.
- **Types from Zod** -- declare schemas in `src/domain/schemas/`, then derive types with `z.infer<typeof MySchema>`. Never declare a standalone `interface` or `type` that duplicates a schema.
- **Zustand selectors** -- always use `useShallow` from `zustand/shallow` to prevent infinite re-renders.
- **Tailwind CSS v4** -- styles via utility classes. No `tailwind.config.js`; configuration lives in the `@tailwindcss/vite` plugin.
- **Imports** -- use path aliases (`@/domain/...`, `@/store/...`, `@/features/...`).

## Testing

```bash
npm test                                       # Run all tests
npx vitest run src/domain/engine/sizing.test.ts  # Run a single file
npm run test:watch                             # Watch mode
```

- Domain logic tests go next to the source file (`foo.test.ts` beside `foo.ts`).
- Tests run in a Node environment (no DOM needed for domain tests).
- Aim for coverage on every `engine/` function and every Zod schema.

## Adding i18n Strings

All user-facing text must be translated. Add the key to **all four** locale files:

| File | Language |
|------|----------|
| `src/i18n/locales/en/translation.json` | English |
| `src/i18n/locales/fr/translation.json` | French |
| `src/i18n/locales/de/translation.json` | German |
| `src/i18n/locales/it/translation.json` | Italian |

Use nested keys that match the feature (e.g., `"bom.totalPower"`). Never hard-code user-visible strings in JSX.

## Creating ADRs

Architecture Decision Records live in `docs/adr/`. Follow this format:

```markdown
# ADR-NNNN: Title

## Status
Proposed | Accepted | Superseded

## Date
YYYY-MM-DD

## Context
Why is this decision needed?

## Decision
What was decided.

## Consequences
Trade-offs and implications.
```

Number sequentially (the next available number is one above the highest existing file). Reference related ADRs where applicable.

## Pull Request Process

1. Branch from `maincd`. Use a descriptive branch name (`feat/`, `fix/`, `docs/`, `refactor/`).
2. Ensure **all checks pass** before opening a PR:
   - `npm run typecheck` -- zero TypeScript errors.
   - `npm test` -- all tests green.
   - `npm run build` -- production build succeeds.
3. Write a clear PR description: what changed and why.
4. Request review. The CI pipeline (GitHub Actions) will run type-check, tests, and build automatically.
5. After approval, squash-merge into `maincd`.

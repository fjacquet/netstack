# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NetStack is a client-side network sizing calculator for Dell Leaf-Spine + OOB infrastructure under SONiC. It takes server count and connectivity inputs and produces a Bill of Materials with topology diagrams. No backend — pure browser app deployed to GitHub Pages.

## Build & Test Commands

```bash
# Install dependencies
npm install

# Development server
npx vite dev

# Type checking
npx tsc --noEmit

# Run all tests
npx vitest run

# Run a single test file
npx vitest run src/domain/engine/sizing.test.ts

# Build for production
npx vite build

# Preview production build
npx vite preview
```

## Architecture

The codebase follows a strict layered architecture with one-way imports:

```
Domain (pure TS, no React) → Store (Zustand) → Features (React components)
```

### Domain Layer (`src/domain/`)

Pure TypeScript — zero React dependencies. Testable in isolation with Vitest (node environment).

- **`catalog/`** — Hardware specs as typed constants (`SWITCH_CATALOG`, `CABLE_CATALOG`), plus JSON override loader for extensibility
- **`schemas/`** — Zod v4 schemas as the single source of truth for types. All TypeScript types are inferred via `z.infer<>`, never declared separately
- **`engine/`** — Sizing logic: `calculateBOM(input: SizingInput): NetworkBOM` — a pure function with no side effects

### Store Layer (`src/store/`)

- `inputStore` — persisted to localStorage (user inputs)
- `resultStore` — derived (recomputed from inputStore on every change via Zustand subscription)

### Features Layer (`src/features/`)

React components organized by feature: input form, BOM panel, topology diagram, rack elevation, export.

## Hardware Catalog

Five Dell switch models with verified specs:

| Model | Role | Downlink Ports | Uplink Ports | Power |
|-------|------|----------------|--------------|-------|
| S5248F-ON | Leaf | 48×25G SFP28 | 4×100G QSFP28 | 647W |
| S5232F-ON | Spine | 32×100G QSFP28 | — | 635W |
| S5224F-ON | Leaf | 24×25G SFP28 | 4×100G QSFP28 | 455W |
| S5212F-ON | Leaf | 12×25G SFP28 | 3×100G QSFP28 | 304W |
| S3248T-ON | OOB | 48×1G RJ45 | 4×10G | 550W |

## Sizing Formulas

- **Racks**: `ceil(totalServers / serversPerRack)`
- **Leafs**: `2 × racks` (redundant ToR pair)
- **Spines**: `max(4, ceil(leafSwitches / 32))` — scales with leaf count, never hardcoded
- **OOB**: `racks × ceil((serversPerRack + 2) / 48)` — alert when ports > 48
- **Cables**: computed from link counts, not port sums (avoids off-by-2 error)
- **Oversubscription**: required field on every BOM output

## Key Conventions

- **TypeScript strict** — no `any`, ever. Equipment modeled with interfaces.
- **Types from Zod** — use `z.infer<typeof Schema>`, never declare types separately from schemas.
- **ConstraintViolation** — domain errors are typed discriminated unions (`OOB_PORT_SATURATION`, `SPINE_CAPACITY_EXCEEDED`, `DAC_DISTANCE_ADVISORY`), never raw strings.
- **Zustand selectors** — always use `useShallow` from `zustand/shallow` to avoid infinite render loops.
- **Tailwind v4** — uses `@tailwindcss/vite` plugin, no `tailwind.config.js` or PostCSS config.
- **@react-pdf/renderer** — for PDF generation (not `react-pdf` which is a viewer). Must be lazy-loaded.
- **@xyflow/react** — for topology diagrams (not the deprecated `reactflow` package).
- **i18n** — FR, EN, DE, IT with language switcher.
- **Theme** — light/dark mode with system preference detection.

## Planning

Project planning lives in `.planning/`:

- `PROJECT.md` — project charter and requirements overview
- `REQUIREMENTS.md` — 28 v1 requirements with REQ-IDs and phase traceability
- `ROADMAP.md` — 4-phase delivery plan
- `STATE.md` — current progress and accumulated context
- `research/` — stack, features, architecture, pitfalls research
- `phases/` — per-phase plans, research, and execution summaries

---

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:

```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)

```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)

```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)

```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)

```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)

```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)

```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)

```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)

```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)

```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands

```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->

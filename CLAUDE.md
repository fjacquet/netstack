# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NetStack is a client-side network sizing calculator supporting three modes: **Ethernet** (Dell Leaf-Spine + OOB under SONiC), **FC SAN** (Brocade Fibre Channel fabrics), and **Converged** (combined Ethernet + FC in a single design — v3.0, in progress). It takes server count and connectivity inputs and produces a Bill of Materials with topology diagrams. No backend — pure browser PWA deployed to GitHub Pages with offline support via Workbox service worker.

**Status**: v2.0 shipped (Ethernet + FC SAN complete), v3.0 in progress (converged mode).

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

Pure TypeScript — zero React dependencies. Testable in isolation with Vitest (node environment). The Ethernet and FC domains are kept as **parallel architectures** per ADR-0009 — separate catalog/schemas/engine with no shared generics.

#### Ethernet Domain

- **`catalog/`** — Hardware specs as typed constants (`SWITCH_CATALOG`, `CABLE_CATALOG`), plus JSON override loader for extensibility
- **`schemas/`** — Zod v4 schemas as the single source of truth for types. All TypeScript types are inferred via `z.infer<>`, never declared separately
- **`engine/`** — Sizing logic: `calculateBOM(input: SizingInput): NetworkBOM` — a pure function with no side effects

#### FC SAN Domain

- **`catalog/brocade.ts`** — `FC_SWITCH_CATALOG` (9 Brocade models) and `FC_OPTICS_CATALOG` (SFPs/QSFPs by speed)
- **`schemas/fc-input.ts`** — `FCSizingInput` Zod schema for FC fabric inputs
- **`engine/fc-sizing.ts`** — `calculateFCBOM()` pure function for Brocade fabric sizing

#### Converged Domain (v3.0 — in progress)

- **`schemas/converged-input.ts`** — `ConvergedSizingInput` schema combining Ethernet + FC inputs
- **`engine/converged-sizing.ts`** — Converged engine orchestrating both sizing functions

### Store Layer (`src/store/`)

- `inputStore` — persisted to localStorage (Ethernet user inputs)
- `resultStore` — derived (recomputed from inputStore on every change via Zustand subscription)
- `fcInputStore` — persisted to localStorage (FC SAN user inputs)
- `fcResultStore` — derived (recomputed from fcInputStore)
- `convergedInputStore` — persisted (converged mode inputs, v3.0)
- `convergedResultStore` — derived (converged mode results, v3.0)

### Features Layer (`src/features/`)

React components organized by feature: input form, BOM panel, topology diagram, rack elevation, export.

## Hardware Catalog

### Ethernet — Dell Switches (5 models)

| Model | Role | Downlink Ports | Uplink Ports | Power |
|-------|------|----------------|--------------|-------|
| S5248F-ON | Leaf | 48×25G SFP28 | 4×100G QSFP28 | 647W |
| S5232F-ON | Spine | 32×100G QSFP28 | — | 635W |
| S5224F-ON | Leaf | 24×25G SFP28 | 4×100G QSFP28 | 455W |
| S5212F-ON | Leaf | 12×25G SFP28 | 3×100G QSFP28 | 304W |
| S3248T-ON | OOB | 48×1G RJ45 | 4×10G | 550W |

### FC SAN — Brocade Switches (9 models)

| Model | Gen | Speed | Total Ports | Base Ports | POD |
|-------|-----|-------|-------------|------------|-----|
| G610 | Gen6 | 32G | 24 | 24 | No |
| G620 | Gen6 | 32G | 64 | 24 | Yes |
| G630 | Gen6 | 32G | 128 | 48 | Yes |
| G720 | Gen7 | 64G | 64 | 24 | Yes |
| G730 | Gen7 | 64G | 128 | 48 | Yes |
| X6-4 | Gen6 | 32G | 192 | 48 | Yes |
| X6-8 | Gen6 | 32G | 384 | 96 | Yes |
| X7-4 | Gen7 | 64G | 192 | 48 | Yes |
| X7-8 | Gen7 | 64G | 384 | 96 | Yes |

## Sizing Formulas

- **Racks**: `ceil(totalServers / serversPerRack)`
- **Leafs**: `2 × racks` (redundant ToR pair)
- **Spines**: `max(2, ceil(leafSwitches / 32))` — scales with leaf count (see ADR-0011)
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
- **`vite-plugin-pwa`** — PWA with Workbox service worker, prompt-based updates for offline support.
- **FC parallel domain** — separate catalog/schemas/engine per ADR-0009, no shared generics between Ethernet and FC.
- **Switch positioning** — ToR/MoR/BoR selector affects rack elevation layout and cable distance advisory.

## Planning

Project planning lives in `.planning/`:

- `PROJECT.md` — project charter and requirements overview
- `REQUIREMENTS.md` — v1/v2/v3 requirements with REQ-IDs and phase traceability, including v3.0 converged requirements (CONV-01 through CONV-12)
- `ROADMAP.md` — 17 phases across 4 milestones (v1.0, v1.1, v2.0, v3.0)
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

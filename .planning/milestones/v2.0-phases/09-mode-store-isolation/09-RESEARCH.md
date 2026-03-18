# Phase 9: Mode Store Isolation - Research

**Researched:** 2026-03-18
**Domain:** Zustand persist middleware — parallel stores with independent localStorage keys
**Confidence:** HIGH

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FC-09 | Mode selector at app level (Ethernet OR Fibre Channel, mutually exclusive) | Separate persisted stores (fcInputStore / fcResultStore) using independent localStorage keys; mode selector stored as ephemeral state prevents cross-contamination when switching modes |

</phase_requirements>

---

## Summary

Phase 9 creates two new stores — `fcInputStore` (persisted to `netstack-fc-input` v1) and `fcResultStore` (derived, not persisted) — that mirror the Ethernet `inputStore`/`resultStore` pair exactly. The FC schemas from Phase 8 (`FCSizingInputSchema`, `FCNetworkBOMSchema`) are already complete and ready for consumption. The stores are independent in every dimension: separate localStorage key, separate default value, separate TypeScript types, and a separate subscription chain. No FC field ever appears in the Ethernet schema, and the Ethernet store version stays at 5 — untouched.

The mode selector (`'ethernet' | 'fc'`) is deliberately kept as ephemeral component state — not persisted. This decision is locked in STATE.md. The user's inputs in each mode are persisted independently; restoring the mode on reload adds no value because `'ethernet'` is the safe default and FC inputs are already in localStorage waiting when the user returns to FC mode.

A Vitest isolation test — the primary success criterion for this phase — must prove byte-for-byte that mutating `fcInputStore` leaves the Ethernet `useInputStore` untouched. The test pattern mirrors the existing `resultStore.test.ts` and works in the jsdom environment.

**Primary recommendation:** Create `fcInputStore.ts` and `fcResultStore.ts` as near-identical mirrors of the Ethernet stores, wiring the subscription at module level. Keep mode as local React component state. Write one isolation Vitest that mutates the FC store and asserts the Ethernet store's serialized state is unchanged.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.12 | Store creation (`create`) | Already in use; FC stores are peers of existing stores |
| zustand/middleware `persist` | 5.0.12 | localStorage persistence for fcInputStore | Same middleware used by inputStore |
| zod | 4.3.6 | Schema/type for FCSizingInput, FCNetworkBOM | Already used; FC schemas from Phase 8 ready to consume |
| vitest | 4.1.0 | Isolation test confirming store independence | Already used; existing resultStore.test.ts is the test template |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand/shallow` (`useShallow`) | 5.0.12 | Selector memoization in components | Use in any React component that reads from fcInputStore or fcResultStore |
| `PersistStorage`, `StorageValue` from `zustand/middleware` | 5.0.12 | Type the lazy localStorage adapter | Required to replicate the `lazyLocalStorage` pattern from inputStore |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate persisted stores | Single store with discriminated union | Single store causes cross-contamination risk on schema migration; separate keys are the locked decision |
| Ephemeral component state for mode | Third persisted store `netstack-mode` | Persisting mode is the anti-pattern documented in ARCHITECTURE.md — stale mode on reload, extra migration burden |
| Module-level subscription | useEffect subscription | Module-level runs outside React lifecycle; fcResultStore is always up to date even before any component mounts |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure (additions for Phase 9)

```
src/
└── store/
    ├── inputStore.ts          # (existing, v5 — no changes in Phase 9)
    ├── resultStore.ts         # (existing — no changes in Phase 9)
    ├── fcInputStore.ts        # NEW: persisted to 'netstack-fc-input' v1
    └── fcResultStore.ts       # NEW: derived from fcInputStore; not persisted
```

### Pattern 1: Lazy localStorage Adapter (replicate verbatim)

**What:** A `PersistStorage<FCInputState>` adapter that reads/writes `window.localStorage` at call time (not module load time). This is identical to the `lazyLocalStorage` constant in `inputStore.ts`.

**When to use:** Required for jsdom test compatibility. Accessing `window.localStorage` at module load time fails in Node test environments. The lazy pattern defers access until `getItem`/`setItem` is called.

**Example:**

```typescript
// Source: src/store/inputStore.ts (verbatim pattern to replicate)
import type { PersistStorage, StorageValue } from 'zustand/middleware'

interface FCInputState {
  input: FCSizingInput
  setInput: (partial: Partial<FCSizingInput>) => void
  resetInput: () => void
}

const lazyLocalStorageFC: PersistStorage<FCInputState> = {
  getItem: (name: string): StorageValue<FCInputState> | null => {
    try {
      const str = window.localStorage.getItem(name)
      if (str === null) return null
      return JSON.parse(str) as StorageValue<FCInputState>
    } catch {
      return null
    }
  },
  setItem: (name: string, value: StorageValue<FCInputState>): void => {
    try {
      window.localStorage.setItem(name, JSON.stringify(value))
    } catch {}
  },
  removeItem: (name: string): void => {
    try {
      window.localStorage.removeItem(name)
    } catch {}
  },
}
```

### Pattern 2: fcInputStore — Persisted Store

**What:** Zustand persisted store for FC inputs. Version 1, key `netstack-fc-input`. No migration branch needed because this is a new key with no legacy data.

**When to use:** Every time user changes FC inputs. The store is read by FCInputForm (Phase 12) and subscribed to by fcResultStore.

**Example:**

```typescript
// Source: architecture pattern from ARCHITECTURE.md + inputStore.ts structure
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FCSizingInput } from '@/domain/schemas/fc-input'

const DEFAULT_FC_INPUT: FCSizingInput = {
  racks: [{ serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 }],
  hbaPortsPerServer: 2,
  storageTargetPorts: 4,
  storageArrayCount: 1,
  fcSwitchModel: 'G720',
  islPortsPerSwitch: 4,
  rackSize: '42U',
  serverUHeight: '1U',
}

export const useFCInputStore = create<FCInputState>()(
  persist(
    (set) => ({
      input: DEFAULT_FC_INPUT,
      setInput: (partial) =>
        set((state) => ({ input: { ...state.input, ...partial } })),
      resetInput: () => set({ input: DEFAULT_FC_INPUT }),
    }),
    {
      name: 'netstack-fc-input',
      version: 1,
      storage: lazyLocalStorageFC,
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<FCInputState>
        const oldInput = persistedState?.input as Partial<FCSizingInput> | undefined
        return {
          ...current,
          input: { ...DEFAULT_FC_INPUT, ...(oldInput ?? {}) } as FCSizingInput,
        }
      },
    }
  )
)
```

### Pattern 3: fcResultStore — Derived Store with Module-Level Subscription

**What:** Non-persisted Zustand store that subscribes to `useFCInputStore` at module load time and recomputes the FC BOM synchronously.

**When to use:** This is the only correct pattern for derived result stores in this codebase. Component-level subscriptions via `useEffect` would leave the result store stale before first render.

**Example:**

```typescript
// Source: src/store/resultStore.ts (verbatim pattern)
import { create } from 'zustand'
import { calculateFCBOM } from '@/domain/engine/fc-sizing'
import type { FCNetworkBOM, FCConstraintViolation } from '@/domain/schemas/fc-bom'
import { useFCInputStore } from './fcInputStore'

interface FCResultState {
  bom: FCNetworkBOM | null
  violations: FCConstraintViolation[]
}

export const useFCResultStore = create<FCResultState>()(() => ({
  bom: null,
  violations: [],
}))

// Module-level subscription: runs OUTSIDE React lifecycle
useFCInputStore.subscribe((state) => {
  try {
    const bom = calculateFCBOM(state.input)
    useFCResultStore.setState({ bom, violations: bom.violations })
  } catch {
    // Keep previous state if engine throws
  }
})

// Initial computation on module load
const initialInput = useFCInputStore.getState().input
try {
  const initialBom = calculateFCBOM(initialInput)
  useFCResultStore.setState({ bom: initialBom, violations: initialBom.violations })
} catch {}
```

### Pattern 4: Mode as Ephemeral Component State

**What:** The `'ethernet' | 'fc'` mode value is held in React component state (`useState`) in the top-level component. It is never written to any store, persisted key, or Zustand slice.

**When to use:** Phase 9 scope is store layer only. A `ModeSelector` component is deferred to Phase 12. Phase 9 only needs to validate the mode concept through tests.

**Example:**

```typescript
// Future pattern (Phase 12) — referenced here for store design context
const [mode, setMode] = useState<'ethernet' | 'fc'>('ethernet')
// mode controls which input store / result store to read, not persisted
```

### Anti-Patterns to Avoid

- **No version bump on inputStore.ts:** Phase 9 must not touch `inputStore.ts` at all. Version 5 stays at 5. Any change risks the migration merge function.
- **No cross-store imports:** `fcResultStore.ts` imports from `fcInputStore.ts`, not from `inputStore.ts`. `fcInputStore.ts` imports from domain schemas only.
- **No shared mutable state:** The two `lazyLocalStorage` adapters must be defined as separate constants with separate generic type parameters — sharing a single adapter instance risks type confusion.
- **No `merge` branch handling FC fields in Ethernet `merge`:** The existing `inputStore.ts` merge function is correct for Ethernet. FC fields (`hbaPortsPerServer`, `fcSwitchModel`, etc.) must never appear there.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage serialization | Custom JSON encode/decode | `zustand/middleware` `persist` with `lazyLocalStorage` | Handles null, parse errors, quota exceeded, and jsdom compatibility |
| Store version migration | Manual localStorage key reads | `persist` `merge` + `version` | Zustand handles version mismatch detection; `merge` provides safe fallback |
| Reactive BOM recomputation | `useEffect` in a component | Module-level `subscribe` at store load | Subscribe fires synchronously before first component mount; `useEffect` fires after |
| FC/Ethernet type discrimination | Manual `instanceof` checks | Separate TypeScript types from separate Zod schemas | Type system enforces isolation at compile time; no runtime check needed |

**Key insight:** The Zustand `persist` middleware handles all the hard parts of localStorage management. The only correctness concern is the storage `name` key — using the same key for two stores is the single failure mode to avoid in this phase.

---

## Common Pitfalls

### Pitfall 1: Same localStorage Key for FC and Ethernet Stores

**What goes wrong:** If `fcInputStore` is registered with `name: 'netstack-input'` (same as Ethernet), the two stores compete for the same key. When the FC store writes, it overwrites the Ethernet state. On next page load, Ethernet's `merge` function receives FC-shaped JSON and either falls back to defaults (silent data loss) or throws (app crash).

**Why it happens:** Copy-paste error when creating fcInputStore from inputStore as template; developer forgets to change the `name` field.

**How to avoid:** The key `netstack-fc-input` is the required value. Unit test: after initializing both stores and mutating fcInputStore, `window.localStorage.getItem('netstack-input')` must not contain any FC fields.

**Warning signs:**

- `persist({ name: 'netstack-input' })` in fcInputStore.ts — caught immediately by the isolation test

### Pitfall 2: `calculateFCBOM` Not Available Before Phase 10

**What goes wrong:** Phase 9 depends on Phase 8 having produced the FC engine (`fc-sizing.ts`). If `calculateFCBOM` is not implemented, `fcResultStore.ts` cannot subscribe.

**Why it happens:** The phase tracing in REQUIREMENTS.md shows FC-05 through FC-08 (engine formulas) are in Phase 10, but the store subscription only needs a callable `calculateFCBOM` function — even a stub that returns a valid `FCNetworkBOM` shape is sufficient for Phase 9.

**How to avoid:** Check whether `src/domain/engine/fc-sizing.ts` exists before implementing `fcResultStore.ts`. If it does not exist, create a minimal stub that returns `DEFAULT_FC_BOM`. The engine is fleshed out in Phase 10.

**Warning signs:** TypeScript error `Module not found: @/domain/engine/fc-sizing` when writing fcResultStore.ts.

### Pitfall 3: Module-Level Code Runs in Test Node Environment Without `window`

**What goes wrong:** The module-level subscription in `fcResultStore.ts` calls `useFCInputStore.getState()` at import time. `useFCInputStore` uses `lazyLocalStorageFC`, which accesses `window.localStorage`. In a Node (non-jsdom) Vitest environment, `window` is undefined, causing an immediate crash on import.

**Why it happens:** Vitest defaults to the `node` environment for non-React test files. The existing `resultStore.test.ts` passes because the test file either uses jsdom or the lazy access is deferred until after environment setup.

**How to avoid:** The isolation test file must declare `@vitest-environment jsdom` at the top, or the Vitest config must set the test environment for all store tests. The existing `resultStore.test.ts` does NOT have this annotation — verify the project Vitest config for the store test environment.

**Warning signs:** `ReferenceError: window is not defined` in the isolation test.

### Pitfall 4: Using `useShallow` Selector in Non-Component Context

**What goes wrong:** `useShallow` is a React hook — it may not be called outside a React component. The module-level subscription uses `useFCInputStore.subscribe((state) => …)`, not a hook selector. Using `useShallow` here would violate the Rules of Hooks.

**Why it happens:** Developer confuses the hook-based selector API (`useFCInputStore(useShallow((s) => s.input))`) with the module-level subscription API.

**How to avoid:** Module-level code uses `useFCInputStore.subscribe` and `useFCInputStore.getState()` — never hooks. Hook selectors with `useShallow` are only used inside React components.

---

## Code Examples

### Isolation Test Pattern (primary success criterion)

```typescript
// Source: resultStore.test.ts template + isolation test requirement from phase spec
// File: src/store/fcInputStore.test.ts (new file)
import { describe, it, expect, beforeEach } from 'vitest'
import { useInputStore } from './inputStore'
import { useFCInputStore } from './fcInputStore'

describe('store isolation: FC and Ethernet stores are independent', () => {
  const ETH_DEFAULT_RACKS = [
    { serverCount: 16 }, { serverCount: 16 }, { serverCount: 16 },
  ]

  beforeEach(() => {
    useInputStore.setState({
      input: {
        racks: ETH_DEFAULT_RACKS,
        portsPerServerFrontend: 1,
        portsPerServerBackend: 1,
        activeUplinksPerLeaf: 4,
        connectivityType: '25G',
        cableType: 'DAC',
        leafModel: 'S5248F-ON',
        spineModel: 'S5232F-ON',
        borderLeafModel: 'none',
        borderLeafCount: 0,
        rackSize: '42U',
        serverUHeight: '1U',
      },
    })
  })

  it('mutating fcInputStore does not change Ethernet inputStore', () => {
    const ethBefore = JSON.stringify(useInputStore.getState().input)

    // Mutate the FC store significantly
    useFCInputStore.getState().setInput({
      racks: [{ serverCount: 100 }, { serverCount: 100 }],
      hbaPortsPerServer: 4,
      fcSwitchModel: 'G730',
    })

    const ethAfter = JSON.stringify(useInputStore.getState().input)
    expect(ethAfter).toBe(ethBefore)
  })

  it('mutating Ethernet inputStore does not change fcInputStore', () => {
    const fcBefore = JSON.stringify(useFCInputStore.getState().input)

    useInputStore.getState().setInput({
      racks: [{ serverCount: 200 }],
      leafModel: 'S5212F-ON',
    })

    const fcAfter = JSON.stringify(useFCInputStore.getState().input)
    expect(fcAfter).toBe(fcBefore)
  })

  it('localStorage keys are distinct: netstack-input and netstack-fc-input', () => {
    // After both stores have been used, each key holds only its own type's data
    useFCInputStore.getState().setInput({ fcSwitchModel: 'G820' })

    const ethRaw = window.localStorage.getItem('netstack-input')
    const fcRaw = window.localStorage.getItem('netstack-fc-input')
    // FC key must not appear in Ethernet key and vice versa
    expect(ethRaw).not.toContain('fcSwitchModel')
    if (fcRaw) {
      expect(fcRaw).not.toContain('leafModel')
    }
  })
})
```

### DEFAULT_FC_INPUT Value

```typescript
// Source: FCSizingInputSchema defaults from src/domain/schemas/fc-input.ts
// The schema defines: hbaPortsPerServer.default(2), storageTargetPorts.default(4),
//   storageArrayCount.default(1), islPortsPerSwitch.default(4), serverUHeight.default('1U')
// rackSize and fcSwitchModel have no schema default — must be provided explicitly

const DEFAULT_FC_INPUT: FCSizingInput = {
  racks: [
    { serverCount: 16 },
    { serverCount: 16 },
    { serverCount: 16 },
  ],
  hbaPortsPerServer: 2,
  storageTargetPorts: 4,
  storageArrayCount: 1,
  fcSwitchModel: 'G720',    // Gen7 64G — most common starting point
  islPortsPerSwitch: 4,
  rackSize: '42U',
  serverUHeight: '1U',
}
```

### fcResultStore wiring (requires fc-sizing.ts stub if engine not yet built)

```typescript
// If calculateFCBOM does not yet exist, a temporary stub can be used:
// src/domain/engine/fc-sizing.ts (stub for Phase 9 only)
import type { FCSizingInput } from '../schemas/fc-input'
import type { FCNetworkBOM } from '../schemas/fc-bom'

export function calculateFCBOM(_input: FCSizingInput): FCNetworkBOM {
  return {
    fabricASwitches: 0,
    fabricBSwitches: 0,
    hostPortsPerFabric: 0,
    storagePortsPerFabric: 0,
    islPortsPerFabric: 0,
    podLicensesRequired: 0,
    fcOpticsCount: 0,
    islCables: 0,
    fanInRatio: 0,
    islOversubscriptionRatio: 0,
    violations: [],
    input: _input,
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand v4 `persist` required explicit `createJSONStorage` | Zustand v5 `persist` accepts custom `PersistStorage<T>` directly | Zustand 5.0.0 (2024) | The `lazyLocalStorage` pattern in inputStore.ts is the v5-correct way; no `createJSONStorage` wrapper needed |
| `devtools` middleware commonly stacked with `persist` | Phase 9 uses `persist` only (no devtools) | Project convention | devtools adds no value for isolated store tests; omit for simplicity |
| Zustand v5: initial state auto-written to storage | Zustand v5: initial state NOT auto-written | Zustand 5.0.0 | Store starts blank in localStorage until first explicit user mutation; `merge` fallback handles cold start correctly |

**Deprecated/outdated:**

- `createJSONStorage(() => localStorage)`: Works in Zustand v5 but the `lazyLocalStorage` pattern is used project-wide for jsdom compatibility — do not introduce `createJSONStorage` in new stores.

---

## Open Questions

1. **Does `fc-sizing.ts` engine exist after Phase 8?**
   - What we know: Phase 8 plans covered FC catalog (`brocade.ts`, `fc-types.ts`) and schemas (`fc-input.ts`, `fc-bom.ts`). The engine is in Phase 10 scope.
   - What's unclear: Phase 8 summaries show completion of catalog + schema; engine stubs may or may not have been created.
   - Recommendation: Check `src/domain/engine/fc-sizing.ts` at plan time. If absent, include a minimal stub task in Phase 9 Wave 0 or as the first task.

2. **Vitest environment for store tests**
   - What we know: `resultStore.test.ts` passes in the current test suite (it uses `useInputStore.setState` which calls localStorage lazily).
   - What's unclear: The existing config does not show an explicit `@vitest-environment jsdom` annotation on the file. The project Vitest config likely sets jsdom globally.
   - Recommendation: Run `npx vitest run src/store/resultStore.test.ts` before writing the isolation test to confirm the environment. If it passes without annotation, the global jsdom config covers FC store tests too.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vite.config.ts` (Vitest config inline) or `vitest.config.ts` |
| Quick run command | `npx vitest run src/store/fcInputStore.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FC-09 | Mutating fcInputStore leaves Ethernet inputStore byte-for-byte unchanged | unit | `npx vitest run src/store/fcInputStore.test.ts` | Wave 0 |
| FC-09 | fcInputStore persists to key `netstack-fc-input` (v1) | unit | `npx vitest run src/store/fcInputStore.test.ts` | Wave 0 |
| FC-09 | fcResultStore derives from fcInputStore (not from inputStore) | unit | `npx vitest run src/store/fcResultStore.test.ts` | Wave 0 |
| FC-09 | Mode selector ephemeral — not persisted to localStorage | manual verify | Check localStorage after mode change | N/A |
| FC-09 | Store layer compiles with TypeScript strict + no cross-domain imports | static | `npx tsc --noEmit` | N/A (runs on existing files) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/store/fcInputStore.test.ts src/store/fcResultStore.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npx tsc --noEmit` before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/store/fcInputStore.test.ts` — covers FC-09 isolation tests (all three test cases above)
- [ ] `src/store/fcResultStore.test.ts` — covers fcResultStore subscription behavior
- [ ] `src/domain/engine/fc-sizing.ts` — stub required if not present after Phase 8; fcResultStore cannot compile without it

*(Existing `src/store/resultStore.test.ts` provides the template pattern for both new test files.)*

---

## Sources

### Primary (HIGH confidence)

- `src/store/inputStore.ts` — lazy localStorage adapter pattern, persist version, merge function
- `src/store/resultStore.ts` — module-level subscribe pattern, derived store structure
- `src/store/resultStore.test.ts` — test pattern for store isolation
- `src/domain/schemas/fc-input.ts` — `FCSizingInputSchema` complete with field defaults
- `src/domain/schemas/fc-bom.ts` — `FCNetworkBOMSchema` complete with required fields
- `.planning/research/ARCHITECTURE.md` — locked decisions: separate keys, ephemeral mode selector, Pattern 2 and 3
- `.planning/research/PITFALLS.md` — Pitfall 5 (mode switch corrupts Ethernet state), integration gotchas table
- `.planning/STATE.md` — locked decision: "Mode selector is ephemeral UI state — not persisted to localStorage"

### Secondary (MEDIUM confidence)

- [Zustand Persist Middleware Reference](https://zustand.docs.pmnd.rs/reference/middlewares/persist) — confirm `PersistStorage<T>` type, `merge` callback signature, v5 initial state behavior
- `npm view zustand version` — confirmed 5.0.12 is current

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — exact versions confirmed from package.json; all libraries already in use
- Architecture: HIGH — patterns verified against existing inputStore/resultStore implementations; locked decisions from STATE.md
- Pitfalls: HIGH — Pitfall 5 from PITFALLS.md directly addresses this phase; additional pitfalls derived from reading actual store code

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable libraries; Zustand 5.x is not fast-moving)

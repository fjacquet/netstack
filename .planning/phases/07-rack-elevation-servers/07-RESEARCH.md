# Phase 7: Rack Elevation Servers - Research

**Researched:** 2026-03-18
**Domain:** React rack-elevation rendering, Zod schema extension, domain engine violations
**Confidence:** HIGH

## Summary

Phase 7 extends an already-complete rack elevation view to render servers as amber device
slots with configurable U-heights (1U/2U/4U/8U), and to detect when the total device
U-height in a rack exceeds its physical U capacity. The domain engine must emit a new
`RACK_CAPACITY_EXCEEDED` violation per overflowing rack.

All technical groundwork is in place. The existing `buildRackDevices` utility, `RackFrame`,
`RackDevice`, `BOMPanel` violation pattern, `SizingInputSchema`, `ConstraintViolationSchema`,
and i18n infrastructure are fully understood from reading the source. No new third-party
dependencies are required.

**Primary recommendation:** Follow the exact patterns already established by
`OOB_PORT_SATURATION` for the violation (schema, engine, BOM panel) and by `RackDevice.tsx`
for the new `ServerDevice` component. The rendering change in `RackFrame` is the only
structurally novel work.

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ELEV-01 | Servers are visible in the rack elevation view with correct U-height | `buildRackDevices` extended to emit server entries; `RackFrame` slot-loop modified to skip covered slots and render `ServerDevice` at correct height |
| ELEV-02 | User can configure server U-height (1U, 2U, 4U, 8U) | New `serverUHeight` field in `SizingInputSchema` (`z.enum(['1U','2U','4U','8U']).default('1U')`); `Select` in InputForm Physical section; migrate persist version 4 → 5 |
| ELEV-03 | RACK_CAPACITY_EXCEEDED violation fires when total device U-height exceeds rack size | New variant in `ConstraintViolationSchema`; engine computes used-U per rack and compares to `parseInt(input.rackSize)`; BOM panel renders via existing `ViolationAlert` switch |
</phase_requirements>

---

## Standard Stack

### Core (verified from source, HIGH confidence)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod v4 | `z` from `'zod'` | Schema extension — add `serverUHeight` to `SizingInputSchema`; add `RACK_CAPACITY_EXCEEDED` to `ConstraintViolationSchema` | All types inferred via `z.infer<>` per project convention |
| React 18 | in use | New `ServerDevice` component; `RackCapacityBadge` component | Project standard |
| Tailwind v4 | `@tailwindcss/vite` | Arbitrary height classes (`h-[88px]`, `h-[176px]`, `h-[352px]`) and `border-destructive` | Project standard; no `tailwind.config.js` |
| shadcn/ui | components present | `Select` for U-height picker; `Badge` for capacity badge; `Alert` for violation | Already initialized; style=default, baseColor=neutral |
| lucide-react | in use | `AlertCircle` icon for RACK_CAPACITY_EXCEEDED (matches OOB_PORT_SATURATION) | Project standard |
| react-i18next | in use | All new copy via i18n keys in 4 locales | Project standard |
| Zustand persist v4 | in use | Version bump to 5 for `serverUHeight` field migration | Project standard; merge() spread pattern already handles missing fields |
| Vitest | in use | Unit tests for engine violation and `buildRackDevices` | Project standard; 204 tests passing |

### No new dependencies needed

All required UI components (`Select`, `Badge`, `Alert`, `Card`) are already installed
via shadcn. No new `npm install` is required for this phase.

---

## Architecture Patterns

### Recommended Project Structure

No structural additions. All new files fit within existing feature directories:

```
src/
├── domain/
│   ├── schemas/
│   │   ├── input.ts         # +serverUHeight field
│   │   └── bom.ts           # +RACK_CAPACITY_EXCEEDED variant
│   └── engine/
│       └── sizing.ts        # +capacity check loop per rack
├── features/
│   └── rack-elevation/
│       ├── types.ts         # +uHeight field, +server role
│       ├── ServerDevice.tsx # NEW
│       ├── RackCapacityBadge.tsx # NEW
│       ├── RackFrame.tsx    # extend slot loop for multi-U
│       └── utils/
│           └── buildRackDevices.ts  # +server device entries
├── store/
│   └── inputStore.ts        # +serverUHeight default, version 4→5
└── features/
    └── sizing/
        ├── InputForm.tsx    # +serverUHeight Select in Physical section
        └── BOMPanel.tsx     # +RACK_CAPACITY_EXCEEDED case in ViolationAlert
```

### Pattern 1: Schema Extension (Zod enum with .default())

Follows the `portsPerServerFrontend` / `activeUplinksPerLeaf` precedent. Using `.default()`
means existing persisted state without the field migrates automatically via the spread in
`merge()`.

```typescript
// src/domain/schemas/input.ts — add inside SizingInputSchema
/** U-height of each server for rack elevation rendering (1U default) */
serverUHeight: z.enum(['1U', '2U', '4U', '8U']).default('1U'),
```

```typescript
// src/domain/schemas/bom.ts — add new variant in ConstraintViolationSchema array
z.object({
  code: z.literal('RACK_CAPACITY_EXCEEDED'),
  /** 1-based rack number that overflows */
  rackNumber: z.number().int(),
  /** Total U-height of all devices in this rack */
  usedU: z.number().int(),
  /** Physical U capacity of the rack */
  totalU: z.number().int(),
}),
```

### Pattern 2: Engine Violation Loop

Mirror the `OOB_PORT_SATURATION` check pattern exactly. Loop over `input.racks` after
all switch counts are computed. Fixed devices per server rack: OOB (1U) + Leaf B (1U) +
Leaf A (1U) = 3U of switches always present. Total used U = `switchU + (serverCount * uHeightInt)`.

```typescript
// src/domain/engine/sizing.ts — add after existing violations block
const uHeightInt = parseInt(input.serverUHeight); // '1U' → 1, '2U' → 2, etc.
const rackSizeU = parseInt(input.rackSize);        // '42U' → 42 (already computed above)
const switchUPerRack = 3; // OOB (U1) + Leaf B (U2) + Leaf A (U3)

for (let i = 0; i < input.racks.length; i++) {
  const serverU = input.racks[i].serverCount * uHeightInt;
  const usedU = switchUPerRack + serverU;
  if (usedU > rackSizeU) {
    violations.push({
      code: 'RACK_CAPACITY_EXCEEDED',
      rackNumber: i + 1,
      usedU,
      totalU: rackSizeU,
    });
  }
}
```

**Important:** `rackSizeU` is already `parseInt(input.rackSize)` at line 72 of `sizing.ts`.
Reuse that variable; do not recalculate.

### Pattern 3: RackFrame Multi-U Slot Rendering

The current loop iterates one slot per U. For multi-U server devices, the loop must
skip covered slots. Track a `Set<number>` of covered slots, populated when a multi-U
device is placed.

```typescript
// Pseudocode for RackFrame.tsx slot loop extension
const coveredSlots = new Set<number>()
for (const device of devices) {
  if (device.role === 'server' && device.uHeight > 1) {
    for (let s = device.uSlot - 1; s <= device.uSlot + device.uHeight - 2; s++) {
      if (s !== device.uSlot) coveredSlots.add(s)
    }
  }
}

// In the slot render loop:
if (coveredSlots.has(uSlot)) return null  // skip — already rendered by multi-U device above
```

Note: The slot loop renders top-to-bottom (highest U first). A 2U server at uSlot=5
spans U5 and U4. When rendering U5 (first), render the `ServerDevice` at full height.
When the loop reaches U4, skip it via `coveredSlots`.

### Pattern 4: buildRackDevices Server Entries

After the 3 switch devices (U1/U2/U3), append server entries starting at U4:

```typescript
// src/features/rack-elevation/utils/buildRackDevices.ts
const uHeight = parseInt(bom.input.serverUHeight)  // '1U' → 1
let currentUSlot = 4
for (let s = 0; s < serverCount; s++) {
  devices.push({
    id: `rack-${rackIndex}-server-${s}`,
    model: '',           // servers have no model
    role: 'server',
    label: `Server ${s + 1}`,
    uSlot: currentUSlot,
    uHeight,
    usedPorts: 0,
    totalPorts: 0,
  })
  currentUSlot += uHeight
}
```

### Pattern 5: ServerDevice Component

Mirror `RackDevice.tsx` structure but simpler: not draggable, amber color, shows U-height
badge.

```typescript
// src/features/rack-elevation/ServerDevice.tsx
// Height: style={{ height: `${uHeight * 44}px` }} — Tailwind JIT cannot handle
// fully dynamic values with variables; use inline style for the height.
// Background: bg-[hsl(25_95%_80%)] dark:bg-[hsl(25_95%_28%)]
// Badge top-right: text-[10px] absolute top-0.5 right-1
```

**Critical note:** Tailwind v4 can handle `h-[88px]`, `h-[176px]`, `h-[352px]` as
static arbitrary values in class strings, but dynamically composing `h-[${n}px]` from
a variable is unreliable with JIT. Use inline `style={{ height: uHeight * 44 + 'px' }}`
for the height, or pre-enumerate the 4 classes as a lookup map.

### Pattern 6: InputForm Select for serverUHeight

Add inside the Physical section, after the `rackSize` Select. Follows the exact same
JSX structure as the existing `rackSize` FormField.

```typescript
// FormValues interface: add serverUHeight: '1U' | '2U' | '4U' | '8U'
// defaultValues: serverUHeight: input.serverUHeight
// The form.watch subscription already handles Select updates via the
// immediate-update path (non-debounced select inputs → setInput)
```

### Pattern 7: Persist Version Migration

Current store version is 4. Adding `serverUHeight` requires bumping to 5. The
`merge()` spread pattern `{ ...DEFAULT_INPUT, ...oldInput }` automatically fills in
`serverUHeight: '1U'` for any stored state that lacks the field — no explicit migration
branch needed. Just bump `version: 4` → `version: 5` and add `serverUHeight: '1U'` to
`DEFAULT_INPUT`.

### Pattern 8: ViolationAlert Switch Case

The `ViolationAlert` function in `BOMPanel.tsx` uses an explicit `if (v.code === ...)` chain.
Add a new branch for `RACK_CAPACITY_EXCEEDED` using `AlertCircle` and `variant="destructive"`,
matching `OOB_PORT_SATURATION` exactly.

```typescript
if (v.code === 'RACK_CAPACITY_EXCEEDED') {
  return (
    <Alert variant="destructive" role="alert" key={`${v.code}-${v.rackNumber}`}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t('bom.violationRackCapacityTitle')}</AlertTitle>
      <AlertDescription>
        {t('bom.violationRackCapacityBody', {
          rackN: v.rackNumber,
          used: v.usedU,
          total: v.totalU,
        })}
      </AlertDescription>
    </Alert>
  )
}
```

**Note on key:** Unlike other violations where `v.code` is unique, multiple racks can
exceed capacity simultaneously. Key must include `v.rackNumber` to avoid React key
collisions.

### Anti-Patterns to Avoid

- **Dynamic Tailwind class composition:** Do not write `className={\`h-[\${n * 44}px]\`}`.
  JIT will not generate those classes. Use a static lookup map or inline`style={}`.
- **Recalculating rackSizeU in the engine:** `rackSizeU` is already on line 72 of `sizing.ts`.
  Reuse it.
- **Making server slots draggable:** UI-SPEC explicitly prohibits drag for servers in v1.
  Add a comment noting v2 scope and do NOT pass `draggable` or keyboard handlers to `ServerDevice`.
- **Global violation key:** `RACK_CAPACITY_EXCEEDED` can fire multiple times (once per
  overflowing rack). The React key on `ViolationAlert` must be unique per instance.
- **Splitting serverUHeight into the rack elevation view:** UI-SPEC locked this to
  `InputForm.tsx` (Physical section). Do not add a second input in the rack view.
- **Using `parseInt()` without radix:** Always `parseInt(str, 10)` or use `Number(str)`
  to avoid octal parsing edge cases.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enum validation for serverUHeight | Custom type guard | `z.enum(['1U','2U','4U','8U'])` | Zod discriminated union already in use; type is inferred automatically |
| Violation deduplication | Custom Map or Set | Engine emits one per rack naturally | Engine loops over `input.racks`, one violation object per overflowing rack |
| Amber color token | New CSS variable | Inline `hsl(25_95%_80%)` | UI-SPEC specifies exact values; no CSS variable exists for amber in neutral shadcn theme (same decision as Phase 3 for warning badge) |
| Storage migration | Explicit version branch | Spread merge pattern | Already proven for versions 2→3 and 3→4; `{ ...DEFAULT_INPUT, ...oldInput }` fills missing fields |

---

## Common Pitfalls

### Pitfall 1: Multi-U Slot Rendering — Off-by-One in Skip Logic

**What goes wrong:** A 2U server at uSlot=5 should render at U5 and skip U4. If the
skip set uses `uSlot` as the anchor instead of `uSlot + uHeight - 1` as the top slot,
covered slots are computed incorrectly.
**Why it happens:** The visual loop renders top-to-bottom (high U number first). The
device's `uSlot` is the bottom-most slot it occupies; the covered slots above it must
be skipped.
**How to avoid:** Confirm the convention: `uSlot` = lowest U occupied (bottom anchor).
Covered slots = `uSlot + 1` through `uSlot + uHeight - 1`. Render the device at the
highest-U slot in its span (`uSlot + uHeight - 1`), not at `uSlot`.
**Warning signs:** Servers render in wrong position, or empty slots appear inside server span.

### Pitfall 2: Rack Overflow When Servers = 0

**What goes wrong:** With `serverCount: 0` racks (allowed by schema), computing
`0 * uHeight + 3` = 3U used, which never exceeds any rack size. Engine must not emit
a false violation for empty racks.
**How to avoid:** The formula `usedU = 3 + serverCount * uHeightInt` naturally handles
this: with `serverCount: 0`, `usedU = 3`, which is always < rackSizeU. No special guard needed.

### Pitfall 3: RackCapacityBadge Data Flow

**What goes wrong:** The `RackCapacityBadge` needs to know used-U for the *currently
selected* rack, not the worst-case rack. This data lives in `buildRackDevices` output
but must be computed or passed through.
**How to avoid:** Compute `usedU` alongside `buildRackDevices` in `RackElevationTab`.
After building devices for the selected rack, sum `device.uHeight` for all devices in
the resulting array. Pass `{ used, total: rackUnits }` to `RackCapacityBadge`.

### Pitfall 4: Violation Key Collision in BOMPanel

**What goes wrong:** `violations.map((v) => <ViolationAlert key={v.code} v={v} />)` uses
`v.code` as the React key. Since multiple racks can produce `RACK_CAPACITY_EXCEEDED`,
this causes duplicate keys.
**How to avoid:** Change the key to `${v.code}-${v.code === 'RACK_CAPACITY_EXCEEDED' ? v.rackNumber : '0'}` or use the array index as a fallback. Alternatively, use `violations.map((v, i) => <ViolationAlert key={i} v={v} />)` which is safe here since the list is read-only.

### Pitfall 5: serverUHeight Missing from FormValues Interface

**What goes wrong:** `InputForm.tsx` has a local `FormValues` interface distinct from
`SizingInput`. Adding `serverUHeight` to `SizingInputSchema` does NOT automatically
update `FormValues`. TypeScript strict mode will catch this only if the field is referenced.
**How to avoid:** Update `FormValues` interface, `useForm` `defaultValues`, the `form.watch`
subscription exclusion list, and the `resetInput()` call inside the Reset button handler.

### Pitfall 6: i18n Keys in All 4 Locales

**What goes wrong:** Adding keys only to `en/translation.json` causes the app to fall
back to the key string in other locales.
**How to avoid:** The UI-SPEC lists exactly 12 new keys. Add all 12 to `en`, `fr`, `de`,
and `it` in the same commit. Use translated values for FR/DE/IT — do not copy English verbatim.

---

## Code Examples

### Capacity check formula (engine)

```typescript
// Source: UI-SPEC ELEV-03, mirrors OOB_PORT_SATURATION pattern in sizing.ts lines 122-128
const uHeightInt = parseInt(input.serverUHeight, 10)
const switchUPerRack = 3  // OOB (U1) + Leaf B (U2) + Leaf A (U3) — fixed per server rack

for (let i = 0; i < input.racks.length; i++) {
  const usedU = switchUPerRack + input.racks[i].serverCount * uHeightInt
  if (usedU > rackSizeU) {
    violations.push({
      code: 'RACK_CAPACITY_EXCEEDED',
      rackNumber: i + 1,  // 1-based for human-readable messages
      usedU,
      totalU: rackSizeU,
    })
  }
}
```

### RackDevice type extension (types.ts)

```typescript
// Source: UI-SPEC Component Inventory
export type RackDevice = {
  id: string
  model: string
  role: 'leaf' | 'spine' | 'oob' | 'border' | 'server'  // +server
  label: string
  uSlot: number
  uHeight: number        // NEW: default 1 for switches, configurable for servers
  usedPorts: number
  totalPorts: number
}
```

### Inline style for dynamic height in ServerDevice

```typescript
// Source: UI-SPEC Design Questions Q2
// Do NOT use dynamic Tailwind class (h-[${n}px]) — JIT won't generate it
<div
  style={{ height: `${uHeight * 44}px` }}
  className={cn(
    'w-full rounded select-none',
    'flex items-center px-3 gap-2 relative',
    'border-2 border-border',
    'bg-[hsl(25_95%_80%)] dark:bg-[hsl(25_95%_28%)]',
  )}
  role="img"
  aria-label={`Server ${serverNumber}, ${uHeight}U, at U${uSlot}`}
>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scalar `totalServers / serversPerRack` | `racks: RackConfig[]` array | Phase 5 (v1.1) | `buildRackDevices` already reads `bom.input.racks[rackIndex].serverCount` per-rack |
| Fixed 3-device per-rack rendering | Extend with server entries above U3 | Phase 7 | Loop in `buildRackDevices` appends server devices starting at U4 |
| Single-U slot loop in RackFrame | Multi-U aware loop with covered-slot skip | Phase 7 | Enable correct stacking of 2U/4U/8U servers |
| 3-variant ConstraintViolation union | 4-variant union (+RACK_CAPACITY_EXCEEDED) | Phase 7 | ViolationAlert switch gains new destructive case |

---

## Open Questions

1. **switchUPerRack = 3 hardcoded or derived from device list?**
   - What we know: Every server rack always has exactly OOB (U1) + Leaf B (U2) + Leaf A (U3) = 3U of switches. This is a fixed architectural invariant of the Dell leaf-spine design.
   - What's unclear: Could a future rack type (e.g. OOB-only rack) have different switch count?
   - Recommendation: Hardcode `3` with a named constant `SWITCH_U_PER_SERVER_RACK = 3` and a comment linking it to the buildRackDevices layout. This is safe for v1 scope.

2. **VLT cables U-height contribution**
   - What we know: VLT interconnect cables are not switches and do not occupy rack U slots. They are modeled as cable quantities, not physical devices.
   - Recommendation: Exclude VLT cables from U-height calculation. They are patch cords between the leaf pair in the same rack and do not consume rack units.

3. **Network rack capacity check**
   - What we know: ELEV-03 requirements and UI-SPEC only describe server rack overflow. Network racks (spines + border leafs) are rendered via `buildNetworkRackDevices`.
   - Recommendation: Omit capacity check for network racks in this phase. Spine count grows with leaf count and should be a separate concern if needed. Focus on the 3 ELEV requirements only.

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (in vite.config.ts test block) |
| Config file | `vite.config.ts` (test key) — no separate vitest.config.ts |
| Quick run command | `npx vitest run src/domain/engine/sizing.test.ts` |
| Full suite command | `npx vitest run` |
| Current passing tests | 204 |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ELEV-01 | `buildRackDevices` returns server entries above U3 for serverCount > 0 | unit | `npx vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | Yes (extend) |
| ELEV-01 | Server devices have role='server', correct uSlot, correct uHeight | unit | `npx vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | Yes (extend) |
| ELEV-01 | Server devices labeled "Server N" (1-based) | unit | `npx vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | Yes (extend) |
| ELEV-02 | Server at 1U occupies 44px (uHeight=1) | unit | `npx vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | Yes (extend) |
| ELEV-02 | Server at 2U occupies uHeight=2, next server starts at uSlot+2 | unit | `npx vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | Yes (extend) |
| ELEV-02 | `serverUHeight` default '1U' in SizingInputSchema | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Yes (extend) |
| ELEV-03 | Engine emits RACK_CAPACITY_EXCEEDED when 16 servers at 2U fills 42U rack (3+32=35 < 42 — no violation; 20 servers at 2U = 3+40=43 > 42 — violation) | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Yes (extend) |
| ELEV-03 | Violation includes correct rackNumber (1-based), usedU, totalU | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Yes (extend) |
| ELEV-03 | Engine emits one violation per overflowing rack (2 racks overflow → 2 violations) | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Yes (extend) |
| ELEV-03 | No violation when serverCount = 0 (empty rack) | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Yes (extend) |
| ELEV-03 | No violation when total used U exactly equals rackSize (boundary) | unit | `npx vitest run src/domain/engine/sizing.test.ts` | Yes (extend) |

### Key Boundary Cases for RACK_CAPACITY_EXCEEDED

```typescript
// 42U rack: 3U switches fixed. Max servers at 1U = 39; at 2U = 19; at 4U = 9; at 8U = 4
// Boundary: 19 servers × 2U + 3 = 41U < 42U → no violation
//           20 servers × 2U + 3 = 43U > 42U → violation(usedU:43, totalU:42)
// 24U rack: 3U switches. Max servers at 1U = 21; at 2U = 10 (23U), 11 = 25U violation
// 50U rack: 3U switches. Max servers at 8U = 5 (43U); 6 = 51U violation
```

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/engine/sizing.test.ts src/features/rack-elevation/utils/buildRackDevices.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (204+ tests) before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. The two relevant test
files already exist and will be extended:

- `src/domain/engine/sizing.test.ts` — extend with RACK_CAPACITY_EXCEEDED cases
- `src/features/rack-elevation/utils/buildRackDevices.test.ts` — extend with server device cases

---

## Sources

### Primary (HIGH confidence)

- Source code: `src/domain/schemas/input.ts` — current SizingInputSchema, RackConfigSchema
- Source code: `src/domain/schemas/bom.ts` — ConstraintViolationSchema discriminated union
- Source code: `src/domain/engine/sizing.ts` — violation emission pattern, rackSizeU variable
- Source code: `src/features/rack-elevation/types.ts` — RackDevice type
- Source code: `src/features/rack-elevation/RackFrame.tsx` — slot loop, h-11 pattern
- Source code: `src/features/rack-elevation/RackDevice.tsx` — role color pattern, draggable
- Source code: `src/features/rack-elevation/utils/buildRackDevices.ts` — current device layout
- Source code: `src/features/rack-elevation/utils/buildRackDevices.test.ts` — test shape
- Source code: `src/features/sizing/InputForm.tsx` — Physical section, Select pattern
- Source code: `src/features/sizing/BOMPanel.tsx` — ViolationAlert pattern, key usage
- Source code: `src/store/inputStore.ts` — persist version, merge() pattern
- Source code: `src/i18n/locales/en/translation.json` — existing key structure
- `.planning/phases/07-rack-elevation-servers/07-UI-SPEC.md` — locked design decisions
- `vite.config.ts` — Vitest configuration

### Secondary (MEDIUM confidence)

- Tailwind v4 arbitrary value behavior: based on project source patterns and known JIT
  semantics. Dynamic class string interpolation is unreliable; static arbitrary values
  or inline style are the safe alternatives.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified from source; no new dependencies
- Architecture: HIGH — patterns read directly from existing source files
- Pitfalls: HIGH — identified from reading actual code paths and TypeScript types
- Validation: HIGH — test files exist; framework confirmed running with 204 passing tests

**Research date:** 2026-03-18
**Valid until:** 2026-06-18 (stable stack, no external dependencies changing)

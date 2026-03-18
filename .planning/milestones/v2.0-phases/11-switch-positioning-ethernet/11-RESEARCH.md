# Phase 11: Switch Positioning (Ethernet) - Research

**Researched:** 2026-03-18
**Domain:** Ethernet rack switch placement (ToR/MoR/BoR) — schema, engine, UI, rack elevation
**Confidence:** HIGH — all findings drawn directly from the codebase and verified project research documents

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| POS-01 | Switch position selector (ToR / MoR / BoR) with ToR as default, persists across reloads | `SizingInputSchema` needs `switchPositioning` field; `inputStore` needs version bump to v6; `InputForm.tsx` needs selector; `DEFAULT_INPUT` needs `switchPositioning: 'ToR'` |
| POS-02 | Rack elevation renders switches at correct U-position based on positioning | `buildRackDevices.ts` must exclude leaf switches from server racks for MoR/BoR; `SWITCH_U_PER_SERVER_RACK=3` constant must become `switchOverheadU(positioning)` function; `RackElevationTab.tsx` must show a positioning rack for MoR/BoR |
| POS-03 | Cable length calculations adjusted per switch position (MoR halves max run) | Engine must output `recommendedCableLengthM` in `NetworkBOM`; BOM schema needs new field; advisory text in BOMPanel |
| POS-04 | DAC distance advisory updated to account for switch positioning | Existing `DAC_DISTANCE_ADVISORY` must be replaced/extended; new `DAC_POSITIONING_INCOMPATIBLE` violation fires when `cableType === 'DAC'` and positioning is MoR or BoR, regardless of rack count |
</phase_requirements>

---

## Summary

Phase 11 adds switch positioning awareness to the existing Ethernet sizing path. The user gains a three-way selector (ToR, MoR, BoR) that flows through the domain engine to update cable length recommendations, DAC violation logic, and rack elevation rendering. The scope is well-bounded: no new stores, no new catalogs, no FC domain touches.

The critical prerequisite is replacing the hardcoded `SWITCH_U_PER_SERVER_RACK = 3` constant in `src/domain/engine/sizing.ts` with a `switchOverheadU(positioning)` function before any UI work. That constant is baked into RACK_CAPACITY_EXCEEDED violation logic — leaving it as-is breaks rack overflow detection for MoR and BoR deployments. This refactor is the foundation that all other changes rest on.

The change surface is narrow: one schema addition, one BOM schema addition, two violation changes, one engine refactor, one store version bump, one form field, two BOM panel additions, and one rack elevation behavioural split. All changes are within the Ethernet domain — FC domain files must not be touched.

**Primary recommendation:** Start at the domain layer (schema → engine → tests) before touching any UI. All domain changes are pure TypeScript and fully testable in the Node environment. Only after the engine returns the new fields should the UI be wired up.

---

## Standard Stack

The phase uses only libraries already present in the project. No new dependencies.

### Core (already installed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| zod | v4 (project standard) | Schema additions for `switchPositioning` field and new violation | Use `z.enum`, `z.literal`, `z.number` — same patterns as existing schemas |
| zustand (persist) | v5 (project standard) | `inputStore` version bump v5→v6 for new field | Use existing `merge` pattern with `{ ...DEFAULT_INPUT, ...oldInput }` spread |
| react-hook-form | v7 (project standard) | Add `switchPositioning` to `FormValues` interface and Select control | Follow existing Select pattern in `InputForm.tsx` |
| react-i18next | v15 (project standard) | New translation keys for position labels and new violation | Add to all 4 locale files (en, fr, de, it) |

### No New Dependencies

This phase introduces zero new npm packages. All patterns are already established in the codebase.

---

## Architecture Patterns

### Recommended Change Surface

```
src/
├── domain/
│   ├── schemas/
│   │   ├── input.ts         MODIFIED: add switchPositioning field
│   │   └── bom.ts           MODIFIED: add recommendedCableLengthM, DAC_POSITIONING_INCOMPATIBLE
│   └── engine/
│       ├── sizing.ts         MODIFIED: switchOverheadU(), cable length, new violation
│       └── sizing.test.ts    MODIFIED: new test cases for positioning
├── store/
│   └── inputStore.ts        MODIFIED: version v5→v6, switchPositioning in DEFAULT_INPUT and form reset
├── features/
│   ├── sizing/
│   │   ├── InputForm.tsx    MODIFIED: add switchPositioning Select field
│   │   └── BOMPanel.tsx     MODIFIED: render recommendedCableLengthM, DAC_POSITIONING_INCOMPATIBLE
│   └── rack-elevation/
│       ├── RackElevationTab.tsx            MODIFIED: show positioning rack when MoR/BoR
│       └── utils/
│           ├── buildRackDevices.ts          MODIFIED: positioning-aware switch placement
│           └── buildPositioningRackDevices.ts  NEW: MoR/BoR switch rack builder
└── i18n/locales/{en,fr,de,it}/translation.json  MODIFIED: new keys
```

### Pattern 1: Schema Addition (input.ts)

**What:** Add `switchPositioning` to `SizingInputSchema` with a `.default('ToR')`.

**Why it works:** Zod `.default()` ensures existing serialized inputs without this field (stored in localStorage) parse correctly after the version bump migration. The migration's `{ ...DEFAULT_INPUT, ...oldInput }` spread in `inputStore` merge fills the field for users upgrading from v5.

```typescript
// src/domain/schemas/input.ts — add to SizingInputSchema
switchPositioning: z.enum(['ToR', 'MoR', 'BoR']).default('ToR'),
```

The inferred `SizingInput` type then includes `switchPositioning: 'ToR' | 'MoR' | 'BoR'` automatically. No separate type declaration needed (project convention: types from Zod only).

### Pattern 2: BOM Schema Addition (bom.ts)

Two additions to `NetworkBOMSchema` and one new violation member:

```typescript
// Add to NetworkBOMSchema:
switchPositioning: z.enum(['ToR', 'MoR', 'BoR']),
recommendedCableLengthM: z.number().int().min(0),
```

New violation in `ConstraintViolationSchema` discriminated union:

```typescript
z.object({
  code: z.literal('DAC_POSITIONING_INCOMPATIBLE'),
  positioning: z.enum(['MoR', 'BoR']),
  recommendedCableLengthM: z.number().int(),
}),
```

**Critical:** The new violation replaces the existing `DAC_DISTANCE_ADVISORY` check for non-ToR positioning. The existing `DAC_DISTANCE_ADVISORY` check (fires when `racks > 8`) remains unchanged — it is a distance-from-spine advisory and is independent of switch placement within the rack. The new violation fires exclusively on `cableType === 'DAC' && positioning !== 'ToR'`.

### Pattern 3: Engine Refactor — switchOverheadU function (sizing.ts)

**CRITICAL PREREQUISITE.** The constant at line 141 of `sizing.ts` must become a function before any other positioning changes:

```typescript
// BEFORE (line 141 of sizing.ts):
const SWITCH_U_PER_SERVER_RACK = 3; // OOB (U1) + Leaf B (U2) + Leaf A (U3)

// AFTER:
function switchOverheadU(positioning: SizingInput['switchPositioning']): number {
  switch (positioning) {
    case 'ToR': return 3;  // OOB (1U) + Leaf B (1U) + Leaf A (1U)
    case 'MoR': return 1;  // OOB only; leaf switches in row rack
    case 'BoR': return 1;  // OOB only; leaf switches in bottom-of-row rack
  }
}
```

The RACK_CAPACITY_EXCEEDED loop then calls `switchOverheadU(input.switchPositioning)` instead of the constant. This is a pure refactor — ToR behaviour is unchanged.

### Pattern 4: Cable Length Advisory in Engine (sizing.ts)

Add cable length output to the return statement and new violation logic:

```typescript
// Cable length recommendation by position
const cableLengthMap: Record<SizingInput['switchPositioning'], number> = {
  ToR: 3,   // in-rack, DAC always feasible, 1m+2m mix typical
  MoR: 15,  // mid-row, AOC or fiber required for servers at row extremes
  BoR: 30,  // end-of-row, AOC or fiber required for far servers
};
const recommendedCableLengthM = cableLengthMap[input.switchPositioning];

// New violation — DAC incompatible with non-ToR positioning
if (input.cableType === 'DAC' && input.switchPositioning !== 'ToR') {
  violations.push({
    code: 'DAC_POSITIONING_INCOMPATIBLE',
    positioning: input.switchPositioning,
    recommendedCableLengthM,
  });
}
```

Add `switchPositioning` and `recommendedCableLengthM` to the return object.

### Pattern 5: inputStore Version Bump (inputStore.ts)

Current version: 5. After adding `switchPositioning`:
- Bump to version 6
- Add `switchPositioning: 'ToR'` to `DEFAULT_INPUT`
- The existing `merge` function's `{ ...DEFAULT_INPUT, ...oldInput }` spread already handles new fields correctly — no new migration branch needed
- Update `form.reset()` in `InputForm.tsx` to include `switchPositioning: 'ToR'`

### Pattern 6: InputForm.tsx — positioning selector

Add to `FormValues` interface:

```typescript
switchPositioning: 'ToR' | 'MoR' | 'BoR'
```

Add to `defaultValues` in `useForm`:

```typescript
switchPositioning: input.switchPositioning,
```

Add the Select control to the Physical section (logical grouping — positioning is a physical placement decision):

```tsx
<FormField
  control={form.control}
  name="switchPositioning"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{t('sizing.switchPositioning')}</FormLabel>
      <Select value={field.value} onValueChange={field.onChange}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder={t('sizing.selectSwitchPositioning')} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="ToR">{t('sizing.positionToR')}</SelectItem>
          <SelectItem value="MoR">{t('sizing.positionMoR')}</SelectItem>
          <SelectItem value="BoR">{t('sizing.positionBoR')}</SelectItem>
        </SelectContent>
      </Select>
      <FormDescription>{t('sizing.positioningHelp')}</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

The `switchPositioning` field updates via the existing immediate-update path in the `form.watch` subscription (already handles all Select fields via the `validRest` spread at the bottom of the subscription handler).

### Pattern 7: BOMPanel.tsx — new advisory rendering

Add DAC_POSITIONING_INCOMPATIBLE to `ViolationAlert` function:

```tsx
if (v.code === 'DAC_POSITIONING_INCOMPATIBLE') {
  return (
    <Alert variant="destructive" role="alert" key={v.code}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t('bom.violationDacPositioningTitle')}</AlertTitle>
      <AlertDescription>
        {t('bom.violationDacPositioningBody', {
          positioning: v.positioning,
          maxLength: v.recommendedCableLengthM,
        })}
      </AlertDescription>
    </Alert>
  )
}
```

Add cable length advisory line to the Cables section (below the table):

```tsx
{bom.recommendedCableLengthM > 0 && (
  <p className="text-xs text-muted-foreground mt-2">
    {t('bom.cableLengthAdvisory', { maxLength: bom.recommendedCableLengthM, positioning: bom.switchPositioning })}
  </p>
)}
```

### Pattern 8: buildRackDevices.ts — positioning-aware leaf placement

When `positioning !== 'ToR'`, omit the two leaf switch devices from the server rack array. Only the OOB switch remains at U1. Servers start at U2 instead of U4:

```typescript
export function buildRackDevices(bom: NetworkBOM, rackIndex: number): RackDevice[] {
  const positioning = bom.input.switchPositioning
  const isToR = positioning === 'ToR'
  // ...existing leafSpec, oobSpec, rackConfig, serverCount...

  const devices: RackDevice[] = []

  // OOB always present in server rack
  devices.push({ id: `rack-${rackIndex}-oob-0`, uSlot: 1, /* ...same... */ })

  if (isToR) {
    // Leaf B at U2, Leaf A at U3
    devices.push({ id: `rack-${rackIndex}-leaf-1`, uSlot: 2, label: 'Leaf B (ToR)', /* ... */ })
    devices.push({ id: `rack-${rackIndex}-leaf-0`, uSlot: 3, label: 'Leaf A (ToR)', /* ... */ })
  }

  // Servers start at U(isToR ? 4 : 2)
  let currentUSlot = isToR ? 4 : 2
  // ...server loop unchanged...
}
```

### Pattern 9: buildPositioningRackDevices.ts — new file for MoR/BoR switch rack

New function returning RackDevice[] for a dedicated network rack containing leaf switches when positioning is MoR/BoR:

```typescript
// src/features/rack-elevation/utils/buildPositioningRackDevices.ts
export function buildPositioningRackDevices(bom: NetworkBOM): RackDevice[] {
  const leafSpec = SWITCH_CATALOG[bom.input.leafModel]
  const devices: RackDevice[] = []
  let uSlot = 1

  // One leaf pair per server rack — rearranged into a central positioning rack
  for (let rackIdx = 0; rackIdx < bom.racks; rackIdx++) {
    const serverCount = bom.input.racks[rackIdx]?.serverCount ?? 0
    devices.push({
      id: `pos-rack-${rackIdx}-leaf-1`,
      model: bom.input.leafModel,
      role: 'leaf',
      label: `Leaf B — Rack ${rackIdx + 1}`,
      uSlot: uSlot++,
      uHeight: 1,
      usedPorts: serverCount,
      totalPorts: leafSpec.downlinkPorts,
    })
    devices.push({
      id: `pos-rack-${rackIdx}-leaf-0`,
      model: bom.input.leafModel,
      role: 'leaf',
      label: `Leaf A — Rack ${rackIdx + 1}`,
      uSlot: uSlot++,
      uHeight: 1,
      usedPorts: serverCount,
      totalPorts: leafSpec.downlinkPorts,
    })
  }

  return devices
}
```

### Pattern 10: RackElevationTab.tsx — positioning rack selector entry

Add a positioning rack option when `bom.input.switchPositioning !== 'ToR'`:

```tsx
{bom.input.switchPositioning !== 'ToR' && (
  <SelectItem value="positioning">
    {t('rack.positioningRack', { type: bom.input.switchPositioning })}
  </SelectItem>
)}
```

In the `useEffect` rebuild:

```typescript
if (selectedRack === 'positioning') {
  setDevices(buildPositioningRackDevices(bom))
}
```

### Anti-Patterns to Avoid

- **Touching FC domain files:** `fc-sizing.ts`, `fc-bom.ts`, `fcInputStore.ts` must not be modified. Switch positioning is Ethernet-only.
- **Leaving `SWITCH_U_PER_SERVER_RACK` as a constant:** Will silently mis-calculate RACK_CAPACITY_EXCEEDED for MoR/BoR. The pitfalls research explicitly identifies this as the primary trap for this phase.
- **Replacing `DAC_DISTANCE_ADVISORY` with `DAC_POSITIONING_INCOMPATIBLE`:** The two violations coexist. `DAC_DISTANCE_ADVISORY` fires on `racks > 8`, which is a spine-distance concern. `DAC_POSITIONING_INCOMPATIBLE` fires on `positioning !== 'ToR' && cableType === 'DAC'`.
- **Computing cable length in the UI layer:** `recommendedCableLengthM` must be in the engine return value — that is where tests verify it. The BOM panel only renders what the engine emits.
- **Skipping i18n for any of the 4 languages:** The project requires FR, EN, DE, IT for all user-facing strings.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Select component for positioning | Custom HTML select | Existing `Select/SelectTrigger/SelectContent/SelectItem` from `@/components/ui/select` | Already used 5 times in InputForm — identical pattern |
| Violation alert display | New alert component | Existing `Alert/AlertTitle/AlertDescription` from `@/components/ui/alert` | Used by all 4 existing violations |
| localStorage versioning | Custom migration function | Zustand `persist` `version` + `merge` already handles additive field migrations | The v2→v3→v4→v5 chain confirms the pattern works |
| Form field subscription | Manual onChange wiring | Existing `form.watch` subscription in InputForm already handles Select fields via `validRest` spread | Adding `switchPositioning` to the exclusion list in the destructure is the only change needed |

---

## Common Pitfalls

### Pitfall 1: SWITCH_U_PER_SERVER_RACK Left Unchanged

**What goes wrong:** RACK_CAPACITY_EXCEEDED fires incorrectly for MoR/BoR racks because the engine still counts 3U of switch overhead even though leaves are not in the server rack.

**Why it happens:** The constant is on line 141 of `sizing.ts`. It is used only in the RACK_CAPACITY_EXCEEDED loop and looks innocuous. Developers add the positioning field and violation without auditing the constant.

**How to avoid:** Replace the constant before writing any positioning logic. The `switchOverheadU()` function must be the first change in `sizing.ts`.

**Warning signs:** RACK_CAPACITY_EXCEEDED fires for MoR/BoR deployment where all servers fit if switches are excluded from the rack.

### Pitfall 2: Form Reset Missing switchPositioning

**What goes wrong:** User clicks "Reset to Defaults" in `InputForm.tsx`. The `form.reset()` call hard-codes all fields. If `switchPositioning: 'ToR'` is not added to the reset object, the field reverts to `undefined` in RHF, causing a type error or stale value.

**How to avoid:** Add `switchPositioning: 'ToR'` to the `form.reset({...})` call in the reset button handler. The reset call is at line 552 of `InputForm.tsx`.

### Pitfall 3: switchPositioning Not in FormValues Destructure Exclusion

**What goes wrong:** The `form.watch` subscription at line 145 of `InputForm.tsx` destructures specific numeric fields to exclude them from the immediate-update path. If `switchPositioning` is accidentally added to the exclusion list, store updates for the new Select field will not fire.

**How to avoid:** Select fields use the immediate-update `validRest` path. `switchPositioning` must NOT be added to the destructured exclusion list (`{ rackCount: _rc, rackServers: _rs, portsPerServerFrontend: _pf, portsPerServerBackend: _pb, activeUplinksPerLeaf: _au, ...rest }`). It flows through `rest` → `validRest` → `setInput(validRest)` automatically.

### Pitfall 4: Positioning Rack Missing From Selector When BOM Recomputes

**What goes wrong:** User selects BoR. Positioning rack appears in dropdown. User changes rack count. BOM recomputes. `selectedRack` is still `'positioning'` but the component logic only checks for `net-` prefix and integer indices. The `useEffect` rebuild silently produces an empty device list.

**How to avoid:** In the `useEffect` that rebuilds devices, add an explicit `if (selectedRack === 'positioning')` branch that calls `buildPositioningRackDevices(bom)`. When the user switches back to ToR, reset `selectedRack` to `'0'` in a `useEffect` that watches `bom.input.switchPositioning`.

### Pitfall 5: Missing i18n Keys Cause Silent Undefined Renders

**What goes wrong:** New translation keys added to `en/translation.json` but not to `fr`, `de`, `it` files. React-i18next returns `undefined`, which renders as an empty string in JSX with no visible error.

**How to avoid:** Always update all 4 locale files (`en`, `fr`, `de`, `it`) in the same commit. Keys needed for this phase:
- `sizing.switchPositioning`
- `sizing.selectSwitchPositioning`
- `sizing.positionToR`
- `sizing.positionMoR`
- `sizing.positionBoR`
- `sizing.positioningHelp`
- `bom.violationDacPositioningTitle`
- `bom.violationDacPositioningBody`
- `bom.cableLengthAdvisory`
- `rack.positioningRack`

### Pitfall 6: DAC_DISTANCE_ADVISORY Logic Accidentally Removed

**What goes wrong:** Developer sees DAC_DISTANCE_ADVISORY in `sizing.ts` and replaces it entirely with DAC_POSITIONING_INCOMPATIBLE. The `racks > 8` distance check disappears. Existing tests for `DAC_DISTANCE_ADVISORY` fail.

**How to avoid:** Both violations coexist. The existing check stays at its current location (line 132 of `sizing.ts`). The new check is added after it. They can both fire simultaneously — a large DAC deployment with BoR positioning triggers both.

---

## Code Examples

### switchOverheadU — replaces SWITCH_U_PER_SERVER_RACK constant

```typescript
// Source: sizing.ts refactor — replaces line 141
function switchOverheadU(positioning: SizingInput['switchPositioning']): number {
  switch (positioning) {
    case 'ToR': return 3;  // OOB + Leaf B + Leaf A
    case 'MoR': return 1;  // OOB only
    case 'BoR': return 1;  // OOB only
  }
}

// Usage in RACK_CAPACITY_EXCEEDED loop:
const overheadU = switchOverheadU(input.switchPositioning);
for (let i = 0; i < input.racks.length; i++) {
  const usedU = overheadU + input.racks[i].serverCount * uHeightInt;
  if (usedU > rackSizeU) {
    violations.push({ code: 'RACK_CAPACITY_EXCEEDED', rackNumber: i + 1, usedU, totalU: rackSizeU });
  }
}
```

### Engine return object additions

```typescript
// Add to calculateBOM return statement:
return {
  // ...existing fields...
  switchPositioning: input.switchPositioning,
  recommendedCableLengthM,
  violations,
  input,
};
```

### makeInput test helper update

The existing `makeInput` helper in `sizing.test.ts` does not include `switchPositioning` because the field does not exist yet. After the schema change, `makeInput` must include it:

```typescript
function makeInput(overrides: Partial<SizingInput> = {}): SizingInput {
  return {
    // ...existing fields...
    switchPositioning: 'ToR',   // new field with safe default
    ...overrides,
  };
}
```

No existing tests break — they all use ToR behaviour by default.

### Vitest test cases to add

```typescript
describe('POS-03 + POS-04: Switch Positioning', () => {
  it('ToR returns recommendedCableLengthM=3 and no DAC_POSITIONING_INCOMPATIBLE', () => {
    const result = calculateBOM(makeInput({ switchPositioning: 'ToR', cableType: 'DAC' }));
    expect(result.recommendedCableLengthM).toBe(3);
    expect(result.violations.find(v => v.code === 'DAC_POSITIONING_INCOMPATIBLE')).toBeUndefined();
  });

  it('MoR returns recommendedCableLengthM=15', () => {
    const result = calculateBOM(makeInput({ switchPositioning: 'MoR' }));
    expect(result.recommendedCableLengthM).toBe(15);
  });

  it('BoR returns recommendedCableLengthM=30', () => {
    const result = calculateBOM(makeInput({ switchPositioning: 'BoR' }));
    expect(result.recommendedCableLengthM).toBe(30);
  });

  it('MoR + DAC fires DAC_POSITIONING_INCOMPATIBLE with positioning=MoR', () => {
    const result = calculateBOM(makeInput({ switchPositioning: 'MoR', cableType: 'DAC' }));
    const v = result.violations.find(v => v.code === 'DAC_POSITIONING_INCOMPATIBLE');
    expect(v).toBeDefined();
    expect(v?.positioning).toBe('MoR');
  });

  it('BoR + DAC fires DAC_POSITIONING_INCOMPATIBLE with positioning=BoR', () => {
    const result = calculateBOM(makeInput({ switchPositioning: 'BoR', cableType: 'DAC' }));
    const v = result.violations.find(v => v.code === 'DAC_POSITIONING_INCOMPATIBLE');
    expect(v?.positioning).toBe('BoR');
  });

  it('MoR + fiber does NOT fire DAC_POSITIONING_INCOMPATIBLE', () => {
    const result = calculateBOM(makeInput({ switchPositioning: 'MoR', cableType: 'fiber' }));
    expect(result.violations.find(v => v.code === 'DAC_POSITIONING_INCOMPATIBLE')).toBeUndefined();
  });

  it('switchOverheadU(MoR) = 1 — RACK_CAPACITY_EXCEEDED uses 1U overhead in MoR', () => {
    // Rack that would overflow with ToR (3U) but not MoR (1U)
    // 42U rack, 1U servers, 40 servers: 40 + 3 = 43 > 42 (ToR fails), 40 + 1 = 41 <= 42 (MoR passes)
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 40 }],
      switchPositioning: 'MoR',
      rackSize: '42U',
      serverUHeight: '1U',
    }));
    expect(result.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED')).toBeUndefined();
  });

  it('ToR with same config fires RACK_CAPACITY_EXCEEDED (regression guard)', () => {
    const result = calculateBOM(makeInput({
      racks: [{ serverCount: 40 }],
      switchPositioning: 'ToR',
      rackSize: '42U',
      serverUHeight: '1U',
    }));
    expect(result.violations.find(v => v.code === 'RACK_CAPACITY_EXCEEDED')).toBeDefined();
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `SWITCH_U_PER_SERVER_RACK = 3` hardcoded | `switchOverheadU(positioning)` function | This phase | Correct rack overflow detection for MoR/BoR |
| `DAC_DISTANCE_ADVISORY` only checks rack count | Adds `DAC_POSITIONING_INCOMPATIBLE` for non-ToR DAC | This phase | Catches MoR/BoR DAC selections regardless of scale |
| `SizingInputSchema` has no switch placement field | Adds `switchPositioning: z.enum(['ToR','MoR','BoR'])` | This phase | Position flows through engine to BOM and rack elevation |
| `buildRackDevices` always places 2 leaf switches | Conditionally omits leaf switches for MoR/BoR | This phase | Rack elevation correctly shows server-only racks |
| `inputStore` at version 5 | Bumps to version 6 | This phase | Persists new field; existing migration pattern covers upgrade |

---

## Open Questions

1. **Positioning rack U-slot layout for large deployments**
   - What we know: `buildPositioningRackDevices` will have `racks × 2` leaf switches (one ToR pair per server rack)
   - What's unclear: For 20+ server racks, the positioning rack could have 40+ U of switches, which exceeds a standard 42U rack. Should a `POSITIONING_RACK_OVERFLOW` violation be added, or silently scroll in the UI?
   - Recommendation: For v1 of this phase, allow the positioning rack to overflow (the rack frame already has overflow strip rendering). Add a note in BOMPanel if `bom.racks * 2 > parseInt(bom.input.rackSize)`. A formal violation can be added in v2.x.

2. **OOB switch in MoR/BoR server racks**
   - What we know: The pitfalls doc says `switchOverheadU('MoR') = 1` (OOB only stays in server rack)
   - What's unclear: Does the customer expect OOB to also move to the positioning rack in MoR/BoR? The industry standard is OOB stays per-rack for out-of-band management accessibility.
   - Recommendation: Keep OOB in server racks for all positioning modes. Only leaf switches move. This matches datacenter practice and the pitfalls document's guidance.

---

## Validation Architecture

Nyquist validation is enabled (`nyquist_validation: true` in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vite.config.ts` (unified config, `test` section) |
| Quick run command | `npx vitest run src/domain/engine/sizing.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| POS-01 | `switchPositioning` field in schema; ToR default; persists | unit | `npx vitest run src/domain/engine/sizing.test.ts` | ✅ (extend existing) |
| POS-02 | `buildRackDevices` excludes leaves for MoR/BoR; `switchOverheadU()` correct | unit | `npx vitest run src/features/rack-elevation/utils/buildRackDevices.test.ts` | ❌ Wave 0 |
| POS-03 | `recommendedCableLengthM` correct per position | unit | `npx vitest run src/domain/engine/sizing.test.ts` | ✅ (extend existing) |
| POS-04 | `DAC_POSITIONING_INCOMPATIBLE` fires for MoR+DAC and BoR+DAC | unit | `npx vitest run src/domain/engine/sizing.test.ts` | ✅ (extend existing) |

### Sampling Rate

- **Per task commit:** `npx vitest run src/domain/engine/sizing.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/features/rack-elevation/utils/buildRackDevices.test.ts` — covers POS-02 (buildRackDevices positioning-aware switch exclusion, switchOverheadU function)

*(All other test infrastructure exists — existing `sizing.test.ts` is extended, not replaced)*

---

## Sources

### Primary (HIGH confidence)

- Codebase read: `src/domain/engine/sizing.ts` — exact line 141 `SWITCH_U_PER_SERVER_RACK = 3` constant confirmed
- Codebase read: `src/domain/schemas/input.ts` — exact current schema shape confirmed, no `switchPositioning` field
- Codebase read: `src/domain/schemas/bom.ts` — exact current violations confirmed, no `DAC_POSITIONING_INCOMPATIBLE`
- Codebase read: `src/store/inputStore.ts` — version 5 confirmed, merge pattern confirmed
- Codebase read: `src/features/sizing/InputForm.tsx` — FormValues interface, Select pattern, form.watch subscription, form.reset call
- Codebase read: `src/features/rack-elevation/utils/buildRackDevices.ts` — current ToR-only placement at U1/U2/U3
- Codebase read: `src/features/rack-elevation/RackElevationTab.tsx` — rack selector logic, selectedRack state
- Codebase read: `src/features/sizing/BOMPanel.tsx` — ViolationAlert pattern, all 4 existing violation renderers

### Secondary (MEDIUM confidence)

- `.planning/research/PITFALLS.md` — Pitfall 7 (SWITCH_U_PER_SERVER_RACK), Pitfall 8 (DAC formula) — authored from codebase analysis
- `.planning/research/ARCHITECTURE.md` — Switch positioning data flow, modified/new files inventory
- `.planning/research/FEATURES.md` — Switch positioning cable length model (ToR 3m, MoR 15m, BoR 30m)

### Tertiary (LOW confidence, for cable length values)

- dc.mynetworkinsights.com — ToR/MoR/EoR architecture (cable run estimates)
- ANFKOM datacenter cabling guide — corroborates cable length ranges

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new libraries; all patterns verified from codebase reads
- Architecture: HIGH — specific file/line references verified; exact code patterns extracted
- Pitfalls: HIGH — three of four pitfalls derived directly from codebase reads (line 141 constant, form reset call at line 552, form.watch destructure at line 145)
- Cable length values: MEDIUM — 3m/15m/30m are industry conventions confirmed by multiple secondary sources; exact values can be adjusted without schema changes

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable domain — no external library changes expected; purely internal architecture)

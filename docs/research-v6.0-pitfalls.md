# Domain Pitfalls

**Domain:** NetStack v6.0 Physical Planning — Cable length estimation and power budget added to existing Ethernet + FC sizing tool
**Researched:** 2026-03-19
**Overall confidence:** HIGH (codebase read directly; DAC/cable specs from official vendor sources; power draw from catalog; Zustand migration from official docs + codebase analysis)

---

## Scope of This Document

This document covers pitfalls that arise specifically when **adding cable length estimation and power budget** to a tool that already does switch/cable quantity sizing. It is not a repeat of the v2.0 pitfalls document (FC/Ethernet isolation, POD licensing, dual-fabric rendering). Those pitfalls are already mitigated in the codebase. This document focuses on what is new and what can break in v6.0.

---

## Critical Pitfalls

Mistakes that cause silent incorrect output, rewrite cost, or procurement errors.

---

### Pitfall 1: Schema Migration Corrupts Profile inputState on Existing Users

**What goes wrong:**
`inputStore` is at version 8 (`name: 'netstack-input'`). The `merge()` function in `inputStore.ts` already handles v2–v8 migration via a `{ ...DEFAULT_INPUT, ...oldInput }` spread.

When v6.0 adds new fields to `SizingInputSchema` (e.g., `rackPitchM`, `rackRowSpacingM`, `adjacentRacks`), the spread-merge strategy correctly fills missing fields from `DEFAULT_INPUT` for the `inputStore`.

However, the `ProfileSchema.inputState` field is typed as `z.record(z.string(), z.unknown())` — it is a raw JSON snapshot of the store at save time. When the user loads a v5.0-era profile, `inputState` does NOT have the new v6.0 fields. The `profileService.loadProfile()` call copies this raw object back to the store via `setInput(profile.inputState as Partial<SizingInput>)`. The store's `setInput` does a shallow merge: `{ ...state.input, ...partial }`. Any new v6.0 fields not present in the old profile are left as whatever is currently in state (which may be a previous profile's value, not `DEFAULT_INPUT`).

**Root cause:** Profile load bypasses the Zustand `merge()` migration path. The `merge()` function only runs at cold-start hydration, not at `setInput()` call time.

**Consequences:**
- Old profiles load with `undefined` or stale values for new cable-length fields.
- Power budget displays 0 W for old profiles because `rackPitchM` is undefined, not 0.6.
- Bug is silent — no validation error, no console warning, wrong output.

**Prevention:**
Profile load must normalize the input before calling `setInput`. Add a `normalizeToCurrentSchema(raw: Record<string, unknown>): SizingInput` function to `profileService.ts` that does `{ ...DEFAULT_INPUT, ...raw }` before handing to the store. This mirrors what `merge()` does at cold start.

```typescript
// profileService.ts — add this before setInput call
function normalizeToCurrentSchema(raw: Record<string, unknown>): SizingInput {
  return SizingInputSchema.parse({ ...DEFAULT_INPUT, ...raw });
}
```

**Detection (warning signs):**
- `profileService.loadProfile()` calls `setInput(profile.inputState as Partial<SizingInput>)` directly with no spread against `DEFAULT_INPUT`.
- New schema fields in `SizingInputSchema` have no corresponding key in the `ProfileSchema` default.
- Power budget or cable length shows 0 when loading a pre-v6.0 profile.

**Phase to address:** Cable Length Schema phase (Phase 1 of v6.0). Must be resolved before any new field is added to `SizingInputSchema`.

---

### Pitfall 2: Cable Path Length vs. Point-to-Point Distance Confusion in the Formula

**What goes wrong:**
The existing `cableLengthMap` in `sizing.ts` (lines 153–157) returns 2 m for ToR and BoR, 1 m for MoR. These are in-rack point-to-point distances (server port to switch port in the same rack). They are correct for the current scope where positioning is rack-level.

For v6.0, the feature adds inter-rack cable lengths: server-to-switch runs that cross rack boundaries (non-adjacent rack mode) or aggregation/core cable runs in Three-Tier that span rows. The mistake is using the **point-to-point Euclidean distance** (straight-line between rack centers) instead of the **cable path length** (the actual routed distance including vertical runs to cable tray height, horizontal through trays, and vertical descent into destination rack).

A cable between rack 1 and rack 6 with 600 mm rack pitch is not 3 m (5 × 0.6 m). The actual path is:
- Ascent from switch port to cable tray height: ~2 m
- Horizontal run: 5 × rack pitch (typically 0.6 m) = 3 m
- Descent into destination rack: ~2 m
- Service loop: ~0.5 m
- Total: ~7.5 m, not 3 m

Outputting 3 m would cause the customer to order cables that are too short. Cables cannot be spliced; the entire run must be reordered.

**Root cause:** Treating rack spacing as the only variable. Vertical rack height component is ignored.

**Formula to use (MEDIUM confidence — standard data center cabling practice):**

```
cablePathLengthM = verticalAscent + horizontalRun + verticalDescent + serviceLoop
verticalAscent   = rackHeightM × 0.5   // ascent from switch mid-point to tray
horizontalRun    = racksBetween × rackPitchM
verticalDescent  = rackHeightM × 0.5   // descent from tray to destination switch
serviceLoop      = 0.5                 // fixed 0.5 m service loop
```

Standard rack height: 42U × 0.04445 m/U ≈ 1.87 m; 50U ≈ 2.22 m.
Standard rack pitch (center-to-center): 0.6 m (600 mm) per EIA-310-D.

**Prevention:** Implement cable path length as a pure function taking `rackCount`, `rackPitchM`, `rackHeightM` — never derive it from rack count alone.

**Detection (warning signs):**
- `cablePathLengthM` uses only `racksBetween × rackPitchM` without vertical components.
- Rack height is not a factor in any cable length formula.
- Cable lengths for a 10-rack deployment with 42U racks appear to be under 6 m.

**Phase to address:** Cable Length Engine phase (first v6.0 domain phase).

---

### Pitfall 3: Three-Tier Aggregation-to-Core Cable Length Treated Same as Clos Leaf-to-Spine

**What goes wrong:**
In a Clos (leaf-spine) topology with ToR positioning, all leaf-to-spine cables run from server racks to a dedicated network rack. In a Three-Tier topology, aggregation-to-core cables run between the aggregation tier rack(s) and the core tier rack(s). These two cable runs are not equivalent and should not share the same length estimate.

The Three-Tier engine (`three-tier-sizing.ts`) outputs `recommendedCableLengthM` from the same `cableLengthMap` as the Clos engine (value: 2 m for ToR). But aggregation racks and core racks are often on different rows in large deployments — the physical distance between them can be 10–40 m, not 2 m. The access-to-aggregation cable length is also longer than server-to-leaf in Clos because the aggregation rack may not be co-located with every access rack.

The current code outputs one `recommendedCableLengthM` for all link types. v6.0's cable length schedule needs per-link-type lengths.

**Root cause:** The existing `recommendedCableLengthM` scalar is a placeholder from v2.0. It was adequate when cable lengths were advisory-only, but it is wrong for a per-link cable schedule.

**Prevention:**
The cable length output for Three-Tier must produce **three distinct length values**: `serverAccessCableLengthM`, `accessAggrCableLengthM`, `aggrCoreCableLengthM`. Each derived from the actual rack topology (how many rack rows separate the tiers). The single `recommendedCableLengthM` can remain as a summary for backwards compatibility but the detailed schedule is the procurement-relevant output.

**Detection (warning signs):**
- `ThreeTierBOM.recommendedCableLengthM` is a single scalar reused for all three cable segments.
- `aggrCoreCableLengthM` equals `serverAccessCableLengthM` in the output.
- The BOM CSV export has one "Cable Length" column for all Three-Tier link types.

**Phase to address:** Cable Length Engine phase. The Three-Tier engine must produce per-tier cable lengths before the BOM export adds a cable schedule.

---

### Pitfall 4: DAC Distance Advisory Threshold is Wrong (> 8 Racks Is Too Permissive at Higher Speeds)

**What goes wrong:**
The existing `DAC_DISTANCE_ADVISORY` in both `sizing.ts` (line 139) and `three-tier-sizing.ts` (line 173) fires when `racks > 8` AND `cableType === 'DAC'`. This threshold was derived from a rule of thumb that spine cables in a ToR deployment with standard rack pitch stay under 5 m up to about 8 racks (8 racks × 0.6 m pitch ≈ 4.8 m ≈ within DAC spec).

Two problems with the threshold in v6.0:

1. **Path length vs. pitch**: The actual cable path (including vertical runs) exceeds 5 m at far fewer than 8 racks. With 42U racks and standard pitch, 3-rack separation already produces a ~5.3 m cable path (1.87/2 ascent + 2 × 0.6 + 1.87/2 + 0.5 service loop ≈ 4.2 m at rack separation 2; add one more rack and it exceeds 5 m). The advisory fires too late.

2. **Speed-dependent DAC limits**: The `CABLE_CATALOG` correctly shows `maxDistanceM: 5` for DAC. But this 5 m limit applies to passive DAC at 25G/100G. At 400G (Z9332F-ON, Z9432F-ON in Three-Tier core tier), passive DAC is limited to 3 m and active DAC to approximately 3 m as well. For Three-Tier with Z-series 400G core switches, the DAC advisory must fire sooner.

**Prevention:**
Replace the `racks > 8` threshold with a comparison against `CABLE_CATALOG.DAC.maxDistanceM` using the computed cable path length:

```typescript
// Compute actual path length, then compare to cable spec
const worstCasePathM = computeCablePath(racks, rackPitchM, rackHeightM);
if (input.cableType === 'DAC' && worstCasePathM > CABLE_CATALOG.DAC.maxDistanceM) {
  violations.push({ code: 'DAC_DISTANCE_ADVISORY', rackCount: racks, cableType: 'DAC' });
}
```

The `DAC_DISTANCE_ADVISORY` violation should also carry the computed `estimatedPathLengthM` so the UI can show a specific number ("Estimated cable path: 6.3 m, DAC max: 5 m") rather than a generic warning.

**Detection (warning signs):**
- `DAC_DISTANCE_ADVISORY` still uses `racks > 8` literal threshold after v6.0 ships.
- Advisory does not include computed path length in violation payload.
- Three-Tier 400G core links use the same DAC threshold as 25G leaf links.

**Phase to address:** Cable Length Engine phase. The DAC advisory must be upgraded as part of v6.0, not deferred.

---

### Pitfall 5: Power Budget Uses nameplate (maxPowerW) Instead of typicalPowerW

**What goes wrong:**
`SWITCH_CATALOG` already has both `maxPowerW` and `typicalPowerW` for most models (e.g., S5248F-ON: max 647 W, typical 310 W; S5232F-ON: max 635 W, typical 360 W). Some models (S3248T-ON, S5224F-ON, S5212F-ON) have only `maxPowerW` — the optional `typicalPowerW` field is absent.

A power budget that sums `maxPowerW` for all devices per rack produces a worst-case number that is 1.5–2× higher than actual draw. Procurement engineers who receive this number will over-specify the PDU and UPS capacity, driving unnecessary cost. Worse: if the tool is inconsistent (some switches use typical, others fall back to max), the per-rack total is meaningless.

However, the opposite error — using only `typicalPowerW` and ignoring max — produces a number that is too low for UPS sizing. UPS must be sized to max draw (nameplate), not typical draw.

**Prevention:** The power budget must emit **two values per rack**:
- `typicalPowerW`: sum of `typicalPowerW ?? maxPowerW * 0.6` for all devices (use 60% as a conservative fallback when typical is not catalogued)
- `maxPowerW`: sum of `maxPowerW` for all devices (for PDU/UPS sizing)

Both values must be clearly labeled in the BOM output. Never output a single "power" number without specifying which.

Server power is NOT in the catalog (`SWITCH_CATALOG` covers only network switches). v6.0 must either add server power estimates as an input field (W per server, with a sensible default such as 300 W for 1U) or prominently label the rack power budget as "switch power only — add server power separately."

**Detection (warning signs):**
- `rackPowerBudget` is derived from a single `maxPowerW` or single `typicalPowerW` field.
- BOM output has one power field per rack without a "typical vs. max" distinction.
- Server power is included in the per-rack total without a user-provided wattage input.
- S3248T-ON (no `typicalPowerW`) causes a TypeScript error or undefined in power computation.

**Phase to address:** Power Budget phase. Both typical and max outputs must be present from the first iteration.

---

### Pitfall 6: Non-Adjacent Rack Patch Panel Advisory Becomes a Blocking Violation

**What goes wrong:**
v6.0 adds a "non-adjacent rack" mode where server racks are not directly next to the switch rack (or where racks are separated by empty/filler racks). The correct behavior for this condition is to show an advisory: "Non-adjacent rack configuration detected — patch panels recommended for cable management." This advisory is informational. The BOM is still valid; the customer just needs to add patch panels to their bill.

If this advisory is implemented as a `ConstraintViolation` with a `code` like `NON_ADJACENT_RACK_INCOMPATIBLE`, it may be treated as a blocking error by the UI (red badge, prevents export, shows as a critical violation alongside `RACK_CAPACITY_EXCEEDED`). Procurement engineers will read "incompatible" as "this design cannot be built" and either panic or distrust the tool.

**Root cause:** Re-using the existing `ConstraintViolation` discriminated union for advisory content is tempting (it already exists), but the semantic distinction between "this design is invalid" and "this design requires additional planning" is lost.

**Prevention:** Introduce a separate `Advisory` type alongside `ConstraintViolation`:

```typescript
// schemas/bom.ts
export const AdvisorySchema = z.discriminatedUnion('code', [
  z.object({
    code: z.literal('PATCH_PANEL_RECOMMENDED'),
    racksBetween: z.number().int(),
    estimatedPathLengthM: z.number(),
  }),
  z.object({
    code: z.literal('DAC_EXCEEDS_SPEC'),  // upgrade from advisory to named
    estimatedPathLengthM: z.number(),
    maxDistanceM: z.number(),
  }),
]);

export type Advisory = z.infer<typeof AdvisorySchema>;
```

`NetworkBOM` gets `advisories: z.array(AdvisorySchema)` alongside `violations: z.array(ConstraintViolationSchema)`. The UI renders violations as red (blocking, procurement must address), advisories as yellow/amber (informational, plan accordingly). Export includes both sections.

**Detection (warning signs):**
- `PATCH_PANEL_RECOMMENDED` is added to `ConstraintViolationSchema` discriminated union.
- BOM panel renders non-adjacent rack advisory with the same red badge as `RACK_CAPACITY_EXCEEDED`.
- CSV export has no distinction between violations and advisories.

**Phase to address:** Cable Length Schema phase (when `AdvisorySchema` is introduced). Must be established before any advisory-class content is added to the engine.

---

### Pitfall 7: FC SAN ISL Cable Lengths Estimated Using Ethernet Rack Pitch Formula

**What goes wrong:**
FC SAN switches are in a separate SAN rack (not co-located with server racks in MoR/BoR/EoR positioning). ISL cables run between Fabric A switches and Fabric B switches — both typically in the same SAN rack or adjacent SAN racks. The cable run for ISL is therefore very short (1–3 m within the SAN rack) and always uses LC-duplex fiber (never DAC).

If the cable length formula naively applies the same rack-pitch formula used for server-to-leaf runs (treating "rack separation" as the distance between SAN rack and the nearest server rack), it will produce ISL cable length estimates of 5–15 m, which is wrong. ISL cables are intra-SAN-rack connections, not SAN-to-server-rack connections.

Additionally, the Broadcom documentation confirms that local ISL (within the same data center room) supports up to 5 km at standard distances (up to 150 m at 32G with short-wave SFP+). The advisory threshold for ISL is not distance-based in the same way as DAC — it is a fabric design concern (too many ISL hops = latency, not cable length). The engine must not emit a `DAC_DISTANCE_ADVISORY` for FC ISL cables because FC ISL cables are always fiber, never DAC.

**Prevention:**
- FC BOM cable length output for ISL is always a fixed short estimate (1–3 m in-rack run). Do not apply the rack-pitch formula to ISL.
- The `CABLE_CATALOG.DAC.maxDistanceM` check must never be applied to `FCNetworkBOM.islCables`.
- If the v6.0 cable schedule feature adds per-link-type lengths to `FCNetworkBOM`, ISL length must be a separate field explicitly documented as "intra-SAN-rack, fiber only."

**Detection (warning signs):**
- `calculateFCBOM()` derives ISL cable length from `racksBetween × rackPitchM`.
- A `DAC_DISTANCE_ADVISORY` violation appears in `FCNetworkBOM.violations` for ISL links.
- FC BOM CSV export shows ISL cable lengths greater than 5 m for a single-room deployment.

**Phase to address:** Cable Length Engine phase. Review FC engine in the same sprint as Ethernet cable length changes to avoid cross-contamination.

---

## Moderate Pitfalls

Mistakes that produce incorrect output or confusing UX, but do not cause silent procurement errors.

---

### Pitfall 8: inputStore Version Not Bumped When New SizingInput Fields Are Added

**What goes wrong:**
Adding `rackPitchM`, `adjacentRacks`, or `serverPowerW` to `SizingInputSchema` without bumping `inputStore.ts` version from 8 to 9. The existing `merge()` function already handles forward-compatibility via `{ ...DEFAULT_INPUT, ...oldInput }` spread — this correctly fills in new fields with defaults on first load after upgrade.

However, if the version is not bumped, the `merge()` function is not called on existing users. Instead, Zustand's default behavior (no-op merge or raw overwrite depending on implementation) applies, and the new fields may not get their defaults. This is subtle: the spread-merge in `merge()` is the migration path; without a version bump, it doesn't run.

**Prevention:** Every `SizingInputSchema` addition must be accompanied by a version bump in `inputStore.ts` and a comment in the `merge()` JSDoc explaining the v8→v9 migration. Verify in tests by seeding a v8 localStorage fixture and asserting that after hydration, the new fields have their DEFAULT_INPUT values.

**Detection (warning signs):**
- `inputStore.ts` remains at `version: 8` after `rackPitchM` is added to `SizingInputSchema`.
- No test exists that loads a v8 fixture and asserts v9 field defaults.

**Phase to address:** Cable Length Schema phase.

---

### Pitfall 9: Power Budget Double-Counts Switches in Non-ToR Positioning

**What goes wrong:**
In ToR positioning, each server rack contains 2 leaf switches + 1 OOB switch. The power budget for the server rack should include all three. In MoR/BoR positioning, the leaf switches are NOT in the server rack (they are in the positioning/network rack). If the power budget formula always adds `2 × leafSwitch.maxPowerW + oobSwitch.maxPowerW` per server rack regardless of positioning, it double-counts leaf switch power (those switches appear in both the server rack power total and the network rack total).

The `switchOverheadU()` function in `sizing.ts` (line 112) explicitly returns 3 for all positioning modes because rack-level positioning means switches ARE in the server rack. So in the current codebase, MoR/BoR do NOT move leaf switches out of the server rack — the comment says "All positioning modes keep leaves inside the server rack (rack-level positioning)." The power budget must align with this: switches are always in the server rack, so include their power in server rack totals.

However, if v6.0 changes MoR/BoR to move switches to a dedicated row rack (as described in the original ARCHITECTURE.md from v2.0 research), the power budget must be updated simultaneously. The risk is that the rack elevation and the power budget code are updated independently: one moves the switches, the other does not.

**Prevention:** Power budget per-rack computation must derive switch assignment from the same logic as rack elevation rendering. Both must call the same `assignSwitchesToRack(positioning, rackIndex)` helper rather than each making independent assumptions about where switches live.

**Phase to address:** Power Budget phase. Review against rack elevation positioning logic before writing the power formula.

---

### Pitfall 10: Cable Schedule Exported as Flat Total Instead of Per-Link-Type Breakdown

**What goes wrong:**
The cable schedule feature should output something like:
- Server-to-leaf cables: 48 × 2 m DAC (server rack 1–3), 48 × 3 m DAC (server rack 4–6)
- Leaf-to-spine cables: 12 × 5 m AOC
- VLT cables: 6 × 1 m DAC

If the CSV export collapses this into a single "Cable Length" column with an average or maximum value, the procurement engineer cannot use it to create a cable order. Cables must be ordered in exact lengths; an average is not actionable.

**Prevention:** The `exportCsv.ts` cable section must produce one row per link type with: `linkType`, `quantity`, `lengthM`, `cableType`. The quantity represents all cables of that exact type/length combination. Test the CSV output with a multi-rack fixture and assert the exact row count and length values.

**Phase to address:** Export phase (last v6.0 phase). The domain engine must produce per-link-type structured cable data before the exporter can use it.

---

### Pitfall 11: "Adjacent Rack" Assumption Applied to All Deployments by Default

**What goes wrong:**
The default for the new `adjacentRacks` boolean input (or equivalent geometry input) should reflect the most common real-world deployment: adjacent racks in a row with standard 600 mm pitch. If the default is `adjacentRacks: false` (non-adjacent), every new deployment shows a patch panel advisory on first load, creating alarm where none is warranted. Engineers who are just exploring the tool will see warnings without context and conclude the tool is over-cautious.

Conversely, if the default is `adjacentRacks: true` and the advisory only fires when explicitly unchecked, engineers in non-adjacent deployments who never read the docs won't know to enable the advisory.

**Prevention:** Default is `adjacentRacks: true` (standard adjacent rack configuration, no patch panel advisory). The input form explains the field: "Uncheck if server racks are separated by more than one empty bay from the network rack." The advisory is opt-in by changing the default deployment geometry, not opt-out.

**Phase to address:** Input Form phase (UI layer of v6.0).

---

## Minor Pitfalls

---

### Pitfall 12: Service Loop Factor Omitted From Cable Length Output

**What goes wrong:**
Cable length estimates that omit a service loop factor will result in cables that are exactly at the minimum required length with no slack. Cables ordered at minimum length cause installation problems: if the rack must be moved 5 cm, the cable cannot reach; if a connector is damaged, there is no slack to cut and re-terminate.

Industry standard is a 0.5–1 m service loop per cable run.

**Prevention:** Add a `serviceLoopM = 0.5` constant to the cable path formula. Include it in the formula documentation.

**Phase to address:** Cable Length Engine phase.

---

### Pitfall 13: Rack Height Derived From rackSize String Without Lookup Table

**What goes wrong:**
Rack height in metres is required for the cable path formula. It would be tempting to compute it as `parseInt(rackSize) * 0.04445`. This formula is correct for 42U (42 × 0.04445 ≈ 1.87 m) and acceptable for 50U (50 × 0.04445 ≈ 2.22 m). However, for 24U racks (24 × 0.04445 ≈ 1.07 m), this underestimates actual rack height because 24U open racks and wall-mount cabinets have significant non-U structural height that makes the overall cabinet taller than the U-count implies.

**Prevention:** Use an explicit `RACK_HEIGHT_M` lookup table keyed by `rackSize`, not a formula. Values from EIA-310-D and standard cabinet specs:

```typescript
const RACK_HEIGHT_M: Record<SizingInput['rackSize'], number> = {
  '24U': 1.40,  // including frame; typical 24U wall-mount is 550-600 mm but floor-mount is 1.4m
  '42U': 1.87,  // standard 42U = 42 × 1.75" + frame ≈ 78"
  '50U': 2.24,  // standard 50U = 50 × 1.75" + frame ≈ 90"
};
```

**Phase to address:** Cable Length Engine phase.

---

### Pitfall 14: i18n Keys Missing for New Power and Cable Length Labels

**What goes wrong:**
v6.0 adds new BOM output fields (rack power budget, cable length schedule, advisory messages). If i18n keys are not added in all four languages (EN, FR, DE, IT) in the same phase as the feature, the UI renders the raw key string (e.g., `"power.maxW"`) in non-English locales.

**Prevention:** Add i18n key stubs for all four languages in the same commit as the new output fields. Use `[key]` notation as placeholders for untranslated languages rather than leaving the key absent. Run the existing i18n coverage test (if it exists) or add one.

**Phase to address:** Each UI phase of v6.0. Follow the pattern established in v5.0 where labels were added to all four locales in the same phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Add new fields to `SizingInputSchema` | Profile load silently missing new fields (Pitfall 1) | Add `normalizeToCurrentSchema()` to `profileService.ts` before adding any new field |
| Cable path length formula | Using pitch-only formula without vertical components (Pitfall 2) | Use `verticalAscent + horizontalRun + verticalDescent + serviceLoop` formula with rack height lookup |
| Three-Tier cable lengths | Single scalar reused for all tier-to-tier runs (Pitfall 3) | Produce `serverAccessCableLengthM`, `accessAggrCableLengthM`, `aggrCoreCableLengthM` separately |
| DAC advisory upgrade | Threshold `racks > 8` not updated to use computed path length (Pitfall 4) | Replace with `computedPathLengthM > CABLE_CATALOG.DAC.maxDistanceM` comparison |
| Power budget formula | Using nameplate max only, or server power not distinguished (Pitfall 5) | Emit both `typicalPowerW` and `maxPowerW` per rack; label server power separately |
| Non-adjacent rack advisory | Advisory added to `ConstraintViolationSchema` and rendered as blocking error (Pitfall 6) | Add `AdvisorySchema` + `NetworkBOM.advisories[]` before adding the advisory in the engine |
| FC ISL cable lengths | Rack-pitch formula applied to ISL runs (Pitfall 7) | ISL cable length is a fixed short in-rack estimate; never apply server-rack formula |
| inputStore version bump | Version not bumped for new fields; merge() not called (Pitfall 8) | Always bump version when modifying `SizingInputSchema`; add migration test fixture |
| Power budget and positioning | Power double-counted for MoR/BoR if switch placement logic diverges (Pitfall 9) | Single `assignSwitchesToRack()` helper shared by rack elevation and power budget |
| CSV cable schedule export | Flat average/total instead of per-link-type rows (Pitfall 10) | Domain engine emits structured `CableLengthEntry[]`; exporter maps one row per entry |
| Adjacent rack default | Non-adjacent default causes alarm on first load (Pitfall 11) | Default `adjacentRacks: true`; advisory is opt-in |

---

## "Looks Done But Isn't" Checklist

- [ ] **Profile migration**: `profileService.loadProfile()` spreads against `DEFAULT_INPUT` before calling `setInput()` — verify with a test that loads a profile missing `rackPitchM` and asserts it gets the default value.
- [ ] **Cable path formula**: `estimatedPathLengthM` includes vertical ascent + horizontal run + vertical descent + service loop — verify with a 3-rack, 42U, 0.6 m pitch fixture that output is ~4.2 m, not 1.8 m.
- [ ] **DAC advisory trigger**: `DAC_DISTANCE_ADVISORY` fires at 3-rack separation with standard pitch (path ~4.2 m, still under 5 m spec) — verify advisory does NOT fire. Fires at 4+ racks (path ~5 m+) — verify it DOES fire.
- [ ] **Power budget two-value output**: `NetworkBOM` has both `rackTypicalPowerW` and `rackMaxPowerW` fields — verify CSV export has both columns labeled distinctly.
- [ ] **Advisory vs. violation**: `PATCH_PANEL_RECOMMENDED` appears in `bom.advisories[]`, NOT `bom.violations[]` — verify BOM panel renders it amber, not red.
- [ ] **FC ISL cable length**: `FCNetworkBOM` ISL cable length is ≤ 3 m for any input — verify no rack-pitch computation affects FC ISL.
- [ ] **Three-Tier separate lengths**: `ThreeTierBOM` has three cable length fields — verify CSV export shows three distinct rows.
- [ ] **i18n completeness**: All new labels exist in EN/FR/DE/IT — verify no `undefined` renders in FR and DE locales for power and cable length sections.
- [ ] **inputStore version**: `version: 9` in `inputStore.ts` when first new field is merged — verify by seeding v8 fixture and confirming new field gets default after hydration.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Profile load without `normalizeToCurrentSchema()` | Less code to write | Old profiles silently produce wrong cable/power output | Never |
| `recommendedCableLengthM` scalar reused for multi-tier cable schedule | No new fields needed | Three-Tier cable schedule is inaccurate; procurement cannot use it | Never |
| Sum `maxPowerW` only for power budget | Simple, no optional field handling needed | 1.5–2× over-sizing of PDU/UPS; customer cost impact | Never |
| Add patch panel advisory to `ConstraintViolationSchema` | One schema, less code | Advisory rendered as blocking error; engineers distrust tool | Never |
| `racks > 8` threshold for DAC advisory | No formula change needed | Advisory fires too late; customer orders short cables | Acceptable only if cable path length is deferred to v7.0 with an explicit TODO |
| Single power value per rack (no typical/max distinction) | Simpler BOM schema | Ambiguous for PDU sizing; requires follow-up question from customer | Acceptable in MVP if labeled "maximum draw (nameplate)" explicitly |

---

## Sources

- Codebase read directly:
  - `src/domain/engine/sizing.ts` — existing `cableLengthMap`, `DAC_DISTANCE_ADVISORY` threshold, `switchOverheadU()` function
  - `src/domain/engine/three-tier-sizing.ts` — Three-Tier cable lengths, per-tier link counts
  - `src/domain/catalog/hardware.ts` — `maxPowerW` and `typicalPowerW` per switch model; `uHeight` field
  - `src/domain/catalog/cables.ts` — `CABLE_CATALOG.DAC.maxDistanceM: 5`
  - `src/domain/schemas/input.ts` — `SizingInputSchema` v8, `switchPositioning` field
  - `src/domain/schemas/bom.ts` — `ConstraintViolationSchema`, `NetworkBOMSchema`, `recommendedCableLengthM`
  - `src/store/inputStore.ts` — version 8, `merge()` migration function, `DEFAULT_INPUT`
  - `src/domain/schemas/profile.ts` — `ProfileSchema.inputState` typed as `z.record(z.string(), z.unknown())`
- [EIA-310-D Rack Unit Standard (1.75 inches per U)](https://en.wikipedia.org/wiki/Rack_unit) — HIGH confidence (standard)
- [DAC Cable Specifications 2025: passive ≤3 m at 25G, ≤5 m at 100G active](https://network-switch.com/blogs/networking/direct-attach-copper-dac-twinax-cables) — MEDIUM confidence (vendor documentation)
- [NVIDIA Cabling Data Centers Design Guide, March 2023](https://docs.nvidia.com/cabling-data-centers.pdf) — HIGH confidence (official NVIDIA datacenter design guide)
- [Zustand Persist Middleware: merge() and version migration](https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data) — HIGH confidence (official Zustand docs)
- [Server rack power: typical 1U server 150–400 W, switches at 60–80% of nameplate](https://sysracks.com/blog/server-rack-energy-consumption/) — MEDIUM confidence (matches catalog values)
- [Broadcom ISL Distance Reference: 32G SFP+ up to 150 m short-wave](https://techdocs.broadcom.com/us/en/fibre-channel-networking/fabric-os/fabric-os-administration/9-2-x/v26799888/v26762506.html) — HIGH confidence (official Broadcom docs)

---

*Pitfalls research for: NetStack v6.0 — Cable length estimation and power budget*
*Researched: 2026-03-19*

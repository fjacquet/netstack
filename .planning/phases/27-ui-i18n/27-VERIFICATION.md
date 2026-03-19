---
phase: 27-ui-i18n
verified: 2026-03-19T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 27: UI i18n — Geometry Inputs and Advisory Cards Verification Report

**Phase Goal:** All new geometry inputs are visible and usable in the accordion input form; advisory cards render in amber; all labels are translated
**Verified:** 2026-03-19
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Rack pitch, adjacency toggle, and patch panel distance fields appear in Ethernet rack-config accordion section | VERIFIED | `EthInputAccordion.tsx` lines 316/342/366 — three `FormField` elements with `data-testid="rack-pitch-mm"`, `data-testid="racks-adjacent-toggle"`, `data-testid="patch-panel-distance"` present in rack-config section |
| 2 | Same geometry fields appear in Converged rack-config accordion section | VERIFIED | `ConvergedInputAccordion.tsx` lines 407/433/457 — identical pattern with same data-testids |
| 3 | Patch panel distance field only renders when racksAdjacent is unchecked | VERIFIED | `EthInputAccordion.tsx` line 363: `{!watchedRacksAdjacent && (` wraps patchPanelDistanceM FormField; same pattern in `ConvergedInputAccordion.tsx` line 454 |
| 4 | Advisory cards render in amber (variant=warning) when bom.advisories has PATCH_PANEL_RECOMMENDED | VERIFIED | `AdvisoryAlert.tsx` line 11: `<Alert variant="warning" role="alert">` with `AlertTriangle` icon; `BOMPanel.tsx` renders advisories in both Clos (line 407) and Three-Tier (line 773) sections |
| 5 | All new labels display correctly in EN, FR, DE, IT without fallback keys | VERIFIED | All 4 locale files contain all 9 required keys (6 under `sizing`, 3 under `bom`); confirmed at lines 61-66 and 311-313 in each file |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/sizing/AdvisoryAlert.tsx` | Reusable advisory card component, exports `AdvisoryAlert` | VERIFIED | 25-line substantive component; exports named `AdvisoryAlert`; handles `PATCH_PANEL_RECOMMENDED` with `variant="warning"`; returns `null` for unknown codes (future-proof guard, not a stub) |
| `src/i18n/locales/en/translation.json` | English translations, contains `rackPitchMm` | VERIFIED | 9 new keys present at lines 61-66 and 311-313; advisory body includes `{{computedDistanceM}}` and `{{dacLimitM}}` interpolation tokens |
| `src/i18n/locales/fr/translation.json` | French translations, contains `rackPitchMm` | VERIFIED | 9 new keys: `"rackPitchMm": "Espacement des baies"`, `"advisoriesHeading": "Avertissements"` |
| `src/i18n/locales/de/translation.json` | German translations, contains `rackPitchMm` | VERIFIED | 9 new keys: `"rackPitchMm": "Rack-Abstand"`, `"advisoriesHeading": "Hinweise"` |
| `src/i18n/locales/it/translation.json` | Italian translations, contains `rackPitchMm` | VERIFIED | 9 new keys: `"rackPitchMm": "Passo rack"`, `"advisoriesHeading": "Avvisi"` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `EthInputAccordion.tsx` | `src/store/inputStore` | `setInput({ rackPitchMm, ... })` — debounced for numeric fields, immediate rest spread for racksAdjacent | WIRED | Lines 183 `setInput({ [name]: numVal })` covers rackPitchMm and patchPanelDistanceM; line 202 `setInput(validRest)` carries racksAdjacent |
| `BOMPanel.tsx` | `AdvisoryAlert.tsx` | `import { AdvisoryAlert }` at line 23; rendered in map at lines 414 and 780 | WIRED | Import present + used twice (Clos section E and Three-Tier section G) |
| `AdvisoryAlert.tsx` | `src/i18n/locales/en/translation.json` | `t('bom.advisoryPatchPanelTitle')` and `t('bom.advisoryPatchPanelBody', {...})` | WIRED | Lines 13 and 15 use correct i18n keys; keys confirmed present in all 4 locale files |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PHYS-04 | 27-01-PLAN.md | i18n labels for all new inputs and sections in EN/FR/DE/IT | SATISFIED | All 4 locale files contain 9 new keys each covering geometry inputs and advisory sections; accordion forms use `t('sizing.rackPitchMm')` etc.; AdvisoryAlert uses `t('bom.advisoryPatchPanelTitle')` and `t('bom.advisoryPatchPanelBody')` |

No orphaned requirements — PHYS-04 is the sole requirement mapped to Phase 27 in REQUIREMENTS.md traceability table (line 87).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `AdvisoryAlert.tsx` | 24 | `return null` | Info | Intentional guard clause for future advisory codes — not a stub; the only active code path (`PATCH_PANEL_RECOMMENDED`) is fully implemented above it |

No blockers or warnings found. The `return null` is architecturally correct and noted in the plan as "future-proof".

### Human Verification Required

#### 1. Conditional patchPanelDistanceM field visibility

**Test:** Open the app, navigate to Ethernet input form, expand the "Rack Configuration" accordion section. Verify that the "Rack Pitch" input and "All racks adjacent" checkbox are visible. Uncheck the "All racks adjacent" checkbox.
**Expected:** The "Patch panel distance (m)" field appears below the checkbox immediately after unchecking.
**Why human:** React conditional rendering based on `watchedRacksAdjacent` state cannot be observed programmatically without a running browser.

#### 2. Advisory card amber colour

**Test:** Configure non-adjacent racks so that `PATCH_PANEL_RECOMMENDED` advisory triggers. View the BOM panel.
**Expected:** An amber/yellow card appears (not red) with "Patch Panel Recommended" title and a message showing computed distance and DAC limit values interpolated correctly.
**Why human:** CSS `variant="warning"` → amber colour depends on the design system token applied by `@/components/ui/alert`; visual rendering requires browser.

#### 3. Language switching coverage

**Test:** Change the UI language to FR, DE, and IT. Navigate to the accordion input form and BOM panel.
**Expected:** All geometry field labels and help text display in the selected language with no `sizing.rackPitchMm` or `bom.advisoriesHeading` fallback keys visible.
**Why human:** i18next runtime key resolution depends on locale loading at runtime.

### Gaps Summary

No gaps found. All 5 observable truths are verified, all artifacts are substantive and wired, the sole requirement PHYS-04 is satisfied, and the test suite is fully green (616 tests, 0 failures). TypeScript strict compilation passes.

---

_Verified: 2026-03-19_
_Verifier: Claude (gsd-verifier)_

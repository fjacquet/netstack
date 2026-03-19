/**
 * Pure cable length computation functions for all modes.
 *
 * Covers CABLE-01 through CABLE-06 requirements:
 * - SKU ladder with 15% slack buffer (CABLE-05)
 * - Rack height derivation from EIA-310 standard (CABLE-06)
 * - Within-rack cable length by switch positioning (CABLE-06)
 * - Inter-rack cable length (adjacent vs non-adjacent) (CABLE-06)
 * - Server→leaf / leaf→spine / VLT lengths for Clos mode (CABLE-01, CABLE-02)
 * - Three-tier per-boundary lengths (CABLE-03)
 * - FC ISL length fixed conservative estimate (CABLE-04)
 *
 * No React, no Zod, no side effects — pure arithmetic.
 * Called by engine modules in Plan 02 to populate cableSchedule BOM fields.
 */

/** Standard SKU lengths in metres (ascending order, CABLE-05) */
export const CABLE_SKU_LADDER = [1, 3, 5, 10] as const;
export type CableSkuM = (typeof CABLE_SKU_LADDER)[number];

/**
 * Apply 15% slack buffer and round up to nearest standard cable SKU.
 * If computed distance exceeds max SKU (10m), return 10m — caller should note
 * this as a long run likely requiring fiber-capable cabling.
 *
 * CABLE-05 test vectors:
 *   rawM=0.5  → 0.575  → SKU 1m
 *   rawM=1.0  → 1.15   → SKU 3m
 *   rawM=2.5  → 2.875  → SKU 3m
 *   rawM=2.7  → 3.105  → SKU 5m
 *   rawM=4.3  → 4.945  → SKU 5m
 *   rawM=4.4  → 5.06   → SKU 10m
 *   rawM=8.7  → 10.005 → SKU 10m (capped)
 */
export function applySlackAndRoundToSku(rawM: number): CableSkuM {
  const withSlack = rawM * 1.15;
  return (CABLE_SKU_LADDER.find((sku) => sku >= withSlack) ?? 10) as CableSkuM;
}

/**
 * Derive rack interior height in metres from rack size string.
 * Standard EIA-310 rack unit = 44.45 mm (1.75 inches).
 *
 *   24U interior = 1.067 m  (24 * 0.04445 = 1.0668 → 1.067)
 *   42U interior = 1.867 m  (42 * 0.04445 = 1.8669 → 1.867)
 *   50U interior = 2.223 m  (50 * 0.04445 = 2.2225 → 2.223)
 */
export function deriveRackHeightM(rackSize: '24U' | '42U' | '50U'): number {
  const uCount = parseInt(rackSize, 10);
  return parseFloat((uCount * 0.04445).toFixed(3));
}

/**
 * Within-rack cable length: server to switch in the same rack.
 * The 0.3m constant accounts for patch panel horizontal slack and connector
 * bend radius (standard industry practice).
 *
 * Positioning formulas:
 * - ToR: server at bottom, switch at top  → rackHeightM + 0.3
 * - MoR: server at extreme, switch at mid → rackHeightM * 0.5 + 0.3
 * - BoR: server at top, switch at bottom  → rackHeightM + 0.3
 */
export function withinRackCableLengthM(
  rackHeightM: number,
  positioning: 'ToR' | 'MoR' | 'BoR',
): number {
  switch (positioning) {
    case 'ToR':
      return rackHeightM + 0.3;
    case 'MoR':
      return rackHeightM * 0.5 + 0.3;
    case 'BoR':
      return rackHeightM + 0.3;
  }
}

/**
 * Inter-rack cable length: cable running between switches in different racks.
 * Accounts for horizontal travel (rack pitch) plus vertical drop at each end.
 *
 * Adjacent racks:   (rackPitchMm / 1000) + rackHeightM * 2
 * Non-adjacent:     patchPanelDistanceM * 2 + rackHeightM * 2
 *   (cable runs to patch panel at both ends, then vertical drops)
 */
export function interRackCableLengthM(
  rackPitchMm: number,
  rackHeightM: number,
  racksAdjacent: boolean,
  patchPanelDistanceM: number,
): number {
  if (racksAdjacent) {
    return rackPitchMm / 1000 + rackHeightM * 2;
  } else {
    return patchPanelDistanceM * 2 + rackHeightM * 2;
  }
}

/**
 * Compute server→leaf cable length SKU for Clos (leaf-spine) mode.
 * Uses within-rack formula since server and leaf switch are in the same rack.
 * CABLE-01
 */
export function computeServerLeafLengthM(input: {
  rackHeightM: number;
  switchPositioning: 'ToR' | 'MoR' | 'BoR';
}): CableSkuM {
  const rawM = withinRackCableLengthM(input.rackHeightM, input.switchPositioning);
  return applySlackAndRoundToSku(rawM);
}

/**
 * Compute leaf→spine cable length SKU for Clos mode.
 * Worst case: furthest server rack to network rack = rackCount hops of rack pitch.
 * Returns 0 for single-rack deployments (no inter-rack leaf→spine cables).
 * CABLE-02
 */
export function computeLeafSpineLengthM(input: {
  rackPitchMm: number;
  rackCount: number;
  rackHeightM: number;
  racksAdjacent: boolean;
  patchPanelDistanceM: number;
}): CableSkuM | 0 {
  if (input.rackCount <= 1) {
    return 0;
  }
  const rawM = input.racksAdjacent
    ? (input.rackPitchMm / 1000) * input.rackCount + input.rackHeightM * 2
    : input.patchPanelDistanceM * 2 + input.rackHeightM * 2;
  return applySlackAndRoundToSku(rawM);
}

/**
 * Compute VLT interconnect cable length SKU for Clos mode.
 * VLT links two leaf switches in the same rack — very short run (just slack).
 * The 0.3m constant is standard patch panel horizontal management slack.
 * CABLE-02
 */
export function computeVltLengthM(
  // rackHeightM is unused for VLT (within-rack short link), but accepted for API consistency
  _rackHeightM: number,
): CableSkuM {
  const rawM = 0.3; // within-rack short link: only patch panel slack
  return applySlackAndRoundToSku(rawM);
}

/**
 * Compute per-boundary cable length SKUs for Three-Tier mode.
 * Returns three distinct lengths for server→access, access→aggregation, aggregation→core.
 * CABLE-03
 */
export function computeThreeTierLengthsM(input: {
  rackPitchMm: number;
  rackCount: number;
  rackHeightM: number;
  switchPositioning: 'ToR' | 'MoR' | 'BoR';
  racksAdjacent: boolean;
  patchPanelDistanceM: number;
}): {
  serverAccessSkuM: CableSkuM;
  accessAggregationSkuM: CableSkuM;
  aggregationCoreSkuM: CableSkuM;
} {
  // server→access: within same rack (access switches are ToR/MoR/BoR in server rack)
  const serverAccessSkuM = computeServerLeafLengthM({
    rackHeightM: input.rackHeightM,
    switchPositioning: input.switchPositioning,
  });

  // access→aggregation: inter-rack (aggregation in dedicated network rack)
  const accessAggrRaw = interRackCableLengthM(
    input.rackPitchMm,
    input.rackHeightM,
    input.racksAdjacent,
    input.patchPanelDistanceM,
  );
  const accessAggregationSkuM = applySlackAndRoundToSku(accessAggrRaw);

  // aggregation→core: same inter-rack distance (both in or near the network rack row)
  const aggregationCoreSkuM = accessAggregationSkuM;

  return { serverAccessSkuM, accessAggregationSkuM, aggregationCoreSkuM };
}

/**
 * Compute FC ISL cable length SKU.
 * FC SAN domain is isolated from Ethernet geometry (per ADR-0009 parallel domain rule).
 * FCSizingInput has no geometry fields — use a fixed conservative estimate.
 *
 * Conservative assumption: adjacent racks, standard 42U height
 *   raw ≈ 0.6 + 1.867*2 = 4.334m → NOT correct for ISL (switch-to-switch, not server-to-switch)
 *   ISL raw estimate: 1 rack hop (0.6m) + vertical drops (1.867m*2) ≈ 4.334m → but let's use
 *   a simpler conservative: 3m raw (typical adjacent switch-to-switch) → 3.45m → SKU 5m.
 * CABLE-04
 */
export function computeFCIslLengthM(): CableSkuM {
  // Fixed conservative: 1 rack hop + verticals ≈ 3.5m raw, 15% slack → 4.025m → SKU 5m
  return 5;
}

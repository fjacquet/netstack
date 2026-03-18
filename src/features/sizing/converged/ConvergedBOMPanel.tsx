import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { cva } from 'class-variance-authority'
import { BarChart3, AlertCircle, AlertTriangle } from 'lucide-react'
import { useConvergedResultStore } from '@/store/convergedResultStore'
import { SWITCH_CATALOG } from '@/domain/catalog/hardware'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import type { ConstraintViolation } from '@/domain/schemas/bom'
import type { FCConstraintViolation } from '@/domain/schemas/fc-bom'
import type { ThreeTierConstraintViolation } from '@/domain/schemas/three-tier-bom'

// ── Oversubscription badge variants (Ethernet: <=3 optimal, <=6 acceptable, >6 critical) ──

const oversubBadgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold transition-colors duration-150',
  {
    variants: {
      severity: {
        optimal: 'bg-[hsl(142_76%_36%)] text-white dark:bg-[hsl(142_69%_58%)] dark:text-black',
        acceptable: 'bg-[hsl(38_92%_50%)] text-white dark:bg-[hsl(38_95%_64%)] dark:text-black',
        critical: 'bg-destructive text-destructive-foreground',
      },
    },
  }
)

function getSeverity(ratio: number): 'optimal' | 'acceptable' | 'critical' {
  if (ratio <= 3) return 'optimal'
  if (ratio <= 6) return 'acceptable'
  return 'critical'
}

// ── FC fan-in badge variants (FC: <=3 optimal, <=7 acceptable, >7 critical) ──

const fcFanInBadgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold transition-colors duration-150',
  {
    variants: {
      severity: {
        optimal: 'bg-[hsl(142_76%_36%)] text-white dark:bg-[hsl(142_69%_58%)] dark:text-black',
        acceptable: 'bg-[hsl(38_92%_50%)] text-white dark:bg-[hsl(38_95%_64%)] dark:text-black',
        critical: 'bg-destructive text-destructive-foreground',
      },
    },
  }
)

function getFCSeverity(ratio: number): 'optimal' | 'acceptable' | 'critical' {
  if (ratio <= 3) return 'optimal'
  if (ratio <= 7) return 'acceptable'
  return 'critical'
}

// ── Port utilization helpers ──────────────────────────────────────────────────

function getProgressColor(pct: number): string {
  if (pct < 80) return 'bg-[hsl(142_76%_36%)] dark:bg-[hsl(142_69%_58%)]'
  if (pct < 100) return 'bg-[hsl(38_92%_50%)] dark:bg-[hsl(38_95%_64%)]'
  return 'bg-destructive'
}

// ── Violation rendering (handles both Ethernet and FC violations) ─────────────

function EthernetViolationAlert({ v }: { v: ConstraintViolation }) {
  const { t } = useTranslation()

  if (v.code === 'OOB_PORT_SATURATION') {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('bom.violationOobTitle')}</AlertTitle>
        <AlertDescription>
          {t('bom.violationOobBody', { required: v.required, available: v.available })}
        </AlertDescription>
      </Alert>
    )
  }

  if (v.code === 'SPINE_CAPACITY_EXCEEDED') {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('bom.violationSpineTitle')}</AlertTitle>
        <AlertDescription>
          {t('bom.violationSpineBody', { leafCount: v.leafCount, maxLeafs: v.maxLeafs })}
        </AlertDescription>
      </Alert>
    )
  }

  if (v.code === 'DAC_DISTANCE_ADVISORY') {
    return (
      <Alert variant="warning" role="alert">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('bom.violationDacTitle')}</AlertTitle>
        <AlertDescription>
          {t('bom.violationDacBody', { rackCount: v.rackCount })}
        </AlertDescription>
      </Alert>
    )
  }

  if (v.code === 'RACK_CAPACITY_EXCEEDED') {
    return (
      <Alert variant="destructive" role="alert">
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

  return null
}

function FCViolationAlert({ v }: { v: FCConstraintViolation }) {
  const { t } = useTranslation()

  if (v.code === 'FC_PORT_SATURATION') {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('fcbom.violationPortSatTitle')}</AlertTitle>
        <AlertDescription>
          {t('fcbom.violationPortSatBody', {
            requiredPorts: v.requiredPorts,
            availablePorts: v.availablePorts,
          })}
        </AlertDescription>
      </Alert>
    )
  }

  if (v.code === 'FC_OVERSUBSCRIPTION_EXCEEDED') {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('fcbom.violationOversubTitle')}</AlertTitle>
        <AlertDescription>
          {t('fcbom.violationOversubBody', {
            ratio: v.ratio.toFixed(1),
            maxRatio: v.maxRatio,
            minStoragePorts: v.minStoragePorts,
          })}
        </AlertDescription>
      </Alert>
    )
  }

  if (v.code === 'FC_ISL_UNDERPROVISIONED') {
    return (
      <Alert variant="warning" role="alert">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('fcbom.violationIslTitle')}</AlertTitle>
        <AlertDescription>
          {t('fcbom.violationIslBody', {
            islsAvailable: v.islsAvailable,
            islsRequired: v.islsRequired,
          })}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

/**
 * Dispatch a combined violation (Ethernet or FC) to the correct alert component.
 * FC violations have codes starting with 'FC_'.
 */
type AnyViolation = ConstraintViolation | FCConstraintViolation | ThreeTierConstraintViolation

function CombinedViolationAlert({ v }: { v: AnyViolation }) {
  if (v.code.startsWith('FC_')) {
    return <FCViolationAlert v={v as FCConstraintViolation} />
  }
  // Three-tier violations share some codes with Ethernet (OOB_PORT_SATURATION, etc.)
  // Render them using the Ethernet alert renderer for now (same shape for shared codes)
  return <EthernetViolationAlert v={v as ConstraintViolation} />
}

/** Generate a unique key for a violation */
function violationKey(v: AnyViolation): string {
  if ('rackNumber' in v) return `${v.code}-${v.rackNumber}`
  return v.code
}

// ── ConvergedBOMPanel component ──────────────────────────────────────────────

export function ConvergedBOMPanel() {
  const { t } = useTranslation()
  const { bom, violations } = useConvergedResultStore(
    useShallow((s) => ({ bom: s.bom, violations: s.violations }))
  )

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (!bom) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">{t('bom.emptyHeading')}</h3>
            <p className="max-w-sm text-sm text-muted-foreground">{t('bom.emptyBody')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Ethernet section variables (computed only when ethernetBom is present) ──
  const ethBom = bom.ethernetBom
  const ttBom = bom.threeTierBom

  // Clos-specific derived values (only when ethBom is non-null)
  const closRatio = ethBom ? ethBom.oversubscriptionRatio : 0
  const closRatioFormatted = ethBom ? `${closRatio.toFixed(1)}:1` : ''
  const closSeverity = ethBom ? getSeverity(closRatio) : ('optimal' as const)

  const closMaxServersPerRack = ethBom && ethBom.input.racks.length > 0
    ? Math.max(...ethBom.input.racks.map(r => r.serverCount))
    : 0
  const closLeafUsed = closMaxServersPerRack
  const closLeafAvailable = ethBom ? SWITCH_CATALOG[ethBom.input.leafModel].downlinkPorts : 0
  const closLeafPct = closLeafAvailable > 0 ? Math.round((closLeafUsed / closLeafAvailable) * 100) : 0

  const closSpineUsed = ethBom && ethBom.spineSwitches > 0 ? Math.ceil(ethBom.leafSwitches / ethBom.spineSwitches) : 0
  const closSpineAvailable = SWITCH_CATALOG['S5232F-ON'].downlinkPorts
  const closSpinePct = Math.round((closSpineUsed / closSpineAvailable) * 100)

  const closOobUsed = closMaxServersPerRack + 2
  const closOobAvailable = SWITCH_CATALOG['S3248T-ON'].downlinkPorts
  const closOobPct = Math.round((closOobUsed / closOobAvailable) * 100)

  const closCableCategory25G = ethBom
    ? ethBom.input.cableType === 'DAC'
      ? t('bom.cableCategoryDac')
      : ethBom.input.cableType === 'AOC'
        ? t('bom.cableCategoryAoc')
        : t('bom.cableCategoryFiberLc')
    : ''
  const closCableCategory100G = ethBom
    ? ethBom.input.cableType === 'DAC'
      ? t('bom.cableCategoryDac')
      : ethBom.input.cableType === 'AOC'
        ? t('bom.cableCategoryAoc')
        : t('bom.cableCategoryFiberMpo')
    : ''

  // Three-tier severity helper (green <=3, amber 3-5, red >5)
  const getThreeTierSeverity = (ratio: number): 'optimal' | 'acceptable' | 'critical' => {
    if (ratio <= 3) return 'optimal'
    if (ratio <= 5) return 'acceptable'
    return 'critical'
  }

  const formatOversub = (ratio: number): string => `${ratio.toFixed(1)}:1`

  return (
    <div className="space-y-4">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ETHERNET SECTION — branches on topology                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Three-Tier BOM (when topology='three-tier') ────────────────────── */}
      {ttBom && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('converged.ethernetHeading')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* ── Oversubscription Ratios ──────────────────────────────── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('bom.oversubHeading')}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('threeTier.accessToAggrOversub')}</span>
                    <span className="text-lg font-semibold">{formatOversub(ttBom.accessToAggrOversubscription)}</span>
                    <span className={oversubBadgeVariants({ severity: getThreeTierSeverity(ttBom.accessToAggrOversubscription) })}>
                      {getThreeTierSeverity(ttBom.accessToAggrOversubscription) === 'optimal' ? t('bom.oversubOptimal') : getThreeTierSeverity(ttBom.accessToAggrOversubscription) === 'acceptable' ? t('bom.oversubAcceptable') : t('bom.oversubCritical')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{t('threeTier.aggrToCoreOversub')}</span>
                    <span className="text-lg font-semibold">{formatOversub(ttBom.aggrToCoreOversubscription)}</span>
                    <span className={oversubBadgeVariants({ severity: getThreeTierSeverity(ttBom.aggrToCoreOversubscription) })}>
                      {getThreeTierSeverity(ttBom.aggrToCoreOversubscription) === 'optimal' ? t('bom.oversubOptimal') : getThreeTierSeverity(ttBom.aggrToCoreOversubscription) === 'acceptable' ? t('bom.oversubAcceptable') : t('bom.oversubCritical')}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Switches Table ──────────────────────────────────────── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('bom.switchesHeading')}
                </p>
                <Table>
                  <TableCaption className="sr-only">{t('bom.switchesHeading')}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t('bom.colRole')}</TableHead>
                      <TableHead scope="col">{t('bom.colModel')}</TableHead>
                      <TableHead scope="col">{t('bom.colQty')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{t('threeTier.accessSwitches')}</TableCell>
                      <TableCell className="font-mono">{ttBom.input.accessModel}</TableCell>
                      <TableCell>{ttBom.accessSwitches}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('threeTier.aggregationSwitches')}</TableCell>
                      <TableCell className="font-mono">{ttBom.input.aggregationModel}</TableCell>
                      <TableCell>{ttBom.aggregationSwitches}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('threeTier.coreSwitches')}</TableCell>
                      <TableCell className="font-mono">{ttBom.input.coreModel}</TableCell>
                      <TableCell>{ttBom.coreSwitches}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('threeTier.oobSwitches')}</TableCell>
                      <TableCell className="font-mono">S3248T-ON</TableCell>
                      <TableCell>{ttBom.oobSwitches}</TableCell>
                    </TableRow>
                    {ttBom.borderLeafSwitches > 0 && (
                      <TableRow>
                        <TableCell>{t('threeTier.borderLeafSwitches')}</TableCell>
                        <TableCell className="font-mono">{ttBom.input.borderLeafModel}</TableCell>
                        <TableCell>{ttBom.borderLeafSwitches}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Cables Table ────────────────────────────────────────── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('bom.cablesHeading', { type: ttBom.input.cableType })}
                </p>
                <Table>
                  <TableCaption className="sr-only">
                    {t('bom.cablesHeading', { type: ttBom.input.cableType })}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t('bom.colCableType')}</TableHead>
                      <TableHead scope="col">{t('bom.colQty')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>{t('threeTier.serverAccessCables')}</TableCell>
                      <TableCell>{ttBom.serverAccessCables}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('threeTier.accessAggrCables')}</TableCell>
                      <TableCell>{ttBom.accessAggrCables}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('threeTier.aggrCoreCables')}</TableCell>
                      <TableCell>{ttBom.aggrCoreCables}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Server-OOB</TableCell>
                      <TableCell>{ttBom.serverOobCables}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>{t('threeTier.vltCables')}</TableCell>
                      <TableCell>{ttBom.vltCables}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* ── Optics Table (if any) ───────────────────────────────── */}
              {(ttBom.sfp28Count > 0 || ttBom.qsfp28Count > 0 || ttBom.qsfp56ddCount > 0) && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Optics
                  </p>
                  <Table>
                    <TableCaption className="sr-only">Optics</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">{t('bom.colCableType')}</TableHead>
                        <TableHead scope="col">{t('bom.colQty')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ttBom.sfp28Count > 0 && (
                        <TableRow>
                          <TableCell>{t('bom.sfp28Transceiver')}</TableCell>
                          <TableCell>{ttBom.sfp28Count}</TableCell>
                        </TableRow>
                      )}
                      {ttBom.qsfp28Count > 0 && (
                        <TableRow>
                          <TableCell>{t('bom.qsfp28Transceiver')}</TableCell>
                          <TableCell>{ttBom.qsfp28Count}</TableCell>
                        </TableRow>
                      )}
                      {ttBom.qsfp56ddCount > 0 && (
                        <TableRow>
                          <TableCell>QSFP56-DD Transceiver</TableCell>
                          <TableCell>{ttBom.qsfp56ddCount}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* ── Rack Summary ────────────────────────────────────────── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('rack.heading')}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">{t('sizing.rackCount')}</span>
                  <span className="font-semibold">{ttBom.racks}</span>
                  <span className="text-muted-foreground">{t('threeTier.networkRacks')}</span>
                  <span className="font-semibold">{ttBom.networkRacks}</span>
                  <span className="text-muted-foreground">{t('sizing.switchPositioning')}</span>
                  <span className="font-semibold">{ttBom.switchPositioning}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Clos (Leaf-Spine) BOM (when topology='leaf-spine') ─────────────── */}
      {ethBom && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('converged.ethernetHeading')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* ── Oversubscription Metric ─────────────────────────────────── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('bom.oversubHeading')}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">{closRatioFormatted}</span>
                  <span
                    data-testid="oversub-badge"
                    data-severity={closSeverity}
                    className={oversubBadgeVariants({ severity: closSeverity })}
                    aria-label={t('bom.oversubAriaLabel', { value: closRatioFormatted, status: closSeverity })}
                  >
                    {closSeverity === 'optimal'
                      ? t('bom.oversubOptimal')
                      : closSeverity === 'acceptable'
                        ? t('bom.oversubAcceptable')
                        : t('bom.oversubCritical')}
                  </span>
                </div>
                {/* Threshold legend chips */}
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span
                    className={
                      closSeverity === 'optimal'
                        ? 'rounded-md bg-[hsl(142_76%_36%)] px-2 py-0.5 text-white dark:bg-[hsl(142_69%_58%)] dark:text-black'
                        : 'rounded-md border px-2 py-0.5 text-muted-foreground'
                    }
                  >
                    {t('bom.oversubOptimal')} {t('bom.oversubOptimalValue')}
                  </span>
                  <span
                    className={
                      closSeverity === 'acceptable'
                        ? 'rounded-md bg-[hsl(38_92%_50%)] px-2 py-0.5 text-white dark:bg-[hsl(38_95%_64%)] dark:text-black'
                        : 'rounded-md border px-2 py-0.5 text-muted-foreground'
                    }
                  >
                    {t('bom.oversubAcceptable')} {t('bom.oversubAcceptableValue')}
                  </span>
                  <span
                    className={
                      closSeverity === 'critical'
                        ? 'rounded-md bg-destructive px-2 py-0.5 text-destructive-foreground'
                        : 'rounded-md border px-2 py-0.5 text-muted-foreground'
                    }
                  >
                    {t('bom.oversubCritical')} {t('bom.oversubCriticalValue')}
                  </span>
                </div>
              </div>

              {/* ── Switches Table ──────────────────────────────────────────── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('bom.switchesHeading')}
                </p>
                <Table>
                  <TableCaption className="sr-only">{t('bom.switchesHeading')}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t('bom.colModel')}</TableHead>
                      <TableHead scope="col">{t('bom.colRole')}</TableHead>
                      <TableHead scope="col">{t('bom.colQty')}</TableHead>
                      <TableHead scope="col">{t('bom.colUtilization')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Leaf row */}
                    <TableRow>
                      <TableCell className="font-mono">{ethBom.input.leafModel}</TableCell>
                      <TableCell>{t('bom.roleLeaf')}</TableCell>
                      <TableCell>{ethBom.leafSwitches}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Progress
                              value={closLeafPct}
                              indicatorClassName={getProgressColor(closLeafPct)}
                              className="h-2 w-24"
                              aria-valuenow={closLeafPct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={t('bom.portUtilizationAriaLabel', {
                                model: ethBom.input.leafModel,
                                pct: closLeafPct,
                              })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t('bom.portUtilizationTooltip', {
                              used: closLeafUsed,
                              available: closLeafAvailable,
                              pct: closLeafPct,
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {/* Spine row */}
                    <TableRow>
                      <TableCell className="font-mono">S5232F-ON</TableCell>
                      <TableCell>{t('bom.roleSpine')}</TableCell>
                      <TableCell>{ethBom.spineSwitches}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Progress
                              value={closSpinePct}
                              indicatorClassName={getProgressColor(closSpinePct)}
                              className="h-2 w-24"
                              aria-valuenow={closSpinePct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={t('bom.portUtilizationAriaLabel', {
                                model: 'S5232F-ON',
                                pct: closSpinePct,
                              })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t('bom.portUtilizationTooltip', {
                              used: closSpineUsed,
                              available: closSpineAvailable,
                              pct: closSpinePct,
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {/* OOB row */}
                    <TableRow>
                      <TableCell className="font-mono">S3248T-ON</TableCell>
                      <TableCell>{t('bom.roleOob')}</TableCell>
                      <TableCell>{ethBom.oobSwitches}</TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Progress
                              value={closOobPct}
                              indicatorClassName={getProgressColor(closOobPct)}
                              className="h-2 w-24"
                              aria-valuenow={closOobPct}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={t('bom.portUtilizationAriaLabel', {
                                model: 'S3248T-ON',
                                pct: closOobPct,
                              })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t('bom.portUtilizationTooltip', {
                              used: closOobUsed,
                              available: closOobAvailable,
                              pct: closOobPct,
                            })}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    {/* Border Leaf row (only if border leafs configured) */}
                    {ethBom.borderLeafSwitches > 0 && (
                      <TableRow>
                        <TableCell className="font-mono">{ethBom.input.borderLeafModel}</TableCell>
                        <TableCell>{t('bom.roleBorderLeaf')}</TableCell>
                        <TableCell>{ethBom.borderLeafSwitches}</TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ── Cables Table ────────────────────────────────────────────── */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('bom.cablesHeading', { type: ethBom.input.cableType })}
                </p>
                <Table>
                  <TableCaption className="sr-only">
                    {t('bom.cablesHeading', { type: ethBom.input.cableType })}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t('bom.colCableType')}</TableHead>
                      <TableHead scope="col">{t('bom.colCableCategory')}</TableHead>
                      <TableHead scope="col">{t('bom.colQty')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Leaf-Spine</TableCell>
                      <TableCell>{closCableCategory100G}</TableCell>
                      <TableCell>{ethBom.leafSpineCables}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Server-Leaf</TableCell>
                      <TableCell>{closCableCategory25G}</TableCell>
                      <TableCell>{ethBom.serverLeafCables}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Server-OOB</TableCell>
                      <TableCell>1G RJ45</TableCell>
                      <TableCell>{ethBom.serverOobCables}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>VLT Interconnect</TableCell>
                      <TableCell>QSFP28-DD</TableCell>
                      <TableCell>{ethBom.vltCables}</TableCell>
                    </TableRow>
                    {ethBom.sfp28Count > 0 && (
                      <TableRow>
                        <TableCell>{t('bom.sfp28Transceiver')}</TableCell>
                        <TableCell>SFP28 LC (25G)</TableCell>
                        <TableCell>{ethBom.sfp28Count}</TableCell>
                      </TableRow>
                    )}
                    {ethBom.qsfp28Count > 0 && (
                      <TableRow>
                        <TableCell>{t('bom.qsfp28Transceiver')}</TableCell>
                        <TableCell>QSFP28 MPO (100G)</TableCell>
                        <TableCell>{ethBom.qsfp28Count}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {ethBom.recommendedCableLengthM > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('bom.cableLengthAdvisory', {
                      maxLength: ethBom.recommendedCableLengthM,
                      positioning: ethBom.switchPositioning,
                    })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* FC SECTION — conditionally rendered ONLY when fcBom is non-null       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {bom.fcBom !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('converged.fcHeading')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ── Fan-in ratio with severity badge ───────────────────────── */}
            <section aria-labelledby="converged-fc-fanin-heading">
              <h3 id="converged-fc-fanin-heading" className="text-sm font-medium mb-2">
                {t('fcbom.fanInHeading')}
              </h3>
              <span className={fcFanInBadgeVariants({ severity: getFCSeverity(bom.fcBom.fanInRatio) })}>
                {bom.fcBom.fanInRatio.toFixed(1)}:1
              </span>
            </section>

            <Separator />

            {/* ── Port distribution table ─────────────────────────────────── */}
            <section aria-labelledby="converged-fc-ports-heading">
              <h3 id="converged-fc-ports-heading" className="text-sm font-medium mb-2">
                {t('fcbom.portsHeading')}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('bom.colRole')}</TableHead>
                    <TableHead>{t('bom.colQty')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{t('fcbom.hostPorts')}</TableCell>
                    <TableCell>{bom.fcBom.hostPortsPerFabric}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('fcbom.storagePorts')}</TableCell>
                    <TableCell>{bom.fcBom.storagePortsPerFabric}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('fcbom.islPorts')}</TableCell>
                    <TableCell>{bom.fcBom.islPortsPerFabric}</TableCell>
                  </TableRow>
                  <TableRow className="font-medium">
                    <TableCell>{t('fcbom.totalPorts')}</TableCell>
                    <TableCell>
                      {bom.fcBom.hostPortsPerFabric + bom.fcBom.storagePortsPerFabric + bom.fcBom.islPortsPerFabric}
                    </TableCell>
                  </TableRow>
                  <TableRow className="text-muted-foreground">
                    <TableCell>{t('fcbom.switchCapacity')}</TableCell>
                    <TableCell>{bom.fcBom.switchPortsPerFabric}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </section>

            <Separator />

            {/* ── Switches/optics table ───────────────────────────────────── */}
            <section aria-labelledby="converged-fc-switches-heading">
              <h3 id="converged-fc-switches-heading" className="text-sm font-medium mb-2">
                {t('fcbom.switchesHeading')}
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('bom.colRole')}</TableHead>
                    <TableHead>{t('bom.colQty')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{t('fcbom.roleFabricA')}</TableCell>
                    <TableCell>{bom.fcBom.fabricASwitches}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('fcbom.roleFabricB')}</TableCell>
                    <TableCell>{bom.fcBom.fabricBSwitches}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('fcbom.islCables')}</TableCell>
                    <TableCell>{bom.fcBom.islCables}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('fcbom.fcOpticsCount')}</TableCell>
                    <TableCell>{bom.fcBom.fcOpticsCount}</TableCell>
                  </TableRow>
                  {bom.fcBom.podLicensesRequired > 0 && (
                    <TableRow>
                      <TableCell>{t('fcbom.podLicenseLabel')}</TableCell>
                      <TableCell>
                        {bom.fcBom.podLicensesRequired} {t('fcbom.podLicenseUnit')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </section>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* COMBINED VIOLATIONS — renders both Ethernet and FC violations         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {violations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t('bom.alertsHeading')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {violations.map((v) => (
                <CombinedViolationAlert key={violationKey(v)} v={v} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { cva } from 'class-variance-authority'
import { BarChart3, AlertCircle, AlertTriangle } from 'lucide-react'
import { useResultStore } from '@/store/resultStore'
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
import type { ConstraintViolation } from '@/domain/schemas/bom'

// ── Oversubscription badge variants ──────────────────────────────────────────

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

// ── Port utilization helpers ──────────────────────────────────────────────────

function getProgressColor(pct: number): string {
  if (pct < 80) return 'bg-[hsl(142_76%_36%)] dark:bg-[hsl(142_69%_58%)]'
  if (pct < 100) return 'bg-[hsl(38_92%_50%)] dark:bg-[hsl(38_95%_64%)]'
  return 'bg-destructive'
}

// ── Violation rendering ───────────────────────────────────────────────────────

function ViolationAlert({ v }: { v: ConstraintViolation }) {
  const { t } = useTranslation()

  if (v.code === 'OOB_PORT_SATURATION') {
    return (
      <Alert variant="destructive" role="alert" key={v.code}>
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
      <Alert variant="destructive" role="alert" key={v.code}>
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
      <Alert variant="warning" role="alert" key={v.code}>
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

  return null
}

// ── BOMPanel component ────────────────────────────────────────────────────────

export function BOMPanel() {
  const { t } = useTranslation()
  const { bom, violations } = useResultStore(
    useShallow((s) => ({ bom: s.bom, violations: s.violations }))
  )

  // ── Empty state ───────────────────────────────────────────────────────────
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

  // ── Oversubscription ratio ────────────────────────────────────────────────
  const ratio = bom.oversubscriptionRatio
  const ratioFormatted = `${ratio.toFixed(1)}:1`
  const severity = getSeverity(ratio)

  // ── Port utilization data ─────────────────────────────────────────────────
  // RACK-03: Use worst-case rack (max serverCount) for port utilization display
  const maxServersPerRack = bom.input.racks.length > 0
    ? Math.max(...bom.input.racks.map(r => r.serverCount))
    : 0
  const leafUsed = maxServersPerRack
  const leafAvailable = SWITCH_CATALOG[bom.input.leafModel].downlinkPorts
  const leafPct = Math.round((leafUsed / leafAvailable) * 100)

  const spineUsed = bom.spineSwitches > 0 ? Math.ceil(bom.leafSwitches / bom.spineSwitches) : 0
  const spineAvailable = SWITCH_CATALOG['S5232F-ON'].downlinkPorts
  const spinePct = Math.round((spineUsed / spineAvailable) * 100)

  const oobUsed = maxServersPerRack + 2
  const oobAvailable = SWITCH_CATALOG['S3248T-ON'].downlinkPorts
  const oobPct = Math.round((oobUsed / oobAvailable) * 100)

  // ── Cable category labels (fiber differs by speed: LC for 25G, MPO for 100G) ──
  const cableCategory25G =
    bom.input.cableType === 'DAC'
      ? t('bom.cableCategoryDac')
      : bom.input.cableType === 'AOC'
        ? t('bom.cableCategoryAoc')
        : t('bom.cableCategoryFiberLc')
  const cableCategory100G =
    bom.input.cableType === 'DAC'
      ? t('bom.cableCategoryDac')
      : bom.input.cableType === 'AOC'
        ? t('bom.cableCategoryAoc')
        : t('bom.cableCategoryFiberMpo')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{t('bom.heading')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* ── Section A: Oversubscription Metric ─────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('bom.oversubHeading')}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">{ratioFormatted}</span>
              <span
                data-testid="oversub-badge"
                data-severity={severity}
                className={oversubBadgeVariants({ severity })}
                aria-label={t('bom.oversubAriaLabel', { value: ratioFormatted, status: severity })}
              >
                {severity === 'optimal'
                  ? t('bom.oversubOptimal')
                  : severity === 'acceptable'
                    ? t('bom.oversubAcceptable')
                    : t('bom.oversubCritical')}
              </span>
            </div>
            {/* Threshold legend chips */}
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span
                className={
                  severity === 'optimal'
                    ? 'rounded-md bg-[hsl(142_76%_36%)] px-2 py-0.5 text-white dark:bg-[hsl(142_69%_58%)] dark:text-black'
                    : 'rounded-md border px-2 py-0.5 text-muted-foreground'
                }
              >
                {t('bom.oversubOptimal')} {t('bom.oversubOptimalValue')}
              </span>
              <span
                className={
                  severity === 'acceptable'
                    ? 'rounded-md bg-[hsl(38_92%_50%)] px-2 py-0.5 text-white dark:bg-[hsl(38_95%_64%)] dark:text-black'
                    : 'rounded-md border px-2 py-0.5 text-muted-foreground'
                }
              >
                {t('bom.oversubAcceptable')} {t('bom.oversubAcceptableValue')}
              </span>
              <span
                className={
                  severity === 'critical'
                    ? 'rounded-md bg-destructive px-2 py-0.5 text-destructive-foreground'
                    : 'rounded-md border px-2 py-0.5 text-muted-foreground'
                }
              >
                {t('bom.oversubCritical')} {t('bom.oversubCriticalValue')}
              </span>
            </div>
          </div>

          {/* ── Section B: Switches Table ───────────────────────────────── */}
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
                  <TableCell className="font-mono">{bom.input.leafModel}</TableCell>
                  <TableCell>{t('bom.roleLeaf')}</TableCell>
                  <TableCell>{bom.leafSwitches}</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Progress
                          value={leafPct}
                          indicatorClassName={getProgressColor(leafPct)}
                          className="h-2 w-24"
                          aria-valuenow={leafPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={t('bom.portUtilizationAriaLabel', {
                            model: bom.input.leafModel,
                            pct: leafPct,
                          })}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('bom.portUtilizationTooltip', {
                          used: leafUsed,
                          available: leafAvailable,
                          pct: leafPct,
                        })}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                {/* Spine row */}
                <TableRow>
                  <TableCell className="font-mono">S5232F-ON</TableCell>
                  <TableCell>{t('bom.roleSpine')}</TableCell>
                  <TableCell>{bom.spineSwitches}</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Progress
                          value={spinePct}
                          indicatorClassName={getProgressColor(spinePct)}
                          className="h-2 w-24"
                          aria-valuenow={spinePct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={t('bom.portUtilizationAriaLabel', {
                            model: 'S5232F-ON',
                            pct: spinePct,
                          })}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('bom.portUtilizationTooltip', {
                          used: spineUsed,
                          available: spineAvailable,
                          pct: spinePct,
                        })}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                {/* OOB row */}
                <TableRow>
                  <TableCell className="font-mono">S3248T-ON</TableCell>
                  <TableCell>{t('bom.roleOob')}</TableCell>
                  <TableCell>{bom.oobSwitches}</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Progress
                          value={oobPct}
                          indicatorClassName={getProgressColor(oobPct)}
                          className="h-2 w-24"
                          aria-valuenow={oobPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={t('bom.portUtilizationAriaLabel', {
                            model: 'S3248T-ON',
                            pct: oobPct,
                          })}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('bom.portUtilizationTooltip', {
                          used: oobUsed,
                          available: oobAvailable,
                          pct: oobPct,
                        })}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                {/* Border Leaf row (only if border leafs configured) */}
                {bom.borderLeafSwitches > 0 && (
                  <TableRow>
                    <TableCell className="font-mono">{bom.input.borderLeafModel}</TableCell>
                    <TableCell>{t('bom.roleBorderLeaf')}</TableCell>
                    <TableCell>{bom.borderLeafSwitches}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Section C: Cables Table ─────────────────────────────────── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('bom.cablesHeading', { type: bom.input.cableType })}
            </p>
            <Table>
              <TableCaption className="sr-only">
                {t('bom.cablesHeading', { type: bom.input.cableType })}
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
                  <TableCell>{cableCategory100G}</TableCell>
                  <TableCell>{bom.leafSpineCables}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Server-Leaf</TableCell>
                  <TableCell>{cableCategory25G}</TableCell>
                  <TableCell>{bom.serverLeafCables}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Server-OOB</TableCell>
                  <TableCell>1G RJ45</TableCell>
                  <TableCell>{bom.serverOobCables}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>VLT Interconnect</TableCell>
                  <TableCell>QSFP28-DD</TableCell>
                  <TableCell>{bom.vltCables}</TableCell>
                </TableRow>
                {bom.sfp28Count > 0 && (
                  <TableRow>
                    <TableCell>{t('bom.sfp28Transceiver')}</TableCell>
                    <TableCell>SFP28 LC (25G)</TableCell>
                    <TableCell>{bom.sfp28Count}</TableCell>
                  </TableRow>
                )}
                {bom.qsfp28Count > 0 && (
                  <TableRow>
                    <TableCell>{t('bom.qsfp28Transceiver')}</TableCell>
                    <TableCell>QSFP28 MPO (100G)</TableCell>
                    <TableCell>{bom.qsfp28Count}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {bom.recommendedCableLengthM > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {t('bom.cableLengthAdvisory', {
                  maxLength: bom.recommendedCableLengthM,
                  positioning: bom.switchPositioning,
                })}
              </p>
            )}
          </div>

          {/* ── Section D: Violations ───────────────────────────────────── */}
          {violations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('bom.alertsHeading')}
              </p>
              <div className="space-y-2">
                {violations.map((v) => (
                  <ViolationAlert key={'rackNumber' in v ? `${v.code}-${v.rackNumber}` : v.code} v={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

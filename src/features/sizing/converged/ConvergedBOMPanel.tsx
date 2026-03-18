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

  // ── Guard: three-tier topology has no Ethernet BOM (handled in future plan) ──
  if (!bom.ethernetBom) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Three-Tier BOM</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Three-tier topology BOM panel is coming in a future release.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Ethernet oversubscription ───────────────────────────────────────────────
  const ethBom = bom.ethernetBom
  const ratio = ethBom.oversubscriptionRatio
  const ratioFormatted = `${ratio.toFixed(1)}:1`
  const severity = getSeverity(ratio)

  // ── Ethernet port utilization (worst-case rack) ─────────────────────────────
  const maxServersPerRack = ethBom.input.racks.length > 0
    ? Math.max(...ethBom.input.racks.map(r => r.serverCount))
    : 0
  const leafUsed = maxServersPerRack
  const leafAvailable = SWITCH_CATALOG[ethBom.input.leafModel].downlinkPorts
  const leafPct = Math.round((leafUsed / leafAvailable) * 100)

  const spineUsed = ethBom.spineSwitches > 0 ? Math.ceil(ethBom.leafSwitches / ethBom.spineSwitches) : 0
  const spineAvailable = SWITCH_CATALOG['S5232F-ON'].downlinkPorts
  const spinePct = Math.round((spineUsed / spineAvailable) * 100)

  const oobUsed = maxServersPerRack + 2
  const oobAvailable = SWITCH_CATALOG['S3248T-ON'].downlinkPorts
  const oobPct = Math.round((oobUsed / oobAvailable) * 100)

  // ── Cable category labels ───────────────────────────────────────────────────
  const cableCategory25G =
    ethBom.input.cableType === 'DAC'
      ? t('bom.cableCategoryDac')
      : ethBom.input.cableType === 'AOC'
        ? t('bom.cableCategoryAoc')
        : t('bom.cableCategoryFiberLc')
  const cableCategory100G =
    ethBom.input.cableType === 'DAC'
      ? t('bom.cableCategoryDac')
      : ethBom.input.cableType === 'AOC'
        ? t('bom.cableCategoryAoc')
        : t('bom.cableCategoryFiberMpo')

  return (
    <div className="space-y-4">
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ETHERNET SECTION — always rendered                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
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
                            value={leafPct}
                            indicatorClassName={getProgressColor(leafPct)}
                            className="h-2 w-24"
                            aria-valuenow={leafPct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={t('bom.portUtilizationAriaLabel', {
                              model: ethBom.input.leafModel,
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
                    <TableCell>{ethBom.spineSwitches}</TableCell>
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
                    <TableCell>{ethBom.oobSwitches}</TableCell>
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
                    <TableCell>{cableCategory100G}</TableCell>
                    <TableCell>{ethBom.leafSpineCables}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Server-Leaf</TableCell>
                    <TableCell>{cableCategory25G}</TableCell>
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

import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { cva } from 'class-variance-authority'
import { BarChart3, AlertCircle, AlertTriangle } from 'lucide-react'
import { useThreeTierResultStore } from '@/store/threeTierResultStore'
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
import type { ThreeTierConstraintViolation } from '@/domain/schemas/three-tier-bom'

// -- Oversubscription badge variants --

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
  if (ratio <= 5) return 'acceptable'
  return 'critical'
}

function formatOversub(ratio: number): string {
  return `${ratio.toFixed(1)}:1`
}

// -- Violation rendering --

function ThreeTierViolationAlert({ v }: { v: ThreeTierConstraintViolation }) {
  const { t } = useTranslation()

  if (v.code === 'AGGREGATION_CAPACITY_EXCEEDED') {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('bom.violationSpineTitle')}</AlertTitle>
        <AlertDescription>
          Aggregation tier capacity exceeded: {v.accessUplinks} access uplinks but only {v.aggrDownlinks} aggregation downlinks available.
        </AlertDescription>
      </Alert>
    )
  }

  if (v.code === 'CORE_CAPACITY_EXCEEDED') {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('bom.violationSpineTitle')}</AlertTitle>
        <AlertDescription>
          Core tier capacity exceeded: {v.aggrUplinks} aggregation uplinks but only {v.coreDownlinks} core downlinks available.
        </AlertDescription>
      </Alert>
    )
  }

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

// -- OversubscriptionBadge component --

function OversubBadge({ label, ratio }: { label: string; ratio: number }) {
  const severity = getSeverity(ratio)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{formatOversub(ratio)}</span>
      <span className={oversubBadgeVariants({ severity })}>
        {severity === 'optimal' ? 'Optimal' : severity === 'acceptable' ? 'Acceptable' : 'Critical'}
      </span>
    </div>
  )
}

// -- ThreeTierBOMPanel component --

export function ThreeTierBOMPanel() {
  const { t } = useTranslation()
  const { bom, violations } = useThreeTierResultStore(
    useShallow((s) => ({ bom: s.bom, violations: s.violations }))
  )

  // Empty state
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{t('bom.heading')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">

          {/* -- Section A: Oversubscription Ratios -- */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('bom.oversubHeading')}
            </p>
            <div className="space-y-1">
              <OversubBadge
                label={t('threeTier.accessToAggrOversub')}
                ratio={bom.accessToAggrOversubscription}
              />
              <OversubBadge
                label={t('threeTier.aggrToCoreOversub')}
                ratio={bom.aggrToCoreOversubscription}
              />
            </div>
          </div>

          {/* -- Section B: Switches Table -- */}
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
                  <TableCell className="font-mono">{bom.input.accessModel}</TableCell>
                  <TableCell>{bom.accessSwitches}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('threeTier.aggregationSwitches')}</TableCell>
                  <TableCell className="font-mono">{bom.input.aggregationModel}</TableCell>
                  <TableCell>{bom.aggregationSwitches}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('threeTier.coreSwitches')}</TableCell>
                  <TableCell className="font-mono">{bom.input.coreModel}</TableCell>
                  <TableCell>{bom.coreSwitches}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('threeTier.oobSwitches')}</TableCell>
                  <TableCell className="font-mono">S3248T-ON</TableCell>
                  <TableCell>{bom.oobSwitches}</TableCell>
                </TableRow>
                {bom.borderLeafSwitches > 0 && (
                  <TableRow>
                    <TableCell>{t('threeTier.borderLeafSwitches')}</TableCell>
                    <TableCell className="font-mono">{bom.input.borderLeafModel}</TableCell>
                    <TableCell>{bom.borderLeafSwitches}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* -- Section C: Cables Table -- */}
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
                  <TableHead scope="col">{t('bom.colQty')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{t('threeTier.serverAccessCables')}</TableCell>
                  <TableCell>{bom.serverAccessCables}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('threeTier.accessAggrCables')}</TableCell>
                  <TableCell>{bom.accessAggrCables}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('threeTier.aggrCoreCables')}</TableCell>
                  <TableCell>{bom.aggrCoreCables}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Server-OOB</TableCell>
                  <TableCell>{bom.serverOobCables}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('threeTier.vltCables')}</TableCell>
                  <TableCell>{bom.vltCables}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* -- Section D: Optics Table (if any) -- */}
          {(bom.sfp28Count > 0 || bom.qsfp28Count > 0 || bom.qsfp56ddCount > 0) && (
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
                  {bom.sfp28Count > 0 && (
                    <TableRow>
                      <TableCell>{t('bom.sfp28Transceiver')}</TableCell>
                      <TableCell>{bom.sfp28Count}</TableCell>
                    </TableRow>
                  )}
                  {bom.qsfp28Count > 0 && (
                    <TableRow>
                      <TableCell>{t('bom.qsfp28Transceiver')}</TableCell>
                      <TableCell>{bom.qsfp28Count}</TableCell>
                    </TableRow>
                  )}
                  {bom.qsfp56ddCount > 0 && (
                    <TableRow>
                      <TableCell>QSFP56-DD Transceiver</TableCell>
                      <TableCell>{bom.qsfp56ddCount}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* -- Section E: Rack Summary -- */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('rack.heading')}
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">{t('sizing.rackCount')}</span>
              <span className="font-semibold">{bom.racks}</span>
              <span className="text-muted-foreground">{t('threeTier.networkRacks')}</span>
              <span className="font-semibold">{bom.networkRacks}</span>
              <span className="text-muted-foreground">{t('sizing.switchPositioning')}</span>
              <span className="font-semibold">{bom.switchPositioning}</span>
              {bom.recommendedCableLengthM > 0 && (
                <>
                  <span className="text-muted-foreground">{t('bom.cableLengthAdvisory', { maxLength: bom.recommendedCableLengthM, positioning: bom.switchPositioning })}</span>
                </>
              )}
            </div>
          </div>

          {/* -- Section F: Violations -- */}
          {violations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('bom.alertsHeading')}
              </p>
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <ThreeTierViolationAlert key={'rackNumber' in v ? `${v.code}-${v.rackNumber}` : `${v.code}-${i}`} v={v} />
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

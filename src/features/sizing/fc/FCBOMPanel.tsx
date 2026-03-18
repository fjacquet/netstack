import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { cva } from 'class-variance-authority'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { useFCResultStore } from '@/store/fcResultStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import type { FCConstraintViolation } from '@/domain/schemas/fc-bom'
// NO imports from BOMPanel.tsx, resultStore.ts, bom.ts — FC domain isolation is mandatory

// ── Fan-in severity badge (FC uses 7:1 threshold — different from Ethernet 6:1) ──

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
  if (ratio <= 7) return 'acceptable' // FC 7:1 max (not Ethernet 6:1)
  return 'critical'
}

// ── FC Violation Alert ─────────────────────────────────────────────────────────

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

// ── FCBOMPanel ─────────────────────────────────────────────────────────────────

export function FCBOMPanel() {
  const { t } = useTranslation()
  const { bom, violations } = useFCResultStore(
    useShallow((s) => ({ bom: s.bom, violations: s.violations }))
  )

  if (!bom) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('fcbom.emptyHeading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t('fcbom.emptyBody')}</p>
        </CardContent>
      </Card>
    )
  }

  const severity = getFCSeverity(bom.fanInRatio)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('fcbom.heading')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fan-in ratio with severity badge */}
          <section aria-labelledby="fc-fanin-heading">
            <h3 id="fc-fanin-heading" className="text-sm font-medium mb-2">
              {t('fcbom.fanInHeading')}
            </h3>
            <span className={fcFanInBadgeVariants({ severity })}>
              {bom.fanInRatio.toFixed(1)}:1
            </span>
          </section>

          <Separator />

          {/* Switches table — Fabric A, Fabric B, ISL cables, optics, POD licenses */}
          <section aria-labelledby="fc-switches-heading">
            <h3 id="fc-switches-heading" className="text-sm font-medium mb-2">
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
                  <TableCell>{bom.fabricASwitches}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('fcbom.roleFabricB')}</TableCell>
                  <TableCell>{bom.fabricBSwitches}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('fcbom.islCables')}</TableCell>
                  <TableCell>{bom.islCables}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('fcbom.fcOpticsCount')}</TableCell>
                  <TableCell>{bom.fcOpticsCount}</TableCell>
                </TableRow>
                {/* POD licenses: top-level line item — not a tooltip or footnote */}
                {bom.podLicensesRequired > 0 && (
                  <TableRow>
                    <TableCell>{t('fcbom.podLicenseLabel')}</TableCell>
                    <TableCell>
                      {bom.podLicensesRequired} {t('fcbom.podLicenseUnit')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          {/* Violations */}
          {violations.length > 0 && (
            <>
              <Separator />
              <section aria-labelledby="fc-alerts-heading" className="space-y-2">
                <h3 id="fc-alerts-heading" className="text-sm font-medium">
                  {t('fcbom.alertsHeading')}
                </h3>
                {violations.map((v) => (
                  <FCViolationAlert key={v.code} v={v} />
                ))}
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

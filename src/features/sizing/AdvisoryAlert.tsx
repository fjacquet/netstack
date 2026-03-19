import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import type { Advisory } from '@/domain/schemas/bom'

export function AdvisoryAlert({ a }: { a: Advisory }) {
  const { t } = useTranslation()

  if (a.code === 'PATCH_PANEL_RECOMMENDED') {
    return (
      <Alert variant="warning" role="alert">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('bom.advisoryPatchPanelTitle')}</AlertTitle>
        <AlertDescription>
          {t('bom.advisoryPatchPanelBody', {
            computedDistanceM: a.computedDistanceM,
            dacLimitM: a.dacLimitM,
          })}
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

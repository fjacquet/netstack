import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export function ResultsPlaceholder() {
  const { t } = useTranslation()

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          {t('results.heading')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="mb-2 text-lg font-medium text-muted-foreground">
            {t('results.emptyHeading')}
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t('results.emptyBody')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

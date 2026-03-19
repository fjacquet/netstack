import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { EthInputAccordion } from './EthInputAccordion'
import { FCInputAccordion } from './FCInputAccordion'
import { ConvergedInputAccordion } from './ConvergedInputAccordion'

interface InputPageProps {
  mode: 'ethernet' | 'fc' | 'converged'
}

export function InputPage({ mode }: InputPageProps) {
  const { t } = useTranslation()

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-1">{t('input.pageTitle')}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t('input.pageDescription')}</p>
      <Card>
        {mode === 'ethernet' && <EthInputAccordion />}
        {mode === 'fc' && <FCInputAccordion />}
        {mode === 'converged' && <ConvergedInputAccordion />}
      </Card>
    </div>
  )
}

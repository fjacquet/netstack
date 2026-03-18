import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface ModeSelectorProps {
  mode: 'ethernet' | 'fc' | 'converged' | 'three-tier'
  onModeChange: (m: 'ethernet' | 'fc' | 'converged' | 'three-tier') => void
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const { t } = useTranslation()

  return (
    <div
      className="flex items-center gap-1 ml-4"
      aria-label={t('mode.selectLabel')}
    >
      <Button
        variant={mode === 'ethernet' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('ethernet')}
      >
        {t('mode.ethernet')}
      </Button>
      <Button
        variant={mode === 'fc' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('fc')}
      >
        {t('mode.fc')}
      </Button>
      <Button
        variant={mode === 'converged' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('converged')}
      >
        {t('mode.converged')}
      </Button>
      <Button
        variant={mode === 'three-tier' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('three-tier')}
      >
        {t('mode.threeTier')}
      </Button>
    </div>
  )
}

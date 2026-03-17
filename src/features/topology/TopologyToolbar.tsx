import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface TopologyToolbarProps {
  onToggleLegend: () => void
}

/**
 * Toolbar card for the topology diagram tab.
 * Dispatches custom DOM events to TopologyCanvas for fit/reset actions
 * (avoids prop-drilling through ReactFlowProvider boundary).
 */
export function TopologyToolbar({ onToggleLegend }: TopologyToolbarProps) {
  const { t } = useTranslation()

  const dispatchAction = (action: string) => {
    window.dispatchEvent(
      new CustomEvent('topology:action', { detail: { action } })
    )
  }

  return (
    <Card className="h-12 flex items-center gap-2 px-4 rounded-none border-x-0 border-t-0 toolbar-card">
      <Button
        variant="outline"
        size="sm"
        onClick={() => dispatchAction('fitView')}
      >
        {t('topology.fitView')}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => dispatchAction('resetLayout')}
      >
        {t('topology.resetLayout')}
      </Button>
      <div className="flex-1" />
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleLegend}
      >
        {t('topology.legend')}
      </Button>
    </Card>
  )
}

import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'

interface TopologyLegendProps {
  show: boolean
}

/**
 * Toggleable legend card overlaid on the bottom-left of the topology canvas.
 * Shows role colors and saturation border color meanings.
 */
export function TopologyLegend({ show }: TopologyLegendProps) {
  const { t } = useTranslation()

  if (!show) return null

  return (
    <Card className="absolute bottom-4 left-4 z-10 p-3 shadow-md">
      <CardContent className="p-0 space-y-2">
        {/* Node role colors */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-[hsl(213_94%_92%)] dark:bg-[hsl(213_94%_20%)] border border-border flex-shrink-0" />
            <span className="text-xs">{t('topology.legendLeaf')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-[hsl(270_91%_92%)] dark:bg-[hsl(270_91%_20%)] border border-border flex-shrink-0" />
            <span className="text-xs">{t('topology.legendSpine')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-muted border border-border flex-shrink-0" />
            <span className="text-xs">{t('topology.legendOob')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-secondary border border-border flex-shrink-0" />
            <span className="text-xs">{t('topology.legendRack')}</span>
          </div>
        </div>

        {/* Saturation border colors */}
        <div className="space-y-1 border-t pt-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-[hsl(142_76%_36%)] dark:border-[hsl(142_69%_58%)] flex-shrink-0" />
            <span className="text-xs">{t('topology.legendHealthy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-[hsl(38_92%_50%)] dark:border-[hsl(38_95%_64%)] flex-shrink-0" />
            <span className="text-xs">{t('topology.legendWarning')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-destructive flex-shrink-0" />
            <span className="text-xs">{t('topology.legendCritical')}</span>
          </div>
        </div>

        {/* VLT edge style */}
        <div className="space-y-1 border-t pt-2">
          <div className="flex items-center gap-2">
            <div
              className="h-0 w-8 flex-shrink-0"
              style={{
                borderTop: '2px dashed hsl(213, 94%, 68%)',
              }}
            />
            <span className="text-xs">{t('topology.legendVlt')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

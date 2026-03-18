import { Card, CardContent } from '@/components/ui/card'

interface FCTopologyLegendProps {
  show: boolean
}

/**
 * Toggleable legend card overlaid on the bottom-left of the FC topology tab.
 * Shows Fabric A (blue), Fabric B (orange), and ISL link symbol.
 */
export function FCTopologyLegend({ show }: FCTopologyLegendProps) {
  if (!show) return null

  return (
    <Card className="absolute bottom-4 left-4 z-10 p-3 shadow-md">
      <CardContent className="p-0 space-y-2">
        {/* Fabric color swatches */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-[hsl(213_94%_92%)] dark:bg-[hsl(213_94%_20%)] border border-border flex-shrink-0" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Fabric A</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-[hsl(32_95%_92%)] dark:bg-[hsl(32_95%_28%)] border border-border flex-shrink-0" />
            <span className="text-xs text-orange-500 dark:text-orange-400 font-medium">Fabric B</span>
          </div>
        </div>

        {/* ISL edge style */}
        <div className="space-y-1 border-t pt-2">
          <div className="flex items-center gap-2">
            <div
              className="h-0 w-8 flex-shrink-0"
              style={{
                borderTop: '2px dashed hsl(213, 94%, 55%)',
              }}
            />
            <span className="text-xs">ISL</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

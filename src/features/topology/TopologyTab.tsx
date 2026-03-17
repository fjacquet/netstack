import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useResultStore } from '@/store/resultStore'
import { TopologyCanvas } from './TopologyCanvas'
import { TopologyToolbar } from './TopologyToolbar'
import { TopologyLegend } from './TopologyLegend'

/**
 * Top-level topology tab component.
 * Wraps content in ReactFlowProvider so TopologyCanvas can use useReactFlow().
 * Renders an empty state when no BOM is available.
 */
export function TopologyTab() {
  const { t } = useTranslation()
  const bom = useResultStore(useShallow((s) => s.bom))
  const [showLegend, setShowLegend] = useState(false)

  if (!bom) {
    return (
      <div className="flex h-[calc(100vh-120px)] flex-col items-center justify-center gap-2 p-8 text-center">
        <h2 className="text-xl font-semibold">{t('topology.emptyHeading')}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{t('topology.emptyBody')}</p>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-120px)] flex-col">
        <TopologyToolbar onToggleLegend={() => setShowLegend((v) => !v)} />
        <div className="relative flex-1 min-h-0">
          <TopologyCanvas />
          <TopologyLegend show={showLegend} />
        </div>
      </div>
    </ReactFlowProvider>
  )
}

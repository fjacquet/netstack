import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useFCResultStore } from '@/store/fcResultStore'
import { FCTopologyCanvas } from './FCTopologyCanvas'
import { FCTopologyLegend } from './FCTopologyLegend'

export function FCTopologyTab() {
  const { t } = useTranslation()
  const bom = useFCResultStore(useShallow((s) => s.bom))
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
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* Toolbar row: fit both / reset both / legend */}
      <div className="h-12 flex items-center gap-2 px-4 border-b bg-secondary/30">
        <button
          className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('fc-topology:action-a', { detail: { action: 'fitView' } }))
            window.dispatchEvent(new CustomEvent('fc-topology:action-b', { detail: { action: 'fitView' } }))
          }}
        >
          {t('topology.fitView')}
        </button>
        <button
          className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('fc-topology:action-a', { detail: { action: 'resetLayout' } }))
            window.dispatchEvent(new CustomEvent('fc-topology:action-b', { detail: { action: 'resetLayout' } }))
          }}
        >
          {t('topology.resetLayout')}
        </button>
        <div className="flex-1" />
        <button
          className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
          onClick={() => setShowLegend((v) => !v)}
        >
          {t('topology.legend')}
        </button>
      </div>

      {/* Two fabric canvases side by side */}
      <div className="flex flex-1 gap-0 min-h-0 relative">
        {/* Fabric A — blue */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-border">
          <div className="h-7 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400 bg-[hsl(213_94%_97%)] dark:bg-[hsl(213_94%_12%)] border-b border-border">
            Fabric A
          </div>
          <div className="flex-1 min-h-0">
            <ReactFlowProvider>
              <FCTopologyCanvas fabric="A" bom={bom} />
            </ReactFlowProvider>
          </div>
        </div>

        {/* Fabric B — orange */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-7 flex items-center justify-center text-xs font-semibold text-orange-500 dark:text-orange-400 bg-[hsl(32_95%_97%)] dark:bg-[hsl(32_95%_12%)] border-b border-border">
            Fabric B
          </div>
          <div className="flex-1 min-h-0">
            <ReactFlowProvider>
              <FCTopologyCanvas fabric="B" bom={bom} />
            </ReactFlowProvider>
          </div>
        </div>

        <FCTopologyLegend show={showLegend} />
      </div>
    </div>
  )
}

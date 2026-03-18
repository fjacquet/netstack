import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { useConvergedResultStore } from '@/store/convergedResultStore'
import { useTheme } from '@/components/theme-provider'
import { buildTopologyGraph } from '../utils/buildTopologyGraph'
import { SwitchNode } from '../nodes/SwitchNode'
import { RackNode } from '../nodes/RackNode'
import { TopologyLegend } from '../TopologyLegend'
import { FCTopologyCanvas } from '../fc/FCTopologyCanvas'
import { FCTopologyLegend } from '../fc/FCTopologyLegend'
import type { SwitchNodeData, RackNodeData } from '../types'

// CRITICAL: nodeTypes must be defined at MODULE LEVEL -- never inside the component.
// Defining inside the component causes React Flow to re-register on every render
// leading to infinite layout recalculations and flickering.
const ethNodeTypes = {
  switchNode: SwitchNode,
  rackNode: RackNode,
}

/**
 * Lightweight Ethernet canvas that takes an ethernetBom as a prop instead of
 * reading from useResultStore. This avoids coupling to the Ethernet-mode store.
 * Must be rendered inside its own <ReactFlowProvider>.
 */
function ConvergedEthernetCanvas({ ethernetBom }: { ethernetBom: import('@/domain/schemas/bom').NetworkBOM }) {
  const { theme } = useTheme()
  const rfInstance = useReactFlow()

  const resolvedTheme = useMemo((): 'dark' | 'light' => {
    if (theme === 'dark') return 'dark'
    if (theme === 'light') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [theme])

  const initialGraph = useMemo(() => buildTopologyGraph(ethernetBom), [ethernetBom])

  const [nodes, setNodes] = useState<Node<SwitchNodeData | RackNodeData>[]>(initialGraph.nodes)
  const [edges, setEdges] = useState<Edge[]>(initialGraph.edges)

  // Update graph when BOM changes
  useEffect(() => {
    const graph = buildTopologyGraph(ethernetBom)
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [ethernetBom])

  // Expose fit view and reset via custom events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string }>).detail
      if (detail.action === 'fitView') {
        rfInstance.fitView({ padding: 0.1, duration: 300 })
      } else if (detail.action === 'resetLayout') {
        const graph = buildTopologyGraph(ethernetBom)
        setNodes(graph.nodes)
        setEdges(graph.edges)
        setTimeout(() => rfInstance.fitView({ padding: 0.1, duration: 300 }), 50)
      }
    }
    window.addEventListener('converged-eth-topology:action', handler)
    return () => window.removeEventListener('converged-eth-topology:action', handler)
  }, [rfInstance, ethernetBom])

  return (
    <div className="relative h-full w-full" aria-label="Converged Ethernet topology diagram">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={ethNodeTypes}
        colorMode={resolvedTheme}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.2}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}

/**
 * Converged topology tab: Ethernet leaf-spine diagram (always) + FC Fabric A/B (when FC enabled).
 *
 * Layout:
 * - Ethernet section: 60% height when FC enabled, 100% when FC disabled
 * - FC section: 40% height, two side-by-side fabrics (Fabric A blue, Fabric B orange)
 *
 * Each ReactFlow canvas has its own ReactFlowProvider (siblings, not nested).
 * CONV-08: Combined topology with Ethernet and FC diagrams.
 */
export function ConvergedTopologyTab() {
  const { t } = useTranslation()
  const bom = useConvergedResultStore(useShallow((s) => s.bom))
  const [showEthLegend, setShowEthLegend] = useState(false)
  const [showFCLegend, setShowFCLegend] = useState(false)

  if (!bom) {
    return (
      <div className="flex h-[calc(100vh-120px)] flex-col items-center justify-center gap-2 p-8 text-center">
        <h2 className="text-xl font-semibold">{t('topology.emptyHeading')}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{t('topology.emptyBody')}</p>
      </div>
    )
  }

  const hasFc = bom.fcBom !== null

  const dispatchAll = useCallback(
    (action: string) => {
      // Dispatch to Ethernet canvas
      window.dispatchEvent(
        new CustomEvent('converged-eth-topology:action', { detail: { action } })
      )
      // Dispatch to FC canvases if enabled
      if (hasFc) {
        window.dispatchEvent(
          new CustomEvent('fc-topology:action-a', { detail: { action } })
        )
        window.dispatchEvent(
          new CustomEvent('fc-topology:action-b', { detail: { action } })
        )
      }
    },
    [hasFc]
  )

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      {/* Toolbar row */}
      <div className="h-12 flex items-center gap-2 px-4 border-b bg-secondary/30 shrink-0">
        <button
          className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
          onClick={() => dispatchAll('fitView')}
        >
          {t('topology.fitView')}
        </button>
        <button
          className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
          onClick={() => dispatchAll('resetLayout')}
        >
          {t('topology.resetLayout')}
        </button>
        <div className="flex-1" />
        <button
          className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
          onClick={() => setShowEthLegend((v) => !v)}
        >
          {t('topology.legend')}
        </button>
        {hasFc && (
          <button
            className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
            onClick={() => setShowFCLegend((v) => !v)}
          >
            FC {t('topology.legend')}
          </button>
        )}
      </div>

      {/* Ethernet section -- always rendered */}
      <div className={hasFc ? 'h-[60%] min-h-0 relative' : 'flex-1 min-h-0 relative'}>
        <ReactFlowProvider>
          <ConvergedEthernetCanvas ethernetBom={bom.ethernetBom} />
          <TopologyLegend show={showEthLegend} />
        </ReactFlowProvider>
      </div>

      {/* FC section -- conditionally rendered when bom.fcBom is non-null */}
      {hasFc && bom.fcBom && (
        <div className="h-[40%] min-h-0 border-t border-border">
          <div className="flex h-full gap-0 relative">
            {/* Fabric A -- blue */}
            <div className="flex-1 min-w-0 flex flex-col border-r border-border">
              <div className="h-7 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400 bg-[hsl(213_94%_97%)] dark:bg-[hsl(213_94%_12%)] border-b border-border shrink-0">
                Fabric A
              </div>
              <div className="flex-1 min-h-0">
                <ReactFlowProvider>
                  <FCTopologyCanvas fabric="A" bom={bom.fcBom} />
                </ReactFlowProvider>
              </div>
            </div>

            {/* Fabric B -- orange */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="h-7 flex items-center justify-center text-xs font-semibold text-orange-500 dark:text-orange-400 bg-[hsl(32_95%_97%)] dark:bg-[hsl(32_95%_12%)] border-b border-border shrink-0">
                Fabric B
              </div>
              <div className="flex-1 min-h-0">
                <ReactFlowProvider>
                  <FCTopologyCanvas fabric="B" bom={bom.fcBom} />
                </ReactFlowProvider>
              </div>
            </div>

            <FCTopologyLegend show={showFCLegend} />
          </div>
        </div>
      )}
    </div>
  )
}

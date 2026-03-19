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
import { useResultStore } from '@/store/resultStore'
import { useTheme } from '@/components/theme-provider'
import { buildThreeTierTopologyGraph } from '../utils/buildThreeTierTopologyGraph'
import { SwitchNode } from '../nodes/SwitchNode'
import { RackNode } from '../nodes/RackNode'
import { TopologyLegend } from '../TopologyLegend'
import type { SwitchNodeData, RackNodeData } from '../types'

// CRITICAL: nodeTypes must be defined at MODULE LEVEL -- never inside the component.
// Defining inside the component causes React Flow to re-register on every render
// leading to infinite layout recalculations and flickering.
const nodeTypes = {
  switchNode: SwitchNode,
  rackNode: RackNode,
}

/**
 * Inner canvas component for three-tier topology.
 * Must be rendered inside a <ReactFlowProvider>.
 */
function ThreeTierCanvas() {
  const { t } = useTranslation()
  const bom = useResultStore(useShallow((s) => s.threeTierBom))
  const { theme } = useTheme()
  const rfInstance = useReactFlow()

  const resolvedTheme = useMemo((): 'dark' | 'light' => {
    if (theme === 'dark') return 'dark'
    if (theme === 'light') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [theme])

  const initialGraph = useMemo(() => {
    if (!bom) return { nodes: [], edges: [] }
    return buildThreeTierTopologyGraph(bom)
  }, [bom])

  const [nodes, setNodes] = useState<Node<SwitchNodeData | RackNodeData>[]>(initialGraph.nodes)
  const [edges, setEdges] = useState<Edge[]>(initialGraph.edges)

  // Update graph when BOM changes
  useEffect(() => {
    if (!bom) {
      setNodes([])
      setEdges([])
      return
    }
    const graph = buildThreeTierTopologyGraph(bom)
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [bom])

  // Expose fit view and reset via custom events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string }>).detail
      if (detail.action === 'fitView') {
        rfInstance.fitView({ padding: 0.1, duration: 300 })
      } else if (detail.action === 'resetLayout') {
        if (!bom) return
        const graph = buildThreeTierTopologyGraph(bom)
        setNodes(graph.nodes)
        setEdges(graph.edges)
        setTimeout(() => rfInstance.fitView({ padding: 0.1, duration: 300 }), 50)
      }
    }
    window.addEventListener('three-tier-topology:action', handler)
    return () => window.removeEventListener('three-tier-topology:action', handler)
  }, [rfInstance, bom])

  return (
    <div className="relative h-full w-full" aria-label={t('topology.emptyHeading')}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
 * Top-level three-tier topology tab component.
 * Wraps content in ReactFlowProvider so ThreeTierCanvas can use useReactFlow().
 * Renders an empty state when no BOM is available.
 */
export function ThreeTierTopologyTab() {
  const { t } = useTranslation()
  const bom = useResultStore(useShallow((s) => s.threeTierBom))
  const [showLegend, setShowLegend] = useState(false)

  const dispatchAction = useCallback((action: string) => {
    window.dispatchEvent(
      new CustomEvent('three-tier-topology:action', { detail: { action } })
    )
  }, [])

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
        {/* Toolbar */}
        <div className="h-12 flex items-center gap-2 px-4 border-b bg-secondary/30 shrink-0">
          <button
            className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
            onClick={() => dispatchAction('fitView')}
          >
            {t('topology.fitView')}
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded border border-border bg-background hover:bg-accent"
            onClick={() => dispatchAction('resetLayout')}
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

        {/* Canvas */}
        <div className="relative flex-1 min-h-0">
          <ThreeTierCanvas />
          <TopologyLegend show={showLegend} />
        </div>
      </div>
    </ReactFlowProvider>
  )
}

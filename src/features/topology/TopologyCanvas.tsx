import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useShallow } from 'zustand/shallow'
import { useResultStore } from '@/store/resultStore'
import { useTheme } from '@/components/theme-provider'
import { buildTopologyGraph } from './utils/buildTopologyGraph'
import { captureTopologyPng } from './utils/captureTopologyPng'
import { SwitchNode } from './nodes/SwitchNode'
import { RackNode } from './nodes/RackNode'
import type { SwitchNodeData, RackNodeData } from './types'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from 'react-i18next'

// CRITICAL: nodeTypes must be defined at MODULE LEVEL — never inside the component.
// Defining inside the component causes React Flow to re-register on every render
// leading to infinite layout recalculations and flickering.
const nodeTypes = {
  switchNode: SwitchNode,
  rackNode: RackNode,
}

// Module-level PNG cache — used by PDF export in Plan 04
let lastCapturePng: string | null = null

/** Returns the most recently captured topology PNG, or null if not yet captured. */
export function getLastTopologyPng(): string | null {
  return lastCapturePng
}

// The inner canvas must be inside ReactFlowProvider (provided by TopologyTab)
export function TopologyCanvas() {
  const { t } = useTranslation()
  const bom = useResultStore(useShallow((s) => s.bom))
  const { theme } = useTheme()
  const rfInstance = useReactFlow()

  // Resolve theme to 'dark' | 'light' for ReactFlow colorMode prop
  const resolvedTheme = useMemo((): 'dark' | 'light' => {
    if (theme === 'dark') return 'dark'
    if (theme === 'light') return 'light'
    // 'system' — check media query
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [theme])

  // Build the initial graph from BOM
  const initialGraph = useMemo(() => {
    if (!bom) return { nodes: [], edges: [] }
    return buildTopologyGraph(bom)
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
    const graph = buildTopologyGraph(bom)
    setNodes(graph.nodes)
    setEdges(graph.edges)
  }, [bom])

  // Capture PNG after nodes render (for PDF export)
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (nodes.length === 0) return
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current)
    captureTimeoutRef.current = setTimeout(async () => {
      try {
        const bgColor = resolvedTheme === 'dark' ? 'hsl(240 10% 3.9%)' : 'hsl(0 0% 100%)'
        const png = await captureTopologyPng(rfInstance, bgColor)
        lastCapturePng = png
      } catch {
        // Capture fails when viewport not visible — not critical
      }
    }, 500)
    return () => {
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current)
    }
  }, [nodes, resolvedTheme, rfInstance])

  // Node click popover state
  const [selectedNode, setSelectedNode] = useState<Node<SwitchNodeData | RackNodeData> | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverAnchorRef = useRef<HTMLDivElement | null>(null)

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedNode(node as Node<SwitchNodeData | RackNodeData>)
    setPopoverOpen(true)
  }, [])

  // Expose fit view and reset via custom events so TopologyToolbar can call them
  // (TopologyToolbar is a sibling rendered by TopologyTab)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string }>).detail
      if (detail.action === 'fitView') {
        rfInstance.fitView({ padding: 0.1, duration: 300 })
      } else if (detail.action === 'resetLayout') {
        if (!bom) return
        const graph = buildTopologyGraph(bom)
        setNodes(graph.nodes)
        setEdges(graph.edges)
        setTimeout(() => rfInstance.fitView({ padding: 0.1, duration: 300 }), 50)
      }
    }
    window.addEventListener('topology:action', handler)
    return () => window.removeEventListener('topology:action', handler)
  }, [rfInstance, bom])

  // Derive popover content from selected node
  const popoverContent = useMemo(() => {
    if (!selectedNode) return null
    const data = selectedNode.data as SwitchNodeData
    if (!data.totalPorts) return null
    const pct = Math.round((data.usedPorts / data.totalPorts) * 100)
    return { data, pct }
  }, [selectedNode])

  return (
    <div className="relative h-full w-full" aria-label="Network topology diagram">
      {/* Hidden div used as popover anchor — we use a floating trigger overlay */}
      <div ref={popoverAnchorRef} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={resolvedTheme}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setPopoverOpen(false)}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.2}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Node detail popover — rendered as overlay when a node is selected */}
      {popoverOpen && popoverContent && (
        <div
          className="absolute inset-0 pointer-events-none z-20"
          onClick={() => setPopoverOpen(false)}
        >
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <div className="h-0 w-0 overflow-hidden" />
              </PopoverTrigger>
              <PopoverContent
                className="w-[240px]"
                aria-label={`Port details for ${popoverContent.data.model}`}
              >
                <div className="space-y-3">
                  <div>
                    <p className="font-mono text-sm font-semibold">{popoverContent.data.model}</p>
                    <p className="text-xs text-muted-foreground capitalize">{popoverContent.data.role}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">{t('topology.portUtilization')}</p>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      {t('topology.portsFormat', {
                        used: popoverContent.data.usedPorts,
                        available: popoverContent.data.totalPorts,
                        pct: popoverContent.pct,
                      })}
                    </p>
                    <Progress
                      value={Math.min(popoverContent.pct, 100)}
                      className="h-1.5"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  )
}

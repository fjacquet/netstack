import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/base.css'
import { useTheme } from '@/components/theme-provider'
import { buildFCTopologyGraph } from './utils/buildFCTopologyGraph'
import { captureTopologyPng } from '../utils/captureTopologyPng'
import type { FCSwitchNodeData } from '../types'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'

// Fabric color constants — single source of truth for both canvas and legend
const FABRIC_COLORS = {
  A: {
    nodeBg: 'bg-[hsl(213_94%_92%)] dark:bg-[hsl(213_94%_20%)]',
    edge: 'hsl(213, 94%, 55%)',
    label: 'Fabric A',
    labelClass: 'text-blue-600 dark:text-blue-400',
  },
  B: {
    nodeBg: 'bg-[hsl(32_95%_92%)] dark:bg-[hsl(32_95%_28%)]',
    edge: 'hsl(32, 95%, 55%)',
    label: 'Fabric B',
    labelClass: 'text-orange-500 dark:text-orange-400',
  },
} as const

// Minimal FC switch node — renders model + port utilization text
// Uses fabric color from data.fabric
function FCSwitchNode({ data }: { data: FCSwitchNodeData }) {
  const colors = FABRIC_COLORS[data.fabric]
  return (
    <div
      className={`px-3 py-2 rounded border border-border text-xs font-mono min-w-[80px] ${colors.nodeBg}`}
    >
      <div className="font-semibold">{data.model}</div>
      <div className="text-muted-foreground">
        {data.usedPorts}/{data.totalPorts}p
      </div>
      {data.islPorts > 0 && (
        <div className="text-muted-foreground">{data.islPorts} ISL</div>
      )}
    </div>
  )
}

// CRITICAL: fcNodeTypes must be defined at MODULE LEVEL — never inside the component.
// Defining inside the component causes React Flow to re-register on every render
// leading to infinite layout recalculations and flickering.
const fcNodeTypes = { fcSwitchNode: FCSwitchNode }

// Module-level PNG cache per fabric — used by PDF export in Phase 14
const lastCapturePngMap: Map<'A' | 'B', string | null> = new Map([
  ['A', null],
  ['B', null],
])

/** Returns the most recently captured topology PNG for the given fabric, or null if not yet captured. */
export function getLastFCTopologyPng(fabric: 'A' | 'B'): string | null {
  return lastCapturePngMap.get(fabric) ?? null
}

interface FCTopologyCanvasProps {
  fabric: 'A' | 'B'
  bom: FCNetworkBOM
}

// The inner canvas must be inside ReactFlowProvider (provided by FCTopologyTab)
export function FCTopologyCanvas({ fabric, bom }: FCTopologyCanvasProps) {
  const { theme } = useTheme()
  const rfInstance = useReactFlow()

  // Resolve theme to 'dark' | 'light' for ReactFlow colorMode prop
  const resolvedTheme = useMemo((): 'dark' | 'light' => {
    if (theme === 'dark') return 'dark'
    if (theme === 'light') return 'light'
    // 'system' — check media query
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [theme])

  // Build the initial graph for this specific fabric from BOM
  const initialGraph = useMemo(() => {
    const result = buildFCTopologyGraph(bom)
    return fabric === 'A' ? result.fabricA : result.fabricB
  }, [bom, fabric])

  const [nodes, setNodes] = useState<Node<FCSwitchNodeData>[]>(initialGraph.nodes)
  const [edges, setEdges] = useState<Edge[]>(initialGraph.edges)

  // Update graph when BOM changes
  useEffect(() => {
    const result = buildFCTopologyGraph(bom)
    const subgraph = fabric === 'A' ? result.fabricA : result.fabricB
    setNodes(subgraph.nodes)
    setEdges(subgraph.edges)
  }, [bom, fabric])

  // Capture PNG after nodes render (for PDF export)
  const captureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (nodes.length === 0) return
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current)
    captureTimeoutRef.current = setTimeout(async () => {
      try {
        const bgColor = resolvedTheme === 'dark' ? 'hsl(240 10% 3.9%)' : 'hsl(0 0% 100%)'
        const png = await captureTopologyPng(rfInstance, bgColor)
        lastCapturePngMap.set(fabric, png)
      } catch {
        // Capture fails when viewport not visible — not critical
      }
    }, 500)
    return () => {
      if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current)
    }
  }, [nodes, resolvedTheme, rfInstance, fabric])

  // Expose fit view and reset via custom events so FCTopologyTab toolbar can call them
  // IMPORTANT: Use fc-topology:action-a / fc-topology:action-b namespaces
  // NOT 'topology:action' — prevents cross-interference with the Ethernet canvas
  const eventName = fabric === 'A' ? 'fc-topology:action-a' : 'fc-topology:action-b'

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string }>).detail
      if (detail.action === 'fitView') {
        rfInstance.fitView({ padding: 0.1, duration: 300 })
      } else if (detail.action === 'resetLayout') {
        const result = buildFCTopologyGraph(bom)
        const subgraph = fabric === 'A' ? result.fabricA : result.fabricB
        setNodes(subgraph.nodes)
        setEdges(subgraph.edges)
        setTimeout(() => rfInstance.fitView({ padding: 0.1, duration: 300 }), 50)
      }
    }
    window.addEventListener(eventName, handler)
    return () => window.removeEventListener(eventName, handler)
  }, [rfInstance, bom, fabric, eventName])

  return (
    <div className="relative h-full w-full" aria-label={`FC Fabric ${fabric} topology diagram`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={fcNodeTypes}
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

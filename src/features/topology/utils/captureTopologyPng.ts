import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import type { ReactFlowInstance } from '@xyflow/react'
import { toPng } from 'html-to-image'

/**
 * Captures the current ReactFlow topology canvas as a PNG data URL.
 * Used by the PDF export to embed the topology diagram on Page 4.
 *
 * @param rfInstance - The ReactFlow instance (from useReactFlow())
 * @param bgColor - Background color string for the captured image
 * @returns Promise<string> — data URL (base64 PNG)
 */
export async function captureTopologyPng(
  rfInstance: ReactFlowInstance,
  bgColor: string
): Promise<string> {
  const IMAGE_W = 800
  const IMAGE_H = 500

  const bounds = getNodesBounds(rfInstance.getNodes())
  const viewport = getViewportForBounds(bounds, IMAGE_W, IMAGE_H, 0.5, 2, 0.1)

  const el = document.querySelector<HTMLElement>('.react-flow__viewport')
  if (!el) throw new Error('ReactFlow viewport not found')

  return toPng(el, {
    backgroundColor: bgColor,
    width: IMAGE_W,
    height: IMAGE_H,
    style: {
      width: `${IMAGE_W}px`,
      height: `${IMAGE_H}px`,
      transform: `translate(${viewport.x}px,${viewport.y}px) scale(${viewport.zoom})`,
    },
  })
}

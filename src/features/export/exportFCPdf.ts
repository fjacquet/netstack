import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'
import React from 'react'

/**
 * Generates a PDF Blob from an FCNetworkBOM.
 * Uses dynamic imports to lazy-load @react-pdf/renderer — it is NOT loaded on page startup.
 *
 * @param bom - The FC Bill of Materials to render
 * @param pngFabricA - Optional Fabric A topology diagram as a data URL (from getLastFCTopologyPng('A'))
 * @param pngFabricB - Optional Fabric B topology diagram as a data URL (from getLastFCTopologyPng('B'))
 * @returns A Blob containing the PDF
 */
export async function generateFCPdfBlob(
  bom: FCNetworkBOM,
  pngFabricA?: string,
  pngFabricB?: string,
): Promise<Blob> {
  // Dynamic import — lazy-loaded to avoid bundling @react-pdf/renderer on initial page load
  const [{ pdf }, { FCNetStackDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./pdf/FCNetStackDocument'),
  ])

  // Double-cast through unknown: @react-pdf/renderer's pdf() expects ReactElement<DocumentProps>,
  // but our component wraps Document and TypeScript can't verify structural compatibility.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(FCNetStackDocument, { bom, pngFabricA, pngFabricB }) as unknown as React.ReactElement<any>
  return pdf(element).toBlob()
}

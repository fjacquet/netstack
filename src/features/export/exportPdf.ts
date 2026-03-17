import type { NetworkBOM } from '@/domain/schemas/bom'
import React from 'react'

/**
 * Generates a PDF Blob from a NetworkBOM.
 * Uses dynamic imports to lazy-load @react-pdf/renderer — it is NOT loaded on page startup.
 *
 * @param bom - The Bill of Materials to render
 * @param topoDiagramPng - Optional topology diagram as a data URL (from getLastTopologyPng)
 * @returns A Blob containing the PDF
 */
export async function generatePdfBlob(bom: NetworkBOM, topoDiagramPng?: string): Promise<Blob> {
  // Dynamic import — lazy-loaded to avoid bundling @react-pdf/renderer on initial page load
  const [{ pdf }, { NetStackDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./pdf/NetStackDocument'),
  ])

  // Double-cast through unknown: @react-pdf/renderer's pdf() expects ReactElement<DocumentProps>,
  // but our component wraps Document and TypeScript can't verify structural compatibility.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(NetStackDocument, { bom, topoDiagramPng }) as unknown as React.ReactElement<any>
  const blob = await pdf(element).toBlob()
  return blob
}

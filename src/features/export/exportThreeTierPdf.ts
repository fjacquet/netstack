import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'
import React from 'react'

/**
 * Generates a PDF Blob from a ThreeTierBOM.
 * Uses dynamic imports to lazy-load @react-pdf/renderer -- it is NOT loaded on page startup.
 *
 * @param bom - The three-tier Bill of Materials to render
 * @param topoDiagramPng - Optional topology diagram as a data URL
 * @returns A Blob containing the PDF
 */
export async function generateThreeTierPdfBlob(
  bom: ThreeTierBOM,
  topoDiagramPng?: string,
): Promise<Blob> {
  // Dynamic import -- lazy-loaded to avoid bundling @react-pdf/renderer on initial page load
  const [{ pdf }, { ThreeTierNetStackDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./pdf/ThreeTierNetStackDocument'),
  ])

  // Double-cast through unknown: @react-pdf/renderer's pdf() expects ReactElement<DocumentProps>,
  // but our component wraps Document and TypeScript can't verify structural compatibility.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ThreeTierNetStackDocument, { bom, topoDiagramPng }) as unknown as React.ReactElement<any>
  const blob = await pdf(element).toBlob()
  return blob
}

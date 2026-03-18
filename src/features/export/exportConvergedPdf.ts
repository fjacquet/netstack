import type { ConvergedBOM } from '@/domain/schemas/converged-bom'
import React from 'react'

/**
 * Generates a PDF Blob from a ConvergedBOM.
 * Uses dynamic imports to lazy-load @react-pdf/renderer — it is NOT loaded on page startup.
 *
 * @param bom - The converged Bill of Materials to render (Ethernet + optional FC)
 * @param topoDiagramPng - Optional Ethernet topology diagram as a data URL
 * @param pngFabricA - Optional FC Fabric A topology diagram as a data URL
 * @param pngFabricB - Optional FC Fabric B topology diagram as a data URL
 * @returns A Blob containing the PDF
 */
export async function generateConvergedPdfBlob(
  bom: ConvergedBOM,
  topoDiagramPng?: string,
  pngFabricA?: string,
  pngFabricB?: string,
): Promise<Blob> {
  // Dynamic import — lazy-loaded to avoid bundling @react-pdf/renderer on initial page load
  const [{ pdf }, { ConvergedNetStackDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./pdf/ConvergedNetStackDocument'),
  ])

  // Double-cast through unknown: @react-pdf/renderer's pdf() expects ReactElement<DocumentProps>,
  // but our component wraps Document and TypeScript can't verify structural compatibility.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ConvergedNetStackDocument, {
    bom,
    topoDiagramPng,
    pngFabricA,
    pngFabricB,
  }) as unknown as React.ReactElement<any>

  return pdf(element).toBlob()
}

import { Document } from '@react-pdf/renderer'
import type { ConvergedBOM } from '@/domain/schemas/converged-bom'
import { CoverPage } from './CoverPage'
import { InputsPage } from './InputsPage'
import { BOMPage } from './BOMPage'
import { TopologyPage } from './TopologyPage'
import { ViolationsPage } from './ViolationsPage'
import { FCInputsPage } from './FCInputsPage'
import { FCBOMPage } from './FCBOMPage'
import { FCTopologyPage } from './FCTopologyPage'
import { FCViolationsPage } from './FCViolationsPage'
import { ThreeTierInputsPage } from './ThreeTierInputsPage'
import { ThreeTierBOMPage } from './ThreeTierBOMPage'
import { ThreeTierViolationsPage } from './ThreeTierViolationsPage'

// Uses built-in Helvetica / Helvetica-Bold — no Font.register needed

interface ConvergedNetStackDocumentProps {
  bom: ConvergedBOM
  topoDiagramPng?: string
  pngFabricA?: string
  pngFabricB?: string
}

export function ConvergedNetStackDocument({
  bom,
  topoDiagramPng,
  pngFabricA,
  pngFabricB,
}: ConvergedNetStackDocumentProps) {
  const generatedDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  return (
    <Document
      title="NetStack -- Converged Sizing Report"
      author="NetStack"
      subject="Dell Leaf-Spine + Brocade FC SAN BOM Report"
    >
      {/* Shared cover page */}
      <CoverPage generatedDate={generatedDate} />

      {/* Ethernet pages -- only when leaf-spine topology (ethernetBom is non-null) */}
      {bom.ethernetBom && (
        <>
          <InputsPage input={bom.ethernetBom.input} />
          <BOMPage bom={bom.ethernetBom} />
          <TopologyPage topoDiagramPng={topoDiagramPng} />
          {bom.ethernetBom.violations.length > 0 && (
            <ViolationsPage violations={bom.ethernetBom.violations} />
          )}
        </>
      )}

      {/* Three-tier pages -- only when three-tier topology (threeTierBom is non-null) */}
      {bom.threeTierBom && (
        <>
          <ThreeTierInputsPage input={bom.threeTierBom.input} />
          <ThreeTierBOMPage bom={bom.threeTierBom} />
          <TopologyPage topoDiagramPng={topoDiagramPng} />
          {bom.threeTierBom.violations.length > 0 && (
            <ThreeTierViolationsPage violations={bom.threeTierBom.violations} />
          )}
        </>
      )}

      {/* FC pages — only when FC fabric is enabled */}
      {bom.fcBom !== null && (
        <>
          <FCInputsPage input={bom.fcBom.input} />
          <FCBOMPage bom={bom.fcBom} />
          <FCTopologyPage pngFabricA={pngFabricA} pngFabricB={pngFabricB} />
          {bom.fcBom.violations.length > 0 && (
            <FCViolationsPage violations={bom.fcBom.violations} />
          )}
        </>
      )}
    </Document>
  )
}

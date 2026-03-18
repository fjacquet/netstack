import { Document } from '@react-pdf/renderer'
import type { ThreeTierBOM } from '@/domain/schemas/three-tier-bom'
import { CoverPage } from './CoverPage'
import { ThreeTierInputsPage } from './ThreeTierInputsPage'
import { ThreeTierBOMPage } from './ThreeTierBOMPage'
import { TopologyPage } from './TopologyPage'
import { ThreeTierViolationsPage } from './ThreeTierViolationsPage'

// Uses built-in Helvetica / Helvetica-Bold -- no Font.register needed

interface ThreeTierNetStackDocumentProps {
  bom: ThreeTierBOM
  topoDiagramPng?: string
}

export function ThreeTierNetStackDocument({ bom, topoDiagramPng }: ThreeTierNetStackDocumentProps) {
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
      title="NetStack -- Three-Tier Sizing Report"
      author="NetStack"
      subject="Dell Three-Tier BOM Report"
    >
      <CoverPage generatedDate={generatedDate} />
      <ThreeTierInputsPage input={bom.input} />
      <ThreeTierBOMPage bom={bom} />
      <TopologyPage topoDiagramPng={topoDiagramPng} />
      {bom.violations.length > 0 && <ThreeTierViolationsPage violations={bom.violations} />}
    </Document>
  )
}

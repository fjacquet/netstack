import { Document } from '@react-pdf/renderer'
import type { NetworkBOM } from '@/domain/schemas/bom'
import { CoverPage } from './CoverPage'
import { InputsPage } from './InputsPage'
import { BOMPage } from './BOMPage'
import { TopologyPage } from './TopologyPage'
import { ViolationsPage } from './ViolationsPage'

// Uses built-in Helvetica / Helvetica-Bold — no Font.register needed

interface NetStackDocumentProps {
  bom: NetworkBOM
  topoDiagramPng?: string
}

export function NetStackDocument({ bom, topoDiagramPng }: NetStackDocumentProps) {
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
      title="NetStack — Network Sizing Report"
      author="NetStack"
      subject="Dell Leaf-Spine BOM Report"
    >
      <CoverPage generatedDate={generatedDate} />
      <InputsPage input={bom.input} />
      <BOMPage bom={bom} />
      <TopologyPage topoDiagramPng={topoDiagramPng} />
      {bom.violations.length > 0 && <ViolationsPage violations={bom.violations} />}
    </Document>
  )
}

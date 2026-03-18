import { Document } from '@react-pdf/renderer'
import type { FCNetworkBOM } from '@/domain/schemas/fc-bom'
import { CoverPage } from './CoverPage'
import { FCInputsPage } from './FCInputsPage'
import { FCBOMPage } from './FCBOMPage'
import { FCTopologyPage } from './FCTopologyPage'
import { FCViolationsPage } from './FCViolationsPage'

// Uses built-in Helvetica / Helvetica-Bold — no Font.register needed

interface FCNetStackDocumentProps {
  bom: FCNetworkBOM
  pngFabricA?: string
  pngFabricB?: string
}

export function FCNetStackDocument({ bom, pngFabricA, pngFabricB }: FCNetStackDocumentProps) {
  const generatedDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  return (
    <Document title="NetStack — FC Sizing Report" author="NetStack" subject="Brocade FC SAN BOM Report">
      <CoverPage generatedDate={generatedDate} />
      <FCInputsPage input={bom.input} />
      <FCBOMPage bom={bom} />
      <FCTopologyPage pngFabricA={pngFabricA} pngFabricB={pngFabricB} />
      {bom.violations.length > 0 && <FCViolationsPage violations={bom.violations} />}
    </Document>
  )
}

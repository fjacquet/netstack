import { Document, Font } from '@react-pdf/renderer'
import type { NetworkBOM } from '@/domain/schemas/bom'
import { CoverPage } from './CoverPage'
import { InputsPage } from './InputsPage'
import { BOMPage } from './BOMPage'
import { TopologyPage } from './TopologyPage'
import { ViolationsPage } from './ViolationsPage'

// Register Inter font — must use full absolute URL for @react-pdf/renderer's fetch
const fontBase = `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}`
Font.register({
  family: 'Inter',
  fonts: [
    { src: `${fontBase}fonts/inter-regular.ttf`, fontWeight: 400 },
    { src: `${fontBase}fonts/inter-semibold.ttf`, fontWeight: 600 },
  ],
})

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

import { BOMPanel } from './BOMPanel'
import { FCBOMPanel } from './fc/FCBOMPanel'
import { ConvergedBOMPanel } from './converged/ConvergedBOMPanel'

interface ResultsPageProps {
  mode: 'ethernet' | 'fc' | 'converged'
}

export function ResultsPage({ mode }: ResultsPageProps) {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {mode === 'fc' ? <FCBOMPanel /> : mode === 'converged' ? <ConvergedBOMPanel /> : <BOMPanel />}
    </div>
  )
}

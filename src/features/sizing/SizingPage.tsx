import { InputForm } from './InputForm'
import { BOMPanel } from './BOMPanel'
import { Separator } from '@/components/ui/separator'

export function SizingPage() {
  return (
    <div className="flex flex-col gap-6 p-6 xl:flex-row xl:gap-8">
      {/* Input panel — 320px fixed on desktop, full width on tablet */}
      <div className="w-full shrink-0 xl:w-80">
        <InputForm />
      </div>

      {/* Separator for stacked layout (tablet) */}
      <Separator className="xl:hidden" />

      {/* Results panel — flex-1 on desktop, full width on tablet */}
      <div className="min-w-0 flex-1">
        <BOMPanel />
      </div>
    </div>
  )
}

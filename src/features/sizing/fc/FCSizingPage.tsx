import { Separator } from '@/components/ui/separator'
import { FCInputForm } from './FCInputForm'

export function FCSizingPage() {
  return (
    <div className="flex flex-col gap-6 p-6 xl:flex-row xl:gap-8">
      <div className="w-full shrink-0 xl:w-80">
        <FCInputForm />
      </div>
      <Separator className="xl:hidden" />
      <div className="min-w-0 flex-1">
        {/* FCBOMPanel — added in plan 12-02 */}
        <div data-testid="fc-bom-placeholder" />
      </div>
    </div>
  )
}

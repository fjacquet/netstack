import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { FileSpreadsheet, FileText, Printer, Loader2 } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useResultStore } from '@/store/resultStore'
import { downloadBomCsv } from '@/features/export/exportCsv'
import { generatePdfBlob } from '@/features/export/exportPdf'
import { getLastTopologyPng } from '@/features/topology'

export function TopBar() {
  const { t } = useTranslation()
  const bom = useResultStore(useShallow((s) => s.bom))
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const handleCsv = () => {
    if (bom) downloadBomCsv(bom)
  }

  const handlePdf = async () => {
    if (!bom) return
    setPdfGenerating(true)
    try {
      const png = getLastTopologyPng()
      const blob = await generatePdfBlob(bom, png ?? undefined)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'netstack-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Silently fail — user can retry
    } finally {
      setPdfGenerating(false)
    }
  }

  const handlePrint = () => window.print()

  return (
    <header className="flex h-11 items-center border-b bg-secondary/50 px-4">
      <img src="/netstack/favicon-32x32.png" alt="NetStack" className="mr-2 h-7 w-7" />
      <span className="text-[28px] font-semibold leading-none tracking-tight">
        {t('app.title')}
      </span>

      <div className="ml-auto flex items-center gap-1">
        {/* Export buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleCsv}
              disabled={!bom}
            >
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('export.csvButton')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handlePdf}
              disabled={!bom || pdfGenerating}
            >
              {pdfGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('export.pdfButton')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('export.printButton')}</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-border" />

        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  )
}

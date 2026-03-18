import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/shallow'
import { FileSpreadsheet, FileText, Printer, Loader2 } from 'lucide-react'
import { useResultStore } from '@/store/resultStore'
import { useFCResultStore } from '@/store/fcResultStore'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { downloadBomCsv } from './exportCsv'
import { downloadFCBomCsv } from './exportFCCsv'
import { generatePdfBlob } from './exportPdf'
import { generateFCPdfBlob } from './exportFCPdf'
import { getLastTopologyPng, getLastFCTopologyPng } from '@/features/topology'

interface ExportTabProps {
  mode: 'ethernet' | 'fc'
}

export function ExportTab({ mode }: ExportTabProps) {
  const { t } = useTranslation()
  const { bom } = useResultStore(useShallow((state) => ({ bom: state.bom })))
  const { bom: fcBom } = useFCResultStore(useShallow((state) => ({ bom: state.bom })))
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const activeBom = mode === 'fc' ? fcBom : bom

  const handleCsvExport = () => {
    if (mode === 'fc') {
      if (!fcBom) return
      downloadFCBomCsv(fcBom)
      return
    }
    if (!bom) return
    downloadBomCsv(bom)
  }

  const handlePdfExport = async () => {
    setPdfGenerating(true)
    setPdfError(null)
    try {
      if (mode === 'fc') {
        if (!fcBom) return
        const pngA = getLastFCTopologyPng('A') ?? undefined
        const pngB = getLastFCTopologyPng('B') ?? undefined
        const blob = await generateFCPdfBlob(fcBom, pngA, pngB)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'netstack-fc-report.pdf'
        a.click()
        URL.revokeObjectURL(url)
        return
      }
      if (!bom) return
      const png = getLastTopologyPng()
      const blob = await generatePdfBlob(bom, png ?? undefined)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'netstack-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : String(err))
    } finally {
      setPdfGenerating(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-[640px] mx-auto p-6 flex flex-col gap-8">
      {/* CSV Export Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={24} className="text-muted-foreground" />
            <div>
              <CardTitle>{t('export.csvHeading')}</CardTitle>
              <CardDescription>{t('export.csvDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeBom ? (
            <Button className="w-full" onClick={handleCsvExport}>
              {mode === 'fc' ? t('export.fcCsvButton') : t('export.csvButton')}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="w-full pointer-events-none opacity-50"
                  aria-disabled="true"
                  tabIndex={-1}
                >
                  {mode === 'fc' ? t('export.fcCsvButton') : t('export.csvButton')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('export.disabledTooltip')}</TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>

      {/* PDF Export Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-muted-foreground" />
            <div>
              <CardTitle>{t('export.pdfHeading')}</CardTitle>
              <CardDescription>{t('export.pdfDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {activeBom ? (
            <Button
              className="w-full"
              onClick={handlePdfExport}
              disabled={pdfGenerating}
              aria-busy={pdfGenerating}
            >
              {pdfGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('export.pdfGenerating')}
                </>
              ) : mode === 'fc' ? (
                t('export.fcPdfButton')
              ) : (
                t('export.pdfButton')
              )}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="w-full pointer-events-none opacity-50"
                  aria-disabled="true"
                  tabIndex={-1}
                >
                  {mode === 'fc' ? t('export.fcPdfButton') : t('export.pdfButton')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('export.disabledTooltip')}</TooltipContent>
            </Tooltip>
          )}
          {pdfError && (
            <Alert variant="destructive">
              <AlertTitle>{t('export.pdfErrorHeading')}</AlertTitle>
              <AlertDescription>
                {t('export.pdfErrorBody')}
                <pre className="mt-2 text-xs opacity-70 whitespace-pre-wrap">{pdfError}</pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Print Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Printer size={24} className="text-muted-foreground" />
            <div>
              <CardTitle>{t('export.printHeading')}</CardTitle>
              <CardDescription>{t('export.printDescription')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" className="w-full" onClick={handlePrint}>
            {t('export.printButton')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

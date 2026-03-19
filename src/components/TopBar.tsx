import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useMatch } from 'react-router-dom'
import { useShallow } from 'zustand/shallow'
import { FileSpreadsheet, FileText, Printer, Loader2, FolderOpen, SlidersHorizontal } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ModeSelector } from '@/components/ModeSelector'
import { ProfileManager } from '@/components/ProfileManager'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useResultStore } from '@/store/resultStore'
import { useInputStore } from '@/store/inputStore'
import { useFCResultStore } from '@/store/fcResultStore'
import { useConvergedResultStore } from '@/store/convergedResultStore'
import { downloadBomCsv } from '@/features/export/exportCsv'
import { downloadFCBomCsv } from '@/features/export/exportFCCsv'
import { downloadConvergedBomCsv } from '@/features/export/exportConvergedCsv'
import { downloadThreeTierBomCsv } from '@/features/export/exportThreeTierCsv'
import { generatePdfBlob } from '@/features/export/exportPdf'
import { generateFCPdfBlob } from '@/features/export/exportFCPdf'
import { generateConvergedPdfBlob } from '@/features/export/exportConvergedPdf'
import { generateThreeTierPdfBlob } from '@/features/export/exportThreeTierPdf'
import { getLastTopologyPng, getLastFCTopologyPng } from '@/features/topology'

interface TopBarProps {
  mode: 'ethernet' | 'fc' | 'converged'
  onModeChange: (m: 'ethernet' | 'fc' | 'converged') => void
  profilesOpen: boolean
  onToggleProfiles: () => void
}

export function TopBar({ mode, onModeChange, profilesOpen, onToggleProfiles }: TopBarProps) {
  const { t } = useTranslation()
  const { bom, threeTierBom } = useResultStore(
    useShallow((s) => ({ bom: s.bom, threeTierBom: s.threeTierBom }))
  )
  const topology = useInputStore(useShallow((s) => s.input.topology))
  const fcBom = useFCResultStore(useShallow((s) => s.bom))
  const convergedBom = useConvergedResultStore(useShallow((s) => s.bom))

  const activeBom = mode === 'fc'
    ? fcBom
    : mode === 'converged'
      ? convergedBom
      : topology === 'three-tier'
        ? threeTierBom
        : bom

  const navigate = useNavigate()
  const isOnInputRoute = !!useMatch('/input')

  const [pdfGenerating, setPdfGenerating] = useState(false)

  const handleCsv = () => {
    if (mode === 'ethernet' && topology === 'three-tier' && threeTierBom) {
      downloadThreeTierBomCsv(threeTierBom)
    } else if (mode === 'converged' && convergedBom) {
      downloadConvergedBomCsv(convergedBom)
    } else if (mode === 'fc' && fcBom) {
      downloadFCBomCsv(fcBom)
    } else if (bom) {
      downloadBomCsv(bom)
    }
  }

  const handlePdf = async () => {
    if (mode === 'converged') {
      if (!convergedBom) return
      setPdfGenerating(true)
      try {
        const png = getLastTopologyPng() ?? undefined
        const pngA = getLastFCTopologyPng('A') ?? undefined
        const pngB = getLastFCTopologyPng('B') ?? undefined
        const blob = await generateConvergedPdfBlob(convergedBom, png, pngA, pngB)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'netstack-converged-report.pdf'
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        // Silently fail -- user can retry
      } finally {
        setPdfGenerating(false)
      }
    } else if (mode === 'fc') {
      if (!fcBom) return
      setPdfGenerating(true)
      try {
        const pngA = getLastFCTopologyPng('A') ?? undefined
        const pngB = getLastFCTopologyPng('B') ?? undefined
        const blob = await generateFCPdfBlob(fcBom, pngA, pngB)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'netstack-fc-report.pdf'
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        // Silently fail -- user can retry
      } finally {
        setPdfGenerating(false)
      }
    } else if (mode === 'ethernet' && topology === 'three-tier') {
      if (!threeTierBom) return
      setPdfGenerating(true)
      try {
        const blob = await generateThreeTierPdfBlob(threeTierBom)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'netstack-three-tier-report.pdf'
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        // Silently fail -- user can retry
      } finally {
        setPdfGenerating(false)
      }
    } else {
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
        // Silently fail -- user can retry
      } finally {
        setPdfGenerating(false)
      }
    }
  }

  const handlePrint = () => window.print()

  return (
    <>
    <header className="flex h-11 items-center border-b bg-secondary/50 px-4">
      <img src={`${import.meta.env.BASE_URL}favicon-32x32.png`} alt="NetStack" className="mr-2 h-7 w-7" />
      <span className="text-[28px] font-semibold leading-none tracking-tight">
        {t('app.title')}
      </span>

      <ModeSelector mode={mode} onModeChange={onModeChange} />

      <div className="ml-auto flex items-center gap-1">
        {/* Configure inputs button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isOnInputRoute ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate('/input')}
              aria-label={t('nav.configure')}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('nav.configure')}</TooltipContent>
        </Tooltip>

        {/* Profile manager toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={profilesOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9"
              onClick={onToggleProfiles}
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('profiles.heading')}</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Export buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleCsv}
              disabled={!activeBom}
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
              disabled={!activeBom || pdfGenerating}
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
    <ProfileManager
      mode={mode}
      open={profilesOpen}
      onClose={onToggleProfiles}
      onModeChange={onModeChange}
    />
    </>
  )
}

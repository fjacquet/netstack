import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Routes, Route, NavLink } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ReloadPrompt } from '@/components/ReloadPrompt'
import { TopBar } from '@/components/TopBar'
import { InputPage } from '@/features/input/InputPage'
import { ResultsPage } from '@/features/sizing/ResultsPage'
import { RackElevationTab, ConvergedRackElevationTab } from '@/features/rack-elevation'
import { TopologyTab, FCTopologyTab, ConvergedTopologyTab } from '@/features/topology'
import { cn } from '@/lib/utils'

function AppContent() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'ethernet' | 'fc' | 'converged'>('ethernet')
  const [profilesOpen, setProfilesOpen] = useState(false)

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      isActive
        ? 'border-b-2 border-primary text-foreground bg-background shadow-sm -mb-px'
        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
    )

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* TopBar renders ProfileManager internally via fixed positioning */}
      <TopBar
        mode={mode}
        onModeChange={setMode}
        profilesOpen={profilesOpen}
        onToggleProfiles={() => setProfilesOpen((v) => !v)}
      />
      <nav aria-label="page navigation" className="border-b bg-secondary/30 px-4 h-11 flex items-center gap-1">
        <NavLink
          to="/input"
          className={navLinkClass}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t('nav.configure')}
        </NavLink>
        <NavLink
          to="/"
          end
          className={navLinkClass}
        >
          <img src={`${import.meta.env.BASE_URL}icon-sizing.png`} className="h-4 w-4" alt="" />
          {t('nav.results')}
        </NavLink>
        <NavLink
          to="/topology"
          className={navLinkClass}
        >
          <img src={`${import.meta.env.BASE_URL}icon-topology.png`} className="h-4 w-4" alt="" />
          {t('nav.topology')}
        </NavLink>
        {mode !== 'fc' && (
          <NavLink
            to="/rack"
            className={navLinkClass}
          >
            <img src={`${import.meta.env.BASE_URL}icon-rack.png`} className="h-4 w-4" alt="" />
            {t('nav.rack')}
          </NavLink>
        )}
      </nav>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/input" element={<InputPage mode={mode} />} />
          <Route path="/" element={<ResultsPage mode={mode} />} />
          <Route path="/topology" element={
            mode === 'fc' ? <FCTopologyTab /> : mode === 'converged' ? <ConvergedTopologyTab /> : <TopologyTab />
          } />
          {mode !== 'fc' && (
            <Route path="/rack" element={
              mode === 'converged' ? <ConvergedRackElevationTab /> : <RackElevationTab />
            } />
          )}
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="netstack-theme">
      <TooltipProvider delayDuration={300}>
        <AppContent />
        <ReloadPrompt />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App

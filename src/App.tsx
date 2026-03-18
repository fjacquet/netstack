import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TopBar } from '@/components/TopBar'
import { SizingPage } from '@/features/sizing/SizingPage'
import { FCSizingPage } from '@/features/sizing/fc/FCSizingPage'
import { RackElevationTab } from '@/features/rack-elevation'
import { TopologyTab } from '@/features/topology'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

function AppContent() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'ethernet' | 'fc'>('ethernet')

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar mode={mode} onModeChange={setMode} />
      <Tabs defaultValue="sizing" className="flex flex-1 flex-col">
        <div className="border-b bg-secondary/30 px-4">
          <TabsList className="h-11 bg-transparent">
            <TabsTrigger value="sizing" className="gap-1.5">
              <img src={`${import.meta.env.BASE_URL}icon-sizing.png`} className="h-4 w-4" alt="" />
              {t('tabs.sizing')}
            </TabsTrigger>
            <TabsTrigger value="topology" className="gap-1.5">
              <img src={`${import.meta.env.BASE_URL}icon-topology.png`} className="h-4 w-4" alt="" />
              {t('tabs.topology')}
            </TabsTrigger>
            {mode === 'ethernet' && (
              <TabsTrigger value="rackElevation" className="gap-1.5">
                <img src={`${import.meta.env.BASE_URL}icon-rack.png`} className="h-4 w-4" alt="" />
                {t('tabs.rackElevation')}
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        <main className="flex-1 overflow-auto">
          <TabsContent value="sizing" className="mt-0">
            {mode === 'fc' ? <FCSizingPage /> : <SizingPage />}
          </TabsContent>
          <TabsContent value="topology" className="mt-0">
            <TopologyTab />
          </TabsContent>
          {mode === 'ethernet' && (
            <TabsContent value="rackElevation" className="mt-0">
              <RackElevationTab />
            </TabsContent>
          )}
        </main>
      </Tabs>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="netstack-theme">
      <TooltipProvider delayDuration={300}>
        <AppContent />
      </TooltipProvider>
    </ThemeProvider>
  )
}

export default App

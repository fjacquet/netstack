import { useTranslation } from 'react-i18next'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TopBar } from '@/components/TopBar'
import { SizingPage } from '@/features/sizing/SizingPage'
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar />
      <Tabs defaultValue="sizing" className="flex flex-1 flex-col">
        <div className="border-b bg-secondary/30 px-4">
          <TabsList className="h-11 bg-transparent">
            <TabsTrigger value="sizing" className="gap-1.5">
              <img src="/icon-sizing.png" className="h-4 w-4" alt="" />
              {t('tabs.sizing')}
            </TabsTrigger>
            <TabsTrigger value="topology" className="gap-1.5">
              <img src="/icon-topology.png" className="h-4 w-4" alt="" />
              {t('tabs.topology')}
            </TabsTrigger>
            <TabsTrigger value="rackElevation" className="gap-1.5">
              <img src="/icon-rack.png" className="h-4 w-4" alt="" />
              {t('tabs.rackElevation')}
            </TabsTrigger>
          </TabsList>
        </div>
        <main className="flex-1 overflow-auto">
          <TabsContent value="sizing" className="mt-0">
            <SizingPage />
          </TabsContent>
          <TabsContent value="topology" className="mt-0">
            <TopologyTab />
          </TabsContent>
          <TabsContent value="rackElevation" className="mt-0">
            <RackElevationTab />
          </TabsContent>
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

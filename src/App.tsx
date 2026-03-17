import { useTranslation } from 'react-i18next'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TopBar } from '@/components/TopBar'
import { SizingPage } from '@/features/sizing/SizingPage'
import { PlaceholderTab } from '@/features/placeholder/PlaceholderTab'
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
            <TabsTrigger value="sizing">{t('tabs.sizing')}</TabsTrigger>
            <TabsTrigger value="topology">{t('tabs.topology')}</TabsTrigger>
            <TabsTrigger value="rackElevation">{t('tabs.rackElevation')}</TabsTrigger>
            <TabsTrigger value="export">{t('tabs.export')}</TabsTrigger>
          </TabsList>
        </div>
        <main className="flex-1 overflow-auto">
          <TabsContent value="sizing" className="mt-0">
            <SizingPage />
          </TabsContent>
          <TabsContent value="topology" className="mt-0">
            <PlaceholderTab
              headingKey="placeholders.topologyHeading"
              bodyKey="placeholders.topologyBody"
              phase={3}
              icon="topology"
            />
          </TabsContent>
          <TabsContent value="rackElevation" className="mt-0">
            <PlaceholderTab
              headingKey="placeholders.rackElevationHeading"
              bodyKey="placeholders.rackElevationBody"
              phase={4}
              icon="rackElevation"
            />
          </TabsContent>
          <TabsContent value="export" className="mt-0">
            <PlaceholderTab
              headingKey="placeholders.exportHeading"
              bodyKey="placeholders.exportBody"
              phase={4}
              icon="export"
            />
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

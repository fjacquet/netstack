import { useTranslation } from 'react-i18next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Network, Server, FileDown } from 'lucide-react'

interface PlaceholderTabProps {
  headingKey: string
  bodyKey: string
  phase: number
  icon: 'topology' | 'rackElevation' | 'export'
}

const ICONS = {
  topology: Network,
  rackElevation: Server,
  export: FileDown,
} as const

export function PlaceholderTab({ headingKey, bodyKey, phase, icon }: PlaceholderTabProps) {
  const { t } = useTranslation()
  const Icon = ICONS[icon]

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{t(headingKey)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t(bodyKey)}</p>
          <Badge variant="secondary">Coming in Phase {phase}</Badge>
        </CardContent>
      </Card>
    </div>
  )
}

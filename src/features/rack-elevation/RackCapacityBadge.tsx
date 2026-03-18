import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

interface RackCapacityBadgeProps {
  usedU: number
  totalU: number
}

export function RackCapacityBadge({ usedU, totalU }: RackCapacityBadgeProps) {
  const { t } = useTranslation()
  const overflow = usedU > totalU

  return (
    <Badge variant={overflow ? 'destructive' : 'secondary'}>
      {overflow
        ? t('rack.capacityExceeded', { used: usedU, total: totalU })
        : t('rack.capacityWithin', { used: usedU, total: totalU })
      }
    </Badge>
  )
}

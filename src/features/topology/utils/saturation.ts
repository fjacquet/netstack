export type SaturationLevel = 'healthy' | 'warning' | 'saturated'

export function getSaturationLevel(usedPorts: number, totalPorts: number): SaturationLevel {
  if (totalPorts === 0) return 'healthy'
  const pct = (usedPorts / totalPorts) * 100
  if (pct >= 100) return 'saturated'
  if (pct >= 80) return 'warning'
  return 'healthy'
}

export function getSaturationBorderClass(usedPorts: number, totalPorts: number): string {
  const level = getSaturationLevel(usedPorts, totalPorts)
  switch (level) {
    case 'healthy':
      return 'border-[hsl(142_76%_36%)] dark:border-[hsl(142_69%_58%)]'
    case 'warning':
      return 'border-[hsl(38_92%_50%)] dark:border-[hsl(38_95%_64%)]'
    case 'saturated':
      return 'border-destructive'
  }
}

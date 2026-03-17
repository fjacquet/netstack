import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  // Resolve effective theme for icon display
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      className="h-9 w-9"
    >
      {isDark ? (
        <Sun className="h-[1.125rem] w-[1.125rem]" />
      ) : (
        <Moon className="h-[1.125rem] w-[1.125rem]" />
      )}
    </Button>
  )
}

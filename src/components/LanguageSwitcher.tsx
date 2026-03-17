import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LOCALES = ['en', 'fr', 'de', 'it'] as const

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 min-w-[3rem] px-2 text-sm font-medium"
          aria-label={t('language.ariaLabel')}
        >
          {i18n.language.toUpperCase().slice(0, 2)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((lng) => (
          <DropdownMenuItem
            key={lng}
            onClick={() => i18n.changeLanguage(lng)}
            className={
              i18n.language.startsWith(lng) ? 'font-semibold' : ''
            }
          >
            {lng.toUpperCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

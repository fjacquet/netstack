import { useTranslation } from 'react-i18next'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export function TopBar() {
  const { t } = useTranslation()

  return (
    <header className="flex h-11 items-center border-b bg-secondary/50 px-4">
      <img src="/netstack/favicon-32x32.png" alt="NetStack" className="mr-2 h-7 w-7" />
      <span className="text-[28px] font-semibold leading-none tracking-tight">
        {t('app.title')}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  )
}

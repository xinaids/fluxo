'use client'

import { usePathname } from 'next/navigation'
import { LanguageToggle } from '@/components/ui/LanguageToggle'

export function AppHeader() {
  const path = usePathname()
  if (path === '/landing' || path === '/onboarding' || path.startsWith('/pay')) return null

  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1">
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="Fluxo" className="w-6 h-6 rounded-md" />
        <span className="text-sm font-semibold text-gray-900">Fluxo</span>
      </div>
      <LanguageToggle />
    </div>
  )
}

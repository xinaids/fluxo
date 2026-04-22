'use client'

import { useLanguage } from '@/i18n/LanguageContext'

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, toggle } = useLanguage()

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors ${className}`}
      title={lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}
    >
      <span className={lang === 'pt' ? 'font-bold text-gray-900' : ''}>PT</span>
      <span className="text-gray-300">|</span>
      <span className={lang === 'en' ? 'font-bold text-gray-900' : ''}>EN</span>
    </button>
  )
}

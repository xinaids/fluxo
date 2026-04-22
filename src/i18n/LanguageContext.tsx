'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { pt } from './pt'
import { en } from './en'

type Lang = 'pt' | 'en'
type Dict = typeof pt

interface LanguageContextType {
  lang: Lang
  t: Dict
  toggle: () => void
}

const dictionaries: Record<Lang, Dict> = { pt, en }

const LanguageContext = createContext<LanguageContextType>({
  lang: 'pt',
  t: pt,
  toggle: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('pt')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('fluxo_lang') as Lang
    if (saved === 'en' || saved === 'pt') setLang(saved)
    setMounted(true)
  }, [])

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'pt' ? 'en' : 'pt'
      try { localStorage.setItem('fluxo_lang', next) } catch {}
      return next
    })
  }, [])

  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ lang: 'pt', t: pt, toggle }}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ lang, t: dictionaries[lang], toggle }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

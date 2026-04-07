'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/cobrar',   label: 'Cobrar',   icon: '⬡' },
  { href: '/extrato',  label: 'Extrato',  icon: '≡' },
  { href: '/carteira', label: 'Carteira', icon: '◎' },
]

export default function BottomNav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 max-w-md mx-auto">
      {tabs.map(tab => {
        const active = path.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-colors
              ${active ? 'text-black' : 'text-gray-400'}`}
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

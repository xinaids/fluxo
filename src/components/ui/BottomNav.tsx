'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/cobrar',
    label: 'Cobrar',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#111' : '#aaa'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4"/>
        <path d="M9 9h6M9 12h6M9 15h4"/>
      </svg>
    )
  },
  {
    href: '/extrato',
    label: 'Extrato',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#111' : '#aaa'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 10h16M4 14h10"/>
      </svg>
    )
  },
  {
    href: '/carteira',
    label: 'Carteira',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#111' : '#aaa'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        <path d="M16 13a1 1 0 1 0 2 0 1 1 0 0 0-2 0z" fill={active ? '#111' : '#aaa'}/>
        <path d="M8 7V5a2 2 0 0 1 4 0v2"/>
      </svg>
    )
  },
]

export default function BottomNav() {
  const path = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100">
      <div className="flex justify-around py-2 px-4">
        {tabs.map(tab => {
          const active = path.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl"
            >
              {tab.icon(active)}
              <span className={`text-[10px] font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

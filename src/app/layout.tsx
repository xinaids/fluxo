import '@/lib/polyfills'
import type { Metadata, Viewport } from 'next'
import { SolanaProvider } from '@/components/SolanaProvider'
import BottomNav from '@/components/ui/BottomNav'
import { WalletModalOverride } from '@/components/ui/WalletModalOverride'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fluxo',
  description: 'Receba pagamentos em crypto. Sem banco. Sem fronteiras.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Fluxo' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <SolanaProvider>
          <main className="pb-24 max-w-md mx-auto min-h-screen">
            {children}
          </main>
          <WalletModalOverride />
          <BottomNav />
        </SolanaProvider>
      </body>
    </html>
  )
}

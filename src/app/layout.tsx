import '@/lib/polyfills'
import type { Metadata, Viewport } from 'next'
import { SolanaProvider } from '@/components/SolanaProvider'
import BottomNav from '@/components/ui/BottomNav'
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
      <body className="bg-white min-h-screen font-sans antialiased">
        <SolanaProvider>
          <main className="pb-20 max-w-md mx-auto min-h-screen">
            {children}
          </main>
          <BottomNav />
        </SolanaProvider>
      </body>
    </html>
  )
}

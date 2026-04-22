'use client'

import { FC, ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { NETWORK } from '@/hooks/constants'

const ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl(NETWORK)

require('@solana/wallet-adapter-react-ui/styles.css')

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = useMemo(() => [], [])

  return (
    // @ts-expect-error -- wallet-adapter types mismatch with React 19
    <ConnectionProvider endpoint={ENDPOINT}>
      {/* @ts-expect-error -- wallet-adapter types mismatch with React 19 */}
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

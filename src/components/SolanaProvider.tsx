// @ts-nocheck
'use client'

import { FC, ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { NETWORK } from '@/hooks/constants'

import '@solana/wallet-adapter-react-ui/styles.css'

const ENDPOINT =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_RPC_URL ?? '/api/rpc')
    : (process.env.RPC_URL ?? clusterApiUrl(NETWORK))

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

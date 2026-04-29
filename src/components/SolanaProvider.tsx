// @ts-nocheck
'use client'

import { FC, ReactNode, useMemo, useState, useEffect } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { NETWORK } from '@/hooks/constants'

import '@solana/wallet-adapter-react-ui/styles.css'

const FALLBACK = clusterApiUrl(NETWORK)

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [endpoint, setEndpoint] = useState(FALLBACK)
  const wallets = useMemo(() => [], [])

  useEffect(() => {
    setEndpoint(window.location.origin + '/api/rpc')
  }, [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

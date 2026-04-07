'use client'

import { FC, ReactNode, useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

// Use devnet during development, mainnet-beta for production
const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet'
  ? 'mainnet-beta'
  : 'devnet'

const ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl(NETWORK as 'devnet' | 'mainnet-beta')

require('@solana/wallet-adapter-react-ui/styles.css')

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

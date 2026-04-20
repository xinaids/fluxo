'use client'
import { FC, ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'

const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet'
  ? 'mainnet-beta'
  : 'devnet'

const ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl(NETWORK as 'devnet' | 'mainnet-beta')

require('@solana/wallet-adapter-react-ui/styles.css')

export const SolanaProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    // @ts-ignore
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

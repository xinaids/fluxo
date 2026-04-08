'use client'

import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'

export function ClientWalletButton() {
  const { setVisible } = useWalletModal()
  const { connected, publicKey, disconnect } = useWallet()

  if (connected && publicKey) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-500">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </p>
        <button
          onClick={disconnect}
          className="px-6 py-3 border border-gray-200 rounded-xl text-sm text-gray-500"
        >
          Desconectar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="px-6 py-3 bg-black text-white rounded-xl text-sm font-medium"
    >
      Conectar carteira
    </button>
  )
}

'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { ClientWalletButton } from '@/components/ui/ClientWalletButton'
import { useEffect, useState } from 'react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { USDC_MINT, IS_MAINNET, BALANCE_REFRESH_MS, explorerAddressUrl } from '@/hooks/constants'
import { useLanguage } from '@/i18n/LanguageContext'
import { useBrlUsdcRate, shortenAddress } from '@/hooks/useBrlUsdcRate'

interface Balances {
  sol: number
  usdc: number
}

function TokenRow({
  symbol,
  name,
  balance,
  usdValue,
  isDefault,
}: {
  symbol: string
  name: string
  balance: number
  usdValue?: number
  isDefault?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
          {symbol[0]}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {symbol}
            {isDefault && (
              <span className="ml-2 text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                padrão
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">{name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">
          {balance.toLocaleString('en-US', { maximumFractionDigits: symbol === 'SOL' ? 4 : 2 })}
        </p>
        {usdValue !== undefined && (
          <p className="text-xs text-gray-400">
            ≈ ${usdValue.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function CarteiraPage() {
  const { publicKey, disconnect } = useWallet()
  const { connection } = useConnection()
  const { solPriceUsd } = useBrlUsdcRate()
  const { t } = useLanguage()
  const [balances, setBalances] = useState<Balances>({ sol: 0, usdc: 0 })
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!publicKey) return
    let cancelled = false

    async function fetchBalances() {
      setLoading(true)
      try {
        const solLamports = await connection.getBalance(publicKey!)
        const sol = solLamports / LAMPORTS_PER_SOL

        let usdc = 0
        try {
          const ata = await getAssociatedTokenAddress(USDC_MINT, publicKey!)
          const info = await connection.getTokenAccountBalance(ata)
          usdc = info.value.uiAmount ?? 0
        } catch {
          // ATA doesn't exist yet — balance is 0
        }

        if (!cancelled) setBalances({ sol, usdc })
      } catch (e) {
        console.error('[Fluxo] balance fetch error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBalances()
    const id = setInterval(fetchBalances, BALANCE_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [publicKey, connection])

  async function handleCopy() {
    if (!publicKey) return
    await navigator.clipboard.writeText(publicKey.toBase58())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-4xl opacity-20">◎</div>
        <p className="text-gray-500 text-sm text-center">
          {t.carteira_connect_desc}
        </p>
        <ClientWalletButton />
      </div>
    )
  }

  const totalUsd = balances.usdc + balances.sol * solPriceUsd

  return (
    <div className="px-4 pt-6 max-w-sm mx-auto">
      {/* Balance header */}
      <div className="text-center mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{t.carteira_total}</p>
        {loading ? (
          <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse mx-auto" />
        ) : (
          <p className="text-4xl font-semibold">${totalUsd.toFixed(2)}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{t.carteira_usd}</p>
      </div>

      {/* Address card */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-400">{t.carteira_address}</p>
          <a
            href={explorerAddressUrl(publicKey.toBase58())}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-blue-500 hover:underline"
          >
            Explorer ↗
          </a>
        </div>
        <p className="text-sm font-mono text-gray-700 break-all leading-relaxed">
          {publicKey.toBase58()}
        </p>
        <button
          onClick={handleCopy}
          className="mt-3 w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 bg-white active:scale-[0.98] transition-transform"
        >
          {copied ? t.carteira_copied : t.carteira_copy}
        </button>
      </div>

      {/* Token list */}
      <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
        {t.carteira_tokens}
      </p>
      <div className="bg-white rounded-2xl border border-gray-100 px-4 mb-5">
        <TokenRow
          symbol="USDC"
          name="USD Coin · Solana"
          balance={balances.usdc}
          usdValue={balances.usdc}
          isDefault
        />
        <TokenRow
          symbol="SOL"
          name="Solana nativo"
          balance={balances.sol}
          usdValue={balances.sol * solPriceUsd}
        />
      </div>

      {/* Network badge */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs text-gray-400">Rede</span>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            IS_MAINNET ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-600'
          }`}
        >
          {IS_MAINNET ? t.carteira_mainnet : t.carteira_devnet}
        </span>
      </div>

      {/* Disconnect */}
      <button
        onClick={disconnect}
        className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-400 active:scale-[0.98] transition-transform"
      >
        {t.carteira_disconnect}
      </button>

      <p className="text-xs text-center text-gray-300 mt-6 pb-4">
        {shortenAddress(publicKey.toBase58())} · Fluxo v0.2
      </p>
    </div>
  )
}

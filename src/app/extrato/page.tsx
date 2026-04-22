'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useTxHistory, TxRecord } from '@/hooks/useTxHistory'
import { formatBrl, shortenAddress } from '@/hooks/useBrlUsdcRate'
import { useLanguage } from '@/i18n/LanguageContext'
import { explorerUrl } from '@/hooks/constants'

function TxItem({ tx }: { tx: TxRecord }) {
  const { t } = useLanguage()
  const isReceive = tx.type === 'receive'

  return (
    <a
      href={explorerUrl(tx.signature)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors -mx-1 px-1 rounded-lg"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm
            ${isReceive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}
        >
          {isReceive ? '↓' : '↑'}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">
            {tx.label || (isReceive ? t.extrato_received : t.extrato_sent)}
            {tx.source === 'chain' && !tx.amountBrl && (
              <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded-full align-middle">
                on-chain
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(tx.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {tx.counterparty && (
              <span className="ml-1 text-gray-300">
                · {shortenAddress(tx.counterparty)}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-medium ${isReceive ? 'text-green-600' : 'text-red-500'}`}>
          {isReceive ? '+' : '-'}
          {tx.token === 'SOL'
            ? tx.amountUsdc.toFixed(4) + ' SOL'
            : tx.amountUsdc.toFixed(2) + ' USDC'}
        </p>
        {tx.amountBrl > 0 && (
          <p className="text-xs text-gray-400">{formatBrl(tx.amountBrl)}</p>
        )}
      </div>
    </a>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-2 w-16 bg-gray-50 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 bg-gray-100 rounded animate-pulse ml-auto" />
            <div className="h-2 w-12 bg-gray-50 rounded animate-pulse ml-auto" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ExtratoPage() {
  const { publicKey } = useWallet()
  const {
    grouped,
    chainLoading,
    totalReceivedBrl,
    totalReceivedUsdc,
    totalReceivedSol,
    totalSentBrl,
    totalSentUsdc,
    totalSentSol,
  } = useTxHistory(publicKey?.toBase58())

  const { t } = useLanguage()
  const groups = Object.entries(grouped)

  return (
    <div className="px-4 pt-6 max-w-sm mx-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs text-green-600 uppercase tracking-widest mb-1">{t.extrato_received}</p>
          <p className="text-xl font-semibold text-green-700">{formatBrl(totalReceivedBrl)}</p>
          <p className="text-xs text-green-500 mt-0.5">
            {totalReceivedUsdc > 0 && <span>{totalReceivedUsdc.toFixed(2)} USDC</span>}
            {totalReceivedUsdc > 0 && totalReceivedSol > 0 && <span> · </span>}
            {totalReceivedSol > 0 && <span>{totalReceivedSol.toFixed(4)} SOL</span>}
            {totalReceivedUsdc === 0 && totalReceivedSol === 0 && <span>—</span>}
          </p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs text-red-500 uppercase tracking-widest mb-1">{t.extrato_sent}</p>
          <p className="text-xl font-semibold text-red-600">{formatBrl(totalSentBrl)}</p>
          <p className="text-xs text-red-400 mt-0.5">
            {totalSentUsdc > 0 && <span>{totalSentUsdc.toFixed(2)} USDC</span>}
            {totalSentUsdc > 0 && totalSentSol > 0 && <span> · </span>}
            {totalSentSol > 0 && <span>{totalSentSol.toFixed(4)} SOL</span>}
            {totalSentUsdc === 0 && totalSentSol === 0 && <span>—</span>}
          </p>
        </div>
      </div>

      {/* Chain loading indicator */}
      {chainLoading && (
        <div className="flex items-center justify-center gap-2 mb-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="text-xs text-blue-500">{t.extrato_syncing}</span>
        </div>
      )}

      {/* Empty state */}
      {groups.length === 0 && !chainLoading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">◎</p>
          <p className="text-sm">{t.extrato_empty}</p>
          <p className="text-xs mt-1">{t.extrato_empty_desc}</p>
        </div>
      )}

      {groups.length === 0 && chainLoading && (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-2">
          <SkeletonRows />
        </div>
      )}

      {/* Transaction groups */}
      {groups.map(([dateLabel, txs]) => (
        <div key={dateLabel} className="mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
            {dateLabel}
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 px-4">
            {txs.map((tx) => (
              <TxItem key={tx.signature + tx.timestamp} tx={tx} />
            ))}
          </div>
        </div>
      ))}

      {/* Footer note */}
      {groups.length > 0 && (
        <p className="text-xs text-center text-gray-300 mt-4 pb-4">
          {t.extrato_footer}
        </p>
      )}
    </div>
  )
}

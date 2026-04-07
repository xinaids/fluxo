'use client'

import { useTxHistory, TxRecord } from '@/hooks/useTxHistory'
import { formatBrl } from '@/hooks/useBrlUsdcRate'

function TxItem({ tx }: { tx: TxRecord }) {
  const isReceive = tx.type === 'receive'
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm
            ${isReceive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}
        >
          {isReceive ? '↓' : '↑'}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{tx.label}</p>
          <p className="text-xs text-gray-400">
            {new Date(tx.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-medium ${isReceive ? 'text-green-600' : 'text-red-500'}`}>
          {isReceive ? '+' : '-'}{tx.amountUsdc.toFixed(2)} USDC
        </p>
        <p className="text-xs text-gray-400">{formatBrl(tx.amountBrl)}</p>
      </div>
    </div>
  )
}

export default function ExtratoPaage() {
  const { grouped, totalReceived } = useTxHistory()
  const groups = Object.entries(grouped)

  return (
    <div className="px-4 pt-6 max-w-sm mx-auto">
      <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
            Total recebido
          </p>
          <p className="text-2xl font-semibold">${totalReceived.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">USDC · Solana</p>
        </div>
        <div className="text-3xl opacity-20">◎</div>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">◎</p>
          <p className="text-sm">Nenhuma transação ainda</p>
          <p className="text-xs mt-1">Gere um QR Code e receba seu primeiro pagamento</p>
        </div>
      )}

      {groups.map(([dateLabel, txs]) => (
        <div key={dateLabel} className="mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
            {dateLabel}
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 px-4">
            {txs.map(tx => (
              <TxItem key={tx.id + tx.timestamp} tx={tx} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

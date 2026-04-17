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
          {isReceive ? '+' : '-'}{tx.token === 'SOL' ? tx.amountUsdc.toFixed(4) + ' SOL' : tx.amountUsdc.toFixed(2) + ' USDC'}
        </p>
        <p className="text-xs text-gray-400">{formatBrl(tx.amountBrl)}</p>
      </div>
    </div>
  )
}

export default function ExtratoPaage() {
  const { grouped, totalReceivedBrl, totalReceivedUsdc, totalReceivedSol, totalSentBrl, totalSentUsdc, totalSentSol } = useTxHistory()
  const groups = Object.entries(grouped)

  return (
    <div className="px-4 pt-6 max-w-sm mx-auto">
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs text-green-600 uppercase tracking-widest mb-1">
            Recebido
          </p>
          <p className="text-xl font-semibold text-green-700">{formatBrl(totalReceivedBrl)}</p>
          <p className="text-xs text-green-500 mt-0.5">
            {totalReceivedUsdc > 0 && <span>{totalReceivedUsdc.toFixed(2)} USDC</span>}
            {totalReceivedUsdc > 0 && totalReceivedSol > 0 && <span> · </span>}
            {totalReceivedSol > 0 && <span>{totalReceivedSol.toFixed(4)} SOL</span>}
            {totalReceivedUsdc === 0 && totalReceivedSol === 0 && <span>—</span>}
          </p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs text-red-500 uppercase tracking-widest mb-1">
            Enviado
          </p>
          <p className="text-xl font-semibold text-red-600">{formatBrl(totalSentBrl)}</p>
          <p className="text-xs text-red-400 mt-0.5">
            {totalSentUsdc > 0 && <span>{totalSentUsdc.toFixed(2)} USDC</span>}
            {totalSentUsdc > 0 && totalSentSol > 0 && <span> · </span>}
            {totalSentSol > 0 && <span>{totalSentSol.toFixed(4)} SOL</span>}
            {totalSentUsdc === 0 && totalSentSol === 0 && <span>—</span>}
          </p>
        </div>
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

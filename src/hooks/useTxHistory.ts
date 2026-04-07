import { useCallback, useEffect, useState } from 'react'

export interface TxRecord {
  id: string
  type: 'receive' | 'send'
  amountUsdc: number
  amountBrl: number
  label: string
  counterparty?: string
  signature: string
  timestamp: number
}

const STORAGE_KEY = 'fluxo_txs'

export function useTxHistory() {
  const [txs, setTxs] = useState<TxRecord[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setTxs(JSON.parse(raw))
    } catch {}
  }, [])

  const addTx = useCallback((tx: TxRecord) => {
    setTxs(prev => {
      const next = [tx, ...prev].slice(0, 200) // keep last 200
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const totalReceived = txs
    .filter(t => t.type === 'receive')
    .reduce((s, t) => s + t.amountUsdc, 0)

  // Group by date label
  const grouped = txs.reduce<Record<string, TxRecord[]>>((acc, tx) => {
    const d = new Date(tx.timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    let label: string
    if (d.toDateString() === today.toDateString()) label = 'Hoje'
    else if (d.toDateString() === yesterday.toDateString()) label = 'Ontem'
    else label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

    if (!acc[label]) acc[label] = []
    acc[label].push(tx)
    return acc
  }, {})

  return { txs, grouped, addTx, totalReceived }
}

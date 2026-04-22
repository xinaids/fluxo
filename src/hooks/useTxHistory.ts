import { useCallback, useEffect, useState, useRef } from 'react'
import { USDC_MINT, IS_MAINNET, TX_HISTORY_LIMIT } from './constants'

// ── Types ───────────────────────────────────────────────────
export interface TxRecord {
  id: string
  type: 'receive' | 'send'
  amountUsdc: number
  amountBrl: number
  label: string
  counterparty?: string
  signature: string
  timestamp: number
  token?: 'USDC' | 'SOL'
  source?: 'local' | 'chain'
}

// ── Local cache ─────────────────────────────────────────────
const STORAGE_KEY = 'fluxo_txs'

function readLocalTxs(): TxRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocalTxs(txs: TxRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs.slice(0, TX_HISTORY_LIMIT)))
  } catch {}
}

// ── On-chain history via RPC getSignaturesForAddress + getTransaction ──
async function fetchOnChainHistory(
  walletAddress: string,
  rpcUrl: string,
  limit = 20
): Promise<TxRecord[]> {
  const records: TxRecord[] = []

  try {
    // Step 1: get recent signatures
    const sigRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'sigs',
        method: 'getSignaturesForAddress',
        params: [walletAddress, { limit }],
      }),
    })
    const sigData = await sigRes.json()
    const signatures: Array<{ signature: string; blockTime: number | null }> =
      sigData?.result || []

    if (signatures.length === 0) return records

    // Step 2: fetch each transaction (batch for efficiency)
    const txPromises = signatures.slice(0, limit).map(async (sig) => {
      try {
        const txRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: sig.signature.slice(0, 8),
            method: 'getTransaction',
            params: [sig.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
          }),
        })
        const txData = await txRes.json()
        const tx = txData?.result
        if (!tx) return null

        const meta = tx.meta
        if (!meta || meta.err) return null

        const accountKeys = tx.transaction?.message?.accountKeys?.map(
          (k: any) => (typeof k === 'string' ? k : k.pubkey)
        ) || []

        const walletIndex = accountKeys.indexOf(walletAddress)
        if (walletIndex === -1) return null

        // Check for USDC transfers in token balances
        const preTokens = meta.preTokenBalances || []
        const postTokens = meta.postTokenBalances || []
        const usdcMint = USDC_MINT.toBase58()

        // Find USDC balance change for this wallet
        const preUsdc = preTokens.find(
          (t: any) => t.mint === usdcMint && t.owner === walletAddress
        )
        const postUsdc = postTokens.find(
          (t: any) => t.mint === usdcMint && t.owner === walletAddress
        )

        const preUsdcAmount = preUsdc?.uiTokenAmount?.uiAmount ?? 0
        const postUsdcAmount = postUsdc?.uiTokenAmount?.uiAmount ?? 0
        const usdcDiff = postUsdcAmount - preUsdcAmount

        // Check SOL balance change
        const preSol = (meta.preBalances?.[walletIndex] ?? 0) / 1e9
        const postSol = (meta.postBalances?.[walletIndex] ?? 0) / 1e9
        const solDiff = postSol - preSol
        const fee = (meta.fee ?? 0) / 1e9

        // Determine transaction type
        let record: TxRecord | null = null
        const timestamp = (sig.blockTime ?? Math.floor(Date.now() / 1000)) * 1000

        if (Math.abs(usdcDiff) >= 0.01) {
          // USDC transaction
          const isReceive = usdcDiff > 0
          // Find counterparty
          const counterpartyToken = isReceive
            ? preTokens.find((t: any) => t.mint === usdcMint && t.owner !== walletAddress)
            : postTokens.find((t: any) => t.mint === usdcMint && t.owner !== walletAddress)

          record = {
            id: sig.signature.slice(0, 8),
            type: isReceive ? 'receive' : 'send',
            amountUsdc: Math.abs(usdcDiff),
            amountBrl: 0, // will be enriched later with rate
            label: isReceive ? 'Recebido' : 'Enviado',
            counterparty: counterpartyToken?.owner,
            signature: sig.signature,
            timestamp,
            token: 'USDC',
            source: 'chain',
          }
        } else if (Math.abs(solDiff) > fee + 0.0001) {
          // SOL transfer (not just fee)
          const isReceive = solDiff > 0
          const amount = isReceive ? solDiff : Math.abs(solDiff) - fee

          if (amount > 0.0001) {
            record = {
              id: sig.signature.slice(0, 8),
              type: isReceive ? 'receive' : 'send',
              amountUsdc: amount, // stored as SOL amount in amountUsdc field
              amountBrl: 0,
              label: isReceive ? 'Recebido' : 'Enviado',
              counterparty: accountKeys.find((k: string) => k !== walletAddress),
              signature: sig.signature,
              timestamp,
              token: 'SOL',
              source: 'chain',
            }
          }
        }

        return record
      } catch {
        return null
      }
    })

    const results = await Promise.all(txPromises)
    results.forEach((r) => {
      if (r) records.push(r)
    })
  } catch (err) {
    console.warn('[Fluxo] On-chain history fetch error:', err)
  }

  return records
}

// ── Main hook ───────────────────────────────────────────────
export function useTxHistory(walletAddress?: string) {
  const [txs, setTxs] = useState<TxRecord[]>([])
  const [chainLoading, setChainLoading] = useState(false)
  const fetchedRef = useRef(false)

  // Load local cache on mount
  useEffect(() => {
    const local = readLocalTxs()
    if (local.length > 0) setTxs(local)
  }, [])

  // Fetch on-chain history when wallet is available
  useEffect(() => {
    if (!walletAddress || fetchedRef.current) return
    fetchedRef.current = true

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'

    setChainLoading(true)
    fetchOnChainHistory(walletAddress, rpcUrl, 30)
      .then((chainTxs) => {
        if (chainTxs.length === 0) return

        setTxs((prev) => {
          // Merge: chain txs + local-only txs (avoid duplicates by signature)
          const sigSet = new Set(chainTxs.map((t) => t.signature))
          const localOnly = prev.filter((t) => !sigSet.has(t.signature))

          // Enrich chain txs with BRL amounts from local records where available
          const localBySig = new Map(prev.map((t) => [t.signature, t]))
          const enriched = chainTxs.map((ct) => {
            const local = localBySig.get(ct.signature)
            if (local) {
              return { ...ct, amountBrl: local.amountBrl, label: local.label }
            }
            return ct
          })

          const merged = [...enriched, ...localOnly]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, TX_HISTORY_LIMIT)

          writeLocalTxs(merged)
          return merged
        })
      })
      .finally(() => setChainLoading(false))
  }, [walletAddress])

  // Reset on wallet change
  useEffect(() => {
    return () => {
      fetchedRef.current = false
    }
  }, [walletAddress])

  const addTx = useCallback((tx: TxRecord) => {
    setTxs((prev) => {
      // Don't add duplicates
      if (prev.some((t) => t.signature === tx.signature)) return prev
      const next = [{ ...tx, source: 'local' as const }, ...prev].slice(0, TX_HISTORY_LIMIT)
      writeLocalTxs(next)
      return next
    })
  }, [])

  // ── Computed values ─────────────────────────────────────
  const totalReceivedUsdc = txs
    .filter((t) => t.type === 'receive' && t.token !== 'SOL')
    .reduce((s, t) => s + t.amountUsdc, 0)
  const totalReceivedSol = txs
    .filter((t) => t.type === 'receive' && t.token === 'SOL')
    .reduce((s, t) => s + t.amountUsdc, 0)
  const totalReceivedBrl = txs
    .filter((t) => t.type === 'receive')
    .reduce((s, t) => s + t.amountBrl, 0)
  const totalSentUsdc = txs
    .filter((t) => t.type === 'send' && t.token !== 'SOL')
    .reduce((s, t) => s + t.amountUsdc, 0)
  const totalSentSol = txs
    .filter((t) => t.type === 'send' && t.token === 'SOL')
    .reduce((s, t) => s + t.amountUsdc, 0)
  const totalSentBrl = txs
    .filter((t) => t.type === 'send')
    .reduce((s, t) => s + t.amountBrl, 0)

  // Compat
  const totalReceived = totalReceivedUsdc
  const totalSent = totalSentUsdc

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

  return {
    txs,
    grouped,
    addTx,
    chainLoading,
    totalReceived,
    totalSent,
    totalReceivedUsdc,
    totalReceivedSol,
    totalReceivedBrl,
    totalSentUsdc,
    totalSentSol,
    totalSentBrl,
  }
}

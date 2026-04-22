import { useEffect, useState } from 'react'
import { FALLBACK_BRL_PER_USDC, RATE_REFRESH_MS } from './constants'

interface PriceState {
  usdcPerBrl: number   // how many BRL per 1 USDC (inverse)
  brlPerUsdc: number   // BRL per 1 USDC
  solPriceBrl: number  // BRL per 1 SOL
  solPriceUsd: number  // USD per 1 SOL
  loading: boolean
  error: boolean
}

const FALLBACK_SOL_BRL = 870
const FALLBACK_SOL_USD = 170

export function useBrlUsdcRate(): PriceState {
  const [state, setState] = useState<PriceState>({
    usdcPerBrl: 1 / FALLBACK_BRL_PER_USDC,
    brlPerUsdc: FALLBACK_BRL_PER_USDC,
    solPriceBrl: FALLBACK_SOL_BRL,
    solPriceUsd: FALLBACK_SOL_USD,
    loading: true,
    error: false,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchRate() {
      try {
        const res = await fetch('/api/rate', { cache: 'no-store' })
        if (!res.ok) throw new Error('bad response')
        const data = await res.json()

        const brlPerUsdc: number =
          data?.rate ?? data['usd-coin']?.brl ?? FALLBACK_BRL_PER_USDC
        const solPriceBrl: number = data?.solPriceBrl ?? FALLBACK_SOL_BRL
        const solPriceUsd: number = data?.solPrice ?? data?.solPriceUsd ?? FALLBACK_SOL_USD

        if (!cancelled) {
          setState({
            brlPerUsdc,
            usdcPerBrl: 1 / brlPerUsdc,
            solPriceBrl,
            solPriceUsd,
            loading: false,
            error: false,
          })
        }
      } catch {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: true }))
        }
      }
    }

    fetchRate()
    const id = setInterval(fetchRate, RATE_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return state
}

// ── Utility functions ───────────────────────────────────────

export function brlToUsdc(brl: number, brlPerUsdc: number): string {
  if (!brl || !brlPerUsdc) return '0.00'
  return (brl / brlPerUsdc).toFixed(2)
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

export function shortenAddress(addr: string): string {
  if (addr.length <= 10) return addr
  return addr.slice(0, 4) + '...' + addr.slice(-4)
}

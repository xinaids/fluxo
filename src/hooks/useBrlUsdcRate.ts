import { useEffect, useState } from 'react'

interface PriceState {
  usdcPerBrl: number   // how many BRL per 1 USDC
  brlPerUsdc: number   // inverse
  loading: boolean
  error: boolean
}

// Fetches USD/BRL from public CoinGecko endpoint (no key needed)
// Falls back to a hardcoded rate if the fetch fails
const FALLBACK_BRL_PER_USDC = 5.85

export function useBrlUsdcRate(): PriceState {
  const [state, setState] = useState<PriceState>({
    usdcPerBrl: 1 / FALLBACK_BRL_PER_USDC,
    brlPerUsdc: FALLBACK_BRL_PER_USDC,
    loading: true,
    error: false,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchRate() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl',
          { cache: 'no-store' }
        )
        if (!res.ok) throw new Error('bad response')
        const data = await res.json()
        const brlPerUsdc: number = data['usd-coin']?.brl ?? FALLBACK_BRL_PER_USDC
        if (!cancelled) {
          setState({
            brlPerUsdc,
            usdcPerBrl: 1 / brlPerUsdc,
            loading: false,
            error: false,
          })
        }
      } catch {
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error: true }))
        }
      }
    }

    fetchRate()
    const id = setInterval(fetchRate, 60_000) // refresh every minute
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return state
}

// Utility: convert BRL amount to USDC string
export function brlToUsdc(brl: number, brlPerUsdc: number): string {
  if (!brl || !brlPerUsdc) return '0.00'
  return (brl / brlPerUsdc).toFixed(2)
}

// Utility: format BRL
export function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

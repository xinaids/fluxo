import { NextRequest, NextResponse } from 'next/server'

const rateMap = new Map<string, { count: number; reset: number }>()
const LIMIT = 30
const WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > LIMIT
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,solana&vs_currencies=brl,usd',
      { next: { revalidate: 60 } }
    )
    const data = await res.json()

    const rate = data['usd-coin']?.brl ?? 5.85
    const solPriceBrl = data['solana']?.brl ?? 870
    const solPrice = data['solana']?.usd ?? 170

    return NextResponse.json({ rate, solPriceBrl, solPrice })
  } catch {
    return NextResponse.json({ rate: 5.85, solPriceBrl: 870, solPrice: 170 })
  }
}

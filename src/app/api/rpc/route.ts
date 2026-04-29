import { NextRequest, NextResponse } from 'next/server'

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com'

const rateMap = new Map<string, { count: number; reset: number }>()
const LIMIT = 60
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

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

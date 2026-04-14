import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl',
      { next: { revalidate: 60 } }
    )
    const data = await res.json()
    const rate = data['usd-coin']?.brl ?? 5.85
    return NextResponse.json({ rate })
  } catch {
    return NextResponse.json({ rate: 5.85 })
  }
}

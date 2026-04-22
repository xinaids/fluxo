import { NextResponse } from 'next/server'

export async function GET() {
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

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PublicKey, Keypair } from '@solana/web3.js'
import { encodeURL } from '@solana/pay'
import BigNumber from 'bignumber.js'
import { QRCodeSVG } from 'qrcode.react'

const RESERVED = ["cobrar", "extrato", "carteira", "pay", "onboarding", "api", "admin", "fluxo"]

const PROFILES: Record<string, { wallet: string; name: string; bio?: string }> = {
  mateus: {
    wallet: 'DHG4p1tKiXuQS2oYUMAnxR1P4YDgzGdkQfzJZfYoRnNV',
    name: 'Mateus',
    bio: 'Desenvolvedor Solana',
  },
}

const USDC_DEVNET  = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const USDC_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const IS_MAINNET   = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet'

async function fetchRate(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl',
      { cache: 'no-store' }
    )
    const data = await res.json()
    return data['usd-coin']?.brl ?? 5.85
  } catch {
    return 5.85
  }
}

function buildQR(wallet: string, amountBrl: number, rate: number, label: string): string {
  const recipient = new PublicKey(wallet)
  const reference = Keypair.generate().publicKey
  const splToken  = IS_MAINNET ? USDC_MAINNET : USDC_DEVNET
  const amountUsdc = new BigNumber(amountBrl).dividedBy(rate).decimalPlaces(2)

  const url = encodeURL({
    recipient,
    amount: amountUsdc,
    splToken,
    reference,
    label: 'Fluxo',
    message: label,
    memo: 'fluxo:profile',
  })

  return url.toString()
}

export default function ProfilePage() {
  const params = useParams()
  const username = (params?.username as string) || ''
  const profile  = PROFILES[username.toLowerCase()]

  if (RESERVED.includes(username.toLowerCase())) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-4">
        <p className="text-base font-medium text-gray-900">Nome reservado</p>
        <p className="text-sm text-gray-400">@{username} nao esta disponivel.</p>
      </div>
    )
  }

  const [amount, setAmount]   = useState('')
  const [message, setMessage] = useState('')
  const [qrUrl, setQrUrl]     = useState('')
  const [rate, setRate]       = useState(5.85)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    fetchRate().then(setRate)
  }, [])

  function handleGenerate() {
    if (!profile) return
    const brl = parseFloat(amount.replace(',', '.'))
    if (isNaN(brl) || brl <= 0) return
    setLoading(true)
    const url = buildQR(profile.wallet, brl, rate, message || 'Pagamento Fluxo')
    setQrUrl(url)
    setLoading(false)
  }

  async function handleShare() {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const brl  = parseFloat(amount.replace(',', '.'))
    const url  = brl > 0
      ? base + '/pay?to=' + profile!.wallet + '&amount=' + brl + (message ? '&label=' + encodeURIComponent(message) : '')
      : base + '/@' + username

    if (navigator.share) {
      await navigator.share({ title: 'Pague via Fluxo', url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400">
          ?
        </div>
        <p className="text-base font-medium text-gray-900">Perfil nao encontrado</p>
        <p className="text-sm text-gray-400">@{username} nao existe no Fluxo ainda.</p>
      </div>
    )
  }

  const initials = profile.name.slice(0, 2).toUpperCase()
  const brlValue = parseFloat(amount.replace(',', '.')) || 0
  const usdcPreview = brlValue > 0 ? (brlValue / rate).toFixed(2) : null

  return (
    <div className="flex flex-col min-h-screen max-w-sm mx-auto px-6 pt-10 pb-8">

      <div className="flex items-center gap-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center text-white text-xs font-bold">
          F
        </div>
        <span className="text-sm font-medium text-gray-900">Fluxo</span>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-3xl bg-black flex items-center justify-center text-white text-2xl font-semibold mb-3">
          {initials}
        </div>
        <h1 className="text-xl font-semibold text-gray-900">{profile.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">@{username}</p>
        {profile.bio && (
          <p className="text-sm text-gray-500 mt-2 text-center">{profile.bio}</p>
        )}
      </div>

      {!qrUrl ? (
        <div className="flex flex-col gap-3">
          <div className="text-center mb-2">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
              Quanto voce quer pagar?
            </p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl text-gray-300 font-light">R$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="text-4xl font-semibold w-40 text-center bg-transparent outline-none text-gray-900 placeholder-gray-200"
              />
            </div>
            {usdcPreview && (
              <p className="text-sm text-gray-400 mt-1">aprox. {usdcPreview} USDC</p>
            )}
          </div>

          <input
            type="text"
            placeholder="Mensagem (opcional)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full px-4 py-3 bg-white rounded-2xl text-sm outline-none border border-gray-100 text-gray-700 placeholder-gray-300"
          />

          <button
            onClick={handleGenerate}
            disabled={brlValue <= 0 || loading}
            className="w-full py-4 bg-black text-white rounded-2xl font-medium text-sm disabled:opacity-20"
          >
            Gerar QR para pagar
          </button>

          <button
            onClick={handleShare}
            className="w-full py-3 border border-gray-200 rounded-2xl text-sm text-gray-500"
          >
            {copied ? 'Link copiado!' : 'Compartilhar perfil'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-semibold text-gray-900">
              R$ {brlValue.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">
              aprox. {(brlValue / rate).toFixed(2)} USDC para {profile.name}
            </p>
            {message && <p className="text-sm text-gray-500 mt-1">"{message}"</p>}
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100">
            <QRCodeSVG value={qrUrl} size={200} level="M" />
          </div>

          <p className="text-xs text-gray-400">
            Escaneie com Phantom, Solflare ou Backpack
          </p>

          <div className="flex gap-3 w-full">
            <button
              onClick={handleShare}
              className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-medium"
            >
              {copied ? 'Copiado!' : 'Compartilhar'}
            </button>
            <button
              onClick={() => { setQrUrl(''); setAmount(''); setMessage('') }}
              className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500"
            >
              Novo valor
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-center text-gray-300 mt-8">
        Pagamentos via Solana - sem banco - sem taxas
      </p>
    </div>
  )
}

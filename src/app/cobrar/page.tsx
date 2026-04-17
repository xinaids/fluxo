'use client'

import { useState, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { QRCodeSVG } from 'qrcode.react'
import { useFluxoPayment, FluxoOrder } from '@/hooks/useFluxoPayment'
import { useBrlUsdcRate, formatBrl } from '@/hooks/useBrlUsdcRate'
import { useTxHistory } from '@/hooks/useTxHistory'
import { ClientWalletButton } from '@/components/ui/ClientWalletButton'

type Stage = 'input' | 'qr' | 'confirmed'
type Token = 'USDC' | 'SOL'

const SOL_PRICE_BRL = 870

async function fetchSolPrice(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=brl',
      { cache: 'no-store' }
    )
    const data = await res.json()
    return data['solana']?.brl ?? SOL_PRICE_BRL
  } catch {
    return SOL_PRICE_BRL
  }
}

export default function CobrarPage() {
  const { publicKey } = useWallet()
  const { createOrder, watchPayment, status } = useFluxoPayment()
  const { brlPerUsdc, loading: rateLoading } = useBrlUsdcRate()
  const { addTx } = useTxHistory()

  const [stage, setStage] = useState<Stage>('input')
  const [brlInput, setBrlInput] = useState('')
  const [description, setDescription] = useState('')
  const [token, setToken] = useState<Token>('USDC')
  const [solPrice, setSolPrice] = useState(SOL_PRICE_BRL)
  const [order, setOrder] = useState<FluxoOrder | null>(null)
  const [confirmedSig, setConfirmedSig] = useState('')
  const cleanupRef = useRef<(() => void) | null>(null)

  const brlValue = parseFloat(brlInput.replace(',', '.')) || 0

  const tokenPreview = token === 'USDC'
    ? (brlValue / brlPerUsdc).toFixed(2) + ' USDC'
    : (brlValue / solPrice).toFixed(4) + ' SOL'

  async function handleGenerate() {
    if (!publicKey || brlValue <= 0) return

    const rate = token === 'SOL' ? await fetchSolPrice() : null
    if (token === 'SOL') setSolPrice(rate!)

    const newOrder = createOrder({
      recipientAddress: publicKey.toBase58(),
      amountBrl: brlValue,
      usdcPerBrl: token === 'USDC' ? brlPerUsdc : (rate ?? solPrice),
      label: 'Fluxo',
      message: description || 'Cobranca Fluxo',
      network: 'devnet',
      token,
    })

    setOrder(newOrder)
    setStage('qr')

    const cleanup = watchPayment(newOrder, (sig) => {
      addTx({
        id: newOrder.id,
        type: 'receive',
        amountUsdc: parseFloat(newOrder.amountUsdc.toFixed(token === 'USDC' ? 2 : 6)),
        amountBrl: brlValue,
        label: description || 'Cobranca',
        signature: sig,
        timestamp: Date.now(),
        token,
      })
      setConfirmedSig(sig)
      setStage('confirmed')
    }, publicKey.toBase58())
    cleanupRef.current = cleanup
  }

  function handleReset() {
    cleanupRef.current?.()
    setStage('input')
    setOrder(null)
    setBrlInput('')
    setDescription('')
    setConfirmedSig('')
  }

  async function handleShare() {
    if (!publicKey || !order) return
    const base = window.location.origin
    const url = base + "/pay?to=" + publicKey.toBase58() +
      "&amount=" + brlValue +
      "&ref=" + order.reference.toBase58() +
      (description ? "&label=" + encodeURIComponent(description) : "")
    try {
      await navigator.clipboard.writeText(url)
      alert("Link copiado: " + url)
    } catch {
      prompt("Copie o link:", url)
    }
  }











  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            F
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Fluxo</h1>
          <p className="text-gray-400 text-sm">Receba pagamentos em crypto.<br/>Sem banco. Sem fronteiras.</p>
        </div>
        <ClientWalletButton />
        <p className="text-xs text-gray-300 text-center">
          Phantom - Solflare - qualquer wallet Solana
        </p>
      </div>
    )
  }

  if (stage === 'confirmed') {
    return (
      <div className="flex flex-col items-center gap-5 pt-12 px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-3xl font-bold text-emerald-500">
          OK
        </div>
        <div className="text-center">
          <p className="text-2xl font-semibold text-gray-900">{formatBrl(brlValue)}</p>
          <p className="text-gray-400 text-sm mt-1">{tokenPreview} recebido</p>
          {description && <p className="text-gray-500 text-sm mt-1">"{description}"</p>}
        </div>
        <p className="text-xs text-gray-400 break-all text-center px-4">
          tx: {confirmedSig.slice(0, 20)}...
        </p>
        <button
          onClick={handleReset}
          className="w-full max-w-sm py-4 bg-black text-white rounded-2xl font-medium text-sm mt-2"
        >
          Nova cobranca
        </button>
      </div>
    )
  }

  if (stage === 'qr' && order) {
    return (
      <div className="flex flex-col items-center gap-4 pt-6 px-6">
        <div className="text-center">
          <p className="text-3xl font-semibold text-gray-900">{formatBrl(brlValue)}</p>
          <p className="text-sm text-gray-400 mt-0.5">aprox. {tokenPreview}</p>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <QRCodeSVG value={order.url.toString()} size={200} level="M" />
        </div>
        <p className="text-xs text-gray-400">Escaneie com Phantom, Solflare ou Backpack</p>
        {status === 'pending' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
            <span className="text-sm text-amber-700">Aguardando pagamento...</span>
          </div>
        )}
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={handleShare}
            className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-medium"
          >
            Compartilhar
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500 bg-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pt-8 px-6 max-w-sm mx-auto">
      <div className="text-center mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
          Valor a cobrar
        </p>
        <div className="flex items-center justify-center gap-1">
          <span className="text-3xl text-gray-300 font-light">R$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0,00"
            value={brlInput}
            onChange={e => setBrlInput(e.target.value)}
            className="text-5xl font-semibold w-44 text-center bg-transparent outline-none text-gray-900 placeholder-gray-200"
          />
        </div>
        {brlValue > 0 && !rateLoading && (
          <p className="text-sm text-gray-400 mt-2">aprox. {tokenPreview}</p>
        )}
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
        {(['USDC', 'SOL'] as Token[]).map(t => (
          <button
            key={t}
            onClick={() => setToken(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              token === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400'
            }`}
          >
            {t === 'USDC' ? 'USDC (dolar)' : 'SOL (solana)'}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Descricao (ex: consulta, freela, jantar)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="w-full px-4 py-3 bg-white rounded-2xl text-sm outline-none border border-gray-100 text-gray-700 placeholder-gray-300"
      />

      <button
        onClick={handleGenerate}
        disabled={brlValue <= 0}
        className="w-full py-4 bg-black text-white rounded-2xl font-medium text-sm disabled:opacity-20"
      >
        Gerar QR Code
      </button>

      <p className="text-xs text-center text-gray-300 mt-1">
        Receba em crypto direto na sua carteira - sem banco - sem taxas
      </p>
    </div>
  )
}

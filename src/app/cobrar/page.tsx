'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { QRCodeSVG } from 'qrcode.react'
import { useFluxoPayment, FluxoOrder } from '@/hooks/useFluxoPayment'
import { useBrlUsdcRate, brlToUsdc, formatBrl } from '@/hooks/useBrlUsdcRate'
import { useTxHistory } from '@/hooks/useTxHistory'

type Stage = 'input' | 'qr' | 'confirmed'

export default function CobrarPage() {
  const { publicKey } = useWallet()
  const { createOrder, watchPayment, status } = useFluxoPayment()
  const { brlPerUsdc, loading: rateLoading } = useBrlUsdcRate()
  const { addTx } = useTxHistory()

  const [stage, setStage] = useState<Stage>('input')
  const [brlInput, setBrlInput] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState<FluxoOrder | null>(null)
  const [confirmedSig, setConfirmedSig] = useState('')
  const cleanupRef = useRef<(() => void) | null>(null)

  const brlValue = parseFloat(brlInput.replace(',', '.')) || 0
  const usdcPreview = brlToUsdc(brlValue, brlPerUsdc)

  function handleGenerate() {
    if (!publicKey || brlValue <= 0) return

    const newOrder = createOrder({
      recipientAddress: publicKey.toBase58(),
      amountBrl: brlValue,
      usdcPerBrl: 1 / brlPerUsdc,
      label: 'Fluxo',
      message: description || `Cobrança R$${brlValue}`,
      network: 'devnet',
    })

    setOrder(newOrder)
    setStage('qr')

    const cleanup = watchPayment(newOrder, (sig) => {
      addTx({
        id: newOrder.id,
        type: 'receive',
        amountUsdc: parseFloat(newOrder.amountUsdc.toFixed(2)),
        amountBrl: brlValue,
        label: description || `Cobrança`,
        signature: sig,
        timestamp: Date.now(),
      })
      setConfirmedSig(sig)
      setStage('confirmed')
    })

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
    if (!order) return
    const text = `Pague via Fluxo:\n${order.url.toString()}`
    if (navigator.share) {
      await navigator.share({ title: 'Cobrança Fluxo', text })
    } else {
      await navigator.clipboard.writeText(order.url.toString())
      alert('Link copiado!')
    }
  }

  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 text-sm">Conecte sua carteira para cobrar</p>
        <WalletMultiButton />
      </div>
    )
  }

  if (stage === 'confirmed') {
    return (
      <div className="flex flex-col items-center gap-6 pt-8 px-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">
          ✓
        </div>
        <div className="text-center">
          <p className="text-xl font-medium text-gray-900">Pagamento recebido</p>
          <p className="text-gray-500 text-sm mt-1">{formatBrl(brlValue)} · {usdcPreview} USDC</p>
        </div>
        <a
          href={`https://solscan.io/tx/${confirmedSig}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 underline"
        >
          Ver na blockchain
        </a>
        <button
          onClick={handleReset}
          className="w-full max-w-sm py-3 bg-black text-white rounded-xl font-medium"
        >
          Nova cobrança
        </button>
      </div>
    )
  }

  if (stage === 'qr' && order) {
    return (
      <div className="flex flex-col items-center gap-4 pt-6 px-4">
        <div className="text-center mb-2">
          <p className="text-2xl font-semibold">{formatBrl(brlValue)}</p>
          <p className="text-sm text-gray-400">≈ {usdcPreview} USDC</p>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100">
          <QRCodeSVG
            value={order.url.toString()}
            size={220}
            level="M"
            includeMargin={false}
          />
        </div>

        <p className="text-xs text-gray-400 text-center">
          Escaneie com Phantom, Solflare ou Backpack
        </p>

        {status === 'pending' && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Aguardando pagamento...
          </div>
        )}

        <div className="flex gap-3 w-full max-w-sm mt-2">
          <button
            onClick={handleShare}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium"
          >
            Compartilhar
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-500"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // Stage: input
  return (
    <div className="flex flex-col gap-5 pt-6 px-4 max-w-sm mx-auto">
      <div className="text-center">
        <label className="text-xs text-gray-400 uppercase tracking-widest">
          Valor a cobrar
        </label>
        <div className="flex items-center justify-center gap-1 mt-2">
          <span className="text-2xl text-gray-400 font-light">R$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0,00"
            value={brlInput}
            onChange={e => setBrlInput(e.target.value)}
            className="text-4xl font-semibold w-40 text-center bg-transparent outline-none"
          />
        </div>
        {brlValue > 0 && !rateLoading && (
          <p className="text-sm text-gray-400 mt-1">≈ {usdcPreview} USDC</p>
        )}
      </div>

      <input
        type="text"
        placeholder="Descrição (ex: consulta, freela, jantar)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none border border-gray-100"
      />

      <button
        onClick={handleGenerate}
        disabled={brlValue <= 0}
        className="w-full py-4 bg-black text-white rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Gerar QR Code
      </button>

      <p className="text-xs text-center text-gray-400">
        Receba em USDC direto na sua carteira · sem banco · sem taxas
      </p>
    </div>
  )
}

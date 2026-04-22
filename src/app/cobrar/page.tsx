'use client'

import { useState, useRef, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { QRCodeSVG } from 'qrcode.react'
import { useFluxoPayment, FluxoOrder } from '@/hooks/useFluxoPayment'
import { useBrlUsdcRate, formatBrl } from '@/hooks/useBrlUsdcRate'
import { useTxHistory } from '@/hooks/useTxHistory'
import { useLanguage } from '@/i18n/LanguageContext'
import { explorerUrl } from '@/hooks/constants'
import { FluxoLogo } from '@/components/ui/FluxoLogo'
import { ClientWalletButton } from '@/components/ui/ClientWalletButton'

type Stage = 'input' | 'qr' | 'confirmed'
type Token = 'USDC' | 'SOL'

export default function CobrarPage() {
  const { publicKey } = useWallet()
  const { createOrder, watchPayment, status, reset } = useFluxoPayment()
  const { brlPerUsdc, solPriceBrl, loading: rateLoading } = useBrlUsdcRate()
  const { addTx } = useTxHistory(publicKey?.toBase58())

  const { t } = useLanguage()
  const [stage, setStage] = useState<Stage>('input')
  const [brlInput, setBrlInput] = useState('')
  const [description, setDescription] = useState('')
  const [token, setToken] = useState<Token>('USDC')
  const [order, setOrder] = useState<FluxoOrder | null>(null)
  const [confirmedSig, setConfirmedSig] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [copied, setCopied] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const cleanupRef = useRef<(() => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const brlValue = parseFloat(brlInput.replace(',', '.')) || 0

  const effectiveRate = token === 'USDC' ? brlPerUsdc : solPriceBrl
  const tokenPreview =
    token === 'USDC'
      ? (brlValue / brlPerUsdc).toFixed(2) + ' USDC'
      : (brlValue / solPriceBrl).toFixed(4) + ' SOL'

  // Elapsed time counter while waiting
  useEffect(() => {
    if (stage === 'qr') {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stage])

  function handleGenerate() {
    if (!publicKey || brlValue <= 0) return

    const newOrder = createOrder({
      recipientAddress: publicKey.toBase58(),
      amountBrl: brlValue,
      usdcPerBrl: effectiveRate,
      label: 'Fluxo',
      message: description || 'Cobranca Fluxo',
      token,
    })

    setOrder(newOrder)
    setStage('qr')

    const cleanup = watchPayment(
      newOrder,
      (sig) => {
        addTx({
          id: newOrder.id,
          type: 'receive',
          amountUsdc: parseFloat(newOrder.amountUsdc.toFixed(token === 'USDC' ? 2 : 6)),
          amountBrl: brlValue,
          label: description || 'Cobranca',
          signature: sig,
          timestamp: Date.now(),
          token,
          source: 'local',
        })
        setConfirmedSig(sig)
        setShowConfetti(true)
        setStage('confirmed')
        setTimeout(() => setShowConfetti(false), 3000)
      },
      publicKey.toBase58()
    )
    cleanupRef.current = cleanup
  }

  function handleReset() {
    cleanupRef.current?.()
    reset()
    setStage('input')
    setOrder(null)
    setBrlInput('')
    setDescription('')
    setConfirmedSig('')
    setShowConfetti(false)
  }

  async function handleShare() {
    if (!publicKey || !order) return
    const base = window.location.origin
    const url =
      base +
      '/pay?to=' +
      publicKey.toBase58() +
      '&amount=' +
      brlValue +
      '&ref=' +
      order.reference.toBase58() +
      (description ? '&label=' + encodeURIComponent(description) : '')

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Cobrança Fluxo',
          text: `Pague ${formatBrl(brlValue)} via Fluxo`,
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        prompt('Copie o link:', url)
      }
    }
  }

  function formatElapsed(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`
  }

  // ── Not connected ─────────────────────────────────────────
  if (!publicKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
        <div className="text-center">
          <FluxoLogo size={64} className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Fluxo</h1>
          <p className="text-gray-400 text-sm">
            {t.cobrar_connect_desc.split("\n")[0]}
            <br />
            {t.cobrar_connect_desc.split("\n")[1]}
          </p>
        </div>
        <ClientWalletButton />
        <p className="text-xs text-gray-300 text-center">
          {t.cobrar_connect_wallets}
        </p>
      </div>
    )
  }

  // ── Confirmed ─────────────────────────────────────────────
  if (stage === 'confirmed') {
    return (
      <div className="flex flex-col items-center gap-5 pt-12 px-6 relative overflow-hidden">
        {/* Confetti animation */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                  backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][
                    i % 5
                  ],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 1}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}

        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
          <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-sm text-emerald-600 font-medium mb-1">{t.cobrar_confirmed}</p>
          <p className="text-3xl font-semibold text-gray-900">{formatBrl(brlValue)}</p>
          <p className="text-gray-400 text-sm mt-1">{tokenPreview}</p>
          {description && (
            <p className="text-gray-500 text-sm mt-1">&ldquo;{description}&rdquo;</p>
          )}
        </div>

        <a
          href={explorerUrl(confirmedSig)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline break-all text-center px-4"
        >
          {t.cobrar_explorer} ↗
        </a>

        <p className="text-xs text-gray-300 break-all text-center px-4">
          {confirmedSig.slice(0, 32)}...
        </p>

        <button
          onClick={handleReset}
          className="w-full max-w-sm py-4 bg-black text-white rounded-2xl font-medium text-sm mt-2"
        >
          {t.cobrar_new}
        </button>
      </div>
    )
  }

  // ── QR Code ───────────────────────────────────────────────
  if (stage === 'qr' && order) {
    return (
      <div className="flex flex-col items-center gap-4 pt-6 px-6">
        <div className="text-center">
          <p className="text-3xl font-semibold text-gray-900">{formatBrl(brlValue)}</p>
          <p className="text-sm text-gray-400 mt-0.5">≈ {tokenPreview}</p>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <QRCodeSVG value={order.url.toString()} size={200} level="M" />
        </div>

        <p className="text-xs text-gray-400">{t.cobrar_scan}</p>

        {status === 'pending' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="text-sm text-amber-700">
              {t.cobrar_waiting}{' '}
              <span className="text-amber-500 font-mono text-xs">{formatElapsed(elapsed)}</span>
            </span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            <span className="text-sm text-red-600">{t.cobrar_expired}</span>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={handleShare}
            className="flex-1 py-3 bg-black text-white rounded-2xl text-sm font-medium"
          >
            {copied ? '{t.cobrar_copied}' : '{t.cobrar_share}'}
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-3 border border-gray-200 rounded-2xl text-sm text-gray-500 bg-white"
          >
            {t.cobrar_cancel}
          </button>
        </div>
      </div>
    )
  }

  // ── Input ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pt-8 px-6 max-w-sm mx-auto">
      <div className="text-center mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">
          {t.cobrar_title}
        </p>
        <div className="flex items-center justify-center gap-1">
          <span className="text-3xl text-gray-300 font-light">R$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0,00"
            value={brlInput}
            onChange={(e) => setBrlInput(e.target.value)}
            className="text-5xl font-semibold w-44 text-center bg-transparent outline-none text-gray-900 placeholder-gray-200"
          />
        </div>
        {brlValue > 0 && !rateLoading && (
          <p className="text-sm text-gray-400 mt-2">≈ {tokenPreview}</p>
        )}
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
        {(['USDC', 'SOL'] as Token[]).map((tok) => (
          <button
            key={tok}
            onClick={() => setToken(tok)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              token === tok ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            {tok === 'USDC' ? t.cobrar_usdc : t.cobrar_sol}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder={t.cobrar_desc_placeholder}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-4 py-3 bg-white rounded-2xl text-sm outline-none border border-gray-100 text-gray-700 placeholder-gray-300"
      />

      <button
        onClick={handleGenerate}
        disabled={brlValue <= 0}
        className="w-full py-4 bg-black text-white rounded-2xl font-medium text-sm disabled:opacity-20 active:scale-[0.98] transition-transform"
      >
        {t.cobrar_generate}
      </button>

      <p className="text-xs text-center text-gray-300 mt-1">
        {t.cobrar_footer}
      </p>
    </div>
  )
}

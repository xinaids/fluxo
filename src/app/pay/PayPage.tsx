'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { PublicKey, Keypair, Connection, Transaction } from '@solana/web3.js'
import { createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token'
import { encodeURL } from '@solana/pay'
import BigNumber from 'bignumber.js'
import { QRCodeSVG } from 'qrcode.react'
import { FluxoLogo } from '@/components/ui/FluxoLogo'
import { useTxHistory } from '@/hooks/useTxHistory'
import { USDC_MINT, IS_MAINNET, explorerUrl } from '@/hooks/constants'

const RPC = process.env.NEXT_PUBLIC_RPC_URL || (IS_MAINNET
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com')

type Status = 'loading' | 'ready' | 'waiting' | 'paying' | 'confirmed' | 'error'

async function fetchUsdcRate(): Promise<number> {
  try {
    const res = await fetch('/api/rate', { cache: 'no-store' })
    const data = await res.json()
    return data.rate ?? 5.85
  } catch {
    return 5.85
  }
}

function playConfirmationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)
    setTimeout(() => ctx.close(), 500)
  } catch {}
}

export default function PayPage() {
  const params = useSearchParams()
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [amountUsdc, setAmountUsdc] = useState('')
  const [amountBrl, setAmountBrl] = useState<number | null>(null)
  const [label, setLabel] = useState('')
  const [recipientShort, setRecipientShort] = useState('')
  const [confirmedSig, setConfirmedSig] = useState('')
  const [phantomInstalled, setPhantomInstalled] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const { addTx } = useTxHistory()
  const referenceRef = useRef<PublicKey | null>(null)
  const recipientRef = useRef<PublicKey | null>(null)
  const amountUsdcRef = useRef<BigNumber | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setPhantomInstalled(!!(window as any).solana?.isPhantom)
  }, [])

  // Elapsed timer
  useEffect(() => {
    if (status === 'waiting') {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [status])

  useEffect(() => {
    async function build() {
      const to = params.get('to')
      const amount = params.get('amount')
      const lbl = params.get('label') || ''
      const currency = params.get('currency') || 'brl'

      if (!to) { setError('Endereço não informado.'); setStatus('error'); return }

      let recipient: PublicKey
      try { recipient = new PublicKey(to) }
      catch { setError('Endereço inválido.'); setStatus('error'); return }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        setError('Valor inválido.'); setStatus('error'); return
      }

      const num = parseFloat(amount)
      const refParam = params.get('ref')
      const reference = refParam ? new PublicKey(refParam) : Keypair.generate().publicKey
      referenceRef.current = reference
      recipientRef.current = recipient

      let usdc: BigNumber
      if (currency === 'usdc') {
        usdc = new BigNumber(num).decimalPlaces(2)
      } else {
        const rate = await fetchUsdcRate()
        setAmountBrl(num)
        usdc = new BigNumber(num).dividedBy(rate).decimalPlaces(2)
      }

      amountUsdcRef.current = usdc

      const url = encodeURL({
        recipient,
        amount: usdc,
        splToken: USDC_MINT,
        reference,
        label: 'Fluxo',
        message: lbl || 'Pagamento via Fluxo',
        memo: 'fluxo:pay',
      })

      setAmountUsdc(usdc.toFixed(2))
      setLabel(lbl)
      setRecipientShort(to.slice(0, 4) + '...' + to.slice(-4))
      setQrUrl(url.toString())
      setStatus('ready')
    }
    build()
  }, [params])

  function onPaymentConfirmed(signature: string) {
    setConfirmedSig(signature)
    setShowConfetti(true)
    setStatus('confirmed')
    playConfirmationSound()
    try { if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]) } catch {}
    setTimeout(() => setShowConfetti(false), 3000)
  }

  function startPolling() {
    if (!referenceRef.current) return
    setStatus('waiting')
    const conn = new Connection(RPC, 'confirmed')
    const ref = referenceRef.current
    const deadline = Date.now() + 10 * 60 * 1000

    pollingRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(pollingRef.current!)
        setStatus('ready')
        return
      }
      try {
        const sigs = await conn.getSignaturesForAddress(ref, { limit: 1 }, 'confirmed')
        if (sigs.length > 0) {
          clearInterval(pollingRef.current!)
          onPaymentConfirmed(sigs[0].signature)
          const rate = await fetchUsdcRate()
          addTx({
            id: sigs[0].signature,
            type: 'receive',
            amountUsdc: amountUsdcRef.current!.toNumber(),
            amountBrl: amountUsdcRef.current!.toNumber() * rate,
            label: label || 'Pagamento recebido',
            signature: sigs[0].signature,
            timestamp: Date.now(),
            source: 'local',
          })
        }
      } catch {}
    }, 2000)
  }

  async function handlePayWithPhantom() {
    const phantom = (window as any).solana
    if (!phantom || !recipientRef.current || !amountUsdcRef.current) return

    try {
      setStatus('paying')
      await phantom.connect()
      const payerPubkey = phantom.publicKey as PublicKey
      const conn = new Connection(RPC, 'confirmed')
      const reference = referenceRef.current!
      const recipient = recipientRef.current
      const amount = amountUsdcRef.current

      const payerAta = await getAssociatedTokenAddress(USDC_MINT, payerPubkey)
      const recipientAta = await getAssociatedTokenAddress(USDC_MINT, recipient)

      const { blockhash } = await conn.getLatestBlockhash()
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: payerPubkey })

      const recipientAtaInfo = await conn.getAccountInfo(recipientAta)
      if (!recipientAtaInfo) {
        const { createAssociatedTokenAccountInstruction } = await import('@solana/spl-token')
        tx.add(createAssociatedTokenAccountInstruction(payerPubkey, recipientAta, recipient, USDC_MINT))
      }

      const transferIx = createTransferCheckedInstruction(
        payerAta,
        USDC_MINT,
        recipientAta,
        payerPubkey,
        BigInt(Math.round(amount.toNumber() * 1_000_000)),
        6
      )
      transferIx.keys.push({
        pubkey: reference,
        isSigner: false,
        isWritable: false,
      })
      tx.add(transferIx)

      const { signature } = await phantom.signAndSendTransaction(tx)
      await conn.confirmTransaction(signature, 'confirmed')

      onPaymentConfirmed(signature)
      const rate = await fetchUsdcRate()
      addTx({
        id: signature,
        type: 'send',
        amountUsdc: amountUsdcRef.current!.toNumber(),
        amountBrl: amountUsdcRef.current!.toNumber() * rate,
        label: label || 'Pagamento enviado',
        counterparty: recipientRef.current!.toBase58(),
        signature,
        timestamp: Date.now(),
        source: 'local',
      })
    } catch (e: any) {
      console.error('[Fluxo] Payment error:', e?.message)
      setError(e?.message || 'Erro ao processar pagamento.')
      setStatus('ready')
    }
  }

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  function formatElapsed(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`
  }

  // ── Loading ───────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Gerando cobrança...</p>
        </div>
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-base font-medium text-gray-900 mb-2">Erro</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  // ── Confirmed ─────────────────────────────────────────────
  if (status === 'confirmed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6 relative overflow-hidden">
        {/* Confetti */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                  backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 1}s`,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        )}

        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="text-center">
          <p className="text-sm text-emerald-600 font-medium mb-1">Pagamento confirmado!</p>
          <p className="text-3xl font-semibold text-gray-900">
            {amountBrl ? 'R$ ' + amountBrl.toFixed(2).replace('.', ',') : amountUsdc + ' USDC'}
          </p>
          <p className="text-gray-400 text-sm mt-1">{amountUsdc} USDC</p>
          {label && <p className="text-gray-500 text-sm mt-1">&ldquo;{label}&rdquo;</p>}
        </div>

        {confirmedSig && (
          <>
            <a
              href={explorerUrl(confirmedSig)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              Ver no Explorer ↗
            </a>
            <p className="text-xs text-gray-300 break-all text-center px-4">
              {confirmedSig.slice(0, 32)}...
            </p>
          </>
        )}
      </div>
    )
  }

  // ── Ready / Waiting / Paying ──────────────────────────────
  return (
    <div className="flex flex-col min-h-screen px-6 pt-10 pb-8 max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <FluxoLogo size={28} showText />
      </div>

      <div className="text-center mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Você recebeu uma cobrança</p>
        {amountBrl ? (
          <>
            <p className="text-4xl font-semibold text-gray-900">
              R$ {amountBrl.toFixed(2).replace('.', ',')}
            </p>
            <p className="text-sm text-gray-400 mt-1">≈ {amountUsdc} USDC</p>
          </>
        ) : (
          <p className="text-4xl font-semibold text-gray-900">{amountUsdc} USDC</p>
        )}
        {label && <p className="text-sm text-gray-500 mt-2">&ldquo;{label}&rdquo;</p>}
        <p className="text-xs text-gray-300 mt-2">para {recipientShort}</p>
      </div>

      {phantomInstalled && (
        <button
          onClick={handlePayWithPhantom}
          disabled={status === 'paying' || status === 'waiting'}
          className="w-full py-4 bg-black text-white rounded-2xl font-medium text-sm mb-4 disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {status === 'paying' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processando...
            </span>
          ) : (
            'Pagar com Phantom'
          )}
        </button>
      )}

      {status === 'waiting' && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
          </span>
          <span className="text-sm text-amber-700">
            Aguardando confirmação...{' '}
            <span className="text-amber-500 font-mono text-xs">{formatElapsed(elapsed)}</span>
          </span>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 mb-4">
        <p className="text-xs text-gray-400">Ou escaneie com o celular</p>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
          <QRCodeSVG value={qrUrl} size={180} level="M" />
        </div>
        <p className="text-xs text-gray-300">Phantom · Solflare · Backpack</p>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Não tem carteira ainda?</p>
        <p className="text-xs text-gray-400 leading-relaxed mb-3">
          Baixe o Phantom, crie sua carteira em 2 minutos.
        </p>
        <a
          href="https://phantom.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center py-2.5 bg-black text-white rounded-xl text-xs font-medium active:scale-[0.98] transition-transform"
        >
          Baixar Phantom
        </a>
      </div>

      {status === 'ready' && (
        <button
          onClick={startPolling}
          className="w-full py-3 border border-gray-200 rounded-2xl text-sm text-gray-500 active:scale-[0.98] transition-transform"
        >
          Já paguei pelo celular
        </button>
      )}

      <p className="text-xs text-center text-gray-300 mt-4">
        Pagamento seguro via Solana · sem intermediários
      </p>
    </div>
  )
}

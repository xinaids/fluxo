'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { PublicKey, Keypair, Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { createTransferCheckedInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import { encodeURL } from '@solana/pay'
import BigNumber from 'bignumber.js'
import { QRCodeSVG } from 'qrcode.react'
import { useTxHistory } from '@/hooks/useTxHistory'

const USDC_MINT_DEVNET  = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const IS_MAINNET = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet'
const USDC_MINT  = IS_MAINNET ? USDC_MINT_MAINNET : USDC_MINT_DEVNET
const RPC = process.env.NEXT_PUBLIC_RPC_URL || (IS_MAINNET
  ? 'https://api.mainnet-beta.solana.com'
  : 'https://api.devnet.solana.com')

type Status = 'loading' | 'ready' | 'waiting' | 'paying' | 'confirmed' | 'error'

async function fetchUsdcRate(): Promise<number> {
  try {
    const res = await fetch(
      '/api/rate',
      { cache: 'no-store' }
    )
    const data = await res.json()
    return data.rate ?? 5.85
  } catch {
    return 5.85
  }
}

export default function PayPage() {
  const params = useSearchParams()
  const [status, setStatus]           = useState<Status>('loading')
  const [error, setError]             = useState('')
  const [qrUrl, setQrUrl]             = useState('')
  const [amountUsdc, setAmountUsdc]   = useState('')
  const [amountBrl, setAmountBrl]     = useState<number | null>(null)
  const [label, setLabel]             = useState('')
  const [recipientShort, setRecipientShort] = useState('')
  const [confirmedSig, setConfirmedSig]     = useState('')
  const [phantomInstalled, setPhantomInstalled] = useState(false)
  const { addTx } = useTxHistory()
  const referenceRef  = useRef<PublicKey | null>(null)
  const recipientRef  = useRef<PublicKey | null>(null)
  const amountUsdcRef = useRef<BigNumber | null>(null)
  const pollingRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setPhantomInstalled(!!(window as any).solana?.isPhantom)
  }, [])

  useEffect(() => {
    async function build() {
      const to       = params.get('to')
      const amount   = params.get('amount')
      const lbl      = params.get('label') || ''
      const currency = params.get('currency') || 'brl'

      if (!to) { setError('Endereco nao informado.'); setStatus('error'); return }

      let recipient: PublicKey
      try { recipient = new PublicKey(to) }
      catch { setError('Endereco invalido.'); setStatus('error'); return }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        setError('Valor invalido.'); setStatus('error'); return
      }

      const num = parseFloat(amount)
      const refParam = params.get('ref')
      const reference = refParam ? new PublicKey(refParam) : Keypair.generate().publicKey
      referenceRef.current  = reference
      recipientRef.current  = recipient

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

  function startPolling() {
    if (!referenceRef.current) return
    setStatus('waiting')
    const conn     = new Connection(RPC, 'confirmed')
    const ref      = referenceRef.current
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
          setConfirmedSig(sigs[0].signature)
          setStatus('confirmed')
          const rate = await fetchUsdcRate()
          addTx({
            id: sigs[0].signature,
            type: 'receive',
            amountUsdc: amountUsdcRef.current!.toNumber(),
            amountBrl: amountUsdcRef.current!.toNumber() * rate,
            label: label || 'Pagamento recebido',
            signature: sigs[0].signature,
            timestamp: Date.now(),
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
      const conn        = new Connection(RPC, 'confirmed')
      const reference   = referenceRef.current!
      const recipient   = recipientRef.current
      const amount      = amountUsdcRef.current

      const payerAta    = await getAssociatedTokenAddress(USDC_MINT, payerPubkey)
      const recipientAta = await getAssociatedTokenAddress(USDC_MINT, recipient)
      const payerAtaInfo = await conn.getAccountInfo(payerAta)
      console.log('[Fluxo] payerAta exists:', !!payerAtaInfo)
      console.log('[Fluxo] reference:', reference.toBase58())
      const { blockhash } = await conn.getLatestBlockhash()
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: payerPubkey })
      const recipientAtaInfo = await conn.getAccountInfo(recipientAta)
      if (!recipientAtaInfo) {
        const { createAssociatedTokenAccountInstruction } = await import("@solana/spl-token")
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
      // Só adiciona reference se foi gerada localmente (não veio da URL)
      const refParam = new URLSearchParams(window.location.search).get('ref')
      if (!refParam) {
        transferIx.keys.push({
          pubkey: reference,
          isSigner: false,
          isWritable: false,
        })
      }
      tx.add(transferIx)

      const { signature } = await phantom.signAndSendTransaction(tx)
      await conn.confirmTransaction(signature, 'confirmed')

      setConfirmedSig(signature)
      setStatus('confirmed')
      const rate = await fetchUsdcRate()
      addTx({
        id: signature,
        type: 'send',
        amountUsdc: amountUsdcRef.current!.toNumber(),
        amountBrl: amountUsdcRef.current!.toNumber() * rate,
        label: label || 'Pagamento via Fluxo',
        counterparty: recipientRef.current!.toBase58(),
        signature,
        timestamp: Date.now(),
      })
    } catch (e: any) {
      console.error("FLUXO ERROR:", e?.message, "logs:", e?.logs, "full:", e)
      if (e?.message?.includes('0x1')) console.error("Saldo insuficiente")
      if (e?.message?.includes('0x4')) console.error("Token account nao encontrada")
      const errStr = JSON.stringify(e, Object.getOwnPropertyNames(e))
      console.error("FLUXO ERROR FULL:", errStr)
      setError(e?.message || 'Erro ao processar pagamento.')
      setStatus('ready')
    }
  }

  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Gerando cobranca...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-xs">
          <p className="text-base font-medium text-gray-900 mb-2">Erro</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-2xl font-bold text-emerald-500">
          OK
        </div>
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900">Pagamento confirmado!</p>
          <p className="text-sm text-gray-400 mt-1">
            {amountBrl ? 'R$ ' + amountBrl.toFixed(2).replace('.', ',') : amountUsdc + ' USDC'}
          </p>
          {label && <p className="text-sm text-gray-500 mt-1">"{label}"</p>}
        </div>
        {confirmedSig && (
          <a
            href={'https://solscan.io/tx/' + confirmedSig + '?cluster=' + (IS_MAINNET ? 'mainnet' : 'devnet')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 underline"
          >
            Ver transacao na blockchain
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pt-10 pb-8 max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center text-white text-xs font-bold">F</div>
        <span className="text-sm font-medium text-gray-900">Fluxo</span>
      </div>

      <div className="text-center mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Voce recebeu uma cobranca</p>
        {amountBrl ? (
          <>
            <p className="text-4xl font-semibold text-gray-900">R$ {amountBrl.toFixed(2).replace('.', ',')}</p>
            <p className="text-sm text-gray-400 mt-1">aprox. {amountUsdc} USDC</p>
          </>
        ) : (
          <p className="text-4xl font-semibold text-gray-900">{amountUsdc} USDC</p>
        )}
        {label && <p className="text-sm text-gray-500 mt-2">"{label}"</p>}
        <p className="text-xs text-gray-300 mt-2">para {recipientShort}</p>
      </div>

      {phantomInstalled && (
        <button
          onClick={handlePayWithPhantom}
          disabled={status === 'paying' || status === 'waiting'}
          className="w-full py-4 bg-black text-white rounded-2xl font-medium text-sm mb-4 disabled:opacity-50"
        >
          {status === 'paying' ? 'Processando...' : 'Pagar com Phantom'}
        </button>
      )}

      {status === 'waiting' && (
        <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
          <span className="text-sm text-amber-700">Aguardando confirmacao on-chain...</span>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 mb-4">
        <p className="text-xs text-gray-400">Ou escaneie com o celular</p>
        <div className="bg-white p-5 rounded-3xl border border-gray-100">
          <QRCodeSVG value={qrUrl} size={180} level="M" />
        </div>
        <p className="text-xs text-gray-300">Phantom, Solflare ou Backpack</p>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Nao tem carteira ainda?</p>
        <p className="text-xs text-gray-400 leading-relaxed mb-3">
          Baixe o Phantom, crie sua carteira em 2 minutos.
        </p>
        <a
          href="https://phantom.app"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center py-2.5 bg-black text-white rounded-xl text-xs font-medium"
        >
          Baixar Phantom
        </a>
      </div>

      {status === 'ready' && (
        <button
          onClick={startPolling}
          className="w-full py-3 border border-gray-200 rounded-2xl text-sm text-gray-500"
        >
          Ja paguei pelo celular
        </button>
      )}
    </div>
  )
}

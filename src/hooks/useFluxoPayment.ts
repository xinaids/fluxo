import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Keypair } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { encodeURL } from '@solana/pay'
import BigNumber from 'bignumber.js'
import { useCallback, useRef, useState } from 'react'
const USDC_MINT_DEVNET   = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
const USDC_MINT_MAINNET  = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
export type PaymentStatus = 'idle' | 'pending' | 'confirmed' | 'error'
export type PaymentToken  = 'USDC' | 'SOL'
export interface FluxoOrder {
  id: string
  reference: PublicKey
  url: URL
  amountUsdc: BigNumber
  amountBrl: number
  label: string
  message: string
  token: PaymentToken
  createdAt: number
}
export function useFluxoPayment() {
  const { connection } = useConnection()
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError]   = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const createOrder = useCallback(({
    recipientAddress,
    amountBrl,
    usdcPerBrl,
    label   = 'Fluxo',
    message = '',
    network = 'devnet',
    token   = 'USDC',
  }: {
    recipientAddress: string
    amountBrl: number
    usdcPerBrl: number
    label?:   string
    message?: string
    network?: 'mainnet' | 'devnet'
    token?:   PaymentToken
  }): FluxoOrder => {
    const recipient  = new PublicKey(recipientAddress)
    const reference  = Keypair.generate().publicKey
    const amountUsdc = new BigNumber(amountBrl)
      .dividedBy(usdcPerBrl)
      .decimalPlaces(token === 'SOL' ? 6 : 2)
    const baseParams = {
      recipient,
      amount: amountUsdc,
      reference,
      label,
      message: message || label,
      memo: 'fluxo:' + Date.now(),
    }
    const url = token === 'SOL'
      ? encodeURL(baseParams)
      : encodeURL({
          ...baseParams,
          splToken: network === 'mainnet' ? USDC_MINT_MAINNET : USDC_MINT_DEVNET,
        })
    return {
      id: reference.toBase58().slice(0, 8),
      reference,
      url,
      amountUsdc,
      amountBrl,
      label,
      message,
      token,
      createdAt: Date.now(),
    }
  }, [])
  const lastSigRef = useRef<string | null>(null)

  const watchPayment = useCallback((
    order: FluxoOrder,
    onConfirmed: (sig: string) => void,
    recipientAddress?: string
  ) => {
    setStatus('pending')
    setError(null)
    const deadline = Date.now() + 10 * 60 * 1000
    const recipient = recipientAddress ? new PublicKey(recipientAddress) : null

    // Captura a signature mais recente ANTES de começar o polling
    // Para USDC, busca na ATA (Associated Token Account) do destinatário
    const initLastSig = async () => {
      if (recipient) {
        try {
          const ata = await getAssociatedTokenAddress(USDC_MINT_DEVNET, recipient)
          ;(lastSigRef as any).ata = ata
          console.log('[Fluxo] ATA do recipient:', ata.toBase58().slice(0, 12))
          const initial = await connection.getSignaturesForAddress(
            ata, { limit: 5 }, 'confirmed'
          )
          const existingSigs = new Set(initial.map(s => s.signature))
          lastSigRef.current = initial.length > 0 ? initial[0].signature : null
          console.log('[Fluxo] baseline sig:', lastSigRef.current?.slice(0, 20) ?? 'nenhuma')
          console.log('[Fluxo] existing sigs count:', existingSigs.size)
          ;(lastSigRef as any).existingSet = existingSigs
        } catch (e) {
          console.warn('[Fluxo] initLastSig error:', e)
          lastSigRef.current = null
          ;(lastSigRef as any).existingSet = new Set()
        }
      }
    }

    initLastSig().then(() => {
      pollingRef.current = setInterval(async () => {
        if (Date.now() > deadline) {
          clearInterval(pollingRef.current!)
          setStatus('error')
          setError('Tempo expirado. Gere um novo QR code.')
          return
        }
        try {
          // Tenta pela reference primeiro
          const sigs = await connection.getSignaturesForAddress(
            order.reference, { limit: 1 }, 'confirmed'
          )
          console.log('[Fluxo] polling reference sigs:', sigs.length, order.reference.toBase58().slice(0,8))
          if (sigs.length > 0) {
            clearInterval(pollingRef.current!)
            setStatus('confirmed')
            onConfirmed(sigs[0].signature)
            return
          }
          // Fallback: detecta transação nova na ATA (token account)
          if (recipient) {
            const ata = (lastSigRef as any).ata as PublicKey
            if (ata) {
              const recipientSigs = await connection.getSignaturesForAddress(
                ata, { limit: 5 }, 'confirmed'
              )
              const existingSet = (lastSigRef as any).existingSet as Set<string> || new Set()
              const newTx = recipientSigs.find(s => !existingSet.has(s.signature))
              console.log('[Fluxo] polling ATA sigs:', recipientSigs.length, 'baseline:', existingSet.size, 'new?', !!newTx)
              if (newTx) {
                console.log('[Fluxo] NOVA tx detectada via ATA:', newTx.signature.slice(0, 20))
                clearInterval(pollingRef.current!)
                setStatus('confirmed')
                onConfirmed(newTx.signature)
              }
            }
          }
        } catch (e) {
          console.warn('[Fluxo] polling error:', e)
        }
      }, 3000)
    })
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [connection])
  return { createOrder, watchPayment, status, error }
}

import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Keypair } from '@solana/web3.js'
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

  const watchPayment = useCallback((
    order: FluxoOrder,
    onConfirmed: (sig: string) => void
  ) => {
    setStatus('pending')
    setError(null)
    const deadline = Date.now() + 10 * 60 * 1000

    pollingRef.current = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(pollingRef.current!)
        setStatus('error')
        setError('Tempo expirado. Gere um novo QR code.')
        return
      }
      try {
        const sigs = await connection.getSignaturesForAddress(
          order.reference,
          { limit: 1 },
          'confirmed'
        )
        if (sigs.length > 0) {
          clearInterval(pollingRef.current!)
          setStatus('confirmed')
          onConfirmed(sigs[0].signature)
        }
      } catch {}
    }, 2000)

    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [connection])

  return { createOrder, watchPayment, status, error }
}

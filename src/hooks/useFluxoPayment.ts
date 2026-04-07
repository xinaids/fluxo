import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Keypair } from '@solana/web3.js'
import {
  encodeURL,
  findTransactionSignature,
  validateTransactionSignature,
  FindTransactionSignatureError,
} from '@solana/pay'
import BigNumber from 'bignumber.js'
import { useCallback, useRef, useState } from 'react'

// USDC mint on mainnet-beta and devnet
const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const USDC_MINT_DEVNET   = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

export type PaymentStatus = 'idle' | 'pending' | 'confirmed' | 'error'

export interface FluxoOrder {
  id: string
  reference: PublicKey
  url: URL
  amountUsdc: BigNumber
  amountBrl: number
  label: string
  message: string
  createdAt: number
}

export interface UseFluxoPaymentReturn {
  createOrder: (params: {
    recipientAddress: string
    amountBrl: number
    usdcPerBrl: number
    label?: string
    message?: string
    network?: 'mainnet' | 'devnet'
  }) => FluxoOrder
  watchPayment: (order: FluxoOrder, onConfirmed: (sig: string) => void) => () => void
  status: PaymentStatus
  error: string | null
}

export function useFluxoPayment(): UseFluxoPaymentReturn {
  const { connection } = useConnection()
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const createOrder = useCallback(
    ({
      recipientAddress,
      amountBrl,
      usdcPerBrl,
      label = 'Fluxo',
      message = '',
      network = 'devnet',
    }: {
      recipientAddress: string
      amountBrl: number
      usdcPerBrl: number
      label?: string
      message?: string
      network?: 'mainnet' | 'devnet'
    }): FluxoOrder => {
      const recipient  = new PublicKey(recipientAddress)
      const reference  = Keypair.generate().publicKey
      const splToken   = network === 'mainnet' ? USDC_MINT_MAINNET : USDC_MINT_DEVNET
      const amountUsdc = new BigNumber(amountBrl).dividedBy(usdcPerBrl).decimalPlaces(2)

      const url = encodeURL({
        recipient,
        amount: amountUsdc,
        splToken,
        reference,
        label,
        message: message || label,
        memo: `fluxo:${Date.now()}`,
      })

      return {
        id: reference.toBase58().slice(0, 8),
        reference,
        url,
        amountUsdc,
        amountBrl,
        label,
        message,
        createdAt: Date.now(),
      }
    },
    []
  )

  // Poll every 2s for up to 10 minutes looking for the payment tx
  const watchPayment = useCallback(
    (order: FluxoOrder, onConfirmed: (sig: string) => void) => {
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
          const sig = await findTransactionSignature(
            connection,
            order.reference,
            { finality: 'confirmed' }
          )

          await validateTransactionSignature(
            connection,
            sig.signature,
            new PublicKey(order.reference),
            order.amountUsdc,
            undefined,
            order.reference
          )

          clearInterval(pollingRef.current!)
          setStatus('confirmed')
          onConfirmed(sig.signature)
        } catch (e) {
          // FindTransactionSignatureError is expected while waiting — ignore it
          if (!(e instanceof FindTransactionSignatureError)) {
            console.error('[Fluxo] watch error:', e)
          }
        }
      }, 2000)

      // Return cleanup function
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    },
    [connection]
  )

  return { createOrder, watchPayment, status, error }
}

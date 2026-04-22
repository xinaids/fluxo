import { useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Keypair } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { encodeURL } from '@solana/pay'
import BigNumber from 'bignumber.js'
import { useCallback, useRef, useState } from 'react'
import {
  USDC_MINT_DEVNET,
  USDC_MINT_MAINNET,
  IS_MAINNET,
  USDC_MINT,
  POLLING_INTERVAL_MS,
  PAYMENT_TIMEOUT_MS,
} from './constants'

// ── Types ───────────────────────────────────────────────────
export type PaymentStatus = 'idle' | 'pending' | 'confirmed' | 'error'
export type PaymentToken = 'USDC' | 'SOL'

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

// ── Polling state (properly typed) ──────────────────────────
interface PollingBaseline {
  ata: PublicKey | null
  ataSignatures: Set<string>
  walletSignatures: Set<string>
}

// ── Sound feedback ──────────────────────────────────────────
function playConfirmationSound() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    // Pleasant two-tone chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15) // A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.4)

    // Cleanup
    setTimeout(() => ctx.close(), 500)
  } catch {
    // Audio not available — silent fallback
  }
}

// ── Vibration feedback ──────────────────────────────────────
function vibrateDevice() {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100])
    }
  } catch {}
}

// ── Main hook ───────────────────────────────────────────────
export function useFluxoPayment() {
  const { connection } = useConnection()
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const baselineRef = useRef<PollingBaseline>({
    ata: null,
    ataSignatures: new Set(),
    walletSignatures: new Set(),
  })

  const createOrder = useCallback(
    ({
      recipientAddress,
      amountBrl,
      usdcPerBrl,
      label = 'Fluxo',
      message = '',
      network = IS_MAINNET ? 'mainnet' : 'devnet',
      token = 'USDC',
    }: {
      recipientAddress: string
      amountBrl: number
      usdcPerBrl: number
      label?: string
      message?: string
      network?: 'mainnet' | 'devnet'
      token?: PaymentToken
    }): FluxoOrder => {
      const recipient = new PublicKey(recipientAddress)
      const reference = Keypair.generate().publicKey
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

      const url =
        token === 'SOL'
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
    },
    []
  )

  const watchPayment = useCallback(
    (
      order: FluxoOrder,
      onConfirmed: (sig: string) => void,
      recipientAddress?: string
    ) => {
      setStatus('pending')
      setError(null)

      const deadline = Date.now() + PAYMENT_TIMEOUT_MS
      const recipient = recipientAddress ? new PublicKey(recipientAddress) : null

      // Capture baseline signatures BEFORE polling starts
      const initBaseline = async () => {
        if (!recipient) return

        try {
          // ATA for USDC
          const ata = await getAssociatedTokenAddress(USDC_MINT, recipient)
          const ataInitial = await connection.getSignaturesForAddress(ata, { limit: 5 }, 'confirmed')
          const walletInitial = await connection.getSignaturesForAddress(
            recipient,
            { limit: 5 },
            'confirmed'
          )

          baselineRef.current = {
            ata,
            ataSignatures: new Set(ataInitial.map((s) => s.signature)),
            walletSignatures: new Set(walletInitial.map((s) => s.signature)),
          }

          console.log(
            '[Fluxo] Baseline — ATA:',
            ata.toBase58().slice(0, 12),
            'sigs:',
            baselineRef.current.ataSignatures.size,
            '| Wallet sigs:',
            baselineRef.current.walletSignatures.size
          )
        } catch (e) {
          console.warn('[Fluxo] initBaseline error:', e)
          baselineRef.current = {
            ata: null,
            ataSignatures: new Set(),
            walletSignatures: new Set(),
          }
        }
      }

      const onPaymentFound = (sig: string) => {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setStatus('confirmed')
        playConfirmationSound()
        vibrateDevice()
        onConfirmed(sig)
      }

      initBaseline().then(() => {
        pollingRef.current = setInterval(async () => {
          // Timeout check
          if (Date.now() > deadline) {
            clearInterval(pollingRef.current!)
            setStatus('error')
            setError('Tempo expirado. Gere um novo QR code.')
            return
          }

          try {
            // 1. Try by reference key (Solana Pay standard)
            const refSigs = await connection.getSignaturesForAddress(
              order.reference,
              { limit: 1 },
              'confirmed'
            )

            if (refSigs.length > 0) {
              onPaymentFound(refSigs[0].signature)
              return
            }

            // 2. Fallback: detect new tx on ATA (USDC) or wallet (SOL)
            if (!recipient) return
            const { ata, ataSignatures, walletSignatures } = baselineRef.current

            // Check ATA for USDC
            if (ata) {
              const ataSigs = await connection.getSignaturesForAddress(
                ata,
                { limit: 5 },
                'confirmed'
              )
              const newAtaTx = ataSigs.find((s) => !ataSignatures.has(s.signature))
              if (newAtaTx) {
                console.log('[Fluxo] New USDC tx via ATA:', newAtaTx.signature.slice(0, 20))
                onPaymentFound(newAtaTx.signature)
                return
              }
            }

            // Check wallet for SOL
            const walletSigs = await connection.getSignaturesForAddress(
              recipient,
              { limit: 5 },
              'confirmed'
            )
            const newWalletTx = walletSigs.find((s) => !walletSignatures.has(s.signature))
            if (newWalletTx) {
              console.log('[Fluxo] New SOL tx via Wallet:', newWalletTx.signature.slice(0, 20))
              onPaymentFound(newWalletTx.signature)
            }
          } catch (e) {
            console.warn('[Fluxo] polling error:', e)
          }
        }, POLLING_INTERVAL_MS)
      })

      // Cleanup function
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    },
    [connection]
  )

  const reset = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    setStatus('idle')
    setError(null)
  }, [])

  return { createOrder, watchPayment, status, error, reset }
}

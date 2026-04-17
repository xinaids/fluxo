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

    // Captura signatures ANTES do polling — ATA (USDC) + wallet (SOL)
    const initLastSig = async () => {
      if (recipient) {
        try {
          // ATA para USDC
          const ata = await getAssociatedTokenAddress(USDC_MINT_DEVNET, recipient)
          ;(lastSigRef as any).ata = ata
          console.log('[Fluxo] ATA do recipient:', ata.toBase58().slice(0, 12))
          const ataInitial = await connection.getSignaturesForAddress(
            ata, { limit: 5 }, 'confirmed'
          )
          const ataExisting = new Set(ataInitial.map(s => s.signature))
          ;(lastSigRef as any).ataExistingSet = ataExisting
          console.log('[Fluxo] ATA baseline count:', ataExisting.size)

          // Wallet principal para SOL
          const walletInitial = await connection.getSignaturesForAddress(
            recipient, { limit: 5 }, 'confirmed'
          )
          const walletExisting = new Set(walletInitial.map(s => s.signature))
          ;(lastSigRef as any).walletExistingSet = walletExisting
          console.log('[Fluxo] Wallet baseline count:', walletExisting.size)

          lastSigRef.current = ataInitial.length > 0 ? ataInitial[0].signature : null
        } catch (e) {
          console.warn('[Fluxo] initLastSig error:', e)
          lastSigRef.current = null
          ;(lastSigRef as any).ataExistingSet = new Set()
          ;(lastSigRef as any).walletExistingSet = new Set()
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
          // Fallback: detecta tx nova na ATA (USDC) ou wallet (SOL)
          if (recipient) {
            // Checa ATA (USDC)
            const ata = (lastSigRef as any).ata as PublicKey
            const ataSet = (lastSigRef as any).ataExistingSet as Set<string> || new Set()
            if (ata) {
              const ataSigs = await connection.getSignaturesForAddress(ata, { limit: 5 }, 'confirmed')
              const newAtaTx = ataSigs.find(s => !ataSet.has(s.signature))
              console.log('[Fluxo] ATA sigs:', ataSigs.length, 'baseline:', ataSet.size, 'new?', !!newAtaTx)
              if (newAtaTx) {
                console.log('[Fluxo] NOVA tx via ATA (USDC):', newAtaTx.signature.slice(0, 20))
                clearInterval(pollingRef.current!)
                setStatus('confirmed')
                onConfirmed(newAtaTx.signature)
                return
              }
            }
            // Checa wallet principal (SOL)
            const walletSet = (lastSigRef as any).walletExistingSet as Set<string> || new Set()
            const walletSigs = await connection.getSignaturesForAddress(recipient, { limit: 5 }, 'confirmed')
            const newWalletTx = walletSigs.find(s => !walletSet.has(s.signature))
            console.log('[Fluxo] Wallet sigs:', walletSigs.length, 'baseline:', walletSet.size, 'new?', !!newWalletTx)
            if (newWalletTx) {
              console.log('[Fluxo] NOVA tx via Wallet (SOL):', newWalletTx.signature.slice(0, 20))
              clearInterval(pollingRef.current!)
              setStatus('confirmed')
              onConfirmed(newWalletTx.signature)
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

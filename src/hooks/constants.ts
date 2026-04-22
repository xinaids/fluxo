import { PublicKey } from '@solana/web3.js'

// ── Token Mints ─────────────────────────────────────────────
export const USDC_MINT_DEVNET  = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')
export const USDC_MINT_MAINNET = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// ── Network ─────────────────────────────────────────────────
export const IS_MAINNET = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'mainnet'
export const USDC_MINT  = IS_MAINNET ? USDC_MINT_MAINNET : USDC_MINT_DEVNET
export const NETWORK    = IS_MAINNET ? 'mainnet-beta' : 'devnet' as const

// ── Explorer ────────────────────────────────────────────────
export function explorerUrl(signature: string): string {
  const cluster = IS_MAINNET ? '' : '?cluster=devnet'
  return `https://explorer.solana.com/tx/${signature}${cluster}`
}

export function explorerAddressUrl(address: string): string {
  const cluster = IS_MAINNET ? '' : '?cluster=devnet'
  return `https://explorer.solana.com/address/${address}${cluster}`
}

// ── Defaults ────────────────────────────────────────────────
export const FALLBACK_BRL_PER_USDC = 5.85
export const FALLBACK_SOL_PRICE_USD = 170
export const TX_HISTORY_LIMIT = 200
export const POLLING_INTERVAL_MS = 3000
export const PAYMENT_TIMEOUT_MS = 10 * 60 * 1000 // 10 min
export const BALANCE_REFRESH_MS = 15_000
export const RATE_REFRESH_MS = 60_000

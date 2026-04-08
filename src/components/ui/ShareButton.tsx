'use client'

interface ShareButtonProps {
  walletAddress: string
  amountBrl?: number
  label?: string
}

export function ShareButton({ walletAddress, amountBrl, label }: ShareButtonProps) {
  async function handleShare() {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const params = new URLSearchParams({ to: walletAddress })
    if (amountBrl) params.set('amount', amountBrl.toString())
    if (label) params.set('label', label)

    const url = base + '/pay?' + params.toString()

    if (navigator.share) {
      await navigator.share({
        title: 'Pagamento via Fluxo',
        text: label ? 'Pague ' + label + ' via Fluxo' : 'Pague via Fluxo',
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copiado: ' + url)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="w-full py-3 border border-gray-200 rounded-2xl text-sm text-gray-600 bg-white font-medium"
    >
      Compartilhar link de pagamento
    </button>
  )
}

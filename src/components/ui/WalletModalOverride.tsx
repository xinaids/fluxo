'use client'

import { useEffect } from 'react'

export function WalletModalOverride() {
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const heading = document.querySelector('.wallet-adapter-modal-title')
      if (heading && heading.textContent?.includes('Connect a wallet')) {
        heading.textContent = 'Conecte sua carteira'
      }

      const subtitle = document.querySelector('.wallet-adapter-modal-wrapper p')
      if (subtitle && subtitle.textContent?.includes('to continue')) {
        subtitle.textContent = 'Escolha sua carteira Solana para continuar'
      }

      document.querySelectorAll('.wallet-adapter-button-end-icon + span').forEach(el => {
        if (el.textContent === 'Detected') el.textContent = 'Instalada'
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}

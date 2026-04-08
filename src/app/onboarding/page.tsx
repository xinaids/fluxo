'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const steps = [
  {
    number: 1,
    title: 'Instale a carteira Phantom',
    subtitle: 'Sua carteira digital na Solana',
    description: 'A Phantom e como uma conta bancaria digital, so que sem banco. Voce guarda seu dinheiro, sem pedir permissao para ninguem.',
    action: 'Instalar Phantom',
    actionUrl: 'https://phantom.app',
    tip: 'Anote as 12 palavras secretas em papel. Nunca compartilhe com ninguem.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="14" fill="#9945FF"/>
        <path d="M38 19.5C38 27.5 30.5 34 24 34C17.5 34 10 27.5 10 19.5C10 15 13.5 11 18 11C20.5 11 22.5 12.5 24 14C25.5 12.5 27.5 11 30 11C34.5 11 38 15 38 19.5Z" fill="white" fillOpacity="0.95"/>
        <circle cx="19" cy="20" r="2" fill="#9945FF"/>
        <circle cx="29" cy="20" r="2" fill="#9945FF"/>
      </svg>
    ),
  },
  {
    number: 2,
    title: 'Ative a rede devnet',
    subtitle: 'Ambiente de testes gratuito',
    description: 'O devnet e uma rede de testes da Solana onde tudo e gratuito. Voce pode praticar sem gastar dinheiro real antes de usar de verdade.',
    action: null,
    actionUrl: null,
    tip: 'No app Phantom: Settings > Developer Settings > Change Network > Devnet',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="14" fill="#111"/>
        <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="2" fill="none"/>
        <path d="M24 14 C20 14 16 18.5 16 24 C16 29.5 20 34 24 34" stroke="white" strokeWidth="2" fill="none"/>
        <path d="M24 14 C28 14 32 18.5 32 24 C32 29.5 28 34 24 34" stroke="white" strokeWidth="2" fill="none"/>
        <line x1="14" y1="24" x2="34" y2="24" stroke="white" strokeWidth="2"/>
        <line x1="15" y1="19" x2="33" y2="19" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
        <line x1="15" y1="29" x2="33" y2="29" stroke="white" strokeWidth="1.5" strokeDasharray="2 2"/>
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Pegue USDC de teste',
    subtitle: 'Dinheiro digital gratuito para testar',
    description: 'USDC e uma moeda digital equivalente ao dolar americano. No devnet voce consegue USDC de graca para testar o Fluxo.',
    action: 'Abrir faucet de USDC',
    actionUrl: 'https://faucet.circle.com',
    tip: 'Cole seu endereco da Phantom no site do faucet e clique em "Send". Voce recebe USDC em segundos.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="14" fill="#2775CA"/>
        <circle cx="24" cy="24" r="11" fill="white"/>
        <text x="24" y="29" textAnchor="middle" fontSize="14" fontWeight="700" fill="#2775CA">$</text>
      </svg>
    ),
  },
]

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0)
  const [completed, setCompleted] = useState<number[]>([])
  const router = useRouter()

  const step = steps[current]
  const isLast = current === steps.length - 1
  const allDone = completed.length === steps.length

  function handleNext() {
    if (!completed.includes(current)) {
      setCompleted(prev => [...prev, current])
    }
    if (isLast) {
      document.cookie = 'fluxo_onboarded=1; path=/; max-age=31536000'
      router.push('/cobrar')
    } else {
      setCurrent(prev => prev + 1)
    }
  }

  function handleSkip() {
    document.cookie = 'fluxo_onboarded=1; path=/; max-age=31536000'
    router.push('/cobrar')
  }

  return (
    <div className="flex flex-col min-h-screen px-6 pt-10 pb-8 max-w-sm mx-auto">

      <div className="flex items-center justify-between mb-10">
        <div className="flex gap-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-8 bg-black'
                  : completed.includes(i)
                  ? 'w-4 bg-black'
                  : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>
        <button
          onClick={handleSkip}
          className="text-xs text-gray-400 font-medium"
        >
          Pular
        </button>
      </div>

      <div className="flex-1 flex flex-col">

        <div className="mb-8">
          {step.icon}
        </div>

        <div className="mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">
            Passo {step.number} de {steps.length}
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-1 leading-tight">
          {step.title}
        </h1>
        <p className="text-sm text-gray-400 mb-5">{step.subtitle}</p>

        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {step.description}
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-8">
          <p className="text-xs font-medium text-amber-700 mb-1">Dica importante</p>
          <p className="text-xs text-amber-600 leading-relaxed">{step.tip}</p>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {step.actionUrl && (
            <a
              href={step.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 bg-black text-white rounded-2xl font-medium text-sm text-center block"
            >
              {step.action}
            </a>
          )}
          <button
            onClick={handleNext}
            className={`w-full py-4 rounded-2xl font-medium text-sm transition-colors ${
              step.actionUrl
                ? 'border border-gray-200 text-gray-700 bg-white'
                : 'bg-black text-white'
            }`}
          >
            {isLast ? 'Comecar a usar o Fluxo' : 'Feito, proximo passo'}
          </button>
        </div>

      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-300">
          Ja tem carteira?{' '}
          <button
            onClick={handleSkip}
            className="text-gray-500 underline"
          >
            Ir direto para o app
          </button>
        </p>
      </div>

    </div>
  )
}

<p align="center">
  <img src="public/logo.svg" width="80" alt="Fluxo Logo" />
</p>

<h1 align="center">Fluxo</h1>

<p align="center">
  <strong>🇧🇷 Pagamentos instantâneos na Solana. Sem banco. Sem fronteiras.</strong><br/>
  <strong>🇺🇸 Instant payments on Solana. No bank. No borders.</strong>
</p>

<p align="center">
  <a href="https://fluxo-theta.vercel.app">Live Demo</a> ·
  <a href="#-como-funciona--how-it-works">Como Funciona</a> ·
  <a href="#-stack">Stack</a> ·
  <a href="#-hackathon">Hackathon</a>
</p>

---

## 🇧🇷 Português

Fluxo é uma PWA mobile-first que transforma a Solana em um sistema de pagamentos tão simples quanto um QR Code do Pix — mas aberto para qualquer pessoa no mundo, sem conta bancária, sem KYC.

Construído em cima do protocolo Solana Pay (open source, padrão da Solana Foundation), Fluxo é a camada de UX consumer que o ecossistema não tinha.

## 🇺🇸 English

Fluxo is a mobile-first PWA that turns Solana into a payment system as simple as a Pix QR Code — but open to anyone in the world, no bank account, no KYC.

Built on top of the Solana Pay protocol (open source, Solana Foundation standard), Fluxo is the consumer UX layer the ecosystem was missing.

---

## 🔄 Como Funciona / How It Works

| 🇧🇷 Português | 🇺🇸 English |
|---|---|
| 1. Conecte sua carteira (Phantom, Solflare) | 1. Connect your wallet (Phantom, Solflare) |
| 2. Digite o valor em reais | 2. Enter amount in your currency |
| 3. Compartilhe o QR Code ou link | 3. Share the QR Code or link |
| 4. Receba em ~3 segundos | 4. Receive in ~3 seconds |

---

## ✨ Funcionalidades / Features

- **Cobrança via QR Code** — USDC e SOL, com valor em BRL / QR Code charges — USDC and SOL, with BRL value
- **Detecção automática de pagamento** — polling por reference + fallback ATA/wallet / Auto payment detection — reference polling + ATA/wallet fallback
- **Histórico on-chain** — extrato real da blockchain, não depende de localStorage / On-chain history — real blockchain data, no localStorage dependency
- **Som + vibração na confirmação** — feedback sensorial quando pagamento chega / Sound + vibration on confirmation — sensory feedback on payment
- **Link compartilhável** — envie cobranças via WhatsApp, Telegram, email / Shareable links — send charges via WhatsApp, Telegram, email
- **Carteira completa** — saldos reais de SOL e USDC com cotação USD / Full wallet — real SOL and USDC balances with USD pricing
- **Cotação em tempo real** — BRL/USDC + SOL/BRL via CoinGecko / Real-time rates — BRL/USDC + SOL/BRL via CoinGecko
- **Internacionalização** — interface completa em PT e EN com toggle / Internationalization — full PT and EN interface with toggle
- **Links para Explorer** — todas transações clicáveis direto para Solana Explorer / Explorer links — all transactions clickable to Solana Explorer
- **PWA instalável** — funciona como app nativo no celular / Installable PWA — works as native app on mobile
- **Onboarding guiado** — 3 passos para novos usuários / Guided onboarding — 3 steps for new users

---

## 🛠 Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Payments | @solana/pay + @solana/web3.js |
| Tokens | @solana/spl-token (USDC + native SOL) |
| Wallet | @solana/wallet-adapter (Phantom, Solflare, Backpack) |
| RPC | Helius |
| Exchange rates | CoinGecko API via internal route |
| UI | Tailwind CSS, mobile-first |
| i18n | Custom React Context (PT/EN) |
| Deploy | Vercel |

---

## 📁 Arquitetura / Architecture

```
src/
├── app/
│   ├── cobrar/page.tsx       # QR Code generation + payment detection
│   ├── pay/PayPage.tsx       # Payer screen (via link/QR)
│   ├── extrato/page.tsx      # Transaction history (on-chain + local)
│   ├── carteira/page.tsx     # Balances and address
│   ├── landing/page.tsx      # Landing page (PT/EN)
│   ├── onboarding/page.tsx   # 3-step tutorial
│   ├── api/rate/route.ts     # BRL/USDC + SOL rates
│   └── layout.tsx            # Providers + navigation
├── hooks/
│   ├── useFluxoPayment.ts    # Core: createOrder + watchPayment
│   ├── useBrlUsdcRate.ts     # Real-time rates (USDC + SOL)
│   ├── useTxHistory.ts       # On-chain history + local cache
│   └── constants.ts          # Centralized mints, network, URLs
├── components/
│   ├── SolanaProvider.tsx    # Wallet adapter + RPC
│   └── ui/                   # BottomNav, FluxoLogo, LanguageToggle, AppHeader
└── i18n/
    ├── LanguageContext.tsx    # Language provider
    ├── pt.ts                 # Portuguese dictionary
    └── en.ts                 # English dictionary
```

---

## 🔍 Detecção de Pagamento / Payment Detection

O Fluxo usa uma estratégia de polling para detectar pagamentos / Fluxo uses a polling strategy to detect payments:

1. **Reference key** — cada cobrança gera uma chave pública única (Solana Pay standard) / each charge generates a unique public key
2. **ATA fallback** — monitora a Associated Token Account para USDC / monitors ATA for USDC
3. **Wallet fallback** — monitora a conta principal para SOL / monitors main account for SOL

Antes do polling, o sistema captura um `Set` com as últimas 5 signatures. A cada 3s, compara — qualquer signature nova é um pagamento detectado.

Before polling starts, the system captures a `Set` of the last 5 signatures. Every 3s, it compares — any new signature is a detected payment.

---

## 🚀 Como Rodar / Getting Started

```bash
# 1. Clone
git clone https://github.com/xinaids/fluxo.git
cd fluxo

# 2. Install
npm install

# 3. Configure
cat > .env.local << EOF
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
NEXT_PUBLIC_SOLANA_NETWORK=devnet
EOF

# 4. Run
npm run dev

# 5. Open http://localhost:3000
```

### Pré-requisitos / Prerequisites

- Phantom or Solflare browser extension
- Switch to Devnet (Settings > Developer Settings > Devnet)
- Get test USDC at [faucet.circle.com](https://faucet.circle.com)

---

## 📋 Roadmap

- [x] Deploy em produção (Vercel) / Production deploy
- [x] Notificação sonora/visual ao receber / Sound + visual notification
- [x] Histórico real da blockchain / Real blockchain history
- [x] Internacionalização PT/EN / i18n PT/EN
- [x] Logo SVG + branding consistente / SVG logo + consistent branding
- [x] Links para Explorer em transações / Explorer links on transactions
- [ ] Suporte mainnet com toggle / Mainnet toggle
- [ ] Link permanente por perfil (fluxo.app/@user) / Permanent profile links
- [ ] Recibo/comprovante compartilhável / Shareable receipt
- [ ] Modo lojista (tela fullscreen) / Merchant mode (fullscreen)
- [ ] Off-ramp para Pix via parceiros / Pix off-ramp via partners
- [ ] SDK para integração / Integration SDK

---

## 🏆 Hackathon

Built for the **Solana Frontier Hackathon** — Superteam Brazil track.

**Time / Team:** Mateus Schneider

**Problema / Problem:** Pagamentos internacionais e descentralizados ainda são complexos. O Pix resolveu pagamentos no Brasil, mas não funciona fora dele. Cripto resolve o problema global, mas a UX ainda é péssima. / International and decentralized payments are still complex. Pix solved payments in Brazil but doesn't work abroad. Crypto solves the global problem, but the UX is terrible.

**Solução / Solution:** Fluxo traz a simplicidade do Pix para pagamentos em cripto na Solana — qualquer pessoa gera um QR Code em reais e recebe em USDC ou SOL em segundos. / Fluxo brings Pix simplicity to crypto payments on Solana — anyone generates a QR Code in their currency and receives in USDC or SOL in seconds.

---

<p align="center">
  <strong>Fluxo v0.2</strong> · Built on Solana · Frontier Hackathon 2026
</p>

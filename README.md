# Fluxo

**Pagamentos instantâneos na Solana. Sem banco. Sem fronteiras.**

Fluxo é uma PWA mobile-first que transforma a Solana em um sistema de pagamentos tão simples quanto um QR Code do Pix — mas aberto para qualquer pessoa no mundo, sem conta bancária, sem KYC.

Construído em cima do protocolo Solana Pay (open source, padrão da Solana Foundation), Fluxo é a camada de UX consumer que o ecossistema não tinha.

---

## Como funciona

1. **Conecte sua carteira** — Phantom, Solflare ou qualquer wallet Solana
2. **Digite o valor em reais** — Fluxo converte automaticamente para USDC ou SOL
3. **Compartilhe o QR Code** — mostre na tela ou mande o link pelo WhatsApp
4. **Receba em ~3 segundos** — direto na sua carteira, sem intermediários

---

## Funcionalidades

- **Cobrança via QR Code** — USDC e SOL, com valor em BRL
- **Detecção automática de pagamento** — polling na ATA (USDC) e wallet (SOL) com comparação por Set de signatures
- **Link compartilhável** — envie cobranças via WhatsApp, Telegram, email
- **Extrato completo** — histórico com totais em BRL, separado por token
- **Carteira** — saldos reais de SOL e USDC, endereço copiável
- **Cotação em tempo real** — BRL/USDC via CoinGecko
- **Onboarding guiado** — 3 passos para novos usuários
- **PWA instalável** — funciona como app nativo no celular

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Pagamentos | `@solana/pay` + `@solana/web3.js` |
| Tokens | `@solana/spl-token` (USDC + SOL nativo) |
| Wallet | `@solana/wallet-adapter` (Phantom, Solflare, Backpack) |
| RPC | Helius (indexação confiável) |
| Câmbio | CoinGecko API via API route interna |
| UI | Tailwind CSS, mobile-first |
| Deploy | Vercel |

---

## Arquitetura

```
src/
├── app/
│   ├── cobrar/page.tsx       # Gera QR Code + detecta pagamento
│   ├── pay/PayPage.tsx       # Tela do pagador (via link/QR)
│   ├── extrato/page.tsx      # Histórico de transações
│   ├── carteira/page.tsx     # Saldos e endereço
│   ├── landing/page.tsx      # Landing page
│   ├── onboarding/page.tsx   # Tutorial em 3 passos
│   ├── api/rate/route.ts     # Cotação BRL/USDC
│   └── layout.tsx            # Providers + navegação
├── hooks/
│   ├── useFluxoPayment.ts    # Core: createOrder + watchPayment (polling ATA + wallet)
│   ├── useBrlUsdcRate.ts     # Cotação em tempo real
│   └── useTxHistory.ts       # Histórico persistido (localStorage)
└── components/
    ├── SolanaProvider.tsx     # Wallet adapter + RPC connection
    └── ui/                   # BottomNav, WalletButton, etc.
```

---

## Detecção de pagamento

O Fluxo usa uma estratégia de polling duplo para detectar pagamentos:

1. **Busca por `reference`** — cada cobrança gera uma chave pública única incluída na transação via Solana Pay
2. **Fallback por ATA** — monitora a Associated Token Account do destinatário para transações USDC
3. **Fallback por wallet** — monitora a conta principal para transações SOL nativas

Antes do polling começar, o sistema captura um Set com as últimas 5 signatures existentes. A cada 3 segundos, compara as signatures atuais — qualquer signature nova que não esteja no Set original é um pagamento detectado.

Essa abordagem elimina dependência de sincronização de relógios (`blockTime` vs `Date.now()`), sendo robusta independente do RPC usado.

---

## Como rodar

```bash
# 1. Clone o repositório
git clone https://github.com/xinaids/fluxo.git
cd fluxo

# 2. Instale as dependências
npm install

# 3. Configure o ambiente
cat > .env.local << EOF
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=SUA_CHAVE_HELIUS
NEXT_PUBLIC_SOLANA_NETWORK=devnet
EOF

# 4. Rode em desenvolvimento
npm run dev

# 5. Acesse http://localhost:3000
```

### Pré-requisitos para testar

1. Instale o [Phantom](https://phantom.app) no navegador
2. Ative a rede **Devnet** (Settings > Developer Settings > Change Network > Devnet)
3. Pegue USDC de teste em [faucet.circle.com](https://faucet.circle.com)

---

## Roadmap

- [ ] Deploy em produção (Vercel)
- [ ] Suporte mainnet com toggle
- [ ] Link de pagamento permanente por perfil (`fluxo.app/@mateus`)
- [ ] Notificação sonora/visual ao receber pagamento
- [ ] Histórico real da blockchain (sem depender de localStorage)
- [ ] Recibo/comprovante compartilhável
- [ ] Modo lojista (tela fullscreen para balcão)
- [ ] Off-ramp para Pix via parceiros
- [ ] SDK para integração em outros apps

---

## Hackathon

Construído para o **Solana Frontier Hackathon** — Superteam Brazil track.

**Time:** Mateus

**Problema:** Pagamentos internacionais e descentralizados ainda são complexos. O Pix resolveu pagamentos no Brasil, mas não funciona fora dele. Cripto resolve o problema global, mas a UX ainda é péssima.

**Solução:** Fluxo traz a simplicidade do Pix para pagamentos em cripto na Solana — qualquer pessoa gera um QR Code em reais e recebe em USDC ou SOL em segundos.

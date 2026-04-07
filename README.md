# Fluxo — Pagamentos instantâneos na Solana

> Receba qualquer valor, de qualquer pessoa, em segundos. Sem banco. Sem fronteiras.

## O que é

Fluxo é uma PWA (Progressive Web App) mobile-first que transforma a Solana em um sistema de pagamentos tão simples quanto um QR Code do Pix — mas aberto para qualquer pessoa no mundo, sem conta bancária, sem KYC.

Construído em cima do protocolo **Solana Pay** (open source, padrão da Solana Foundation), Fluxo é a camada de UX consumer que o ecossistema não tinha.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Pagamentos | `@solana/pay` + `@solana/web3.js` |
| Wallet | `@solana/wallet-adapter` (Phantom, Solflare, Backpack) |
| Token padrão | USDC (SPL Token) |
| Câmbio BRL/USDC | CoinGecko API (sem chave) |
| Deploy | Vercel |

## Estrutura

```
src/
  app/
    cobrar/page.tsx      # Tela principal — gera QR + confirma pagamento
    extrato/page.tsx     # Histórico de transações
    carteira/page.tsx    # Saldo e endereço
    layout.tsx           # Providers + nav
  hooks/
    useFluxoPayment.ts   # Core: createOrder + watchPayment
    useBrlUsdcRate.ts    # Cotação BRL/USDC em tempo real
    useTxHistory.ts      # Histórico persistido em localStorage
  components/
    SolanaProvider.tsx   # Wallet adapter + connection
    ui/BottomNav.tsx     # Navegação inferior mobile
```

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.local.example .env.local
# Edite .env.local se quiser usar RPC próprio

# 3. Rodar em desenvolvimento
npm run dev

# 4. Acessar em http://localhost:3000
```

## Fluxo de pagamento

1. Usuário conecta wallet (Phantom etc.)
2. Digita valor em BRL — Fluxo converte para USDC automaticamente
3. QR Code é gerado via `@solana/pay` com `reference` única
4. Pagador escaneia com qualquer wallet Solana compatível
5. Fluxo detecta a transação via polling (`findTransactionSignature`)
6. Confirma o pagamento e registra no histórico

## Roadmap (pós-hackathon)

- [ ] Link de pagamento permanente por perfil (ex: fluxo.app/@mateus)
- [ ] Suporte a SOL nativo além de USDC
- [ ] Notificação push quando receber pagamento
- [ ] Off-ramp para Pix via parceiros (EfiBank, Transak)
- [ ] SDK para devs integrarem em qualquer app

## Hackathon

Construído para o **Solana Frontier Hackathon** — Superteam Brazil track.

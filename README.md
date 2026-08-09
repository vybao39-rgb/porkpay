# VPorkPay

**Buy pork. Keep cash moving.** VPorkPay is a USDC-native pork marketplace with direct merchant settlement and merchant-approved onchain store credit on Arc.

[Checkpoint 3 form values](CHECKPOINT-3-SUBMISSION.md) · [Final submission hub](https://vpork.xyz/submission.html) · [Live MVP](https://vpork.xyz/) · [180-second video](https://vpork.xyz/VPorkPay-Final-Demo.mp4) · [Final deck](https://vpork.xyz/VPorkPay-Final-Submission-Deck.pptx) · [Vietnamese user guide](https://vpork.xyz/VPorkPay-User-Guide-VI.pdf) · [Public repository](https://github.com/vybao39-rgb/porkpay)

**Fully source-verified Arc Testnet deployment:** [`0xd9dab755431664ada2d13868674ddb43ffdef396`](https://testnet.arcscan.app/address/0xd9dab755431664ada2d13868674ddb43ffdef396?tab=contract) · [deployment transaction](https://testnet.arcscan.app/tx/0x07acbc8ad1f7a2a2ef0dddafd457b93de30a08d4dc33d6881452cc16049a0067)

> **Safety:** Arc Testnet only. Do not use real funds. `VPorkPayStoreCredit` is an unaudited hackathon prototype and does not create a legally binding credit agreement.

## Problem

Small pork buyers and suppliers often coordinate prices, orders and payment evidence through disconnected messages, spreadsheets, cash or bank transfers. A buyer can also be short of working capital at checkout, while the shop owner has no transparent shared record for approving and collecting that credit.

## Solution

VPorkPay combines a simple pork marketplace with a narrow DeFi primitive: merchant-approved store credit denominated and repaid in test USDC.

Buyers compare products, prepare an order and connect an injected EVM wallet. If their displayed Arc Testnet USDC balance is below the order total, they can send the shortfall to the shop owner as a credit request. No debt exists until the merchant opens it in the verified contract. The contract fixes an annual rate from the pork-price index, accrues simple interest using Arc block time and transfers repayment directly from the buyer to the immutable merchant address.

## Why this is DeFi

- Principal, buyer, merchant, opening time, APR and repayment state are recorded onchain.
- The contract—not the webpage—calculates the live amount due.
- Only the deploying merchant can open or cancel debt; only the recorded buyer can repay it.
- Repayment uses Arc Testnet USDC `transferFrom` and goes directly to the merchant wallet.
- Every successful transaction can be inspected independently on Arcscan.
- VPorkPay never receives or stores a private key and never takes custody of user funds.

## Functional MVP

### Marketplace and orders

- Browse, search and filter six pork products priced in USDC.
- Add products to a cart, adjust quantity and capture delivery details.
- Persist wallet-owned products, carts, orders and fulfilment state in Supabase.
- Separate paid orders from active credit, including order time, payment method, principal, APR, accrued interest and live amount due per order.
- Hide Seller Hub from buyer wallets and expose operations only to authorized seller/admin roles.

### Arc Testnet wallet and payment proof

- Require an injected EVM wallet; there is no fake wallet or browser-payment fallback.
- Add or switch the wallet to Arc Testnet (chain ID `5042002`).
- Prove wallet ownership with a message-only Web3 signature; it submits no transaction, changes no balance and charges no gas.
- Read the official Arc Testnet USDC balance.
- Transfer the full order value in test USDC directly to the verified merchant when the connected balance is sufficient; no shop debt is created for that order.
- Wait for the receipt and link the finalized transaction to Arcscan.

### Circle App Kit liquidity onboarding

- Lazy-load the official `@circle-fin/app-kit` only when the buyer requests it.
- Use the official EIP-1193 Viem adapter with the already connected MetaMask wallet.
- Estimate or execute a two-way CCTP bridge between Ethereum Sepolia and Arc Testnet so the buyer can fund checkout or move Arc liquidity with test USDC.
- Require an explicit wallet confirmation and return every bridge-step explorer link.

The browser integration is [`src/circle-app-kit.js`](src/circle-app-kit.js); the reproducible browser bundle is [`assets/circle-app-kit.bundle.js`](assets/circle-app-kit.bundle.js).
Implementation follows the official [Arc App Kit bridge quickstart](https://docs.arc.network/app-kit/quickstarts/bridge-tokens-across-blockchains).

### Circle Agent Stack procurement

- Use the official `@circle-fin/cli` and a Circle Agent Wallet on `ARC-TESTNET`.
- Calculate supplier payment from a machine-readable product catalog.
- Restrict the recipient to the verified VPorkPay merchant and cap each agent order at 100 USDC.
- Default to a dry-run plan and refuse execution without the exact `ARC_TESTNET_ONLY` human-confirmation phrase.

See [`agent/README.md`](agent/README.md), [`agent/vporkpay-agent.json`](agent/vporkpay-agent.json) and the executable [`agent/vporkpay-agent.mjs`](agent/vporkpay-agent.mjs).
Wallet setup and commands follow Circle's official [Agent Stack](https://developers.circle.com/agent-stack) and [Agent Wallet quickstart](https://developers.circle.com/agent-stack/agent-wallets/quickstart).

### Onchain store credit

- Build and publish the Solidity deployment artifact reproducibly.
- Deploy `VPorkPayStoreCredit` from the shop-owner wallet in Seller Hub.
- Verify the contract identifier, immutable merchant and official Arc Testnet USDC address before trusting an entered address.
- Calculate the shortfall and persist a buyer credit request across reloads.
- Let the merchant open that exact order debt onchain.
- Fix APR when the debt opens: `8% + 50% × annual pork-price change`, capped to `6–18%`.
- Read the live block-time amount due from the contract.
- Approve a narrowly capped USDC allowance and repay the debt in full.
- Reject a repayment when live accrued interest exceeds the buyer-approved maximum.
- Persist deployment and transaction evidence while keeping debt state onchain as the source of truth.

## Onchain lifecycle

1. Buyer connects an Arc Testnet wallet and builds an order.
2. Checkout compares the test-USDC balance with the order total.
3. Buyer submits the shortfall as a pending request; this step alone creates no debt.
4. The deploying merchant wallet calls `openDebt(orderId, buyer, principal)`.
5. The contract records the fixed APR and starts interest accrual from Arc block time.
6. Buyer approves a capped test-USDC allowance and calls `repayInFull(orderId, maxAmount)`.
7. The contract transfers only the live amount due to the merchant and permanently closes the debt.

## Contract safeguards

- Immutable merchant and USDC addresses.
- Versioned `CONTRACT_ID` verification in the browser.
- Merchant-only debt opening, cancellation and pork-price updates.
- Buyer-only repayment.
- One debt per order ID; closed IDs cannot be reused.
- Checks-effects-interactions ordering and reentrancy protection.
- Maximum repayment quote to protect the buyer from interest drift between approval and execution.
- Explicit pork-price and APR bounds.

The source is [`contracts/VPorkPayStoreCredit.sol`](contracts/VPorkPayStoreCredit.sol). The browser artifact is [`assets/vporkpay-store-credit.json`](assets/vporkpay-store-credit.json). Arc Testnet USDC is fixed to Circle's published address `0x3600000000000000000000000000000000000000`.

## Verified deployment

The canonical VPorkPay v1.1 contract was deployed successfully on Arc Testnet at block `55,799,303` on 7 August 2026.

- Contract: [`0xd9dab755431664ada2d13868674ddb43ffdef396`](https://testnet.arcscan.app/address/0xd9dab755431664ada2d13868674ddb43ffdef396)
- Deployment transaction: [`0x07ac…0067`](https://testnet.arcscan.app/tx/0x07acbc8ad1f7a2a2ef0dddafd457b93de30a08d4dc33d6881452cc16049a0067)
- Immutable merchant: [`0xf2d062b3920b342f6c6c4ecfd22c39a79e1e33d0`](https://testnet.arcscan.app/address/0xf2d062b3920b342f6c6c4ecfd22c39a79e1e33d0)
- Official Arc Testnet USDC: `0x3600000000000000000000000000000000000000`
- Initial annual pork-price change: `+6.40%`; opening APR at this setting: `11.20%`
- Arcscan verification: full Solidity source and ABI, compiler `v0.8.24+commit.e11b9ed9`, optimizer `200`, EVM `shanghai`, MIT license

Independent RPC reads confirm that the deployed bytecode exposes the expected v1.1 `CONTRACT_ID`, merchant, USDC and pork-price parameters. Arcscan independently matched and published the complete source and ABI. Each credit request, merchant approval and buyer repayment still requires its own signed Arc Testnet transaction.

## Architecture

```text
Buyer / Merchant
       |
Injected EVM wallet
       |
VPorkPay web app on vpork.xyz
       |-- Circle App Kit -> CCTP test-USDC bridge to Arc
       |-- Circle Agent Stack -> policy-bounded Agent Wallet payment
       |
Supabase Postgres + Web3 Auth + RLS
       |
Arc Testnet
       |
VPorkPayStoreCredit v1.1
       |
Official test USDC -> immutable merchant wallet
       |
Arcscan transaction evidence
```

The frontend is a static HTML/CSS/JavaScript application hosted on GitHub Pages at `vpork.xyz`. Supabase Postgres stores the shared catalog, wallet-owned carts, orders and fulfilment state. Supabase Web3 Auth verifies wallet ownership, and Row Level Security isolates buyer rows while allowing explicitly promoted seller/admin accounts to manage fulfilment. Browser storage is only a continuity cache; Supabase remains authoritative for commerce records, and the Arc contract remains authoritative for active debt and repayment.

## Supabase setup

1. Open the Supabase SQL Editor for the project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) once to create tables, indexes, seed products and Row Level Security policies.
3. In Authentication settings, enable Ethereum Web3 sign-in.
4. Set the Auth Site URL to `https://vpork.xyz` and add `https://www.vpork.xyz` as an allowed redirect URL.
5. Connect the shop-owner wallet once. The schema securely matches the verified Web3 identity and automatically assigns the canonical contract merchant wallet the `seller` role; every other wallet starts as `buyer`.

Existing databases created before the Web3 identity normalization fix should run [`supabase/fix-web3-wallet-session.sql`](supabase/fix-web3-wallet-session.sql) once. The migration is idempotent and supports both plain `0x…` identities and Supabase's `web3:ethereum:0x…` form.

To start a clean test cycle, run [`supabase/reset-test-data.sql`](supabase/reset-test-data.sql) in the Supabase SQL Editor. It backs up and clears carts, orders, order items and order events, then restores the six-product baseline. Authentication users and seller roles are preserved. Signed Arc Testnet history is immutable, so use a fresh buyer wallet when a completely empty onchain history is required.

The frontend contains only the Supabase project URL and publishable key. Never commit a Supabase secret key, `service_role` key, database password or personal access token.

## Reproduce and verify

```bash
pnpm install
pnpm build:app-kit
pnpm build:contract
pnpm test:contract
pnpm test:ui
pnpm test:supabase
pnpm test:circle-stack
pnpm agent:quote -- --wallet 0xYOUR_AGENT_WALLET --product 1 --quantity 2
```

The contract test compiles Solidity `0.8.24` and exercises merchant controls, buyer authorization, price-linked APR, interest accrual, repayment caps and full repayment on a local EVM. The UI and Supabase tests cover verified deployment, cloud-owned orders, seller role gating, merchant approval, bounded USDC approval and repayment. The Circle stack test verifies the browser App Kit bundle, CCTP route, agent quotation, merchant allowlist, official-USDC token pinning, payment cap, idempotency and mandatory human confirmation.

## Run locally

Serve the repository with any static file server and open `index.html`. An injected wallet such as MetaMask is required for Arc Testnet transactions. The public GitHub Pages deployment is the canonical MVP.

## License

MIT

# VPorkPay

**A USDC-native pork marketplace with merchant-approved onchain store credit on Arc.**

[Final submission links](https://vybao39-rgb.github.io/porkpay/submission.html) · [Live MVP](https://vybao39-rgb.github.io/porkpay/) · [3-minute video](https://vybao39-rgb.github.io/porkpay/VPorkPay-Final-Demo.mp4) · [Final deck](https://vybao39-rgb.github.io/porkpay/VPorkPay-Final-Submission-Deck.pptx) · [Public repository](https://github.com/vybao39-rgb/porkpay)

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
- Review buyer orders and seller fulfilment status.
- Distinguish sample operations data from signed onchain evidence.

### Arc Testnet wallet and payment proof

- Require an injected EVM wallet; there is no fake wallet or browser-payment fallback.
- Add or switch the wallet to Arc Testnet (chain ID `5042002`).
- Read the official Arc Testnet USDC balance.
- Submit an explicitly labelled `0.01` test-USDC self-transfer as a wallet/payment proof.
- Wait for the receipt and link the finalized transaction to Arcscan.

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

## Architecture

```text
Buyer / Merchant
       |
Injected EVM wallet
       |
VPorkPay static web app
       |
Arc Testnet
       |
VPorkPayStoreCredit v1.1
       |
Official test USDC -> immutable merchant wallet
       |
Arcscan transaction evidence
```

The frontend is a dependency-free HTML/CSS/JavaScript application hosted on GitHub Pages. All state-changing calls are signed by the user's injected wallet. Browser storage keeps only interface continuity and evidence links; the contract remains authoritative for active debt and repayment.

## Reproduce and verify

```bash
pnpm install
pnpm build:contract
pnpm test:contract
pnpm test:ui
```

The contract test compiles Solidity `0.8.24` and exercises merchant controls, buyer authorization, price-linked APR, interest accrual, repayment caps and full repayment on a local EVM. The UI test simulates verified deployment, a persistent request, merchant approval, bounded USDC approval and repayment.

## Run locally

Serve the repository with any static file server and open `index.html`. An injected wallet such as MetaMask is required for Arc Testnet transactions. The public GitHub Pages deployment is the canonical MVP.

## License

MIT

# VPorkPay

**A USDC-native pork marketplace for fast, transparent buyer-to-supplier payments on Arc.**

[Live Demo](https://vybao39-rgb.github.io/porkpay/) · [Checkpoint 2 Presentation](https://vybao39-rgb.github.io/porkpay/presentation.html) · [Repository](https://github.com/vybao39-rgb/porkpay)

> **Hackathon status:** Functional frontend MVP with Arc Testnet proof payments and a tested store-credit smart contract. The shop owner can deploy the contract from Seller Hub, approve buyer debt onchain, and receive test USDC repayment. Testnet only — do not use real funds. The contract has not been independently audited and does not create a legally binding credit agreement.

## The problem

Small pork buyers and suppliers often coordinate orders through fragmented messages, spreadsheets, cash, or slow bank transfers. This makes price comparison, order tracking, payment confirmation, and settlement harder than necessary.

## The solution

VPorkPay combines a simple marketplace with USDC settlement on Arc. Buyers discover products, build an order, connect a wallet, and pay in USDC. If the available balance is not enough, the buyer can request the shortfall as store credit. The shop owner approves the debt onchain, its annual rate is fixed from the pork-price trend, and the buyer repays test USDC directly to the merchant wallet.

The product is intentionally narrow: **buy pork, pay with USDC, and track the order from purchase to delivery.**

## Hackathon track

**Primary track: DeFi**

VPorkPay uses stablecoin payments as practical commerce infrastructure, focusing on USDC checkout, escrow-style settlement, supplier payouts, and transparent transaction records.

## Current MVP

- Browse six pork products with prices in USDC
- Search products and filter by category
- Save favorite products
- Add items to cart and change quantities
- Connect an EVM wallet
- Add or switch to Arc Testnet
- Read the connected wallet's Arc Testnet USDC balance
- Offer store credit when the available balance is below the order total
- Deploy the `VPorkPayStoreCredit` contract from the shop-owner wallet
- Approve buyer credit onchain from Seller Hub
- Accrue simple interest using Arc block time and a pork-price-linked fixed APR
- Approve and repay Arc Testnet USDC directly to the merchant wallet
- Show transaction proofs on Arcscan
- Complete a guided demo checkout
- Enter delivery information
- Review buyer orders and fulfillment progress
- Confirm delivery
- View seller metrics and incoming order status
- Persist contract and order UI state locally while keeping the debt and repayment source of truth onchain
- Responsive layout for desktop and mobile

## Meaningful use of Arc and Circle

### Implemented

- Arc Testnet wallet network setup
- USDC-denominated product pricing and order totals
- Arc Testnet USDC balance lookup and 0.01 USDC proof payment
- Merchant-controlled store-credit smart contract
- Per-order onchain principal, buyer, opening time, APR and closed status
- Block-time interest accrual and test USDC `transferFrom` repayment
- Buyer and supplier flow designed around stablecoin settlement

### Next integration milestone

- Send testnet USDC using Circle App Kit Send
- Save transaction hashes and link orders to Arcscan
- Deploy a minimal escrow contract on Arc Testnet
- Release funds after buyer delivery confirmation
- Add refund handling for cancelled orders

## Onchain store credit

When a connected wallet cannot cover the order total, checkout offers a simple onchain credit request:

1. Available balance is applied to the order calculation.
2. The missing amount becomes a pending request; no debt exists yet.
3. The deploying merchant wallet calls `openDebt` for that order on Arc Testnet.
4. Annual interest uses a transparent contract formula: an 8% base rate plus 50% of the annual pork-price change, capped between 6% and 18%. The APR is fixed when the debt opens.
5. My orders reads the live amount due from the contract.
6. The buyer first approves test USDC, then calls `repayInFull`; the contract transfers the full amount directly to the immutable merchant address.

Only the merchant can open or cancel a debt, only its recorded buyer can repay it, order IDs cannot be reused, and repayment is protected against reentrancy. Source is in [`contracts/VPorkPayStoreCredit.sol`](contracts/VPorkPayStoreCredit.sol). This is an unaudited testnet prototype, not a production lending product or legal credit process.

Arc is a strong fit because USDC is its native gas token and Circle App Kit provides a direct path to Send, Bridge, Swap, and Unified Balance capabilities.

## User flow

1. A buyer browses pork products and adds items to the cart.
2. The buyer connects a wallet and switches to Arc Testnet.
3. VPorkPay calculates the total in USDC.
4. The buyer submits delivery details and approves payment.
5. Funds are held for the order in the planned escrow flow.
6. The supplier fulfills the order.
7. The buyer confirms delivery and funds are released.

## Technical architecture

```text
Buyer / Supplier
       |
VPorkPay Web App
       |
EVM Wallet
       |
Arc Testnet
       |
VPorkPayStoreCredit Contract
       |
Arc Testnet USDC → Merchant Wallet
```

The frontend is a dependency-free static web application built with HTML, CSS, and JavaScript and hosted on GitHub Pages. The Solidity contract is compiled into the browser deployment artifact at [`assets/vporkpay-store-credit.json`](assets/vporkpay-store-credit.json). Arc Testnet USDC is fixed to Circle's published address `0x3600000000000000000000000000000000000000`.

## Roadmap

### Checkpoint 1 — Idea and prototype

- Define the buyer/supplier problem
- Publish the marketplace UI
- Add wallet connection and Arc Testnet setup
- Document the Arc and USDC integration plan

### Checkpoint 2 — Onchain payment

- Integrate testnet USDC payment
- Display pending, confirmed, and failed payment states
- Store and display transaction hashes
- Publish progress and architecture notes

### Final submission — Escrow MVP

- Deploy and verify the escrow contract on Arc Testnet
- Connect checkout, delivery confirmation, payout, and refund flows
- Add contract tests and end-to-end scenarios
- Record a three-minute demo
- Publish the final pitch deck and submission links

## Run locally

No build step is required. Clone or download the repository and open `index.html`, or serve the directory with any static file server. Use a browser wallet such as MetaMask for the Arc Testnet connection flow.

## Checkpoint 1 submission summary

**Project name:** VPorkPay

**Track:** DeFi

**One-line pitch:** VPorkPay is a USDC-native marketplace that helps pork buyers and verified suppliers place orders, secure payments, and settle quickly on Arc.

**Description:** VPorkPay simplifies pork commerce for small buyers and suppliers. Buyers can compare products, place an order, connect an EVM wallet, and pay a USDC-denominated total. Suppliers can manage incoming orders and follow fulfillment and settlement from a single dashboard. The current public MVP demonstrates the complete marketplace and order-management experience, including Arc Testnet wallet setup. The next milestone is real testnet USDC payment through Circle App Kit Send, followed by a minimal Arc escrow contract that releases funds after delivery confirmation.

## License

MIT

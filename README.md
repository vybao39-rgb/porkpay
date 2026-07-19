# PorkPay

**A USDC-native pork marketplace for fast, transparent buyer-to-supplier payments on Arc.**

[Live Demo](https://vybao39-rgb.github.io/porkpay/) · [Repository](https://github.com/vybao39-rgb/porkpay)

> **Hackathon status:** Functional frontend MVP. Wallet connection and Arc Testnet setup are available. Real USDC transfers and onchain escrow are the next milestone. Testnet/demo only — do not use real funds.

## The problem

Small pork buyers and suppliers often coordinate orders through fragmented messages, spreadsheets, cash, or slow bank transfers. This makes price comparison, order tracking, payment confirmation, and settlement harder than necessary.

## The solution

PorkPay combines a simple marketplace with USDC settlement on Arc. Buyers discover products, build an order, connect a wallet, and pay in USDC. Suppliers review incoming orders and track fulfillment and settlement from one dashboard.

The product is intentionally narrow: **buy pork, pay with USDC, and track the order from purchase to delivery.**

## Hackathon track

**Primary track: DeFi**

PorkPay uses stablecoin payments as practical commerce infrastructure, focusing on USDC checkout, escrow-style settlement, supplier payouts, and transparent transaction records.

## Current MVP

- Browse six pork products with prices in USDC
- Search products and filter by category
- Save favorite products
- Add items to cart and change quantities
- Connect an EVM wallet
- Add or switch to Arc Testnet
- Complete a guided demo checkout
- Enter delivery information
- Review buyer orders and fulfillment progress
- Confirm delivery
- View seller metrics and incoming order status
- Persist demo state locally in the browser
- Responsive layout for desktop and mobile

## Meaningful use of Arc and Circle

### Implemented

- Arc Testnet wallet network setup
- USDC-denominated product pricing and order totals
- Buyer and supplier flow designed around stablecoin settlement

### Next integration milestone

- Send testnet USDC using Circle App Kit Send
- Save transaction hashes and link orders to Arcscan
- Deploy a minimal escrow contract on Arc Testnet
- Release funds after buyer delivery confirmation
- Add refund handling for cancelled orders

Arc is a strong fit because USDC is its native gas token and Circle App Kit provides a direct path to Send, Bridge, Swap, and Unified Balance capabilities.

## User flow

1. A buyer browses pork products and adds items to the cart.
2. The buyer connects a wallet and switches to Arc Testnet.
3. PorkPay calculates the total in USDC.
4. The buyer submits delivery details and approves payment.
5. Funds are held for the order in the planned escrow flow.
6. The supplier fulfills the order.
7. The buyer confirms delivery and funds are released.

## Technical architecture

```text
Buyer / Supplier
       |
PorkPay Web App
       |
EVM Wallet
       |
Arc Testnet + USDC
       |
Planned Escrow Contract / Circle App Kit Send
```

The current demo is a dependency-free static web application built with HTML, CSS, and JavaScript and hosted on GitHub Pages.

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

**Project name:** PorkPay  
**Track:** DeFi  
**One-line pitch:** PorkPay is a USDC-native marketplace that helps pork buyers and verified suppliers place orders, secure payments, and settle quickly on Arc.

**Description:** PorkPay simplifies pork commerce for small buyers and suppliers. Buyers can compare products, place an order, connect an EVM wallet, and pay a USDC-denominated total. Suppliers can manage incoming orders and follow fulfillment and settlement from a single dashboard. The current public MVP demonstrates the complete marketplace and order-management experience, including Arc Testnet wallet setup. The next milestone is real testnet USDC payment through Circle App Kit Send, followed by a minimal Arc escrow contract that releases funds after delivery confirmation.

## License

MIT

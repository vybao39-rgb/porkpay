# VPorkPay

**A USDC-native pork marketplace for fast, transparent buyer-to-supplier payments on Arc.**

[Live Demo](https://vybao39-rgb.github.io/porkpay/) · [Checkpoint 2 Presentation](https://vybao39-rgb.github.io/porkpay/presentation.html) · [Repository](https://github.com/vybao39-rgb/porkpay)

> **Hackathon status:** Functional frontend MVP with Arc Testnet proof payments and a simple browser-based store-credit flow. The debt record and interest calculation are simulations until a contract and legal credit process are implemented. Testnet/demo only — do not use real funds.

## The problem

Small pork buyers and suppliers often coordinate orders through fragmented messages, spreadsheets, cash, or slow bank transfers. This makes price comparison, order tracking, payment confirmation, and settlement harder than necessary.

## The solution

VPorkPay combines a simple marketplace with USDC settlement on Arc. Buyers discover products, build an order, connect a wallet, and pay in USDC. If the available balance is not enough, the demo can record the missing amount as debt owed to the shop owner, with an annual rate linked to the pork-price trend.

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
- Calculate one-year interest using the demo pork-price trend
- Show and repay the customer's demo debt in My orders
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
- Arc Testnet USDC balance lookup and 0.01 USDC proof payment
- Simple store-credit shortfall and annual-interest calculation
- Buyer and supplier flow designed around stablecoin settlement

### Next integration milestone

- Send testnet USDC using Circle App Kit Send
- Save transaction hashes and link orders to Arcscan
- Deploy a minimal escrow contract on Arc Testnet
- Release funds after buyer delivery confirmation
- Add refund handling for cancelled orders

## Simple store credit

When a connected wallet cannot cover the order total, checkout offers a simple browser-based credit option:

1. Available balance is applied to the order calculation.
2. The missing amount becomes debt owed to the primary shop owner.
3. Annual interest uses a transparent demo formula: an 8% base rate plus 50% of the annual pork-price change, capped between 6% and 18%.
4. My orders shows principal, APR, estimated one-year interest and total repayment.
5. The customer can clear the demo debt with one repayment action.

No real credit decision, fund transfer or legally binding debt is created in this version.

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

**Project name:** VPorkPay

**Track:** DeFi

**One-line pitch:** VPorkPay is a USDC-native marketplace that helps pork buyers and verified suppliers place orders, secure payments, and settle quickly on Arc.

**Description:** VPorkPay simplifies pork commerce for small buyers and suppliers. Buyers can compare products, place an order, connect an EVM wallet, and pay a USDC-denominated total. Suppliers can manage incoming orders and follow fulfillment and settlement from a single dashboard. The current public MVP demonstrates the complete marketplace and order-management experience, including Arc Testnet wallet setup. The next milestone is real testnet USDC payment through Circle App Kit Send, followed by a minimal Arc escrow contract that releases funds after delivery confirmation.

## License

MIT

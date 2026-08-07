# VPorkPay onchain store credit

`VPorkPayStoreCredit.sol` is the Arc Testnet contract behind VPorkPay's merchant-approved store-credit flow.

## Contract roles

- **Merchant:** the wallet that deploys the contract. It is immutable and is the only wallet allowed to open or cancel debt and update the pork-price index.
- **Buyer:** the wallet recorded for an order. It is the only wallet allowed to repay that order.
- **USDC:** the immutable token used for repayment. The browser deployer supplies Circle's Arc Testnet USDC address.

## Credit lifecycle

1. Checkout creates a pending credit request in the UI.
2. The merchant calls `openDebt(orderId, buyer, principal)`.
3. The contract fixes the APR at opening time: `8% + 50% × pork price change`, clamped to 6–18%.
4. Simple interest accrues from Arc block time.
5. The buyer approves the full current amount due on the USDC contract.
6. The buyer calls `repayInFull(orderId, maxAmount)`. The contract rejects a charge above that cap and transfers only the live amount due to the merchant.

## Safety boundaries

- Arc Testnet only; test USDC has no monetary value.
- Maximum principal is 1,000,000 USDC per order.
- Pork-price input is limited to -40% through +40%.
- Order IDs cannot be reused.
- Repayment uses checks-effects-interactions and a reentrancy lock.
- Repayment has a buyer-supplied maximum so block-time interest cannot create an unexpected charge.
- `CONTRACT_ID` lets the frontend reject unrelated contracts pasted into Seller Hub.
- The merchant can cancel an active debt.
- The contract has not been independently audited and is not a legal credit agreement.

The frontend deployment artifact is published at `assets/vporkpay-store-credit.json` so the merchant can deploy through an injected wallet without exposing a private key.

Run `pnpm install`, `pnpm build:contract`, `pnpm test:contract` and `pnpm test:ui` to rebuild the published browser artifact and test permissions, APR bounds, stale repayment quotes, USDC settlement, persistent requests and the full wallet experience.

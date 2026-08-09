# VPorkPay Procurement Agent

This integration uses Circle Agent Stack's official `@circle-fin/cli` and an Arc Testnet Agent Wallet to pay the immutable VPorkPay merchant in USDC. The agent calculates the order from the public catalog, enforces a 100 USDC per-order cap, restricts the recipient to the verified merchant, and refuses to move funds without the explicit `ARC_TESTNET_ONLY` confirmation phrase.

## 1. Log in and fund the Agent Wallet

```bash
pnpm exec circle wallet login you@example.com --testnet
pnpm exec circle wallet list --type agent --chain ARC-TESTNET
pnpm exec circle wallet fund --address 0xYOUR_AGENT_WALLET --chain ARC-TESTNET
```

## 2. Generate a safe dry-run plan

```bash
pnpm agent:quote -- --wallet 0xYOUR_AGENT_WALLET --product 1 --quantity 2
```

## 3. Execute only after reviewing the plan

```bash
pnpm agent:quote -- --wallet 0xYOUR_AGENT_WALLET --product 1 --quantity 2 --order-id demo-001 --execute --confirm ARC_TESTNET_ONLY
```

`--order-id` becomes Circle's idempotency key so retrying the same order cannot intentionally create a second payment. Arc Testnet only. Never provide a private key to this script; Circle Agent Wallet authentication remains in Circle CLI.

import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";

const kit = new AppKit();

function normalizedAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
    throw new Error("Bridge amount must be greater than 0 and no more than 1,000 test USDC.");
  }
  return amount.toFixed(2);
}

async function bridgeParams(provider, amount) {
  if (!provider?.request) throw new Error("Connect an EIP-1193 wallet such as MetaMask first.");
  const adapter = await createViemAdapterFromProvider({ provider });
  return {
    from: { adapter, chain: "Ethereum_Sepolia" },
    to: { adapter, chain: "Arc_Testnet" },
    amount: normalizedAmount(amount)
  };
}

function safeResult(value) {
  return JSON.parse(JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item));
}

async function estimateBridge(provider, amount) {
  return safeResult(await kit.estimateBridge(await bridgeParams(provider, amount)));
}

async function bridge(provider, amount) {
  return safeResult(await kit.bridge(await bridgeParams(provider, amount)));
}

window.VPorkCircleAppKit = Object.freeze({ estimateBridge, bridge });

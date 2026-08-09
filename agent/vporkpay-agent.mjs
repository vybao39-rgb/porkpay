import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(join(here, "vporkpay-agent.json"), "utf8"));
const products = JSON.parse(readFileSync(join(here, "products.json"), "utf8"));
const args = new Map();

for (let index = 2; index < process.argv.length; index += 1) {
  const key = process.argv[index];
  if (!key.startsWith("--")) continue;
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else args.set(key, true);
}

const wallet = String(args.get("--wallet") || "");
const productId = Number(args.get("--product"));
const quantityKg = Number(args.get("--quantity"));
const orderId = String(args.get("--order-id") || "");
const execute = args.get("--execute") === true;
const confirmation = String(args.get("--confirm") || "");
const isAddress = value => /^0x[0-9a-fA-F]{40}$/.test(value);
const isOrderId = value => /^[a-zA-Z0-9][a-zA-Z0-9-]{2,63}$/.test(value);

if (!isAddress(wallet)) throw new Error("Provide a valid Circle Agent Wallet address with --wallet.");
const product = products.find(item => item.id === productId);
if (!product) throw new Error("Choose a valid product id with --product.");
if (!Number.isFinite(quantityKg) || quantityKg < product.minimumKg) {
  throw new Error(`Minimum quantity for ${product.name} is ${product.minimumKg} kg.`);
}

const totalUsdc = Math.round(product.priceUsdcPerKg * quantityKg * 100) / 100;
if (totalUsdc > manifest.maxOrderUsdc) {
  throw new Error(`Agent policy blocks orders above ${manifest.maxOrderUsdc} USDC.`);
}

const merchant = manifest.merchantAllowlist[0];
const plan = {
  mode: execute ? "execute" : "dry-run",
  network: manifest.network,
  wallet,
  merchant,
  product: product.name,
  quantityKg,
  totalUsdc: totalUsdc.toFixed(2),
  orderId: orderId || "required-before-execution",
  safeguards: {
    merchantAllowlisted: true,
    belowOrderLimit: true,
    humanConfirmationRequired: true
  }
};

if (!execute) {
  console.log(JSON.stringify(plan, null, 2));
  console.log(`\nTo execute after Circle Agent Wallet login, add: --execute --confirm ARC_TESTNET_ONLY`);
  process.exit(0);
}

if (confirmation !== "ARC_TESTNET_ONLY") {
  throw new Error("Execution requires --confirm ARC_TESTNET_ONLY. Never use real funds.");
}
if (!isOrderId(orderId)) {
  throw new Error("Execution requires a stable 3-64 character --order-id for idempotent payment retries.");
}

const circleCli = join(here, "..", "node_modules", "@circle-fin", "cli", "dist", "index.js");
const result = execFileSync(process.execPath, [circleCli,
  "wallet", "transfer", merchant,
  "--amount", totalUsdc.toFixed(2),
  "--token", manifest.usdcContract,
  "--address", wallet,
  "--chain", manifest.network,
  "--idempotency-key", `vporkpay-${orderId}`,
  "--output", "json"
], { encoding: "utf8", stdio: ["inherit", "pipe", "inherit"] });

console.log(JSON.stringify({ ...plan, circleResult: JSON.parse(result) }, null, 2));

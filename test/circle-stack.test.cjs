const fs = require("fs");
const { spawnSync } = require("child_process");
const { JSDOM } = require("jsdom");

const appKitSource = fs.readFileSync("src/circle-app-kit.js", "utf8");
const page = fs.readFileSync("index.html", "utf8");
const submission = fs.readFileSync("submission.html", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

for (const required of ["@circle-fin/app-kit", "@circle-fin/adapter-viem-v2", "viem"]) {
  if (!packageJson.dependencies?.[required]) throw new Error(`Missing Circle App Kit dependency: ${required}`);
}
if (!packageJson.devDependencies?.["@circle-fin/cli"]) throw new Error("Missing official Circle Agent CLI dependency");
if (!appKitSource.includes("kit.estimateBridge") || !appKitSource.includes("kit.bridge")) {
  throw new Error("App Kit integration must estimate and execute a real bridge");
}
if (!appKitSource.includes('chain: "Ethereum_Sepolia"') || !appKitSource.includes('chain: "Arc_Testnet"')) {
  throw new Error("App Kit bridge route must terminate on Arc Testnet");
}
if (!page.includes("Fund Arc with Circle App Kit") || !page.includes("assets/circle-app-kit.bundle.js")) {
  throw new Error("Live checkout does not expose the lazy-loaded App Kit flow");
}
if (!submission.includes("Circle Agent Stack") || !submission.includes("Circle App Kit")) {
  throw new Error("Submission page does not disclose the Circle stack integrations");
}
if (!fs.statSync("assets/circle-app-kit.bundle.js").size) throw new Error("Browser App Kit bundle is empty");

const browser = new JSDOM("<!doctype html><html><body></body></html>", {
  runScripts: "outside-only",
  url: "https://vpork.xyz/"
});
for (const name of [
  "TextEncoder", "TextDecoder", "AbortController", "AbortSignal", "Headers",
  "Request", "Response", "fetch", "structuredClone"
]) {
  if (globalThis[name]) Object.defineProperty(browser.window, name, { value: globalThis[name], configurable: true });
}
browser.window.eval(fs.readFileSync("assets/circle-app-kit.bundle.js", "utf8"));
if (typeof browser.window.VPorkCircleAppKit?.estimateBridge !== "function" ||
    typeof browser.window.VPorkCircleAppKit?.bridge !== "function") {
  throw new Error("Browser App Kit bundle did not initialize its public API");
}

const quote = spawnSync(process.execPath, [
  "agent/vporkpay-agent.mjs",
  "--wallet", "0x2222222222222222222222222222222222222222",
  "--product", "1",
  "--quantity", "2"
], { encoding: "utf8" });

if (quote.status !== 0) throw new Error(quote.stderr || "Agent dry-run failed");
if (!quote.stdout.includes('"totalUsdc": "13.60"')) throw new Error("Agent quote calculated the wrong order total");
if (!quote.stdout.includes('"merchantAllowlisted": true')) throw new Error("Agent plan omitted the merchant allowlist safeguard");
if (!quote.stdout.includes("ARC_TESTNET_ONLY")) throw new Error("Agent plan omitted mandatory human confirmation");
const agentSource = fs.readFileSync("agent/vporkpay-agent.mjs", "utf8");
if (!agentSource.includes('"--token", manifest.usdcContract')) throw new Error("Agent payment is not pinned to official Arc Testnet USDC");
if (!agentSource.includes('"--idempotency-key"')) throw new Error("Agent payment does not protect retries with an idempotency key");

const rejected = spawnSync(process.execPath, [
  "agent/vporkpay-agent.mjs",
  "--wallet", "0x2222222222222222222222222222222222222222",
  "--product", "1",
  "--quantity", "1"
], { encoding: "utf8" });
if (rejected.status === 0) throw new Error("Agent accepted an order below the supplier minimum");

console.log("PASS: Circle App Kit bridge and policy-bounded Agent Stack payment runner");

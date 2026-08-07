const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { Interface, id } = require("ethers");

const repo = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(__dirname, "VPorkPayStoreCredit.sol"), "utf8");
const output = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity",
  sources: { "VPorkPayStoreCredit.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
})));

for (const diagnostic of output.errors || []) {
  console[diagnostic.severity === "error" ? "error" : "warn"](diagnostic.formattedMessage);
}
if ((output.errors || []).some(diagnostic => diagnostic.severity === "error")) process.exit(1);

const compiled = output.contracts["VPorkPayStoreCredit.sol"].VPorkPayStoreCredit;
const contractInterface = new Interface(compiled.abi);
const signatures = [
  "CONTRACT_ID()",
  "merchant()",
  "usdc()",
  "porkPriceChangeBps()",
  "setPorkPriceChangeBps(int16)",
  "openDebt(bytes32,address,uint128)",
  "amountDue(bytes32)",
  "repayInFull(bytes32,uint256)",
  "debts(bytes32)",
];
const selectors = Object.fromEntries(signatures.map(signature => [signature, contractInterface.getFunction(signature).selector]));

const artifact = {
  contractName: "VPorkPayStoreCredit",
  contractId: id("VPorkPayStoreCredit:v1.1"),
  compiler: solc.version(),
  network: {
    name: "Arc Testnet",
    chainId: 5042002,
    usdc: "0x3600000000000000000000000000000000000000",
  },
  abi: compiled.abi,
  bytecode: `0x${compiled.evm.bytecode.object}`,
  selectors,
};

const outputPath = path.join(repo, "assets/vporkpay-store-credit.json");
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`Wrote ${path.relative(repo, outputPath)} (${artifact.bytecode.length / 2} bytes)`);

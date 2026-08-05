const fs = require("fs");
const path = require("path");
const solc = require("solc");
const ganache = require("ganache");
const { BrowserProvider, ContractFactory } = require("ethers");

const contractsDir = path.resolve(__dirname, "..");
const sources = {};
for (const file of ["VPorkPayStoreCredit.sol", "MockUSDC.sol"]) {
  sources[file] = { content: fs.readFileSync(path.join(contractsDir, file), "utf8") };
}

const output = JSON.parse(solc.compile(JSON.stringify({
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
})));
for (const diagnostic of output.errors || []) console[diagnostic.severity === "error" ? "error" : "warn"](diagnostic.formattedMessage);
if ((output.errors || []).some(diagnostic => diagnostic.severity === "error")) process.exit(1);

const artifact = name => {
  const compiled = output.contracts[`${name}.sol`][name];
  return { abi: compiled.abi, bytecode: `0x${compiled.evm.bytecode.object}` };
};

async function expectRevert(operation, label) {
  try {
    const result = await operation();
    if (result && typeof result.wait === "function") await result.wait();
  } catch {
    return;
  }
  throw new Error(`Expected revert: ${label}`);
}

async function main() {
  const chain = ganache.provider({ logging: { quiet: true }, wallet: { totalAccounts: 3 } });
  const provider = new BrowserProvider(chain);
  const merchant = await provider.getSigner(0);
  const buyer = await provider.getSigner(1);
  const outsider = await provider.getSigner(2);

  const mock = await new ContractFactory(artifact("MockUSDC").abi, artifact("MockUSDC").bytecode, merchant).deploy();
  await mock.waitForDeployment();
  await (await mock.mint(await buyer.getAddress(), 1_000_000_000n)).wait();

  const credit = await new ContractFactory(artifact("VPorkPayStoreCredit").abi, artifact("VPorkPayStoreCredit").bytecode, merchant)
    .deploy(await mock.getAddress(), 640);
  await credit.waitForDeployment();

  if ((await credit.aprForPriceChange(640)) !== 1120n) throw new Error("APR +6.4% should be 11.2%");
  if ((await credit.aprForPriceChange(-1000)) !== 600n) throw new Error("APR floor should be 6%");
  if ((await credit.aprForPriceChange(4000)) !== 1800n) throw new Error("APR cap should be 18%");

  const orderId = `0x${"11".repeat(32)}`;
  await expectRevert(
    () => credit.connect(outsider).openDebt(orderId, buyer.getAddress(), 100_000_000n),
    "non-merchant opens debt",
  );
  await (await credit.openDebt(orderId, await buyer.getAddress(), 100_000_000n)).wait();
  await expectRevert(() => credit.openDebt(orderId, buyer.getAddress(), 100_000_000n), "duplicate order");

  await chain.request({ method: "evm_increaseTime", params: [365 * 24 * 60 * 60] });
  await chain.request({ method: "evm_mine", params: [] });
  const due = await credit.amountDue(orderId);
  if (due < 111_199_990n || due > 111_200_100n) throw new Error(`Unexpected one-year amount due: ${due}`);

  const merchantBefore = await mock.balanceOf(await merchant.getAddress());
  await (await mock.connect(buyer).approve(await credit.getAddress(), due + 100n)).wait();
  await (await credit.connect(buyer).repayInFull(orderId)).wait();
  const merchantAfter = await mock.balanceOf(await merchant.getAddress());
  if (merchantAfter - merchantBefore < due) throw new Error("Merchant did not receive USDC repayment");
  if ((await credit.amountDue(orderId)) !== 0n) throw new Error("Debt should be closed");
  if (!(await credit.debts(orderId)).closed) throw new Error("Debt closed flag was not set");
  await expectRevert(() => credit.connect(buyer).repayInFull(orderId), "repaying a closed debt");

  console.log("PASS: VPorkPayStoreCredit full lifecycle");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

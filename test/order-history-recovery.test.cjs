const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");

const html = fs.readFileSync("index.html", "utf8");
const artifact = JSON.parse(fs.readFileSync("assets/vporkpay-store-credit.json", "utf8"));
const buyer = "0x50A67ae502F2972d96cEA6F4b1A84bF00F07dca1";
const merchant = "0xF2d062B3920B342f6c6C4ECFD22c39a79E1E33d0";
const contract = "0xd9dAB755431664aDA2D13868674Ddb43FfDEF396";
const usdc = "0x3600000000000000000000000000000000000000";
const openedTopic = "0xad505d493d6d8809fd2ed2047004c87e07237849c60e7555cb0c360e52c0dd57";
const repaidTopic = "0xa7e3334dcefe7cac00fb627e53fe0a03f0027ac7d3b075d02c55435ca548f391";
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const orderA = "0x08c3ef882ceb2bf04f374d44688d6a64d391abda40cd65e35f932cc93a498ee6";
const orderB = "0xbf2f40c65b90547d13fd034b87cdf33bcb0b32900a8b519e3a79cff41ea93c4a";
const paymentHash = "0xfd1358bf60112b6501e6309db0fe47a54ea244bf9a8928883801c06bf544d4c9";
const word = value => BigInt(value).toString(16).padStart(64, "0");
const addressWord = value => value.slice(2).toLowerCase().padStart(64, "0");
const topicAddress = value => "0x" + addressWord(value);
const debtResult = (principal, openedAt) => "0x" + [addressWord(buyer), word(principal), word(0), word(openedAt), word(1120), word(0)].join("");

const debtLogs = [
  { topics: [openedTopic, orderA, topicAddress(buyer)], transactionHash: "0xad547171959fecde933ae4ae6296bed253a61b86c1df87cae08d1212d8427902" },
  { topics: [openedTopic, orderB, topicAddress(buyer)], transactionHash: "0x86f2c80aaecba2b9ef9db8d01ae0a879b33f308d604aebe86027dcfde687e4de" }
];
const paymentLogs = [{
  topics: [transferTopic, topicAddress(buyer), topicAddress(merchant)],
  data: "0x" + word(9_400_000),
  blockNumber: "0x3560809",
  transactionHash: paymentHash
}];

const ethereum = {
  on() {},
  async request({ method, params = [] }) {
    if (method === "eth_accounts" || method === "eth_requestAccounts") return [buyer];
    if (method === "eth_chainId") return "0x4cef52";
    if (method === "eth_getCode") return "0x6001600055";
    if (method === "eth_getLogs") {
      const topic = params[0].topics[0];
      if (topic === openedTopic) return debtLogs;
      if (topic === repaidTopic) return [];
      if (topic === transferTopic) return paymentLogs;
    }
    if (method === "eth_getBlockByNumber") return { timestamp: "0x68977b71" };
    if (method === "eth_call") {
      const { to, data } = params[0];
      if (to.toLowerCase() === usdc.toLowerCase()) return "0x" + word(49_592_517);
      if (data === artifact.selectors["CONTRACT_ID()"] ) return artifact.contractId;
      if (data === artifact.selectors["merchant()"] ) return "0x" + addressWord(merchant);
      if (data === artifact.selectors["usdc()"] ) return "0x" + addressWord(usdc);
      if (data === artifact.selectors["porkPriceChangeBps()"] ) return "0x" + word(640);
      if (data === artifact.selectors["debts(bytes32)"] + orderA.slice(2)) return debtResult(21_600_000, 1_786_208_657);
      if (data === artifact.selectors["debts(bytes32)"] + orderB.slice(2)) return debtResult(27_000_000, 1_786_207_519);
      if (data === artifact.selectors["amountDue(bytes32)"] + orderA.slice(2)) return "0x" + word(21_605_006);
      if (data === artifact.selectors["amountDue(bytes32)"] + orderB.slice(2)) return "0x" + word(27_006_368);
    }
    throw new Error(`Unhandled RPC method: ${method}`);
  }
};

const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", error => runtimeErrors.push(error.message));
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  url: "https://vpork.xyz/#orders",
  virtualConsole,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.ethereum = ethereum;
    window.fetch = async () => ({ ok: true, json: async () => artifact });
  }
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  await wait(80);
  const document = dom.window.document;
  const text = selector => document.querySelector(selector).textContent.trim();
  if (text("#paidOrderCount") !== "1") throw new Error("Direct Arc payment was not recovered");
  if (text("#activeDebtCount") !== "2") throw new Error("Both active Arc debts were not recovered");
  if (text("#activeDebtTotal") !== "48.61 USDC") throw new Error("Active debt total is incorrect");
  const orders = text("#savedOrderCards");
  for (const label of ["PAID IN FULL", "DEBT ACTIVE", "9.40 USDC", "21.60 USDC", "27.00 USDC", "11.20%", "Ordered at", "Interest now", "Total due now"]) {
    if (!orders.includes(label)) throw new Error(`Recovered order history is missing ${label}`);
  }
  if (runtimeErrors.length) throw new Error("Runtime errors: " + runtimeErrors.join(" | "));
  console.log("PASS: Arc history recovers one paid order and two interest-bearing debts with exact totals");
  dom.window.close();
})().catch(error => {
  console.error(error.stack || error.message);
  dom.window.close();
  process.exit(1);
});

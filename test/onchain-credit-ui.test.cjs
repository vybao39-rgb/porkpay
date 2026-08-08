const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");

const html = fs.readFileSync("index.html", "utf8");
const artifact = JSON.parse(fs.readFileSync("assets/vporkpay-store-credit.json", "utf8"));
const merchant = "0x1111111111111111111111111111111111111111";
const buyer = "0x2222222222222222222222222222222222222222";
const contractAddress = "0x3333333333333333333333333333333333333333";
const usdc = "0x3600000000000000000000000000000000000000";
let account = merchant;
let txCount = 0;
let amountDue = 5_600_000n;
const receipts = new Map();
const listeners = {};
let cloudSession = null;
let cloudOrderWrites = 0;
let cloudItemWrites = 0;

const word = value => BigInt(value).toString(16).padStart(64, "0");
const addressResult = value => "0x" + value.slice(2).padStart(64, "0");

const ethereum = {
  on(event, handler) {
    listeners[event] = handler;
  },
  async request({ method, params = [] }) {
    if (method === "eth_accounts") return [account];
    if (method === "eth_requestAccounts") return [account];
    if (method === "eth_chainId") return "0x4cef52";
    if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
    if (method === "eth_getCode") return "0x6001600055";
    if (method === "eth_call") {
      const call = params[0];
      if (call.to.toLowerCase() === usdc.toLowerCase()) return "0x" + word(8_000_000n);
      if (call.data === artifact.selectors["CONTRACT_ID()"]) return artifact.contractId;
      if (call.data === artifact.selectors["merchant()"]) return addressResult(merchant);
      if (call.data === artifact.selectors["usdc()"]) return addressResult(usdc);
      if (call.data === artifact.selectors["porkPriceChangeBps()"]) return "0x" + word(640n);
      if (call.data.startsWith(artifact.selectors["amountDue(bytes32)"])) return "0x" + word(amountDue);
      return "0x" + word(0);
    }
    if (method === "eth_sendTransaction") {
      txCount += 1;
      const hash = "0x" + txCount.toString(16).padStart(64, "0");
      const transaction = params[0];
      const receipt = { status: "0x1", transactionHash: hash };
      if (!transaction.to) receipt.contractAddress = contractAddress;
      if (transaction.data?.startsWith(artifact.selectors["repayInFull(bytes32,uint256)"])) amountDue = 0n;
      receipts.set(hash, receipt);
      return hash;
    }
    if (method === "eth_getTransactionReceipt") return receipts.get(params[0]) || null;
    throw new Error(`Unhandled RPC method: ${method}`);
  },
  switchAccount(next) {
    account = next;
    listeners.accountsChanged?.([next]);
  },
};

const cloudUser = () => ({
  id: "00000000-0000-4000-8000-000000000001",
  user_metadata: { address: account },
  identities: [{ provider: "web3", identity_data: { address: account } }]
});

const supabase = {
  createClient() {
    return {
      auth: {
        async getSession() { return { data: { session: cloudSession }, error: null }; },
        async signInWithWeb3() {
          const user = cloudUser();
          cloudSession = { user };
          return { data: { user, session: cloudSession }, error: null };
        },
        async signOut() { cloudSession = null; return { error: null }; }
      },
      from(table) {
        let operation = "";
        const result = () => ({ data: operation === "select" ? [] : null, error: null });
        const builder = {
          select() { operation = "select"; return builder; },
          delete() { operation = "delete"; return builder; },
          update() { operation = "update"; return builder; },
          eq() { return builder; },
          order() { return Promise.resolve(result()); },
          single() {
            return Promise.resolve({
              data: { user_id: cloudUser().id, wallet_address: account, role: "buyer" },
              error: null
            });
          },
          insert() {
            if (table === "order_items") cloudItemWrites += 1;
            return Promise.resolve({ data: null, error: null });
          },
          upsert() {
            if (table === "orders") cloudOrderWrites += 1;
            return Promise.resolve({ data: null, error: null });
          },
          then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); }
        };
        return builder;
      }
    };
  }
};

const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", error => runtimeErrors.push(error.message));
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  url: "https://vporkpay.test/#seller",
  virtualConsole,
  beforeParse(window) {
    window.scrollTo = () => {};
    window.ethereum = ethereum;
    window.supabase = supabase;
    window.fetch = async () => ({ ok: true, json: async () => artifact });
  },
});

const { document, Event, localStorage } = dom.window;
const click = selector => document.querySelector(selector).click();
const text = selector => document.querySelector(selector).textContent.trim();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  if (document.querySelector("#contractAddressInput").value.toLowerCase() !== "0xd9dab755431664ada2d13868674ddb43ffdef396") {
    throw new Error("Canonical Arc Testnet contract should be configured by default");
  }
  if (!document.querySelector("#deploymentProof").href.endsWith("0x07acbc8ad1f7a2a2ef0dddafd457b93de30a08d4dc33d6881452cc16049a0067")) {
    throw new Error("Canonical deployment transaction should be linked by default");
  }
  if (!document.querySelector("#createProofCreditRequest")) throw new Error("Jury-proof request action should be available");
  click("#walletButton");
  await wait(0);
  const connectedWalletLabel = text("#walletButton");
  click("#walletButton");
  await wait(0);
  if (text("#walletButton") !== connectedWalletLabel) throw new Error("Clicking a connected wallet must not disconnect it");
  click("#deployContract");
  await wait(30);
  if (document.querySelector("#contractAddressInput").value.toLowerCase() !== contractAddress) throw new Error("Deployment address was not saved");
  if (!text("#contractStatus").includes("Verified deployment")) throw new Error("Deployment was not verified");
  if (!localStorage.getItem("vporkpay-deployment-evidence-v1")) throw new Error("Deployment evidence was not persisted");

  ethereum.switchAccount(buyer);
  await wait(0);
  click('[data-view="market"]');
  click('[data-add="1"]');
  if (!JSON.parse(localStorage.getItem("vporkpay-cart-v1"))?.length) throw new Error("Cart was not persisted");
  click("#checkoutButton");
  await wait(0);
  document.querySelector("#useStoreCredit").checked = true;
  document.querySelector("#useStoreCredit").dispatchEvent(new Event("change", { bubbles: true }));
  click("#confirmPayment");
  await wait(700);
  if (text("#debtStatus") !== "AWAITING MERCHANT") throw new Error("Credit request should be pending");
  if (!localStorage.getItem("vporkpay-credit-requests-v1")) throw new Error("Credit request was not persisted");
  if (!localStorage.getItem("vporkpay-buyer-orders-v1")) throw new Error("Buyer order history was not persisted");
  if (!localStorage.getItem("vporkpay-seller-orders-v1")) throw new Error("Seller order history was not persisted");
  if (!cloudOrderWrites || !cloudItemWrites) throw new Error("Order and line items were not persisted to Supabase");
  if (JSON.parse(localStorage.getItem("vporkpay-cart-v1")).length) throw new Error("Persisted cart was not cleared after checkout");

  ethereum.switchAccount(merchant);
  await wait(0);
  click('[data-view="seller"]');
  click("[data-credit-approve]");
  await wait(30);
  if (text("#debtStatus") !== "ONCHAIN ACTIVE") throw new Error("Merchant approval did not activate debt");

  ethereum.switchAccount(buyer);
  await wait(0);
  click('[data-view="orders"]');
  click("#repayDebt");
  await wait(40);
  if (text("#debtStatus") !== "REPAID") throw new Error("Repayment did not close debt");
  if (text("#debtYearTotal") !== "0.00 USDC") throw new Error("Repaid amount due should be zero");
  const lifecycleEvidence = JSON.parse(localStorage.getItem("vporkpay-credit-requests-v1"))[0];
  if (!lifecycleEvidence.openTxHash) throw new Error("Debt-opening proof was not persisted");
  if (!lifecycleEvidence.approveTxHash) throw new Error("USDC-approval proof was not persisted");
  if (!lifecycleEvidence.repayTxHash) throw new Error("Repayment proof was not persisted");
  const persistedBuyerOrder = JSON.parse(localStorage.getItem("vporkpay-buyer-orders-v1"))[0];
  if (persistedBuyerOrder.status !== "Credit repaid") throw new Error("Buyer order status was not synchronized after repayment");
  if (!persistedBuyerOrder.openTxHash || !persistedBuyerOrder.approveTxHash || !persistedBuyerOrder.repayTxHash) {
    throw new Error("Buyer order did not retain the complete onchain lifecycle");
  }
  if (document.querySelector("#debtProofLinks").hidden) throw new Error("Lifecycle evidence links should be visible after repayment");
  if (txCount !== 4) throw new Error(`Expected deploy, open, approve and repay transactions; got ${txCount}`);

  click('[data-view="market"]');
  click('[data-add="2"]');
  const storageSnapshot = Object.fromEntries([
    "vporkpay-cart-v1",
    "vporkpay-buyer-orders-v1",
    "vporkpay-seller-orders-v1",
    "vporkpay-store-debt-v1",
    "vporkpay-credit-contract-v1",
    "vporkpay-deployment-evidence-v1",
    "vporkpay-credit-requests-v1"
  ].map(key => [key, localStorage.getItem(key)]));
  const reloaded = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://vporkpay.test/#orders",
    virtualConsole,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.ethereum = ethereum;
      window.supabase = supabase;
      window.fetch = async () => ({ ok: true, json: async () => artifact });
      Object.entries(storageSnapshot).forEach(([key, value]) => {
        if (value !== null) window.localStorage.setItem(key, value);
      });
    },
  });
  await wait(0);
  if (reloaded.window.document.querySelector("#walletButton").textContent.includes("Connect")) {
    throw new Error("Connected wallet was not restored after page reload");
  }
  if (!reloaded.window.document.querySelector("#cartContent").textContent.includes("Bone-in Pork Chops")) {
    throw new Error("Cart was not restored after page reload");
  }
  if (!reloaded.window.document.querySelector("#savedOrderCards").textContent.includes("CREDIT REPAID")) {
    throw new Error("Buyer order status was not restored after page reload");
  }
  if (!reloaded.window.document.querySelector("#sellerOrders").textContent.includes("Credit repaid")) {
    throw new Error("Seller order status was not restored after page reload");
  }
  reloaded.window.close();
  if (runtimeErrors.length) throw new Error("Runtime errors: " + runtimeErrors.join(" | "));

  console.log("PASS: cart, buyer/seller orders and complete onchain lifecycle survive a page reload");
  dom.window.close();
})().catch(error => {
  console.error(error.stack || error.message);
  dom.window.close();
  process.exit(1);
});

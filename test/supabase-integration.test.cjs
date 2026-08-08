const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const schema = fs.readFileSync("supabase/schema.sql", "utf8");

const requireMatch = (source, pattern, message) => {
  if (!pattern.test(source)) throw new Error(message);
};

requireMatch(html, /https:\/\/oqyuvzxikaibetsgwhsk\.supabase\.co/, "Supabase project URL is not configured");
requireMatch(html, /sb_publishable_[A-Za-z0-9_-]+/, "Supabase publishable key is not configured");
requireMatch(html, /signInWithWeb3\(\{[\s\S]*chain:\s*"ethereum"/, "Ethereum Web3 sign-in is missing");
requireMatch(html, /wallet:\s*window\.ethereum/, "Web3 sign-in must use the same injected wallet provider");
requireMatch(html, /identity_data\?\.sub/, "Legacy CAIP-style Web3 identity parsing is missing");
requireMatch(html, /from\("cart_items"\)/, "Cloud cart persistence is missing");
requireMatch(html, /from\("orders"\)/, "Cloud order persistence is missing");
requireMatch(html, /from\("products"\)/, "Cloud catalog loading is missing");

if (/sb_secret_|service_role\s*[:=]/i.test(html)) {
  throw new Error("A privileged Supabase key appears in the public frontend");
}

for (const table of ["profiles", "products", "cart_items", "orders", "order_items", "order_events"]) {
  requireMatch(schema, new RegExp(`create table if not exists public\\.${table}\\b`, "i"), `Missing ${table} table`);
  requireMatch(schema, new RegExp(`alter table public\\.${table} enable row level security`, "i"), `RLS is not enabled for ${table}`);
}

requireMatch(schema, /authenticated_wallet_address\(\)/, "Verified Web3 wallet binding is missing");
requireMatch(schema, /identity_data ->> 'sub'/, "CAIP-style Web3 identity extraction is missing from SQL");
requireMatch(schema, /provider = 'web3'/, "Web3 identity provider filter is missing from SQL");
requireMatch(schema, /0xf2d062b3920b342f6c6c4ecfd22c39a79e1e33d0/, "Canonical shop-owner wallet is not assigned seller access");
requireMatch(schema, /create policy "orders_read"[\s\S]*buyer_id = auth\.uid\(\)/, "Buyer order isolation policy is missing");
requireMatch(schema, /create policy "cart_owner"[\s\S]*user_id = auth\.uid\(\)/, "Cart ownership policy is missing");

console.log("PASS: Supabase Web3 auth, cloud persistence and RLS safeguards are present");

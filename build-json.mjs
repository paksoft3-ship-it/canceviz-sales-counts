// Read-only on ikas: builds the public counts file (no customer data —
// only product id → number of distinct buyers / checkout-reachers, 30 days).
import { writeFileSync } from "node:fs";
import { collectCounts } from "./counts.mjs";

const DAYS = 30;
const { result, orderCount, checkoutCount } = await collectCounts(DAYS);
const products = {};
for (const [pid, c] of Object.entries(result)) products[pid] = [c.purchased, c.carted];
const out = { v: 1, days: DAYS, updatedAt: new Date().toISOString(), products };
writeFileSync(new URL("./sales-counts.json", import.meta.url), JSON.stringify(out));
console.log(`sales-counts.json: ${Object.keys(products).length} products (from ${orderCount} orders, ${checkoutCount} abandoned checkouts)`);

// Read-only: real 30-day counts per product from ikas orders + abandoned checkouts.
import { gql } from "./ikas-client.mjs";

const DAY = 86400000;
const EXCLUDED = new Set(["CANCELLED", "REFUNDED", "DRAFT", "WAITING_UPSELL_ACTION"]);
const LINE_EXCLUDED = new Set(["CANCELLED", "REFUNDED", "REFUND_REQUEST_ACCEPTED", "RETURN_DELIVERED"]);

async function pageAll(query, root, vars) {
  const out = [];
  for (let page = 1; page < 500; page++) {
    const d = (await gql(query, { ...vars, page }))[root];
    out.push(...d.data);
    if (!d.hasNext) break;
  }
  return out;
}

export async function collectCounts(days = 30) {
  const since = Date.now() - days * DAY;
  const orders = await pageAll(
    `query($since: Timestamp!, $page: Int!) { listOrder(orderedAt: { gte: $since }, pagination: { page: $page, limit: 100 }) {
      hasNext data { id status customerId orderLineItems { status variant { productId } } } } }`,
    "listOrder", { since },
  );
  const checkouts = await pageAll(
    `query($since: Timestamp!, $page: Int!) { listAbandonedCheckouts(input: {}, lastActivityDate: { gte: $since }, pagination: { page: $page, limit: 100 }) {
      hasNext data { id customer { id } cart { items { variant { productId } } } } } }`,
    "listAbandonedCheckouts", { since },
  );
  const buyers = new Map(); // productId -> Set(buyer key)
  const carters = new Map(); // productId -> Set(buyer key) — people who reached checkout with it
  const add = (m, pid, key) => { if (!pid) return; if (!m.has(pid)) m.set(pid, new Set()); m.get(pid).add(key); };
  for (const o of orders) {
    if (EXCLUDED.has(o.status)) continue;
    const who = o.customerId || `order:${o.id}`;
    for (const li of o.orderLineItems) {
      if (LINE_EXCLUDED.has(li.status)) continue;
      add(buyers, li.variant?.productId, who);
      add(carters, li.variant?.productId, who);
    }
  }
  for (const c of checkouts) {
    const who = c.customer?.id || `checkout:${c.id}`;
    for (const li of c.cart?.items ?? []) add(carters, li.variant?.productId, who);
  }
  const result = {};
  for (const pid of new Set([...buyers.keys(), ...carters.keys()])) {
    result[pid] = { purchased: buyers.get(pid)?.size ?? 0, carted: carters.get(pid)?.size ?? 0 };
  }
  return { result, orderCount: orders.length, checkoutCount: checkouts.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { result, orderCount, checkoutCount } = await collectCounts(30);
  const ids = Object.keys(result);
  const names = {};
  for (let i = 0; i < ids.length; i += 50) {
    const d = await gql(`query($ids:[String!]){ listProduct(id: { in: $ids }, pagination: { limit: 50 }) { data { id name } } }`, { ids: ids.slice(i, i + 50) });
    for (const p of d.listProduct.data) names[p.id] = p.name;
  }
  console.log(`Last 30 days: ${orderCount} orders, ${checkoutCount} abandoned checkouts, ${ids.length} products with activity.`);
  console.log("purchased | carted | product");
  Object.entries(result).sort((a, b) => b[1].purchased - a[1].purchased).slice(0, 15)
    .forEach(([pid, c]) => console.log(String(c.purchased).padStart(9), "|", String(c.carted).padStart(6), "|", names[pid] ?? pid));
}

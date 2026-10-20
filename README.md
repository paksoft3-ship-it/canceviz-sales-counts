# Canceviz sales counts

Nightly, read-only count of **real** activity per product on the Canceviz Hurma
ikas store over the last 30 days:

- `purchased` — distinct customers whose orders contained the product
  (cancelled, refunded and draft orders excluded)
- `carted` — distinct customers who reached checkout with the product
  (completed orders + abandoned checkouts)

`sales-counts.json` contains only product ids and these two numbers — no
customer data. The storefront theme reads it to show lines like
"Son 30 günde 58 kişi satın aldı".

The ikas Private App credentials are stored as encrypted repository Secrets
(`IKAS_CLIENT_ID`, `IKAS_CLIENT_SECRET`); locally they live in an untracked
`.env`. The app has read-only product/order use here — this job never writes
to the store.

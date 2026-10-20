// Minimal ikas Admin API client. Credentials come from ./.env (never committed,
// never sent anywhere except ikas). Usage: import { gql } from "./ikas-client.mjs".
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
// Local: ./.env file. GitHub Actions: repository Secrets passed as env vars.
const envFile = join(dir, ".env");
const env = existsSync(envFile) ? Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
) : process.env;
const STORE = env.IKAS_STORE || "cancevizhurma";
if (!env.IKAS_CLIENT_ID || !env.IKAS_CLIENT_SECRET) throw new Error("IKAS_CLIENT_ID / IKAS_CLIENT_SECRET missing (sales-sync/.env locally, repository Secrets on GitHub)");

let token = null;
async function getToken() {
  if (token) return token;
  const res = await fetch(`https://${STORE}.myikas.com/api/admin/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: env.IKAS_CLIENT_ID, client_secret: env.IKAS_CLIENT_SECRET }),
  });
  if (!res.ok) throw new Error(`token request failed: HTTP ${res.status}`);
  token = (await res.json()).access_token;
  return token;
}

export async function gql(query, variables = {}) {
  const res = await fetch("https://api.myikas.com/api/v1/admin/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getToken()}` },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data;
}

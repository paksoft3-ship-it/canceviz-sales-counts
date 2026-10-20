// Step 1 (read-only): confirms the credentials work and saves the API schema
// summary so the sync can use the exact query names. Writes nothing to ikas.
import { writeFileSync } from "node:fs";
import { gql } from "./ikas-client.mjs";

const q = `{ __schema { queryType { fields { name args { name } } } mutationType { fields { name } } } }`;
const data = await gql(q);
const queries = data.__schema.queryType.fields.map((f) => `${f.name}(${f.args.map((a) => a.name).join(", ")})`);
const mutations = data.__schema.mutationType?.fields.map((f) => f.name) ?? [];
writeFileSync(new URL("./schema-summary.txt", import.meta.url), `QUERIES\n${queries.join("\n")}\n\nMUTATIONS\n${mutations.join("\n")}\n`);
console.log(`OK — ${queries.length} queries, ${mutations.length} mutations. Relevant:`);
console.log(queries.filter((n) => /order|checkout|cart|product|attribute|definition/i.test(n)).join("\n"));

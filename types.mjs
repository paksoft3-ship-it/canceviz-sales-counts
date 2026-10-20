import { gql } from "./ikas-client.mjs";
const names = process.argv.slice(2);
for (const n of names) {
  const d = await gql(`query($n:String!){ __type(name:$n){ name kind fields { name type { name kind ofType { name kind ofType { name kind ofType { name } } } } } inputFields { name type { name kind ofType { name kind ofType { name } } } } enumValues { name } } }`, { n });
  const t = d.__type; if (!t) { console.log("-- no type", n); continue; }
  const ty = (x) => x ? (x.name || (x.kind + "<" + ty(x.ofType) + ">")) : "";
  console.log(`== ${t.name} (${t.kind})`);
  for (const f of t.fields ?? t.inputFields ?? []) console.log(`  ${f.name}: ${ty(f.type)}`);
  if (t.enumValues) console.log("  enum:", t.enumValues.map((e) => e.name).join(", "));
}

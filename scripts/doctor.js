// Run `npm run doctor` after `npm install` to confirm the proxy packages expose
// what server.js expects (their APIs have changed between major versions).
const checks = [
  ["@titaniumnetwork-dev/ultraviolet", (m) => typeof m.uvPath === "string", "uvPath"],
  ["@mercuryworkshop/epoxy-transport", (m) => typeof m.epoxyPath === "string", "epoxyPath"],
  ["@mercuryworkshop/bare-mux/node", (m) => typeof m.baremuxPath === "string", "baremuxPath"],
  ["@mercuryworkshop/wisp-js/server", (m) => typeof m.server?.routeRequest === "function", "server.routeRequest"],
];

import fs from "node:fs";
import path from "node:path";

let failed = false;
for (const [name, test, what] of checks) {
  try {
    const mod = await import(name);
    if (!test(mod)) throw new Error(`export "${what}" missing`);
    console.log(`ok    ${name}`);
  } catch (err) {
    failed = true;
    console.log(`FAIL  ${name}: ${err.message}`);
  }
}

try {
  const { uvPath } = await import("@titaniumnetwork-dev/ultraviolet");
  for (const f of ["uv.bundle.js", "uv.client.js", "uv.handler.js", "uv.sw.js"]) {
    if (!fs.existsSync(path.join(uvPath, f))) throw new Error(`${f} not found in ${uvPath}`);
  }
  console.log("ok    ultraviolet runtime files present");
} catch (err) {
  failed = true;
  console.log(`FAIL  ultraviolet files: ${err.message}`);
}

if (failed) {
  console.log("\nSome packages differ from what server.js expects. Check each package's README for the current export names.");
  process.exit(1);
}
console.log("\nAll good - run `npm start`.");

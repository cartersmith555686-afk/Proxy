import express from "express";
import http from "node:http";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Server as IOServer } from "socket.io";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

import { createStore } from "./lib/store.js";
import { createAuth } from "./lib/auth.js";
import { registerChat } from "./lib/chat.js";
import { registerAI } from "./lib/ai.js";
import { rateLimit } from "./lib/util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production" || !!process.env.RENDER;

let secret = process.env.SESSION_SECRET;
if (!secret || secret === "change-me") {
  secret = crypto.randomBytes(32).toString("hex");
  console.warn("[warn] SESSION_SECRET not set - using a random one. Everyone gets logged out on every restart.");
}

const store = createStore(process.env.DATA_DIR || path.join(__dirname, "data"));
const auth = createAuth({ store, secret, secureCookies: isProd });

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy; needed for real client IPs + secure cookies
app.disable("x-powered-by");

app.get("/healthz", (_req, res) => res.type("text").send("ok"));

// ---- Static files. public/ is first so public/uv/uv.config.js overrides the package default.
app.use(express.static(path.join(__dirname, "public")));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

// ---- JSON API (accounts, settings, AI)
const api = express.Router();
api.use(express.json({ limit: "64kb" }));
api.use((req, res, next) => {
  // Basic CSRF / confused-deputy protection. Proxied pages share this origin,
  // so refuse API calls that originate from inside a proxied page.
  const origin = req.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Forbidden." });
    } catch {
      return res.status(403).json({ error: "Forbidden." });
    }
  }
  if ((req.get("referer") || "").includes("/service/")) return res.status(403).json({ error: "Forbidden." });
  if (req.method !== "GET" && !req.is("application/json")) return res.status(415).json({ error: "Expected JSON." });
  next();
});

const authLimit = rateLimit(20, 15 * 60_000, "Too many attempts. Try again later.");
api.post("/register", authLimit, (req, res, next) => auth.register(req, res).catch(next));
api.post("/login", authLimit, (req, res, next) => auth.login(req, res).catch(next));
api.post("/logout", auth.logout);
api.get("/me", auth.me);
api.put("/settings", rateLimit(60, 60_000), auth.saveSettings);
api.post("/delete-account", authLimit, (req, res, next) => auth.deleteAccount(req, res).catch(next));
registerAI(api, { rateLimit });
app.use("/api", api);

app.use("/api", (err, _req, res, _next) => {
  console.error("[api]", err);
  res.status(500).json({ error: "Something went wrong." });
});

// ---- HTTP + WebSockets
const server = http.createServer(app);

const io = new IOServer(server, {
  destroyUpgrade: false, // let the proxy's wisp WebSocket share this port
  maxHttpBufferSize: 4_000,
});
registerChat(io, {
  userFromCookieHeader: auth.userFromCookieHeader,
  blocklist: (process.env.CHAT_BLOCKLIST || "").split(",").map((s) => s.trim()).filter(Boolean),
});

// Don't let the proxy reach loopback / private addresses (e.g. your other services on Render's private network).
Object.assign(wisp.options, {
  allow_loopback_ips: false,
  allow_private_ips: false,
  allow_udp_streams: false,
});
if (process.env.WISP_DNS) {
  // wisp-js only uses dns_servers when dns_method is "resolve"
  wisp.options.dns_method = "resolve";
  wisp.options.dns_servers = process.env.WISP_DNS.split(",").map((s) => s.trim()).filter(Boolean);
}

server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/socket.io/")) return; // handled by socket.io
  if (req.url?.endsWith("/wisp/")) return wisp.routeRequest(req, socket, head);
  socket.destroy();
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Orbit listening on :${PORT}  (accounts: ${store.count()})`);
});

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    store.flushSync();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

// Boots the Ultraviolet service worker and the Wisp transport.
// Globals __uv$config and BareMux come from the classic <script> tags in index.html.
let ready = null;

export function ensureProxy() {
  if (!ready) {
    ready = init().catch((err) => {
      ready = null; // allow retry
      throw err;
    });
  }
  return ready;
}

async function init() {
  if (!window.isSecureContext) throw new Error("The proxy needs HTTPS (or localhost). Open the https:// address.");
  if (!("serviceWorker" in navigator)) throw new Error("This browser doesn't support service workers.");
  if (typeof __uv$config === "undefined" || typeof BareMux === "undefined") {
    throw new Error("Proxy scripts failed to load. Run `npm run doctor` on the server.");
  }

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: __uv$config.prefix });
  const worker = reg.installing || reg.waiting || reg.active;
  if (worker && worker.state !== "activated") {
    await new Promise((resolve, reject) => {
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") resolve();
        else if (worker.state === "redundant") reject(new Error("The service worker failed to install."));
      });
    });
  }

  const wisp = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
  const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
  await connection.setTransport("/epoxy/index.mjs", [{ wisp }]);
}

export const proxyUrl = (url) => __uv$config.prefix + __uv$config.encodeUrl(url);

/** Best-effort: recover the real URL a proxied iframe is showing. */
export function realUrlOf(frame, fallback = "") {
  try {
    const href = frame.contentWindow.__uv$location?.href;
    if (href) return href;
  } catch {}
  try {
    const { pathname } = new URL(frame.contentWindow.location.href);
    if (pathname.startsWith(__uv$config.prefix)) return __uv$config.decodeUrl(pathname.slice(__uv$config.prefix.length));
  } catch {}
  return fallback;
}

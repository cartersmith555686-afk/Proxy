// Live chat. Every socket is in the "global" room and, while a tab is active,
// in a per-site room ("site:<hostname>") so people on the same site can talk.
import crypto from "node:crypto";
import { sanitizeSettings } from "./settings.js";

const HOST = /^[a-z0-9.-]{1,100}$/;
const NICK = /^[A-Za-z0-9 _-]{2,16}$/;
const COLOR = /^#[0-9a-f]{6}$/i;
const HISTORY = 40;
// Control characters plus zero-width / bidi / separator characters.
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028-\\u202f]", "g");

export function registerChat(io, { userFromCookieHeader, blocklist = [] }) {
  const history = new Map(); // room -> messages[]

  const clean = (text) => {
    let t = String(text ?? "")
      .replace(CONTROL_CHARS, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
    for (const w of blocklist) {
      if (!w) continue;
      t = t.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => "*".repeat(m.length));
    }
    return t;
  };

  const push = (room, msg) => {
    const list = history.get(room) || [];
    list.push(msg);
    if (list.length > HISTORY) list.shift();
    history.set(room, list);
    // Don't keep dead site rooms in memory forever.
    if (history.size > 500) history.delete(history.keys().next().value);
  };

  const count = (room) => io.sockets.adapter.rooms.get(room)?.size || 0;
  const announce = (room) => io.to(room).emit("presence", { room, count: count(room) });

  io.on("connection", (socket) => {
    const account = userFromCookieHeader(socket.handshake.headers.cookie);
    const guestId = crypto.randomInt(1000, 9999);
    let nick = "";
    let color = "#8b5cf6";
    let siteRoom = null;
    let stamps = [];

    if (account) color = sanitizeSettings(account.settings).chatColor;

    const displayName = () => (account ? account.name : nick ? `${nick} (guest)` : `Guest${guestId}`);

    socket.join("global");
    socket.emit("history", { scope: "global", room: "global", messages: history.get("global") || [] });
    announce("global");

    socket.on("identify", (p) => {
      if (!account && typeof p?.nick === "string" && NICK.test(p.nick)) nick = p.nick;
      if (!account && typeof p?.color === "string" && COLOR.test(p.color)) color = p.color.toLowerCase();
      socket.emit("me", { name: displayName(), account: !!account });
    });
    socket.emit("me", { name: displayName(), account: !!account });

    socket.on("join", (p) => {
      let host = typeof p?.host === "string" ? p.host.toLowerCase().replace(/^www\./, "") : "";
      if (!HOST.test(host)) host = "home";
      const room = `site:${host}`;
      if (room === siteRoom) return;
      if (siteRoom) {
        socket.leave(siteRoom);
        announce(siteRoom);
      }
      siteRoom = room;
      socket.join(room);
      socket.emit("history", { scope: "site", room: host, messages: history.get(room) || [] });
      announce(room);
    });

    socket.on("send", (p) => {
      const now = Date.now();
      stamps = stamps.filter((t) => now - t < 10_000);
      if (stamps.length >= 8 || (stamps.length && now - stamps[stamps.length - 1] < 700)) {
        return socket.emit("notice", "You're sending messages too fast.");
      }
      stamps.push(now);

      const text = clean(p?.text);
      if (!text) return;
      const scope = p?.scope === "global" ? "global" : "site";
      const room = scope === "global" ? "global" : siteRoom;
      if (!room) return;

      const msg = {
        id: crypto.randomUUID(),
        scope,
        name: displayName(),
        account: !!account,
        color,
        text,
        ts: now,
      };
      push(room, msg);
      io.to(room).emit("message", msg);
    });

    socket.on("disconnect", () => {
      if (siteRoom) announce(siteRoom);
      announce("global");
    });
  });
}

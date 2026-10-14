import { $, $$, el, safeColor, debounce } from "./util.js";
import { getSettings, onSettings } from "./state.js";

const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function initChat({ isVisible }) {
  const socket = io({ transports: ["websocket", "polling"] });

  const list = $("#chatList");
  const form = $("#chatForm");
  const input = $("#chatInput");
  const roomEl = $("#chatRoom");
  const countEl = $("#chatCount");
  const badge = $("#chatBadge");

  let scope = "site";
  let host = "home";
  let me = "";
  let unread = 0;
  const buf = { site: [], global: [] };
  const counts = { site: 1, global: 1 };

  const label = () => (scope === "global" ? "Everyone" : host === "home" ? "Lobby" : host);

  function row(m) {
    return el(
      "div",
      { class: "msg" + (m.name === me ? " mine" : "") },
      el(
        "div",
        { class: "msg-head" },
        el("span", { class: "msg-name", style: `color:${safeColor(m.color)}` }, m.name),
        m.account ? el("span", { class: "tick", title: "Signed-in account" }, "✓") : null,
        el("time", {}, fmtTime(m.ts)),
      ),
      el("div", { class: "msg-text" }, m.text),
    );
  }

  function render() {
    list.replaceChildren();
    const msgs = buf[scope];
    if (!msgs.length) {
      list.append(el("div", { class: "sys" }, scope === "global" ? "No messages yet. Say hi to everyone online." : `No messages yet. Anyone else on ${host === "home" ? "the lobby" : host} will see what you write.`));
    }
    msgs.forEach((m) => list.append(row(m)));
    list.scrollTop = list.scrollHeight;
    roomEl.textContent = label();
    const n = counts[scope];
    countEl.textContent = `${n} online`;
  }

  function bumpUnread() {
    unread++;
    badge.textContent = unread > 9 ? "9+" : String(unread);
    badge.hidden = false;
  }
  function clearUnread() {
    unread = 0;
    badge.hidden = true;
  }

  socket.on("connect", () => {
    identify();
    socket.emit("join", { host });
  });
  socket.on("me", (p) => (me = p.name));
  socket.on("history", (p) => {
    if (p.scope === "site") host = p.room;
    buf[p.scope] = p.messages || [];
    render();
  });
  socket.on("presence", (p) => {
    if (p.room === "global") counts.global = p.count;
    else if (p.room === `site:${host}`) counts.site = p.count;
    render();
  });
  socket.on("message", (m) => {
    buf[m.scope].push(m);
    if (buf[m.scope].length > 80) buf[m.scope].shift();
    if (m.scope === scope) render();
    if (m.name !== me && !(isVisible() && m.scope === scope)) bumpUnread();
  });
  socket.on("notice", (text) => {
    list.append(el("div", { class: "sys" }, text));
    list.scrollTop = list.scrollHeight;
  });

  function identify() {
    const s = getSettings();
    socket.emit("identify", { nick: s.chatName, color: s.chatColor });
  }
  const identifyLater = debounce(identify, 600);
  onSettings(identifyLater);

  $$("#chatScope button").forEach((b) =>
    b.addEventListener("click", () => {
      scope = b.dataset.scope;
      $$("#chatScope button").forEach((x) => x.classList.toggle("on", x === b));
      render();
    }),
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    socket.emit("send", { scope, text });
    input.value = "";
  });

  render();

  return {
    /** Called whenever the active tab's site changes ("home" for the start page). */
    joinHost(h) {
      const next = h || "home";
      if (next === host && socket.connected) return;
      host = next;
      counts.site = 1;
      buf.site = [];
      render();
      if (socket.connected) socket.emit("join", { host });
    },
    /** Reconnect after sign-in/out so the server re-reads the session cookie. */
    reconnect() {
      socket.disconnect().connect();
    },
    onShow() {
      clearUnread();
      list.scrollTop = list.scrollHeight;
      input.focus();
    },
  };
}

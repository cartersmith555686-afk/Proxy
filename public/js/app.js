import { $, $$, el, toast } from "./util.js";
import { hydrateIcons, icon } from "./icons.js";
import { getSettings, updateSettings, onSettings } from "./state.js";
import { applyTheme, PRESETS, FONTS } from "./theme.js";
import { APPS, CATEGORIES, ENGINES, toUrl } from "./apps.js";
import { ensureProxy, proxyUrl, realUrlOf } from "./proxy.js";
import { initChat } from "./chat.js";
import { initAI } from "./ai.js";
import { initAuth, render as renderAccount } from "./auth.js";
import { renderSettings } from "./settings-ui.js";

hydrateIcons();
applyTheme(getSettings());

const home = $("#home");
const framesEl = $("#frames");
const tabsEl = $("#tabs");
const address = $("#address");

/* ───────── Panels ───────── */
const PANELS = { chat: "Chat", ai: "AI assistant", settings: "Customize", account: "Account" };
let panelName = null;

function showPanel(name) {
  panelName = name;
  $("#panel").hidden = false;
  $("#panelTitle").textContent = PANELS[name];
  $$(".view").forEach((v) => (v.hidden = v.id !== `view-${name}`));
  $$(".dock-btn[data-panel]").forEach((b) => b.classList.toggle("on", b.dataset.panel === name));
  if (name === "settings") renderSettings();
  if (name === "account") renderAccount();
  if (name === "chat") chat.onShow();
  if (name === "ai") ai.onShow();
}
function closePanel() {
  panelName = null;
  $("#panel").hidden = true;
  $$(".dock-btn[data-panel]").forEach((b) => b.classList.remove("on"));
}
$$(".dock-btn[data-panel]").forEach((b) => b.addEventListener("click", () => (panelName === b.dataset.panel ? closePanel() : showPanel(b.dataset.panel))));
$("#panelClose").addEventListener("click", closePanel);

/* ───────── Tabs ───────── */
const tabs = [];
let activeId = null;
let seq = 0;
const active = () => tabs.find((t) => t.id === activeId);
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function setFav(t) {
  t.fav.onerror = () => {
    t.fav.onerror = null;
    t.fav.src = "/favicon.svg";
  };
  t.fav.src = t.host ? `https://icons.duckduckgo.com/ip3/${t.host}.ico` : "/favicon.svg";
}

function createTab(url) {
  const t = { id: ++seq, frame: null, realUrl: "", host: "", title: "" };
  t.fav = el("img", { class: "fav", alt: "", width: 16, height: 16, src: "/favicon.svg" });
  t.titleEl = el("span", { class: "tab-title" }, "New tab");
  const close = el("button", { class: "tab-x", title: "Close tab", "aria-label": "Close tab", onclick: (e) => { e.stopPropagation(); closeTab(t.id); } });
  close.innerHTML = icon("x", 14);
  t.node = el("div", { class: "tab", role: "tab", onclick: () => activate(t.id) }, t.fav, t.titleEl, close);
  tabs.push(t);
  tabsEl.append(t.node);
  activate(t.id);
  if (url) navigate(t, url);
  return t;
}

function activate(id) {
  activeId = id;
  const cur = active();
  for (const t of tabs) {
    t.node.classList.toggle("on", t.id === id);
    if (t.frame) t.frame.hidden = t.id !== id;
  }
  home.hidden = !!cur.frame;
  address.value = cur.frame ? cur.realUrl : "";
  cur.node.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  chat.joinHost(cur.host);
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i < 0) return;
  const [t] = tabs.splice(i, 1);
  t.frame?.remove();
  t.node.remove();
  if (!tabs.length) createTab();
  else if (activeId === id) activate(tabs[Math.min(i, tabs.length - 1)].id);
  persistTabs();
}

async function navigate(t, input) {
  const url = toUrl(input, getSettings().searchEngine);
  if (!url) return;
  try {
    await ensureProxy();
  } catch (err) {
    toast(err.message, 6500);
    return;
  }
  if (!t.frame) {
    t.frame = el("iframe", {
      class: "frame",
      title: "Web page",
      allow: "fullscreen; autoplay; encrypted-media; clipboard-write; picture-in-picture",
      referrerpolicy: "no-referrer",
    });
    t.frame.addEventListener("load", () => onFrameLoad(t));
    framesEl.append(t.frame);
  }
  t.realUrl = url;
  t.host = hostOf(url);
  t.titleEl.textContent = t.host || "Loading…";
  setFav(t);
  t.frame.src = proxyUrl(url);
  if (t.id === activeId) activate(t.id);
  persistTabs();
}

/** Keep new-window links inside Orbit instead of escaping the shell. */
function hookFrame(t) {
  try {
    const w = t.frame.contentWindow;
    const doc = t.frame.contentDocument;
    if (!w || !doc || doc.__orbitHooked) return;
    doc.__orbitHooked = true;
    doc.addEventListener("click", (e) => {
      const a = e.target?.closest?.("a[target]");
      if (a && a.target && a.target !== "_self") a.target = "_self";
    }, true);
    w.open = (u) => {
      try {
        const abs = new URL(String(u || ""), realUrlOf(t.frame, t.realUrl)).href;
        if (/^https?:/i.test(abs)) createTab(abs);
      } catch {}
      return null;
    };
  } catch {}
}

function syncTab(t) {
  if (!t.frame) return;
  const real = realUrlOf(t.frame, t.realUrl);
  if (real && real !== t.realUrl) {
    t.realUrl = real;
    const h = hostOf(real);
    if (h !== t.host) {
      t.host = h;
      setFav(t);
    }
    persistTabs();
  }
  try {
    const title = t.frame.contentDocument?.title;
    if (title) t.title = title;
  } catch {}
  t.titleEl.textContent = t.title || t.host || "Loading…";
  if (t.id === activeId) {
    if (document.activeElement !== address) address.value = t.realUrl;
    chat.joinHost(t.host);
  }
}
const onFrameLoad = (t) => {
  hookFrame(t);
  syncTab(t);
};
setInterval(() => tabs.forEach(syncTab), 1000);

function persistTabs() {
  try {
    if (getSettings().restoreTabs) localStorage.setItem("orbit.tabs", JSON.stringify(tabs.filter((t) => t.frame).map((t) => t.realUrl).slice(0, 8)));
    else localStorage.removeItem("orbit.tabs");
  } catch {}
}

/** Open a URL/search in the current tab (or a new one with {newTab}). */
function go(input, { newTab = false } = {}) {
  const cur = active();
  if (newTab || !cur) return createTab(input);
  navigate(cur, input);
}

/* Toolbar */
$("#newTab").addEventListener("click", () => createTab());
$("#btnHome").addEventListener("click", () => {
  const blank = tabs.find((t) => !t.frame);
  blank ? activate(blank.id) : createTab();
});
$("#addressForm").addEventListener("submit", (e) => {
  e.preventDefault();
  go(address.value);
  address.blur();
});
address.addEventListener("focus", () => address.select());
$("#back").addEventListener("click", () => { try { active()?.frame?.contentWindow.history.back(); } catch {} });
$("#fwd").addEventListener("click", () => { try { active()?.frame?.contentWindow.history.forward(); } catch {} });
$("#reload").addEventListener("click", () => { try { active()?.frame?.contentWindow.location.reload(); } catch {} });
$("#fullscreen").addEventListener("click", () => $("#viewport").requestFullscreen?.());

/* ───────── Home screen ───────── */
let cat = "All";
let clockTimer = 0;

function renderHome() {
  const s = getSettings();
  const clock = el("div", { class: "clock" });
  const greet = el("div", { class: "greet" });
  const tick = () => {
    const d = new Date(), h = d.getHours();
    clock.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    greet.textContent = `${h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}. Where to?`;
  };
  tick();
  clearInterval(clockTimer);
  clockTimer = setInterval(tick, 15000);

  const input = el("input", { type: "text", placeholder: `Search ${ENGINES[s.searchEngine]?.name || "the web"} or type a URL`, spellcheck: "false", "aria-label": "Search" });
  const search = el("form", { class: "searchbar", onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) go(input.value); } },
    el("span", { class: "ico", "data-i": "search" }), input);

  const chips = el("div", { class: "chips" }, CATEGORIES.map((c) =>
    el("button", { class: "chip" + (c === cat ? " on" : ""), onclick: () => { cat = c; renderHome(); } }, c)));

  const mine = s.shortcuts.map((sc, i) => ({ id: `u${i}`, name: sc.name, url: sc.url, cat: "Mine", c1: s.accent, c2: s.accent2, letter: sc.emoji || sc.name[0].toUpperCase() }));
  const items = [...APPS, ...mine].filter((a) => cat === "All" || a.cat === cat);
  const grid = el("div", { class: "grid" }, items.map((a) =>
    el("button", { class: "tile", title: a.url, onclick: () => go(a.url) },
      el("div", { class: "tile-icon", style: `background:linear-gradient(135deg,${a.c1},${a.c2})` }, a.letter),
      el("div", { class: "tile-name" }, a.name))));
  if (cat === "All" || cat === "Mine") {
    grid.append(el("button", { class: "tile add", onclick: () => showPanel("settings") },
      el("div", { class: "tile-icon" }, "+"), el("div", { class: "tile-name" }, "Add shortcut")));
  }

  home.replaceChildren(el("div", { class: "home-inner" },
    el("div", { class: "hello" }, clock, greet), search, chips, grid,
    el("div", { class: "foot-note" }, "Heads up: logins, captchas and DRM video (like Netflix) can be limited when a site is viewed through a proxy.")));
  hydrateIcons(home);
}

/* ───────── AI hooks ───────── */
const ai = initAI({
  actions: {
    open(query, { forceSearch = false } = {}) {
      const q = query.trim().replace(/^(the|a)\s+/i, "").toLowerCase();
      const all = [...APPS, ...getSettings().shortcuts.map((sc) => ({ id: sc.name.toLowerCase(), name: sc.name, url: sc.url }))];
      const app = !forceSearch && all.find((a) => a.id === q || a.name.toLowerCase() === q);
      if (app) { go(app.url); return app.name; }
      if (forceSearch) {
        go(ENGINES[getSettings().searchEngine].url.replace("%s", encodeURIComponent(query.trim())));
        return query;
      }
      if (/^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#]\S*)?$/i.test(query.trim())) {
        const url = toUrl(query);
        go(url);
        return hostOf(url);
      }
      return null; // not an app or an address, so let the model answer
    },
    theme(name) {
      const id = name.toLowerCase();
      const p = PRESETS[id];
      if (!p) return false;
      updateSettings({ theme: id, accent: p.accent, accent2: p.accent2 });
      return true;
    },
    font(name) {
      const n = name.trim();
      const known = FONTS.find((f) => f.toLowerCase() === n.toLowerCase());
      if (known) { updateSettings({ font: known }); return true; }
      if (/^[A-Za-z0-9 ]{1,40}$/.test(n)) { updateSettings({ font: "custom", customFont: n }); return true; }
      return false;
    },
    themeNames: () => Object.keys(PRESETS),
  },
});

/* ───────── Chat + accounts ───────── */
const chat = initChat({ isVisible: () => panelName === "chat" });

let firstAuth = true;
initAuth(() => {
  if (firstAuth) { firstAuth = false; return; }
  chat.reconnect();
  if (panelName === "settings") renderSettings();
});

/* ───────── Boot ───────── */
let lastShortcuts = JSON.stringify(getSettings().shortcuts);
let lastEngine = getSettings().searchEngine;
onSettings((s) => {
  applyTheme(s);
  const j = JSON.stringify(s.shortcuts);
  if (j !== lastShortcuts || s.searchEngine !== lastEngine || s.accent !== home.dataset.accent) {
    lastShortcuts = j;
    lastEngine = s.searchEngine;
    home.dataset.accent = s.accent;
    renderHome();
  }
});
home.dataset.accent = getSettings().accent;
renderHome();

let restored = [];
try {
  if (getSettings().restoreTabs) restored = JSON.parse(localStorage.getItem("orbit.tabs") || "[]").filter((u) => /^https?:\/\//i.test(u)).slice(0, 5);
} catch {}
if (restored.length) {
  restored.forEach((u) => createTab(u));
  activate(tabs[0].id);
} else {
  createTab();
}

// Warm up the proxy in the background so the first page opens fast.
ensureProxy().catch(() => {});

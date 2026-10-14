import { $, httpUrlOrEmpty } from "./util.js";

export const PRESETS = {
  aurora:   { name: "Aurora",   bg0: "#07060f", bg1: "#120c2a", fg: "#eceaff", muted: "#9a94c9", glass: "22,18,48",   accent: "#8b5cf6", accent2: "#22d3ee" },
  midnight: { name: "Midnight", bg0: "#050912", bg1: "#0b1730", fg: "#e6efff", muted: "#8ea3c8", glass: "12,24,52",   accent: "#3b82f6", accent2: "#60a5fa" },
  sakura:   { name: "Sakura",   bg0: "#140a12", bg1: "#2a1124", fg: "#ffeaf4", muted: "#c79ab4", glass: "46,20,40",   accent: "#ff6fae", accent2: "#ffb86b" },
  ember:    { name: "Ember",    bg0: "#0f0806", bg1: "#2a110a", fg: "#fff0e8", muted: "#c79f8e", glass: "44,20,12",   accent: "#ff5a2c", accent2: "#ffc53d" },
  forest:   { name: "Forest",   bg0: "#050d09", bg1: "#0b2218", fg: "#e8fff3", muted: "#8fbfa4", glass: "12,40,28",   accent: "#34d399", accent2: "#a3e635" },
  mono:     { name: "Mono",     bg0: "#0a0a0a", bg1: "#171717", fg: "#f5f5f5", muted: "#a3a3a3", glass: "28,28,28",   accent: "#e5e5e5", accent2: "#a3a3a3" },
  daylight: { name: "Daylight", bg0: "#f4f5ff", bg1: "#e6e9ff", fg: "#14142b", muted: "#5d5f86", glass: "255,255,255", accent: "#6d4aff", accent2: "#0ea5e9", light: true },
};

export const FONTS = [
  "Space Grotesk", "Inter", "Poppins", "Outfit", "Sora",
  "Orbitron", "Quicksand", "JetBrains Mono", "Press Start 2P", "Playfair Display",
];

const HEX = /^#[0-9a-f]{6}$/i;
const FONT_NAME = /^[A-Za-z0-9 ]{1,40}$/;

export function applyTheme(s) {
  const p = PRESETS[s.theme] || PRESETS.aurora;
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);

  set("--bg0", p.bg0);
  set("--bg1", p.bg1);
  set("--fg", p.fg);
  set("--muted", p.muted);
  set("--glass-rgb", p.glass);
  set("--accent", HEX.test(s.accent) ? s.accent : p.accent);
  set("--accent2", HEX.test(s.accent2) ? s.accent2 : p.accent2);
  set("--glass-a", String(Math.min(0.95, Math.max(0.1, Number(s.glass) || 0.55))));
  set("--blur", `${Math.min(40, Math.max(0, Number(s.blur) || 0))}px`);
  set("--radius", `${Math.min(32, Math.max(0, Number(s.radius) || 0))}px`);
  set("--fs", `${Math.min(20, Math.max(12, Number(s.fontSize) || 15))}px`);
  root.dataset.light = p.light ? "1" : "0";

  // Font: only whitelisted names or a strictly validated custom Google Font.
  let family = FONTS.includes(s.font) ? s.font : "Space Grotesk";
  if (s.font === "custom" && FONT_NAME.test(s.customFont || "")) family = s.customFont;
  set("--font", `"${family}", system-ui, sans-serif`);
  $("#gfont").href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;700&display=swap`;

  // Background
  const bg = ["aurora", "stars", "grid", "solid", "image"].includes(s.background) ? s.background : "aurora";
  document.body.dataset.bg = bg;
  const img = bg === "image" ? httpUrlOrEmpty(s.bgImage) : "";
  $("#bgImage").style.backgroundImage = img ? `url("${img}")` : "";
  bg === "stars" ? startStars() : stopStars();

  // Browser-tab title + icon
  document.title = (s.tabTitle || "").trim() || "Orbit";
  $("#favicon").href = httpUrlOrEmpty(s.tabIcon) || "/favicon.svg";
}

// ── Starfield ──────────────────────────────────────────
let raf = 0;
let stars = [];
function startStars() {
  const c = $("#bgCanvas");
  const ctx = c.getContext("2d");
  const resize = () => {
    c.width = innerWidth;
    c.height = innerHeight;
    stars = Array.from({ length: Math.round((c.width * c.height) / 9000) }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.5 + 0.2, v: Math.random() * 0.25 + 0.03, t: Math.random() * 6,
    }));
  };
  if (!raf) addEventListener("resize", resize);
  resize();
  cancelAnimationFrame(raf);
  const tick = () => {
    const css = getComputedStyle(document.documentElement);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = css.getPropertyValue("--fg").trim() || "#fff";
    for (const s of stars) {
      s.y += s.v;
      s.t += 0.02;
      if (s.y > c.height) { s.y = 0; s.x = Math.random() * c.width; }
      ctx.globalAlpha = 0.35 + Math.sin(s.t) * 0.3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.283);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
}
function stopStars() {
  cancelAnimationFrame(raf);
  raf = 0;
}

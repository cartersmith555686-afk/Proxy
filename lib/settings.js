// Validation for the per-user settings blob saved to accounts.
// Everything coming from a client is whitelisted + clamped here.

const COLOR = /^#[0-9a-f]{6}$/i;

export const THEMES = ["aurora", "midnight", "sakura", "ember", "forest", "mono", "daylight"];
export const BACKGROUNDS = ["aurora", "stars", "grid", "solid", "image"];
export const ENGINES = ["duckduckgo", "google", "bing", "brave"];
export const FONTS = [
  "Space Grotesk",
  "Inter",
  "Poppins",
  "Outfit",
  "Sora",
  "Orbitron",
  "Quicksand",
  "JetBrains Mono",
  "Press Start 2P",
  "Playfair Display",
];

export const DEFAULTS = {
  theme: "aurora",
  accent: "#8b5cf6",
  accent2: "#22d3ee",
  background: "aurora",
  bgImage: "",
  font: "Space Grotesk",
  customFont: "",
  fontSize: 15,
  radius: 16,
  blur: 18,
  glass: 0.55,
  searchEngine: "duckduckgo",
  tabTitle: "",
  tabIcon: "",
  restoreTabs: false,
  chatName: "",
  chatColor: "#8b5cf6",
  ai: { name: "Nova", emoji: "✨", persona: "", model: "", temperature: 0.7 },
  shortcuts: [],
};

const str = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : "");
const num = (v, min, max, d) => {
  v = Number(v);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
};
const color = (v, d) => (typeof v === "string" && COLOR.test(v) ? v.toLowerCase() : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const httpUrl = (v, max = 500) => {
  if (typeof v !== "string" || !v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href.slice(0, max) : "";
  } catch {
    return "";
  }
};
const emoji = (v) => Array.from(str(v, 16)).slice(0, 2).join("");

export function sanitizeSettings(input) {
  const s = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const ai = s.ai && typeof s.ai === "object" ? s.ai : {};
  const d = DEFAULTS;

  const shortcuts = Array.isArray(s.shortcuts)
    ? s.shortcuts
        .slice(0, 24)
        .map((x) => ({
          name: str(x?.name, 24).trim(),
          url: httpUrl(x?.url),
          emoji: emoji(x?.emoji),
        }))
        .filter((x) => x.name && x.url)
    : [];

  const customFont = typeof s.customFont === "string" && /^[A-Za-z0-9 ]{1,40}$/.test(s.customFont) ? s.customFont : "";
  const font = s.font === "custom" && customFont ? "custom" : oneOf(s.font, FONTS, d.font);

  return {
    theme: oneOf(s.theme, THEMES, d.theme),
    accent: color(s.accent, d.accent),
    accent2: color(s.accent2, d.accent2),
    background: oneOf(s.background, BACKGROUNDS, d.background),
    bgImage: httpUrl(s.bgImage),
    font,
    customFont,
    fontSize: Math.round(num(s.fontSize, 12, 20, d.fontSize)),
    radius: Math.round(num(s.radius, 0, 32, d.radius)),
    blur: Math.round(num(s.blur, 0, 40, d.blur)),
    glass: Math.round(num(s.glass, 0.1, 0.95, d.glass) * 100) / 100,
    searchEngine: oneOf(s.searchEngine, ENGINES, d.searchEngine),
    tabTitle: str(s.tabTitle, 40),
    tabIcon: httpUrl(s.tabIcon),
    restoreTabs: s.restoreTabs === true,
    chatName: /^[A-Za-z0-9 _-]{2,16}$/.test(s.chatName || "") ? s.chatName : "",
    chatColor: color(s.chatColor, d.chatColor),
    ai: {
      name: str(ai.name, 20).trim() || d.ai.name,
      emoji: emoji(ai.emoji) || d.ai.emoji,
      persona: str(ai.persona, 800),
      model: str(ai.model, 60),
      temperature: Math.round(num(ai.temperature, 0, 1.5, d.ai.temperature) * 100) / 100,
    },
    shortcuts,
  };
}

// Settings live in localStorage and, when signed in, are synced to the account.
const KEY = "orbit.settings.v1";

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

const clone = (o) => JSON.parse(JSON.stringify(o));

function merge(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch || {})) {
    if (!(k in DEFAULTS)) continue;
    if (k === "ai" && v && typeof v === "object") out.ai = { ...base.ai, ...v };
    else out[k] = v;
  }
  return out;
}

let settings;
try {
  settings = merge(clone(DEFAULTS), JSON.parse(localStorage.getItem(KEY) || "{}"));
} catch {
  settings = clone(DEFAULTS);
}

const listeners = new Set();
let syncHandler = null;

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {}
};
const emit = () => listeners.forEach((fn) => fn(settings));

export const getSettings = () => settings;

export function updateSettings(patch, { sync = true } = {}) {
  settings = merge(settings, patch);
  persist();
  emit();
  if (sync && syncHandler) syncHandler(settings);
}

export function replaceSettings(next, { sync = false } = {}) {
  settings = merge(clone(DEFAULTS), next || {});
  persist();
  emit();
  if (sync && syncHandler) syncHandler(settings);
}

export const onSettings = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const setSyncHandler = (fn) => {
  syncHandler = fn;
};

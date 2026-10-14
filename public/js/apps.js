// App tiles. Monogram tiles on brand-ish gradients (no logos are bundled).
export const CATEGORIES = ["All", "Social", "Video", "Music", "Games", "Tools", "Mine"];

const a = (id, name, url, cat, c1, c2, letter) => ({ id, name, url, cat, c1, c2, letter: letter || name[0] });

export const APPS = [
  a("tiktok", "TikTok", "https://www.tiktok.com", "Social", "#25f4ee", "#fe2c55", "♪"),
  a("instagram", "Instagram", "https://www.instagram.com", "Social", "#feda75", "#d62976", "◎"),
  a("discord", "Discord", "https://discord.com/app", "Social", "#5865f2", "#7983f5", "D"),
  a("reddit", "Reddit", "https://www.reddit.com", "Social", "#ff4500", "#ff7a45", "R"),
  a("x", "X", "https://x.com", "Social", "#111111", "#444444", "𝕏"),
  a("snapchat", "Snapchat", "https://www.snapchat.com", "Social", "#fffc00", "#f5c400", "S"),
  a("pinterest", "Pinterest", "https://www.pinterest.com", "Social", "#e60023", "#ff5a6e", "P"),
  a("netflix", "Netflix", "https://www.netflix.com", "Video", "#b20710", "#e50914", "N"),
  a("youtube", "YouTube", "https://www.youtube.com", "Video", "#cc0000", "#ff3333", "▶"),
  a("twitch", "Twitch", "https://www.twitch.tv", "Video", "#6d28d9", "#9146ff", "T"),
  a("disney", "Disney+", "https://www.disneyplus.com", "Video", "#0b1b6b", "#1e40ff", "D+"),
  a("prime", "Prime Video", "https://www.primevideo.com", "Video", "#0f4c81", "#00a8e1", "P"),
  a("spotify", "Spotify", "https://open.spotify.com", "Music", "#17a34a", "#1ed760", "♫"),
  a("soundcloud", "SoundCloud", "https://soundcloud.com", "Music", "#ff5500", "#ff8844", "☁"),
  a("roblox", "Roblox", "https://www.roblox.com", "Games", "#2b2b2b", "#e2231a", "R"),
  a("poki", "Poki", "https://poki.com", "Games", "#1d4ed8", "#06b6d4", "P"),
  a("crazygames", "CrazyGames", "https://www.crazygames.com", "Games", "#6d28d9", "#c026d3", "C"),
  a("google", "Google", "https://www.google.com", "Tools", "#4285f4", "#34a853", "G"),
  a("duckduckgo", "DuckDuckGo", "https://duckduckgo.com", "Tools", "#de5833", "#ff8a5c", "D"),
  a("wikipedia", "Wikipedia", "https://www.wikipedia.org", "Tools", "#3a3a3a", "#8a8a8a", "W"),
  a("github", "GitHub", "https://github.com", "Tools", "#24292f", "#57606a", "G"),
];

export const ENGINES = {
  duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" },
  google: { name: "Google", url: "https://www.google.com/search?q=%s" },
  bing: { name: "Bing", url: "https://www.bing.com/search?q=%s" },
  brave: { name: "Brave", url: "https://search.brave.com/search?q=%s" },
};

/** Turn whatever was typed into a URL (address, bare domain, or search). */
export function toUrl(input, engine = "duckduckgo") {
  const v = String(input || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (!/\s/.test(v) && /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(v)) return `https://${v}`;
  if (/^localhost(:\d+)?([/?#].*)?$/i.test(v)) return `http://${v}`;
  return (ENGINES[engine] || ENGINES.duckduckgo).url.replace("%s", encodeURIComponent(v));
}

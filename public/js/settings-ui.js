import { $, el, api, toast, debounce, httpUrlOrEmpty } from "./util.js";
import { getSettings, updateSettings, replaceSettings, DEFAULTS } from "./state.js";
import { PRESETS, FONTS } from "./theme.js";
import { ENGINES } from "./apps.js";

let aiModels = null;

export async function renderSettings() {
  const root = $("#view-settings");
  const s = getSettings();
  root.replaceChildren();

  const sec = (title, ...kids) => el("section", { class: "sec" }, el("h3", { class: "sec-title" }, title), ...kids);
  const field = (label, control, hint) => el("label", { class: "field" }, el("span", { class: "field-label" }, label), control, hint ? el("small", {}, hint) : null);

  const slider = (key, label, min, max, step, fmt = (v) => v) => {
    const out = el("span", {}, fmt(s[key]));
    const input = el("input", { type: "range", min, max, step, value: s[key] });
    input.addEventListener("input", () => {
      const v = Number(input.value);
      out.textContent = fmt(v);
      updateSettings({ [key]: v });
    });
    return el("label", { class: "field" }, el("span", { class: "field-label" }, label, out), input);
  };

  const select = (key, options, onPick) => {
    const sel = el("select", {}, options.map(([v, n]) => el("option", { value: v, selected: String(s[key]) === String(v) }, n)));
    sel.addEventListener("change", () => (onPick ? onPick(sel.value) : updateSettings({ [key]: sel.value })));
    return sel;
  };

  // ── Themes ────────────────────────────────
  const themeGrid = el("div", { class: "theme-grid" },
    Object.entries(PRESETS).map(([id, p]) =>
      el("button", {
        class: "theme-card" + (s.theme === id ? " on" : ""),
        title: p.name,
        onclick: () => {
          updateSettings({ theme: id, accent: p.accent, accent2: p.accent2 });
          renderSettings();
        },
      },
      el("div", { class: "sw", style: `background:linear-gradient(135deg,${p.bg0},${p.bg1});--c1:${p.accent};--c2:${p.accent2}` }),
      el("span", {}, p.name)),
    ),
  );

  const color = (key) => {
    const i = el("input", { type: "color", value: s[key] });
    i.addEventListener("input", () => updateSettings({ [key]: i.value }));
    return i;
  };

  const bgUrl = el("input", { class: "input", placeholder: "https://… image address", value: s.bgImage });
  bgUrl.addEventListener("change", () => {
    const v = bgUrl.value.trim();
    if (v && !httpUrlOrEmpty(v)) return toast("That doesn't look like a web address.");
    updateSettings({ bgImage: v });
  });

  // ── Fonts ─────────────────────────────────
  const customFont = el("input", { class: "input", placeholder: "Any Google Font name, e.g. Lobster", value: s.customFont, maxlength: 40 });
  const customWrap = field("Custom Google Font", customFont, "Letters, numbers and spaces only. Browse fonts.google.com for names.");
  customWrap.hidden = s.font !== "custom";
  customFont.addEventListener("change", () => {
    const v = customFont.value.trim();
    if (!/^[A-Za-z0-9 ]{1,40}$/.test(v)) return toast("Use the exact font name (letters, numbers, spaces).");
    updateSettings({ customFont: v, font: "custom" });
  });
  const fontSel = select("font", [...FONTS.map((f) => [f, f]), ["custom", "Custom…"]], (v) => {
    customWrap.hidden = v !== "custom";
    if (v === "custom") {
      if (/^[A-Za-z0-9 ]{1,40}$/.test(customFont.value.trim())) updateSettings({ font: "custom", customFont: customFont.value.trim() });
    } else updateSettings({ font: v });
  });

  // ── Shortcuts ─────────────────────────────
  const scList = el("div", { class: "field" });
  const paintShortcuts = () => {
    scList.replaceChildren();
    const list = getSettings().shortcuts;
    if (!list.length) scList.append(el("div", { class: "note" }, "No shortcuts yet. They show up on the home screen under “Mine”."));
    list.forEach((sc, i) =>
      scList.append(el("div", { class: "sc-item" },
        el("span", {}, sc.emoji || "🔗"),
        el("span", { class: "nm", title: sc.url }, sc.name),
        el("button", { class: "btn small ghost", onclick: () => {
          updateSettings({ shortcuts: getSettings().shortcuts.filter((_, j) => j !== i) });
          paintShortcuts();
        } }, "Remove"))),
    );
  };
  const scName = el("input", { class: "input", placeholder: "Name", maxlength: 24 });
  const scUrl = el("input", { class: "input", placeholder: "https://example.com" });
  const scEmoji = el("input", { class: "input", placeholder: "🔗", maxlength: 4, style: "max-width:64px" });
  const addShortcut = () => {
    const url = httpUrlOrEmpty(/^https?:\/\//i.test(scUrl.value.trim()) ? scUrl.value.trim() : `https://${scUrl.value.trim()}`);
    const name = scName.value.trim();
    if (!name || !url) return toast("Add a name and a valid address.");
    const cur = getSettings().shortcuts;
    if (cur.length >= 24) return toast("That's the maximum of 24 shortcuts.");
    updateSettings({ shortcuts: [...cur, { name, url, emoji: Array.from(scEmoji.value.trim()).slice(0, 2).join("") }] });
    scName.value = scUrl.value = scEmoji.value = "";
    paintShortcuts();
  };
  paintShortcuts();

  // ── AI ────────────────────────────────────
  const aiPatch = (patch) => updateSettings({ ai: { ...getSettings().ai, ...patch } });
  const aiName = el("input", { class: "input", value: s.ai.name, maxlength: 20 });
  aiName.addEventListener("input", debounce(() => aiPatch({ name: aiName.value.trim() || "Nova" }), 300));
  const aiEmoji = el("input", { class: "input", value: s.ai.emoji, maxlength: 4, style: "max-width:80px" });
  aiEmoji.addEventListener("input", debounce(() => aiPatch({ emoji: Array.from(aiEmoji.value.trim()).slice(0, 2).join("") || "✨" }), 300));
  const persona = el("textarea", { class: "input", maxlength: 800, placeholder: "e.g. Talk like a laid-back surfer who loves science." }, s.ai.persona);
  persona.addEventListener("input", debounce(() => aiPatch({ persona: persona.value }), 500));
  const modelSel = el("select", {}, el("option", { value: "" }, "Default"));
  modelSel.addEventListener("change", () => aiPatch({ model: modelSel.value }));
  (async () => {
    try {
      aiModels ||= await api("/api/ai/config");
      aiModels.models.forEach((m) => modelSel.append(el("option", { value: m, selected: getSettings().ai.model === m }, m)));
    } catch {}
  })();
  const temp = el("input", { type: "range", min: 0, max: 1.5, step: 0.05, value: s.ai.temperature });
  const tempOut = el("span", {}, String(s.ai.temperature));
  temp.addEventListener("input", () => {
    tempOut.textContent = temp.value;
    aiPatch({ temperature: Number(temp.value) });
  });

  // ── Chat identity ─────────────────────────
  const chatName = el("input", { class: "input", placeholder: "Guest nickname (2-16 letters/numbers)", value: s.chatName, maxlength: 16 });
  chatName.addEventListener("change", () => {
    const v = chatName.value.trim();
    if (v && !/^[A-Za-z0-9 _-]{2,16}$/.test(v)) return toast("Nicknames are 2-16 letters, numbers, spaces, _ or -.");
    updateSettings({ chatName: v });
  });
  const chatColor = el("input", { type: "color", value: s.chatColor });
  chatColor.addEventListener("input", () => updateSettings({ chatColor: chatColor.value }));

  // ── Tab disguise / title ──────────────────
  const tabTitle = el("input", { class: "input", placeholder: "Orbit", value: s.tabTitle, maxlength: 40 });
  tabTitle.addEventListener("input", debounce(() => updateSettings({ tabTitle: tabTitle.value }), 300));
  const tabIcon = el("input", { class: "input", placeholder: "https://… icon address (optional)", value: s.tabIcon });
  tabIcon.addEventListener("change", () => {
    const v = tabIcon.value.trim();
    if (v && !httpUrlOrEmpty(v)) return toast("That doesn't look like a web address.");
    updateSettings({ tabIcon: v });
  });

  // ── Import / export ───────────────────────
  const fileIn = el("input", { type: "file", accept: "application/json", hidden: true });
  fileIn.addEventListener("change", async () => {
    try {
      const parsed = JSON.parse(await fileIn.files[0].text());
      replaceSettings(parsed, { sync: true });
      renderSettings();
      toast("Settings imported.");
    } catch {
      toast("That file isn't a valid settings export.");
    }
  });

  root.append(
    sec("Theme", themeGrid,
      el("div", { class: "row" }, field("Accent", color("accent")), field("Glow", color("accent2"))),
      field("Background", select("background", [["aurora", "Aurora glow"], ["stars", "Starfield"], ["grid", "Grid"], ["solid", "Solid"], ["image", "Your image"]], (v) => { updateSettings({ background: v }); })),
      field("Background image", bgUrl, "Used when Background is set to “Your image”."),
    ),
    sec("Typography",
      field("Font", fontSel), customWrap,
      slider("fontSize", "Text size", 12, 20, 1, (v) => `${v}px`),
    ),
    sec("Shape & glass",
      slider("radius", "Corner roundness", 0, 32, 1, (v) => `${v}px`),
      slider("blur", "Glass blur", 0, 40, 1, (v) => `${v}px`),
      slider("glass", "Panel opacity", 0.1, 0.95, 0.05, (v) => `${Math.round(v * 100)}%`),
    ),
    sec("Browser",
      field("Search engine", select("searchEngine", Object.entries(ENGINES).map(([k, v]) => [k, v.name]))),
      el("label", { class: "field inline" }, el("span", { class: "field-label" }, "Reopen my tabs next visit"),
        el("input", { type: "checkbox", checked: s.restoreTabs, onchange: (e) => updateSettings({ restoreTabs: e.target.checked }) })),
      field("Page title", tabTitle, "What this page is called in your browser's tab bar."),
      field("Page icon", tabIcon),
    ),
    sec("Chat", field("Nickname", chatName, "Signed-in accounts chat under their username."), field("Name color", chatColor)),
    sec("AI assistant",
      el("div", { class: "row" }, el("div", { class: "grow" }, field("Name", aiName)), field("Emoji", aiEmoji)),
      field("Personality", persona, "Added to every conversation. Leave blank for the default."),
      field("Model", modelSel),
      el("label", { class: "field" }, el("span", { class: "field-label" }, "Creativity", tempOut), temp),
    ),
    sec("Shortcuts", scList,
      el("div", { class: "row" }, scEmoji, el("div", { class: "grow" }, scName)),
      scUrl,
      el("button", { class: "btn primary", onclick: addShortcut }, "Add shortcut"),
    ),
    sec("Your data",
      el("div", { class: "note" }, "Settings are saved in this browser, and to your account if you're signed in."),
      el("div", { class: "row" },
        el("button", { class: "btn small", onclick: () => {
          const blob = new Blob([JSON.stringify(getSettings(), null, 2)], { type: "application/json" });
          const a = el("a", { href: URL.createObjectURL(blob), download: "orbit-settings.json" });
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        } }, "Export"),
        el("button", { class: "btn small", onclick: () => fileIn.click() }, "Import"),
        el("button", { class: "btn small danger", onclick: () => {
          if (!confirm("Reset all customization to defaults?")) return;
          replaceSettings(DEFAULTS, { sync: true });
          renderSettings();
        } }, "Reset"),
      ),
      fileIn,
    ),
  );
}

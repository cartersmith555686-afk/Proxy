import { $, el, api } from "./util.js";
import { getSettings, onSettings } from "./state.js";

const STORE = "orbit.ai.chat";

export function initAI({ actions }) {
  const log = $("#aiLog");
  const form = $("#aiForm");
  const input = $("#aiInput");
  let convo = [];
  let busy = false;

  try {
    convo = JSON.parse(sessionStorage.getItem(STORE) || "[]").slice(-30);
  } catch {}

  const save = () => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(convo.slice(-30)));
    } catch {}
  };

  const bubble = (role, text) => el("div", { class: "msg" + (role === "user" ? " mine" : "") }, el("div", { class: "bubble " + role }, text));
  const scroll = () => (log.scrollTop = log.scrollHeight);

  function paintHead() {
    const { ai } = getSettings();
    $("#aiName").textContent = ai.name;
    $("#aiEmoji").textContent = ai.emoji;
  }
  onSettings(paintHead);
  paintHead();

  function greet() {
    const { ai } = getSettings();
    log.append(bubble("assistant", `Hey, I'm ${ai.name}. Ask me anything, or tell me what to do: "open tiktok", "theme sakura", "font Orbitron", "search cute cats".`));
  }

  function redraw() {
    log.replaceChildren();
    if (!convo.length) greet();
    convo.forEach((m) => log.append(bubble(m.role, m.content)));
    scroll();
  }
  redraw();

  $("#aiClear").addEventListener("click", () => {
    convo = [];
    save();
    redraw();
  });

  /** Commands handled locally so the AI can drive the site without a model call. */
  function localIntent(text) {
    const t = text.trim();
    let m;
    if ((m = t.match(/^(?:open|go to|launch|visit)\s+(.+)$/i))) {
      const opened = actions.open(m[1]);
      return opened ? `Opening ${opened}…` : null;
    }
    if ((m = t.match(/^(?:search(?: for)?)\s+(.+)$/i))) {
      actions.open(m[1], { forceSearch: true });
      return `Searching for “${m[1]}”…`;
    }
    if ((m = t.match(/^(?:set\s+)?theme(?:\s+to)?\s+(\w+)$/i))) {
      return actions.theme(m[1]) ? `Switched to the ${m[1]} theme.` : `I don't know a theme called “${m[1]}”. Try: ${actions.themeNames().join(", ")}.`;
    }
    if ((m = t.match(/^(?:set\s+)?font(?:\s+to)?\s+(.+)$/i))) {
      return actions.font(m[1]) ? `Font changed to ${m[1].trim()}.` : `I couldn't use “${m[1]}” as a font name.`;
    }
    if (/^help$/i.test(t)) {
      return `I can chat, and I can also run commands:\n• open <app or site>\n• search <anything>\n• theme <${actions.themeNames().join("|")}>\n• font <Google Font name>`;
    }
    return null;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = "";

    if (!convo.length) log.replaceChildren();
    convo.push({ role: "user", content: text });
    log.append(bubble("user", text));
    scroll();

    const local = localIntent(text);
    if (local) {
      convo.push({ role: "assistant", content: local });
      log.append(bubble("assistant", local));
      save();
      scroll();
      return;
    }

    busy = true;
    const typing = el("div", { class: "msg" }, el("div", { class: "bubble assistant" }, el("span", { class: "typing" }, el("i"), el("i"), el("i"))));
    log.append(typing);
    scroll();

    const { ai } = getSettings();
    try {
      const { reply } = await api("/api/ai", {
        method: "POST",
        body: { messages: convo.slice(-12), persona: ai.persona, name: ai.name, model: ai.model, temperature: ai.temperature },
      });
      convo.push({ role: "assistant", content: reply });
      typing.replaceWith(bubble("assistant", reply));
    } catch (err) {
      typing.replaceWith(bubble("assistant", `${err.message} You can still use commands like “open tiktok” or “theme midnight”.`));
      convo.pop(); // don't keep the unanswered question in context
    } finally {
      busy = false;
      save();
      scroll();
    }
  });

  return { onShow: () => input.focus() };
}

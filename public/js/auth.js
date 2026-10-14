import { $, el, api, toast, debounce } from "./util.js";
import { getSettings, replaceSettings, setSyncHandler } from "./state.js";

let user = null;
let mode = "login";
let onChange = () => {};

const pushSettings = debounce(async (s) => {
  if (!user) return;
  try {
    await api("/api/settings", { method: "PUT", body: { settings: s } });
  } catch (err) {
    toast(`Couldn't sync settings: ${err.message}`);
  }
}, 900);

function adopt(res) {
  user = res.user;
  if (user) {
    if (res.settings) replaceSettings(res.settings); // account settings win
    else pushSettings(getSettings()); // first sign-in: upload what this device has
  }
}

export async function initAuth(cb) {
  onChange = cb;
  setSyncHandler((s) => pushSettings(s));
  try {
    adopt(await api("/api/me"));
  } catch {}
  render();
  onChange(user);
}

export const currentUser = () => user;

export function render() {
  const root = $("#view-account");
  root.replaceChildren();
  const sec = (...kids) => el("section", { class: "sec" }, ...kids);

  if (user) {
    const pw = el("input", { class: "input", type: "password", placeholder: "Password", autocomplete: "current-password" });
    const err = el("div", { class: "err" });
    root.append(
      sec(
        el("h3", { class: "sec-title" }, "Signed in"),
        el("div", {}, el("b", {}, user), el("div", { class: "note" }, "Your theme, fonts, shortcuts and AI settings sync to this account on every device.")),
        el("div", { class: "row" },
          el("button", { class: "btn", onclick: async () => {
            await api("/api/logout", { method: "POST", body: {} }).catch(() => {});
            user = null;
            render();
            onChange(null);
            toast("Signed out. Settings stay on this device.");
          } }, "Sign out"),
        ),
      ),
      sec(
        el("h3", { class: "sec-title" }, "Delete account"),
        el("div", { class: "note" }, "Removes your account and its saved settings from the server."),
        pw,
        err,
        el("button", { class: "btn danger", onclick: async () => {
          try {
            await api("/api/delete-account", { method: "POST", body: { password: pw.value } });
            user = null;
            render();
            onChange(null);
            toast("Account deleted.");
          } catch (e) {
            err.textContent = e.message;
          }
        } }, "Delete my account"),
      ),
    );
    return;
  }

  const username = el("input", { class: "input", placeholder: "Username", autocomplete: "username", maxlength: 20 });
  const password = el("input", { class: "input", type: "password", placeholder: "Password (8+ characters)", autocomplete: mode === "login" ? "current-password" : "new-password" });
  const err = el("div", { class: "err" });

  const submit = async (e) => {
    e.preventDefault();
    err.textContent = "";
    try {
      const res = await api(mode === "login" ? "/api/login" : "/api/register", {
        method: "POST",
        body: { username: username.value.trim(), password: password.value },
      });
      adopt(res);
      render();
      onChange(user);
      toast(mode === "login" ? `Welcome back, ${user}!` : `Account created. Welcome, ${user}!`);
    } catch (ex) {
      err.textContent = ex.message;
    }
  };

  root.append(
    el("form", { onsubmit: submit },
      sec(
        el("h3", { class: "sec-title" }, "Account (optional)"),
        el("div", { class: "note" }, "Everything works without one. Create an account only if you want your customization saved across devices."),
        el("div", { class: "seg" },
          el("button", { type: "button", class: mode === "login" ? "on" : "", onclick: () => { mode = "login"; render(); } }, "Log in"),
          el("button", { type: "button", class: mode === "register" ? "on" : "", onclick: () => { mode = "register"; render(); } }, "Create account"),
        ),
        username,
        password,
        err,
        el("button", { class: "btn primary", type: "submit" }, mode === "login" ? "Log in" : "Create account"),
        el("div", { class: "note" }, "Use a password you don't use anywhere else."),
      ),
    ),
  );
}

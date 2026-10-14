// Optional accounts: register / login / logout, plus saving settings.
// Passwords: scrypt with a per-user salt. Sessions: HMAC-signed cookie.
import crypto from "node:crypto";
import { promisify } from "node:util";
import { parseCookies } from "./util.js";
import { sanitizeSettings } from "./settings.js";

const scrypt = promisify(crypto.scrypt);
const COOKIE = "orbit_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `s1$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [v, saltHex, keyHex] = String(stored).split("$");
  if (v !== "s1" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

export function createAuth({ store, secret, secureCookies }) {
  const sign = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const mac = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    return `${body}.${mac}`;
  };

  const verify = (token) => {
    if (typeof token !== "string") return null;
    const [body, mac] = token.split(".");
    if (!body || !mac) return null;
    const good = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    const a = Buffer.from(mac);
    const b = Buffer.from(good);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
      const p = JSON.parse(Buffer.from(body, "base64url").toString());
      return p.exp > Date.now() && typeof p.u === "string" ? p : null;
    } catch {
      return null;
    }
  };

  /** Returns the stored user record for a Cookie header, or null. */
  const userFromCookieHeader = (header) => {
    const p = verify(parseCookies(header)[COOKIE]);
    return p ? store.getUser(p.u) : null;
  };
  const userFromReq = (req) => userFromCookieHeader(req.headers.cookie);

  const setSession = (res, user) =>
    res.cookie(COOKIE, sign({ u: user.name, exp: Date.now() + SESSION_MS }), {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookies,
      maxAge: SESSION_MS,
      path: "/",
    });

  // Lock out repeated failed logins per username+IP.
  const failures = new Map();
  const failKey = (req, name) => `${req.ip}|${String(name).toLowerCase()}`;
  const locked = (k) => {
    const f = failures.get(k);
    return f && f.until > Date.now();
  };
  const noteFail = (k) => {
    const f = failures.get(k) || { n: 0, until: 0 };
    f.n++;
    if (f.n >= 8) {
      f.until = Date.now() + 15 * 60 * 1000;
      f.n = 0;
    }
    failures.set(k, f);
  };

  const credentials = (body) => {
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    return { username, password };
  };

  return {
    userFromCookieHeader,
    userFromReq,

    async register(req, res) {
      const { username, password } = credentials(req.body);
      if (!USERNAME.test(username)) return res.status(400).json({ error: "Username must be 3-20 letters, numbers or underscores." });
      if (password.length < 8 || password.length > 200) return res.status(400).json({ error: "Password must be at least 8 characters." });
      const user = store.createUser(username, { pass: await hashPassword(password) });
      if (!user) return res.status(409).json({ error: "That username is taken." });
      setSession(res, user);
      res.json({ user: user.name, settings: null });
    },

    async login(req, res) {
      const { username, password } = credentials(req.body);
      const k = failKey(req, username);
      if (locked(k)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
      const user = USERNAME.test(username) ? store.getUser(username) : null;
      // Always run a hash so timing doesn't reveal whether the user exists.
      const ok = user ? await verifyPassword(password, user.pass) : (await hashPassword(password), false);
      if (!ok) {
        noteFail(k);
        return res.status(401).json({ error: "Invalid username or password." });
      }
      failures.delete(k);
      setSession(res, user);
      res.json({ user: user.name, settings: user.settings });
    },

    logout(_req, res) {
      res.clearCookie(COOKIE, { path: "/" });
      res.json({ ok: true });
    },

    me(req, res) {
      const user = userFromReq(req);
      res.json({ user: user ? user.name : null, settings: user ? user.settings : null });
    },

    saveSettings(req, res) {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Not signed in." });
      if (JSON.stringify(req.body?.settings ?? {}).length > 30_000) return res.status(413).json({ error: "Settings too large." });
      user.settings = sanitizeSettings(req.body?.settings);
      store.save();
      res.json({ ok: true, settings: user.settings });
    },

    async deleteAccount(req, res) {
      const user = userFromReq(req);
      if (!user) return res.status(401).json({ error: "Not signed in." });
      const { password } = credentials(req.body);
      if (!(await verifyPassword(password, user.pass))) return res.status(401).json({ error: "Wrong password." });
      store.deleteUser(user.name);
      res.clearCookie(COOKIE, { path: "/" });
      res.json({ ok: true });
    },
  };
}

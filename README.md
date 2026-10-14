# Orbit

A tabbed web hub with a built-in proxy, live chat per site, a free configurable AI, optional accounts, and deep customization.

- **App tabs**: TikTok, Instagram, Discord, Netflix, YouTube, Twitch, Spotify, Reddit, X, games and more, plus your own shortcuts. Every tab is a real browser tab inside the page.
- **Chat**: everyone on the same site (same tab hostname) shares a room. There is also an "Everyone" room.
- **AI**: a free assistant you can rename, give a personality, pick a model for and tune. It can also run commands ("open tiktok", "theme sakura", "font Orbitron").
- **Accounts (optional)**: sign up to sync themes, fonts, shortcuts and AI settings across devices. Guests keep everything in their own browser.
- **Customization**: 7 themes, custom accent/glow colors, 5 backgrounds (aurora, starfield, grid, solid, your image), 10 fonts plus any Google Font, text size, corner roundness, glass blur/opacity, search engine, page title/icon, settings export/import.

The proxy is [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) with the Epoxy transport over Wisp.

## Run locally

```bash
npm install
npm run doctor      # confirms the proxy packages expose what server.js expects
npm start           # http://localhost:3000
```

Needs Node 20+. The proxy only works on `https://` or `localhost` (service workers).

## Put it on GitHub

```bash
git init
git add .
git commit -m "Orbit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`package.json` lists the proxy packages as `*` so the first install grabs current versions. After `npm install` works for you, commit the generated `package-lock.json` so Render builds exactly what you tested.

## Deploy on Render

The repo includes a `render.yaml` Blueprint.

1. Push the repo to GitHub (above).
2. Render dashboard → **New +** → **Blueprint** → connect the repo → **Apply**. It builds with `npm install`, starts with `npm start`, health-checks `/healthz`, and generates a `SESSION_SECRET` for you.
3. When the deploy finishes, open the `https://<name>.onrender.com` address.

(You can also create a plain **Web Service** by hand: runtime Node, build `npm install`, start `npm start`, health check path `/healthz`, and add `SESSION_SECRET` yourself.)

### Free plan vs. keeping accounts

| | Free | Paid (e.g. Starter) + disk |
|---|---|---|
| Sleeps when idle | Yes: after 15 min without traffic, then ~1 min to wake | No |
| Accounts / saved settings survive | **No.** The filesystem resets on every deploy, restart and spin-down | Yes |
| Guest customization | Works (it's stored in each visitor's browser) | Works |

To keep accounts: in `render.yaml` set `plan: starter`, uncomment the `disk` block, and change `DATA_DIR` to `/var/data` (the disk's mount path). Render lists free-plan details at render.com/docs/free; check current pricing before upgrading.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `SESSION_SECRET` | Signs login cookies (required in production) | random per boot |
| `DATA_DIR` | Where `db.json` (accounts) lives; point at your disk's mount path | `./data` |
| `AI_BASE_URL` | Any OpenAI-compatible base URL | `https://text.pollinations.ai/openai` |
| `AI_API_KEY` | Key for that provider, if it needs one | none |
| `AI_MODEL` / `AI_MODELS` | Default model / list users can choose | `openai` |
| `AI_SYSTEM` | Extra instructions for every AI chat | none |
| `WISP_DNS` | DNS servers the proxy uses, comma separated | system |
| `CHAT_BLOCKLIST` | Words masked in chat, comma separated | none |

### The AI

It works out of the box with a free keyless endpoint, but free endpoints change or disappear. To switch, set `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL`. Examples: Groq (`https://api.groq.com/openai/v1`), OpenRouter (`https://openrouter.ai/api/v1`, many `:free` models), or your own Ollama (`http://host:11434/v1`). The key stays on the server. If the AI service is down, the in-site commands still work.

## Things to know

- **Not everything works through a proxy.** Netflix and other DRM video, logins with captchas, and some Discord/TikTok/Instagram flows can be limited or broken. That is a limit of proxies, not a bug here.
- **Same-origin risk.** Proxied pages run on your site's origin. The API refuses calls that come from inside a proxied page, but treat the site as low-trust: don't reuse a real password for Orbit accounts.
- **Private networks are blocked** for the proxy (`allow_private_ips: false`, loopback off), so it can't be pointed at your other services on Render's private network. Confirm the option names against the `wisp-server-node` README for the version you install.
- **Storage** is a JSON file on disk, fine for a hobby site. Move to Postgres if it grows.
- **Moderation**: chat has rate limiting, a length cap and an optional word mask, but no admin tools. Add them before opening it to the public.
- **Hosting rules**: check Render's acceptable-use policy, and the rules of any school or workplace network you use it on.

## Layout

```
server.js            Express + Socket.IO + Wisp, static files, API
lib/                 store (accounts), auth, chat, ai, settings validation
public/index.html    the shell
public/css/          theme + layout
public/js/           tabs/home (app.js), proxy boot, chat, ai, settings UI, auth
public/sw.js         Ultraviolet service worker
public/uv/           Ultraviolet config
scripts/doctor.js    post-install check
```

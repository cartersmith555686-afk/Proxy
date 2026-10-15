// The built-in AI. It talks to any OpenAI-compatible /chat/completions
// endpoint configured through environment variables, so the API key (if any)
// never reaches the browser. Users manage name / persona / model / creativity
// from Settings; those are sent per request.

export function registerAI(app, { rateLimit }) {
  const base = (process.env.AI_BASE_URL || "https://text.pollinations.ai/openai").replace(/\/+$/, "");
  const key = process.env.AI_API_KEY || "";
  const defaultModel = process.env.AI_MODEL || "openai";
  const models = (process.env.AI_MODELS || defaultModel)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!models.includes(defaultModel)) models.unshift(defaultModel);
  const extraSystem = process.env.AI_SYSTEM || "";

  app.get("/ai/config", (_req, res) => res.json({ models, defaultModel }));

  app.post("/ai", rateLimit(15, 60_000, "The AI is rate limited. Try again in a minute."), async (req, res) => {
    const { messages, persona, name, model, temperature } = req.body || {};
    if (!Array.isArray(messages) || !messages.length || messages.length > 24) {
      return res.status(400).json({ error: "Bad request." });
    }

    const convo = [];
    for (const m of messages) {
      if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
        return res.status(400).json({ error: "Bad request." });
      }
      convo.push({ role: m.role, content: m.content.slice(0, 2000) });
    }

    const aiName = typeof name === "string" && name.trim() ? name.trim().slice(0, 20) : "Nova";
    const system = [
      `You are ${aiName}, the built-in assistant of Orbit, a tabbed web hub. Be friendly, concise and useful.`,
      extraSystem,
      typeof persona === "string" && persona.trim() ? `Personality/style requested by the user: ${persona.trim().slice(0, 800)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const chosenModel = models.includes(model) ? model : defaultModel;
    const temp = Math.min(1.5, Math.max(0, Number(temperature) || 0.7));

    try {
      const upstream = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({
          model: chosenModel,
          temperature: temp,
          max_tokens: 700,
          messages: [{ role: "system", content: system }, ...convo],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
      const data = await upstream.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== "string" || !reply.trim()) throw new Error("empty reply");
      res.json({ reply: reply.trim().slice(0, 4000) });
    } catch (err) {
      console.error("[ai]", err.message);
      res.status(502).json({ error: "The AI service isn't answering right now." });
    }
  });
}

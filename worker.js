/* Prumo API — Cloudflare Worker + D1 + Workers AI (sem chave de provedor)
 * Rotas: GET /api/health, POST /api/register, POST /api/login,
 * GET /api/me, POST /api/chat (alias legado: POST /api/research)
 */
const encoder = new TextEncoder();
const DAILY_LIMIT_DEFAULT = 2;
const TOKEN_DAYS = 7;
const PASSWORD_ITERATIONS = 180000;

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "*";
  const allow = (env.ALLOWED_ORIGINS || "*").split(",").map(x => x.trim()).filter(Boolean);
  const allowedOrigin = allow.includes("*") || allow.includes(origin) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(data, status, request, env) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...corsHeaders(request, env) } });
}
function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function randomBytes(size) { const out = new Uint8Array(size); crypto.getRandomValues(out); return out; }
function hex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, "0")).join(""); }
function unhex(value) { return new Uint8Array((value.match(/.{1,2}/g) || []).map(x => parseInt(x, 16))); }
async function passwordHash(password, saltHex) {
  const salt = saltHex ? unhex(saltHex) : randomBytes(16);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PASSWORD_ITERATIONS, hash: "SHA-256" }, key, 256);
  return { salt: hex(salt), hash: hex(new Uint8Array(bits)) };
}
async function signToken(payload, secret) {
  const header = b64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return `${data}.${b64url(new Uint8Array(signature))}`;
}
async function verifyToken(token, secret) {
  try {
    const [header, body, signature] = String(token || "").split(".");
    if (!header || !body || !signature) return null;
    const data = `${header}.${body}`;
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("HMAC", key, fromB64url(signature), encoder.encode(data));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000) || !payload.email) return null;
    return payload;
  } catch { return null; }
}
async function currentUser(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !env.JWT_SECRET) return null;
  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) return null;
  const user = await env.DB.prepare("SELECT email, name FROM users WHERE email = ?1").bind(payload.email).first();
  return user || null;
}
function currentDay(env) {
  const zone = env.APP_TIME_ZONE || "America/Fortaleza";
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
async function quotaFor(env, email, day) {
  const row = await env.DB.prepare("SELECT used FROM daily_usage WHERE email = ?1 AND day = ?2").bind(email, day).first();
  const limit = Math.max(1, Math.min(20, Number(env.DAILY_CREDITS || DAILY_LIMIT_DEFAULT)));
  const used = Number(row?.used || 0);
  return { used, limit, remaining: Math.max(0, limit - used), day };
}
async function requireUser(request, env) {
  const user = await currentUser(request, env);
  return user;
}
function responseText(data) {
  if (typeof data === "string") return data.trim();
  if (typeof data?.response === "string") return data.response.trim();
  if (typeof data?.text === "string") return data.text.trim();
  if (typeof data?.output_text === "string") return data.output_text.trim();
  if (Array.isArray(data?.choices)) {
    const content = data.choices[0]?.message?.content;
    if (typeof content === "string") return content.trim();
  }
  return "";
}

async function reserveCredit(env, email, day, limit) {
  return env.DB.prepare(`INSERT INTO daily_usage (email, day, used) VALUES (?1, ?2, 1)
    ON CONFLICT(email, day) DO UPDATE SET used = used + 1 WHERE used < ?3
    RETURNING used`).bind(email, day, limit).first();
}
async function refundCredit(env, email, day) {
  await env.DB.prepare("UPDATE daily_usage SET used = CASE WHEN used > 0 THEN used - 1 ELSE 0 END WHERE email = ?1 AND day = ?2").bind(email, day).run();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "GET" && path === "/api/health") return json({ ok: true, service: "prumo-api", time: new Date().toISOString() }, 200, request, env);
    if (!env.DB) return json({ error: "Banco D1 não está vinculado ao Worker (binding DB)." }, 500, request, env);
    try {
      if (request.method === "POST" && path === "/api/register") {
        if (!env.JWT_SECRET) return json({ error: "Configure o Secret JWT_SECRET no Worker." }, 500, request, env);
        const body = await request.json();
        const name = String(body.name || "").trim().slice(0, 80);
        const email = String(body.email || "").trim().toLowerCase().slice(0, 190);
        const password = String(body.password || "");
        if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Informe nome e e-mail válidos." }, 400, request, env);
        if (password.length < 10 || password.length > 128) return json({ error: "A senha precisa ter entre 10 e 128 caracteres." }, 400, request, env);
        const creds = await passwordHash(password);
        try {
          await env.DB.prepare("INSERT INTO users (email, name, password_salt, password_hash, created_at) VALUES (?1, ?2, ?3, ?4, ?5)").bind(email, name, creds.salt, creds.hash, Math.floor(Date.now()/1000)).run();
        } catch (error) {
          if (String(error).toLowerCase().includes("unique") || String(error).toLowerCase().includes("constraint")) return json({ error: "Já existe uma conta online com este e-mail. Entre nela." }, 409, request, env);
          throw error;
        }
        const token = await signToken({ email, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + TOKEN_DAYS*86400 }, env.JWT_SECRET);
        const quota = await quotaFor(env, email, currentDay(env));
        return json({ token, user: { email, name }, quota }, 201, request, env);
      }
      if (request.method === "POST" && path === "/api/login") {
        if (!env.JWT_SECRET) return json({ error: "Configure o Secret JWT_SECRET no Worker." }, 500, request, env);
        const body = await request.json();
        const email = String(body.email || "").trim().toLowerCase().slice(0, 190);
        const password = String(body.password || "");
        const user = await env.DB.prepare("SELECT email, name, password_salt, password_hash FROM users WHERE email = ?1").bind(email).first();
        if (!user || password.length > 128) return json({ error: "E-mail ou senha incorretos." }, 401, request, env);
        const candidate = await passwordHash(password, user.password_salt);
        if (candidate.hash !== user.password_hash) return json({ error: "E-mail ou senha incorretos." }, 401, request, env);
        const now = Math.floor(Date.now()/1000);
        const token = await signToken({ email, iat: now, exp: now + TOKEN_DAYS*86400 }, env.JWT_SECRET);
        const quota = await quotaFor(env, email, currentDay(env));
        return json({ token, user: { email, name: user.name }, quota }, 200, request, env);
      }
      if (request.method === "GET" && path === "/api/me") {
        const user = await requireUser(request, env);
        if (!user) return json({ error: "Sessão inválida ou expirada. Entre novamente." }, 401, request, env);
        const quota = await quotaFor(env, user.email, currentDay(env));
        return json({ user: { email: user.email, name: user.name }, quota }, 200, request, env);
      }
      if (request.method === "POST" && (path === "/api/chat" || path === "/api/research")) {
        const user = await requireUser(request, env);
        if (!user) return json({ error: "Sessão inválida ou expirada. Entre novamente." }, 401, request, env);
        if (!env.AI || typeof env.AI.run !== "function") return json({ error: "A conexão Workers AI não está vinculada. Configure o binding AI no Worker." }, 503, request, env);
        const body = await request.json();
        let messages = Array.isArray(body.messages) ? body.messages : [];
        if (!messages.length && body.question) messages = [{ role: "user", content: String(body.question) }];
        messages = messages.slice(-12).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 4000) })).filter(m => m.content.trim());
        if (!messages.length || messages[messages.length-1].role !== "user") return json({ error: "Envie uma mensagem válida." }, 400, request, env);
        const day = currentDay(env);
        const limit = Math.max(1, Math.min(20, Number(env.DAILY_CREDITS || DAILY_LIMIT_DEFAULT)));
        const reserved = await reserveCredit(env, user.email, day, limit);
        if (!reserved) {
          const quota = await quotaFor(env, user.email, day);
          return json({ error: "Você usou seus 2 créditos de hoje. Volte amanhã para continuar.", quota }, 429, request, env);
        }
        try {
          const model = env.WORKERS_AI_MODEL || "@cf/google/gemma-4-26b-a4b-it";
          const aiMessages = [
            { role: "system", content: "Você é o Assistente do Prumo, uma agência criativa e de marketing. Seja útil, colaborativo e claro em português brasileiro. Ajude com estratégia, campanhas, posicionamento, pesquisa, ideias, redação, revisão e organização de tarefas. Faça perguntas objetivas quando faltar contexto. Não invente dados, métricas, resultados ou fontes. Diferencie fatos de sugestões. Responda com formatação simples e organizada." },
            ...messages
          ];
          const payload = await env.AI.run(model, {
            messages: aiMessages,
            max_tokens: 900,
            temperature: 0.6
          });
          const answer = responseText(payload);
          if (!answer) throw new Error("O modelo da Cloudflare não retornou texto nesta resposta.");
          const quota = await quotaFor(env, user.email, day);
          return json({ answer, quota, model, provider: "Cloudflare Workers AI" }, 200, request, env);
        } catch (error) {
          await refundCredit(env, user.email, day);
          const quota = await quotaFor(env, user.email, day);
          return json({ error: `Não foi possível concluir a resposta pela Cloudflare Workers AI. O crédito foi devolvido. ${String(error.message || "")}`.slice(0, 500), quota }, 502, request, env);
        }
      }
      return json({ error: "Rota não encontrada." }, 404, request, env);
    } catch (error) {
      console.error("Prumo Worker error:", error);
      return json({ error: "Erro interno no servidor do Prumo. Confira os Logs do Worker." }, 500, request, env);
    }
  }
};

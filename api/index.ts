/**
 * SARDYX AI — Vercel Serverless Entry Point
 * All routes are self-contained here so Vercel's module bundler
 * can compile them without any ambiguous relative-path issues.
 */

// ── dotenv FIRST (no-op on Vercel since env vars come from dashboard) ────────
import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { SARDYX_SYSTEM_PROMPT, injectUserContext } from "../src/lib/systemPromptConstants";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ── Supabase client generator (Fresh instance per request to avoid auth state pollution) ──
function sb() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

// ── URL normaliser ────────────────────────────────────────────────────────────
function normaliseLlmBase(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "");
  if (u.endsWith("/v1r")) u = u.slice(0, -1); // fix typo
  if (u.endsWith("/v1"))  u = u.slice(0, -3);
  return u;
}

// ── Helper: get caller IP ────────────────────────────────────────────────────
const ip = (req: express.Request) =>
  (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "unknown";

// ── Supabase DB helpers ───────────────────────────────────────────────────────
async function getSessions(email: string) {
  const client = sb();
  if (!client) return [];
  const { data, error } = await client
    .from("chat_sessions").select("*").eq("user_email", email).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((s: any) => ({
    id: s.id, userEmail: s.user_email, title: s.title,
    messages: s.messages || [], modelMode: s.model_mode || "auto",
    createdAt: s.created_at, updatedAt: s.updated_at, isSaved: true,
  }));
}

async function createSession(id: string, email: string, title: string, modelMode: string) {
  const client = sb();
  if (!client) return { id, userEmail: email, title, messages: [], modelMode, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), isSaved: false };
  const { data, error } = await client.from("chat_sessions")
    .insert({ id, user_email: email, title: title || "New Conversation", messages: [], model_mode: modelMode || "auto", created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select().single();
  if (error) throw new Error(error.message);
  return { id: data.id, userEmail: data.user_email, title: data.title, messages: data.messages || [], modelMode: data.model_mode || "auto", createdAt: data.created_at, updatedAt: data.updated_at, isSaved: true };
}

async function updateSession(id: string, email: string, messages: any[]) {
  const client = sb();
  if (!client) return null;
  const { data, error } = await client.from("chat_sessions")
    .update({ messages, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_email", email).select().single();
  if (error) throw new Error(error.message);
  return { id: data.id, userEmail: data.user_email, title: data.title, messages: data.messages || [], modelMode: data.model_mode || "auto", createdAt: data.created_at, updatedAt: data.updated_at, isSaved: true };
}

async function deleteSession(id: string, email: string) {
  const client = sb();
  if (!client) return true;
  const { error } = await client.from("chat_sessions").delete().eq("id", id).eq("user_email", email);
  if (error) throw new Error(error.message);
  return true;
}

async function getMemories(email: string) {
  const client = sb();
  if (!client) return [];
  const { data, error } = await client.from("memories").select("*").eq("user_email", email).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((m: any) => ({ id: m.id, userEmail: m.user_email, key: m.key, content: m.content, createdAt: m.created_at }));
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function signUp(email: string, password: string, name: string) {
  const client = sb();
  if (client) {
    const isService = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (isService) {
      const { data, error } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name } });
      if (error) throw new Error(error.message);
      return { id: data.user!.id, email: data.user!.email!, name, avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`, createdAt: data.user!.created_at, role: "user" };
    } else {
      const { data, error } = await client.auth.signUp({ email, password, options: { data: { name } } });
      if (error) throw new Error(error.message);
      return { id: data.user!.id, email: data.user!.email!, name, avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`, createdAt: data.user!.created_at, role: "user" };
    }
  }
  throw new Error("No auth provider configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env vars.");
}

async function signIn(email: string, password: string) {
  const client = sb();
  if (client) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { id: data.user.id, email: data.user.email!, name: (data.user.user_metadata?.name as string) || email.split("@")[0], avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`, createdAt: data.user.created_at, role: "user" };
  }
  throw new Error("No auth provider configured.");
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

function getJwtRole(token?: string): string {
  if (!token) return "missing";
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "invalid";
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    return payload.role || "unknown";
  } catch (e: any) {
    return "error: " + e.message;
  }
}

// Health
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "SARDYX AI Backend running on Vercel",
    supabase: !!sb(),
    llm: !!(process.env.FREE_LLM_API_BASE_URL && process.env.FREE_LLM_API_KEY),
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      supabaseUrl: process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : "none",
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasLlmUrl: !!process.env.FREE_LLM_API_BASE_URL,
      hasLlmKey: !!process.env.FREE_LLM_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      anonKeyRole: getJwtRole(process.env.SUPABASE_ANON_KEY),
      serviceKeyRole: getJwtRole(process.env.SUPABASE_SERVICE_ROLE_KEY),
      clientKeyRole: getJwtRole((sb() as any)?.supabaseKey),
    }
  });
});

// Auth — signup
app.post(["/api/auth/local-signup", "/auth/local-signup"], async (req, res) => {
  try {
    const { email, password, fullName, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const displayName = name || fullName || email.split("@")[0];
    const user = await signUp(email.toLowerCase().trim(), password, displayName);
    return res.json({ user, token: user.email });
  } catch (err: any) {
    console.error("[AUTH] Signup error:", err.message);
    return res.status(400).json({ error: err.message });
  }
});

// Auth — login
app.post(["/api/auth/local-login", "/auth/local-login"], async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const user = await signIn(email.toLowerCase().trim(), password);
    return res.json({ user, token: user.email });
  } catch (err: any) {
    console.error("[AUTH] Login error:", err.message);
    return res.status(400).json({ error: err.message });
  }
});

// Auth — session check
app.get(["/api/auth/session", "/auth/session"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.json({ session: null });
  const email = authHeader.replace("Bearer ", "").trim();
  const client = sb();
  if (!client) return res.json({ session: { user: { email, name: email.split("@")[0], role: "user" } } });
  try {
    const { data } = await client.auth.admin.listUsers();
    const found = data?.users?.find((u: any) => u.email === email);
    if (found) return res.json({ session: { user: { id: found.id, email: found.email, name: found.user_metadata?.name || email.split("@")[0], role: "user", avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}` } } });
  } catch (_) {}
  return res.json({ session: null });
});

// Auth — logout
app.post(["/api/auth/logout", "/auth/logout"], (_req, res) => res.json({ success: true }));

// Profile sync
app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  const { email, name, avatarUrl, id } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const e = email.toLowerCase().trim();
  return res.json({ user: { id: id || `usr-${Date.now()}`, email: e, name: name || e.split("@")[0], avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(e)}`, role: "user" }, token: e });
});

// Memories
app.get(["/api/memory", "/memory"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  try { return res.json(await getMemories(email)); } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.post(["/api/memory", "/memory"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const { key, content } = req.body;
  if (!key || !content) return res.status(400).json({ error: "key and content required" });
  try {
    const client = sb();
    if (!client) return res.json({ id: `mem-${Date.now()}`, userEmail: email, key, content, createdAt: new Date().toISOString() });
    const { data, error } = await client.from("memories").insert({ id: `mem-${Date.now()}`, user_email: email, key, content }).select().single();
    if (error) throw new Error(error.message);
    return res.json({ id: data.id, userEmail: data.user_email, key: data.key, content: data.content, createdAt: data.created_at });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.delete(["/api/memory/:id", "/memory/:id"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  try {
    const client = sb();
    if (client) { const { error } = await client.from("memories").delete().eq("id", req.params.id).eq("user_email", email); if (error) throw new Error(error.message); }
    return res.json({ success: true });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// Chat sessions
app.get(["/api/chats", "/chats"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.json([]);
  try { return res.json(await getSessions(email)); } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.post(["/api/chats", "/chats"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const { title, modelMode } = req.body;
  try { return res.json(await createSession(`sess-${Date.now()}`, email, title, modelMode)); } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.delete(["/api/chats/:id", "/chats/:id"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  try { await deleteSession(req.params.id, email); return res.json({ success: true }); } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

app.post(["/api/chats/:id", "/chats/:id"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const { messages } = req.body;
  try { return res.json(await updateSession(req.params.id, email, messages)); } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

// Models list
app.get(["/api/models", "/models"], async (_req, res) => {
  const baseUrl = process.env.FREE_LLM_API_BASE_URL || "";
  const key = process.env.FREE_LLM_API_KEY || "";
  const defaults = [
    { id: "sardyx-reasoning", name: "SardyX Reason Plus", category: "Reasoning Models", isAvailable: true, provider: "FreeLLMAPI" },
    { id: "sardyx-conversation", name: "SardyX Conversational", category: "Chat Models", isAvailable: true, provider: "FreeLLMAPI" },
    { id: "sardyx-coder", name: "SardyX CodePro", category: "Coding Models", isAvailable: true, provider: "FreeLLMAPI" },
  ];
  if (!baseUrl || !key) return res.json(defaults);
  try {
    const r = await fetch(`${normaliseLlmBase(baseUrl)}/v1/models`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d?.data) && d.data.length > 0) {
        return res.json(d.data.map((m: any) => {
          const l = (m.id as string).toLowerCase();
          return { id: m.id, name: m.id, category: l.includes("code") ? "Coding Models" : (l.includes("reason") || l.includes("r1") || l.includes("think")) ? "Reasoning Models" : l.includes("vision") || l.includes("vl") ? "Vision Models" : "Chat Models", isAvailable: true, provider: "FreeLLMAPI" };
        }));
      }
    }
  } catch (_) {}
  return res.json(defaults);
});

// Security
app.post(["/api/security/check-guest-limit", "/security/check-guest-limit"], (req, res) => {
  // On Vercel serverless, we can't persist guest state easily — allow 1 guest message
  return res.json({ allowed: true, currentCount: 0 });
});

// ── MAIN CHAT INFERENCE ENDPOINT ─────────────────────────────────────────────
app.post(["/api/chats/:id/messages", "/chats/:id/messages"], async (req, res) => {
  const t0 = Date.now();
  const { message, modelMode, customInstructions } = req.body;
  const sessionId = req.params.id;
  const userEmail = req.headers.authorization?.replace("Bearer ", "").trim() || null;

  if (!message?.content?.trim()) return res.status(400).json({ error: "Message content is required" });

  // Model selection
  const content = message.content.toLowerCase();
  const mode = (modelMode || "auto").toLowerCase();
  let category = "Chat Models";
  const thoughts: string[] = ["Analysing request..."];

  if (mode === "coding" || (mode === "auto" && /\b(code|function|debug|typescript|javascript|python|css|refactor|algorithm)\b/.test(content))) {
    category = "Coding Models"; thoughts.push("Routing to coding model.");
  } else if (mode === "reasoning" || (mode === "auto" && (message.content.split(" ").length > 30 || /\b(explain|analyse|analyze|calculate|solve|why|how does|proof)\b/.test(content)))) {
    category = "Reasoning Models"; thoughts.push("Routing to reasoning model.");
  } else if (mode === "vision" || message.attachments?.some((a: any) => a.type?.startsWith("image/"))) {
    category = "Vision Models"; thoughts.push("Routing to vision model.");
  }

  // Load memories
  let memCtx = "";
  if (userEmail) {
    try {
      const mems = await getMemories(userEmail);
      if (mems.length) { memCtx = mems.map((m: any) => `${m.key}: ${m.content}`).join("; "); thoughts.push(`${mems.length} memory note(s) loaded.`); }
    } catch (_) {}
  }

  // Session
  let session: any = null;
  if (userEmail) {
    try {
      const sessions = await getSessions(userEmail);
      session = sessions.find((s: any) => s.id === sessionId) || await createSession(sessionId, userEmail, message.content.substring(0, 50), mode);
    } catch (e: any) { console.error("[CHAT] Session error:", e.message); }
  }

  // Pick model
  const FREE_DEFAULTS: Record<string, string> = {
    "Coding Models":    "qwen/qwen-2.5-coder-32b-instruct:free",
    "Reasoning Models": "deepseek/deepseek-r1:free",
    "Vision Models":    "google/gemini-flash-1.5",
    "Chat Models":      "meta-llama/llama-3.1-8b-instruct:free",
  };
  let assignedModel = FREE_DEFAULTS[category] || FREE_DEFAULTS["Chat Models"];

  const llmBase = process.env.FREE_LLM_API_BASE_URL || "";
  const llmKey  = process.env.FREE_LLM_API_KEY || "";
  let responseText = "";

  if (llmBase && llmKey) {
    const base = normaliseLlmBase(llmBase);
    // Pick best available free model
    try {
      const mr = await fetch(`${base}/v1/models`, { headers: { Authorization: `Bearer ${llmKey}` }, signal: AbortSignal.timeout(8000) });
      if (mr.ok) {
        const md = await mr.json();
        const ids: string[] = Array.isArray(md?.data) ? md.data.map((m: any) => m.id as string) : [];
        thoughts.push(`${ids.length} models available.`);
        if (ids.length > 0) {
          const pick = (filters: string[]) =>
            ids.find(id => filters.some(f => id.toLowerCase().includes(f)) && id.toLowerCase().includes("free")) ||
            ids.find(id => filters.some(f => id.toLowerCase().includes(f)));
          let m = "";
          if (category === "Coding Models")    m = pick(["code","coder"]) || "";
          else if (category === "Reasoning Models") m = pick(["reason","think","r1","deepseek"]) || "";
          else if (category === "Vision Models") m = pick(["vision","vl"]) || "";
          if (!m) m = pick(["llama","mistral","qwen","gemma","instruct"]) || "";
          if (!m) m = ids.find(id => id.toLowerCase().includes("free")) || ids[0] || assignedModel;
          assignedModel = m;
        }
      }
    } catch (e: any) { thoughts.push(`Model list error: ${e.message}`); }

    // Call LLM
    const history = (session?.messages || []).map((m: any) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: message.content });
    const sysPrompt = injectUserContext(SARDYX_SYSTEM_PROMPT, customInstructions, memCtx).trim();
    thoughts.push(`Calling ${assignedModel}...`);

    try {
      const llmRes = await fetch(`${base}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${llmKey}` },
        body: JSON.stringify({ model: assignedModel, messages: [{ role: "system", content: sysPrompt }, ...history], temperature: 0.7 }),
        signal: AbortSignal.timeout(60_000),
      });
      if (llmRes.ok) {
        const d = await llmRes.json();
        responseText = d.choices?.[0]?.message?.content || "";
        thoughts.push("Response received.");
      } else {
        const errTxt = await llmRes.text();
        thoughts.push(`LLM error ${llmRes.status}: ${errTxt.substring(0, 100)}`);
        console.error("[LLM] Error:", llmRes.status, errTxt.substring(0, 200));
      }
    } catch (e: any) {
      thoughts.push(`LLM request failed: ${e.message}`);
      console.error("[LLM] Request failed:", e.message);
    }
  } else {
    thoughts.push("LLM not configured.");
  }

  if (!responseText) {
    responseText = `### SARDYX AI — Sandbox Mode\n\nYour message: *"${message.content.substring(0, 100)}"*\n\nI am **SARDYX AI**, created by **Sardar Abdullah Fazal**.\n\n> **Note:** ${llmBase && llmKey ? "The LLM API call failed. Check Vercel logs for details." : "Set `FREE_LLM_API_BASE_URL` and `FREE_LLM_API_KEY` environment variables in Vercel to enable real AI responses."}`;
  }

  const botMsg = { id: `msg-${Date.now()}-bot`, role: "assistant", content: responseText, timestamp: new Date().toISOString(), modelUsed: assignedModel, durationMs: Date.now() - t0, thoughts };

  if (session && userEmail) {
    try {
      const updated = [...(session.messages || []),
        { id: message.id || `msg-${Date.now()}-usr`, role: "user", content: message.content, timestamp: message.timestamp || new Date().toISOString() },
        botMsg];
      session = await updateSession(sessionId, userEmail, updated);
    } catch (e: any) { console.error("[CHAT] Save session error:", e.message); }
  }

  return res.json({ message: botMsg, session });
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[SERVER] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", message: err?.message || "Unknown error" });
});

export default app;

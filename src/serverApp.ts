/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SARDYX AI — Central Express Application
 * ========================================
 * dotenv MUST be configured before any module that reads env vars is imported.
 */

// ─── 1. Load env vars FIRST (before any other local import) ────────────────
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";

const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.local";
const envPath = path.resolve(process.cwd(), envFile);
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // fallback: reads .env in cwd
}

// ─── 2. Now import everything else ─────────────────────────────────────────
import express from "express";
import chatRouter from "./api/chat";
import {
  getLocalDB,
  saveLocalDB,
  dbSignUp,
  dbSignIn,
  dbGetUserProfile,
  dbGetSessions,
  dbCreateSession,
  dbUpdateSession,
  dbDeleteSession,
  dbGetMemories,
  dbCreateMemory,
  dbDeleteMemory,
} from "./lib/supabase";

// ─── 3. Express setup ───────────────────────────────────────────────────────
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ─── Health / test ──────────────────────────────────────────────────────────
app.get(["/health", "/api/health"], (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "SARDYX AI Backend is running",
    supabase: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
    llmConfigured: !!(process.env.FREE_LLM_API_BASE_URL && process.env.FREE_LLM_API_KEY),
  });
});

app.post(["/api/test/chat", "/test/chat"], (req, res) => {
  res.json({ message: "Test endpoint working!", receivedBody: req.body, timestamp: new Date().toISOString() });
});

// ─── Local DB helpers ────────────────────────────────────────────────────────
const getDB = getLocalDB;
const saveDB = saveLocalDB;

const addAuditLog = (type: string, message: string, userEmail?: string, ip?: string, details?: string) => {
  try {
    const db = getDB();
    db.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      type, message, userEmail,
      ipAddress: ip || "127.0.0.1",
      details,
    });
    if (db.auditLogs.length > 200) db.auditLogs = db.auditLogs.slice(0, 200);
    saveDB(db);
  } catch (err) {
    console.error("Failed to add audit log:", err);
  }
};

// ─── Custom LLM proxy route ──────────────────────────────────────────────────
app.use(["/api/chat", "/chat"], chatRouter);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getClientIp = (req: express.Request) =>
  (req.headers["x-forwarded-for"] as string) || req.socket?.remoteAddress || "127.0.0.1";

/** Normalise the FreeLLM base URL — handles the /v1r typo and trailing /v1 */
function normaliseLlmBase(rawUrl: string): string {
  let url = rawUrl.trim().replace(/\/+$/, ""); // strip trailing slashes
  // Fix typo: ends with /v1r → /v1
  if (url.endsWith("/v1r")) url = url.slice(0, -1);
  // Strip /v1 suffix so we can always append /v1/...
  if (url.endsWith("/v1")) url = url.slice(0, -3);
  return url;
}

const getAvailableFreeLlmModels = async (baseUrl: string, key: string): Promise<string[]> => {
  try {
    const base = normaliseLlmBase(baseUrl);
    const modelsUrl = `${base}/v1/models`;
    console.log(`[LLM] Fetching models from ${modelsUrl}`);
    const res = await fetch(modelsUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) return data.data.map((m: any) => m.id as string);
    } else {
      console.error(`[LLM] Model list fetch failed: ${res.status} ${await res.text()}`);
    }
  } catch (err: any) {
    console.error("[LLM] Model list fetch error:", err.message);
  }
  return [];
};

// ─── AUTH ENDPOINTS ──────────────────────────────────────────────────────────

app.post(["/api/auth/local-signup", "/auth/local-signup"], async (req, res) => {
  console.log("[AUTH] POST /api/auth/local-signup");
  try {
    const { email, password, fullName, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const displayName = name || fullName || email.split("@")[0];
    const user = await dbSignUp(email, password, displayName);
    addAuditLog("auth", `Account registered: ${user.email}`, user.email, getClientIp(req));
    return res.json({ user, token: user.email });
  } catch (err: any) {
    console.error("[AUTH] Signup error:", err.message);
    return res.status(400).json({ error: err.message || "Signup failed" });
  }
});

app.post(["/api/auth/local-login", "/auth/local-login"], async (req, res) => {
  console.log("[AUTH] POST /api/auth/local-login");
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });
    const user = await dbSignIn(email, password);
    addAuditLog("auth", `Account authenticated: ${user.email}`, user.email, getClientIp(req));
    return res.json({ user, token: user.email });
  } catch (err: any) {
    console.error("[AUTH] Login error:", err.message);
    return res.status(400).json({ error: err.message || "Login failed" });
  }
});

app.get(["/api/auth/session", "/auth/session"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.json({ session: null });
  const email = authHeader.replace("Bearer ", "").trim();
  try {
    const user = await dbGetUserProfile(email);
    return res.json({ session: user ? { user } : null });
  } catch (err) {
    return res.json({ session: null });
  }
});

app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  try {
    const { email, name, avatarUrl, id } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });
    const emailLower = email.toLowerCase().trim();
    const user = {
      id: id || `usr-${Date.now()}`,
      email: emailLower,
      name: name || emailLower.split("@")[0],
      role: "user",
      createdAt: new Date().toISOString(),
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`,
    };
    addAuditLog("auth", `Profile synced: ${emailLower}`, emailLower, getClientIp(req));
    return res.json({ user, token: emailLower });
  } catch (err: any) {
    return res.status(500).json({ error: "Login sync failed", message: err.message });
  }
});

app.post(["/api/auth/logout", "/auth/logout"], (req, res) => {
  const { email } = req.body;
  addAuditLog("auth", `User logged out: ${email || "Anonymous"}`, email, getClientIp(req));
  return res.json({ success: true });
});

// ─── MEMORY ENDPOINTS ────────────────────────────────────────────────────────

app.get(["/api/memory", "/memory"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  try {
    return res.json(await dbGetMemories(email));
  } catch (err: any) {
    console.error("[MEMORY] Fetch error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve memories" });
  }
});

app.post(["/api/memory", "/memory"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const { key, content } = req.body;
  if (!key || !content) return res.status(400).json({ error: "Key and content are required" });
  try {
    const mem = await dbCreateMemory(`mem-${Date.now()}`, email, key, content);
    addAuditLog("chat", `Created memory [${key}]`, email, getClientIp(req));
    return res.json(mem);
  } catch (err: any) {
    console.error("[MEMORY] Create error:", err.message);
    return res.status(500).json({ error: "Failed to store memory" });
  }
});

app.delete(["/api/memory/:id", "/memory/:id"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  try {
    await dbDeleteMemory(req.params.id, email);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[MEMORY] Delete error:", err.message);
    return res.status(500).json({ error: "Failed to delete memory" });
  }
});

// ─── CHAT SESSION ENDPOINTS ──────────────────────────────────────────────────

app.get(["/api/chats", "/chats"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.json([]);
  try {
    return res.json(await dbGetSessions(email));
  } catch (err: any) {
    console.error("[CHATS] Fetch error:", err.message);
    return res.status(500).json({ error: "Failed to load chats" });
  }
});

app.post(["/api/chats", "/chats"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const { title, modelMode } = req.body;
  try {
    return res.json(await dbCreateSession(`sess-${Date.now()}`, email, title, modelMode));
  } catch (err: any) {
    console.error("[CHATS] Create error:", err.message);
    return res.status(500).json({ error: "Failed to create chat session" });
  }
});

app.delete(["/api/chats/:id", "/chats/:id"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  try {
    await dbDeleteSession(req.params.id, email);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[CHATS] Delete error:", err.message);
    return res.status(500).json({ error: "Failed to delete chat" });
  }
});

app.post(["/api/chats/:id", "/chats/:id"], async (req, res) => {
  const email = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!email) return res.status(401).json({ error: "Unauthorized" });
  const { messages } = req.body;
  try {
    return res.json(await dbUpdateSession(req.params.id, email, messages));
  } catch (err: any) {
    console.error("[CHATS] Update error:", err.message);
    return res.status(500).json({ error: "Failed to save chat messages" });
  }
});

// ─── MODELS ENDPOINT ─────────────────────────────────────────────────────────

app.get(["/api/models", "/models"], async (_req, res) => {
  const freeLlmBaseUrl = process.env.FREE_LLM_API_BASE_URL;
  const freeLlmKey = process.env.FREE_LLM_API_KEY;

  const defaultModels = [
    { id: "sardyx-reasoning", name: "SardyX Reason Plus (r1)", category: "Reasoning Models", isAvailable: true, provider: "FreeLLMAPI-Core", description: "Advanced multi-turn deep thinking for STEM, math, and logic.", iconName: "brain" },
    { id: "sardyx-conversation", name: "SardyX Conversational-X", category: "Chat Models", isAvailable: true, provider: "FreeLLMAPI-Core", description: "Blazing fast everyday interactions and brainstorming.", iconName: "message-square" },
    { id: "sardyx-coder", name: "SardyX CodePro v3", category: "Coding Models", isAvailable: true, provider: "FreeLLMAPI-Coder", description: "Expert at debugging, refactoring and writing clean code.", iconName: "code" },
    { id: "sardyx-vision", name: "SardyX Omni-Vision", category: "Vision Models", isAvailable: true, provider: "FreeLLMAPI-Multimodal", description: "OCR, image analysis and visual reasoning.", iconName: "eye" },
  ];

  if (freeLlmBaseUrl && freeLlmKey) {
    try {
      const ids = await getAvailableFreeLlmModels(freeLlmBaseUrl, freeLlmKey);
      if (ids.length > 0) {
        return res.json(ids.map((id) => {
          const l = id.toLowerCase();
          const isReason = l.includes("reason") || l.includes("r1") || l.includes("think") || l.includes("deepseek");
          const isCode   = l.includes("code") || l.includes("coder");
          const isVision = l.includes("vision") || l.includes("vl");
          return {
            id, name: id,
            category: isReason ? "Reasoning Models" : isCode ? "Coding Models" : isVision ? "Vision Models" : "Chat Models",
            isAvailable: true,
            provider: "FreeLLMAPI Host",
            description: `Free model: ${id}`,
            iconName: isReason ? "brain" : isCode ? "code" : isVision ? "eye" : "message-square",
          };
        }));
      }
    } catch (err: any) {
      console.error("[MODELS] Error fetching model list:", err.message);
    }
  }
  return res.json(defaultModels);
});

// ─── GUEST SECURITY ───────────────────────────────────────────────────────────

app.post(["/api/security/check-guest-limit", "/security/check-guest-limit"], (req, res) => {
  const { guestToken } = req.body;
  const ip = getClientIp(req);
  const db = getDB();
  const tokenKey = guestToken || ip;
  const count = db.guestTokens[tokenKey] || 0;
  return res.json({ allowed: count < 1, currentCount: count });
});

// ─── CORE CHAT / AI INFERENCE ENDPOINT ───────────────────────────────────────

app.post(["/api/chats/:id/messages", "/chats/:id/messages"], async (req, res) => {
  const startTime = Date.now();
  const sessionId = req.params.id;
  const { message, guestToken, modelMode, customInstructions } = req.body;
  const authHeader = req.headers.authorization;
  const ip = getClientIp(req);

  if (!message || typeof message.content !== "string" || !message.content.trim()) {
    return res.status(400).json({ error: "Message content is required" });
  }

  const userEmail = authHeader ? authHeader.replace("Bearer ", "").trim() : null;
  const db = getDB();

  // ── Guest rate limiting ──────────────────────────────────────────────────
  if (!userEmail) {
    const tokenKey = guestToken || ip;
    const count = db.guestTokens[tokenKey] || 0;
    if (count >= 1) {
      db.systemMetrics.rateLimitHits++;
      saveDB(db);
      return res.status(403).json({
        error: "GUEST_LIMIT_REACHED",
        message: "You have used your 1 free guest message. Please Sign In to continue.",
      });
    }
    db.guestTokens[tokenKey] = count + 1;
    saveDB(db);
  }

  // ── Session management ───────────────────────────────────────────────────
  let activeSession: any = null;
  if (userEmail) {
    try {
      const sessions = await dbGetSessions(userEmail);
      activeSession = sessions.find((s: any) => s.id === sessionId) || null;
    } catch (err) {
      console.error("[ROUTER] Error fetching sessions:", err);
    }
    if (!activeSession) {
      try {
        activeSession = await dbCreateSession(sessionId, userEmail, message.content.substring(0, 50), modelMode || "auto");
      } catch (err) {
        console.error("[ROUTER] Error creating session:", err);
      }
    } else if (modelMode) {
      activeSession.modelMode = modelMode;
    }
  }

  // ── Intelligent model routing ────────────────────────────────────────────
  const contentLower = message.content.toLowerCase();
  const reqMode = (modelMode || "auto").toLowerCase();
  let selectedCategory = "Chat Models";
  const thoughts: string[] = ["Analysing user input..."];

  if (reqMode === "coding" || (reqMode === "auto" && /\b(code|function|program|compile|typescript|javascript|python|css|debug|refactor|algorithm)\b/.test(contentLower))) {
    selectedCategory = "Coding Models";
    thoughts.push("Routing to coding specialist model.");
  } else if (reqMode === "reasoning" || (reqMode === "auto" && (contentLower.split(" ").length > 30 || /\b(explain|analyse|analyze|calculate|solve|reason|why|how does|proof|theorem)\b/.test(contentLower)))) {
    selectedCategory = "Reasoning Models";
    thoughts.push("Routing to deep-reasoning model.");
  } else if (reqMode === "vision" || (message.attachments?.some((a: any) => a.type?.startsWith("image/")))) {
    selectedCategory = "Vision Models";
    thoughts.push("Routing to vision model.");
  } else if (/\b(create image|generate image|design logo|draw|paint)\b/.test(contentLower)) {
    selectedCategory = "Image Models";
  } else if (/\b(create video|generate video|make video)\b/.test(contentLower)) {
    selectedCategory = "Video Models";
  }

  // ── Memory context ───────────────────────────────────────────────────────
  let memoryContext = "";
  if (userEmail) {
    try {
      const mems = await dbGetMemories(userEmail);
      if (mems.length) {
        memoryContext = mems.map((m: any) => `${m.key}: ${m.content}`).join("; ");
        thoughts.push(`Loaded ${mems.length} memory note(s).`);
      }
    } catch (err) { /* non-fatal */ }
  }

  db.systemMetrics.requestsTotal++;
  saveDB(db);

  // ── Determine LLM model ──────────────────────────────────────────────────
  const freeLlmBaseUrl = process.env.FREE_LLM_API_BASE_URL || "";
  const freeLlmKey     = process.env.FREE_LLM_API_KEY || "";

  // Default free fallbacks per category
  const FREE_DEFAULTS: Record<string, string> = {
    "Coding Models":    "qwen/qwen-2.5-coder-32b-instruct:free",
    "Reasoning Models": "deepseek/deepseek-r1:free",
    "Vision Models":    "google/gemini-flash-1.5",
    "Chat Models":      "meta-llama/llama-3.1-8b-instruct:free",
    "Image Models":     "meta-llama/llama-3.1-8b-instruct:free",
    "Video Models":     "meta-llama/llama-3.1-8b-instruct:free",
  };

  let assignedModel = FREE_DEFAULTS[selectedCategory] || FREE_DEFAULTS["Chat Models"];
  let apiConfigured = !!(freeLlmBaseUrl && freeLlmKey);
  let targetUrl = "";

  if (apiConfigured) {
    const base = normaliseLlmBase(freeLlmBaseUrl);
    targetUrl = `${base}/v1/chat/completions`;

    // Try to pick the best available model from the API
    const availableModels = await getAvailableFreeLlmModels(freeLlmBaseUrl, freeLlmKey);
    thoughts.push(`${availableModels.length} models available on FreeLLMAPI.`);

    if (modelMode && !["auto","conversational","coding","reasoning","vision","agent"].includes(modelMode) && availableModels.includes(modelMode)) {
      assignedModel = modelMode;
    } else if (availableModels.length > 0) {
      // Prefer free models for each category
      const pick = (filters: string[]) =>
        availableModels.find(id => filters.some(f => id.toLowerCase().includes(f)) && id.toLowerCase().includes("free")) ||
        availableModels.find(id => filters.some(f => id.toLowerCase().includes(f)));

      let matched = "";
      if (selectedCategory === "Coding Models")    matched = pick(["code","coder"]) || "";
      else if (selectedCategory === "Reasoning Models") matched = pick(["reason","think","r1","deepseek","deep"]) || "";
      else if (selectedCategory === "Vision Models") matched = pick(["vision","vl"]) || "";

      if (!matched) matched = pick(["llama","mistral","qwen","gemma","gpt","chat","instruct"]) || "";
      if (!matched) matched = availableModels.find(id => id.toLowerCase().includes("free")) || availableModels[0] || "";

      if (matched) assignedModel = matched;
    }
    thoughts.push(`Selected model: ${assignedModel}`);
  }

  console.log(`[CHAT] Message: "${message.content.substring(0, 80)}"`);
  console.log(`[MODEL] ${assignedModel}`);

  // ── Build conversation context ────────────────────────────────────────────
  const historyMessages = (activeSession?.messages || []).map((m: any) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  historyMessages.push({ role: "user", content: message.content });

  const formattingRules = `
GLOBAL RESPONSE FORMATTING RULES
Apply these formatting rules to EVERY response without exception.
1. Never return walls of text.
2. Always use proper spacing between sections.
3. Always add line breaks between headings and content.
4. Keep responses clean, modern, and professional.
5. Use Markdown formatting.
6. Use headings, subheadings, bullet points, and numbered lists where appropriate.
7. Never place all information in a single paragraph.
8. Important information should be clearly separated.
9. Responses should look like they were written by a professional consultant, not a chatbot.
10. Always optimize readability for both desktop and mobile users.

BIOGRAPHY RESPONSE FORMAT
Whenever a user asks:
- Who is Sardar Abdullah?
- Who is Sardar Abdullah Fazal?
- Who is Abdullah?
- Who is Abdullah Fazal?
- سردار عبداللہ کون ہے؟
- عبداللہ فضل کون ہے؟
- Any similar question in any language

Use the following format exactly (translate the labels appropriately into the user's language, but preserve the exact structure, spacing, headings, and separators):

# Sardar Abdullah Fazal

## Basic Information

**Full Name:** Sardar Abdullah Fazal

**Age:** 17

**Country:** Pakistan

**Father's Name:** Sardar Mufti Fazal Ur Rehman Shakir

---

## Professional Background

Sardar Abdullah Fazal is a young AI developer, AI automation specialist, entrepreneur, and digital creator from Pakistan.

He has worked on multiple AI projects, automation systems, chatbots, websites, and digital solutions for various clients, businesses, and organizations.

---

## Skills & Expertise

• Artificial Intelligence (AI)

• AI Automation

• Chatbot Development

• Website Development

• Graphic Design

• Video Editing

• Marketing Video Creation

• Social Media Marketing

• Digital Branding

• Business Automation

---

## Professional Summary

Sardar Abdullah Fazal is known for building AI-powered solutions, intelligent chatbots, automation systems, and modern websites.

His work focuses on helping businesses and organizations improve productivity through technology, automation, and digital innovation.

---

## Key Areas of Focus

✓ AI Solutions

✓ Business Automation

✓ Digital Transformation

✓ Marketing & Branding

✓ Web Development

✓ Content & Media Production

Always preserve this structure, spacing, headings, separators, and formatting.
Never compress it into a single paragraph.
Never remove line breaks.
Never return plain text formatting.`.trim();

  const sysPrompt = `You are SARDYX AI, a premium autonomous AI agent created by Sardar Abdullah Fazal.
${formattingRules}
${customInstructions ? `Custom instructions: ${customInstructions}.` : ""}
${memoryContext ? `User context: ${memoryContext}.` : ""}`.trim();

  // ── Call LLM ─────────────────────────────────────────────────────────────
  let responseText = "";
  let apiSucceeded = false;

  if (apiConfigured && targetUrl) {
    try {
      thoughts.push(`Calling FreeLLMAPI [${assignedModel}]...`);
      const llmRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${freeLlmKey}` },
        body: JSON.stringify({
          model: assignedModel,
          messages: [{ role: "system", content: sysPrompt }, ...historyMessages],
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (llmRes.ok) {
        const apiData = await llmRes.json();
        responseText = apiData.choices?.[0]?.message?.content || "";
        apiSucceeded = true;
        db.systemMetrics.freeLlmCalls++;
        saveDB(db);
        thoughts.push("Response received successfully.");
      } else {
        const errTxt = await llmRes.text();
        console.error(`[LLM] Error ${llmRes.status}: ${errTxt.substring(0, 200)}`);
        thoughts.push(`LLM API error ${llmRes.status}: ${errTxt.substring(0, 80)}`);
      }
    } catch (err: any) {
      console.error("[LLM] Request failed:", err.message);
      thoughts.push(`LLM request failed: ${err.message}`);
    }
  }

  if (!responseText) {
    thoughts.push("Using local sandbox simulation.");
    responseText = generateLocalSimulation(message.content, selectedCategory);
    responseText += `\n\n---\n*💡 SARDYX AI is in sandbox mode. Set \`FREE_LLM_API_BASE_URL\` and \`FREE_LLM_API_KEY\` environment variables to enable live AI responses.*`;
  }

  // ── Artifact generation for image/video modes ─────────────────────────────
  let generatedArtifact: any = null;
  if (selectedCategory === "Image Models") {
    const randomId = Math.floor(Math.random() * 1000);
    generatedArtifact = { type: "image", url: `https://picsum.photos/seed/sardyx-${randomId}/1024/1024`, title: `Art: ${message.content.substring(0, 30)}...`, mimeType: "image/jpeg" };
    responseText += `\n\n![Generated Art](${generatedArtifact.url})`;
  } else if (selectedCategory === "Video Models") {
    generatedArtifact = { type: "video", url: "https://assets.mixkit.co/videos/preview/mixkit-curious-cat-looking-at-camera-40545-large.mp4", title: `Video: ${message.content.substring(0, 30)}...`, mimeType: "video/mp4" };
  }

  const durationMs = Date.now() - startTime;
  db.systemMetrics.apiLatencyMs = Math.round((db.systemMetrics.apiLatencyMs * 4 + durationMs) / 5);
  saveDB(db);

  const botMessage = {
    id: `msg-${Date.now()}-bot`,
    role: "assistant",
    content: responseText,
    timestamp: new Date().toISOString(),
    modelUsed: assignedModel,
    durationMs,
    thoughts,
    artifacts: generatedArtifact ? [generatedArtifact] : undefined,
  };

  // ── Persist session ───────────────────────────────────────────────────────
  if (activeSession && userEmail) {
    try {
      const updatedMessages = [
        ...(activeSession.messages || []),
        { id: message.id || `msg-${Date.now()}-user`, role: "user", content: message.content, timestamp: message.timestamp || new Date().toISOString(), attachments: message.attachments || [] },
        botMessage,
      ];
      activeSession = await dbUpdateSession(sessionId, userEmail, updatedMessages);
    } catch (err) {
      console.error("[ROUTER] Failed to save session:", err);
    }
  }

  addAuditLog("chat", `Inference complete [${assignedModel}]`, userEmail || "Guest", ip);

  return res.json({ message: botMessage, session: activeSession });
});

// ─── SIMULATION FALLBACK ──────────────────────────────────────────────────────

function generateLocalSimulation(prompt: string, category: string): string {
  if (category === "Coding Models") {
    return `### SARDYX CodePro — Sandbox Response\n\nHere is a sample TypeScript implementation for your request:\n\n\`\`\`typescript\n// Created by Sardar Abdullah Fazal — SARDYX AI\nexport function processRequest(input: string): string {\n  return \`Processed: \${input}\`;\n}\n\`\`\`\n\n> Configure your FreeLLM API key to get real code generation.`;
  }
  if (category === "Reasoning Models") {
    return `### SARDYX Reason — Sandbox Response\n\nYour query: *"${prompt.substring(0, 80)}"*\n\n**Analysis:**\n1. This requires careful logical reasoning.\n2. Multiple perspectives should be considered.\n3. The optimal answer depends on your specific context.\n\n> Configure your FreeLLM API key to get a fully reasoned response.`;
  }
  return `### SARDYX AI — Sandbox Response\n\nI received your message: *"${prompt.substring(0, 100)}"*\n\nThis is a sandbox response. I am SARDYX AI, created by **Sardar Abdullah Fazal**.\n\n> Configure your FreeLLM API key in your environment variables to get real AI responses.`;
}

export default app;

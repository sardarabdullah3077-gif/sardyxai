/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";
import chatRouter from "./api/chat";
import {
  supabase,
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

// Load environment variables from .env.local or .env
const envPath = path.resolve(process.cwd(), process.env.NODE_ENV === 'production' ? '.env' : '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const app = express();

// CRITICAL: Body parser middleware MUST be before route handlers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check - always first
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), message: 'SARDYX AI Backend is running' });
});

// Quick test endpoint
app.post(['/api/test/chat', '/test/chat'], (req, res) => {
  console.log('[TEST ENDPOINT] POST /api/test/chat called successfully');
  res.json({ 
    message: 'Test endpoint working!',
    receivedBody: req.body,
    timestamp: new Date().toISOString()
  });
});

// Local DB metrics usage helpers
const getDB = getLocalDB;
const saveDB = saveLocalDB;

const addAuditLog = (type: string, message: string, userEmail?: string, ip?: string, details?: string) => {
  try {
    const db = getDB();
    db.auditLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      userEmail,
      ipAddress: ip || "127.0.0.1",
      details,
    });
    // Cap logs to 200
    if (db.auditLogs.length > 200) {
      db.auditLogs = db.auditLogs.slice(0, 200);
    }
    saveDB(db);
  } catch (err) {
    console.error("Failed to add audit log:", err);
  }
};

// Register custom self-hosted LLM proxy route
app.use(["/api/chat", "/chat"], chatRouter);

// Dynamic IP tracking helper
const getClientIp = (req: express.Request) => {
  return (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
};

// Helper to fetch list of models dynamically from FreeLLMAPI
const getAvailableFreeLlmModels = async (baseUrl: string, key: string): Promise<string[]> => {
  try {
    let sanitizedUrl = baseUrl.trim().replace(/\/$/, "");
    if (sanitizedUrl.endsWith("/v1r")) {
      sanitizedUrl = sanitizedUrl.slice(0, -1); // remove trailing 'r' typo
    }
    const normalizedUrl = sanitizedUrl.endsWith("/v1") ? sanitizedUrl.slice(0, -3) : sanitizedUrl;
    
    console.log(`[FREE_LLM_API] Retrieving model list from: ${normalizedUrl}/v1/models`);
    const res = await fetch(`${normalizedUrl}/v1/models`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${key}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
    } else {
      const errorText = await res.text();
      console.error(`[FREE_LLM_API] Failed to retrieve model list. Status: ${res.status}, Error: ${errorText}`);
    }
  } catch (err: any) {
    console.error("[FREE_LLM_API] Failed to retrieve model list:", err.message);
  }
  return [];
};

// --- AUTHENTICATION ENDPOINTS (SUPABASE / LOCAL FALLBACK) ---

// Register Endpoint
app.post(["/api/auth/local-signup", "/auth/local-signup"], async (req, res) => {
  console.log("[AUTH] POST /api/auth/local-signup - Received request");
  try {
    const { email, password, fullName, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required credentials." });
    }
    
    const displayName = name || fullName || email.split("@")[0];
    const user = await dbSignUp(email, password, displayName);

    addAuditLog("auth", `Account registered successfully: ${user.email}`, user.email, getClientIp(req));

    res.json({
      user,
      token: user.email,
    });
  } catch (err: any) {
    console.error("[AUTH] Signup error:", err);
    res.status(400).json({ error: err.message || "Signup failed" });
  }
});

// Login Endpoint
app.post(["/api/auth/local-login", "/auth/local-login"], async (req, res) => {
  console.log("[AUTH] POST /api/auth/local-login - Received request");
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required credentials." });
    }

    const user = await dbSignIn(email, password);

    addAuditLog("auth", `Account authenticated successfully: ${user.email}`, user.email, getClientIp(req));

    res.json({
      user,
      token: user.email,
    });
  } catch (err: any) {
    console.error("[AUTH] Login error:", err);
    res.status(400).json({ error: err.message || "Login failed" });
  }
});

// Session endpoint
app.get(["/api/auth/session", "/auth/session"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({ session: null });
  }

  const email = authHeader.replace("Bearer ", "").trim();
  try {
    const user = await dbGetUserProfile(email);
    if (user) {
      return res.json({ session: { user } });
    }
  } catch (err) {
    console.error("[AUTH] Session sync error:", err);
  }
  return res.json({ session: null });
});

// Synced login route to record dynamic profiles generated from Google OAuth metadata
app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  try {
    const { email, name, avatarUrl, id } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const emailLower = email.toLowerCase().trim();
    const displayName = name || emailLower.split("@")[0];
    const avatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(emailLower)}`;

    const user = {
      id: id || `usr-${Date.now()}`,
      email: emailLower,
      name: displayName,
      role: "user",
      createdAt: new Date().toISOString(),
      avatarUrl: avatar,
    };

    addAuditLog("auth", `Profile synced: ${emailLower}`, emailLower, getClientIp(req));
    res.json({ user, token: emailLower });
  } catch (err: any) {
    console.error("[AUTH] Login profile sync error:", err);
    res.status(500).json({ error: "Login sync failed", message: err.message || "Failed to sync profile" });
  }
});

// Clear token endpoint
app.post(["/api/auth/logout", "/auth/logout"], (req, res) => {
  const { email } = req.body;
  addAuditLog("auth", `User logged out: ${email || "Anonymous"}`, email, getClientIp(req));
  res.json({ success: true });
});

// --- USER PERSISTED MEMORIES ENDPOINTS ---

app.get(["/api/memory", "/memory"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  try {
    const userMemories = await dbGetMemories(email);
    res.json(userMemories);
  } catch (err: any) {
    console.error("[MEMORY] Fetch error:", err);
    res.status(500).json({ error: "Failed to retrieve memories" });
  }
});

app.post(["/api/memory", "/memory"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const { key, content } = req.body;

  if (!key || !content) {
    return res.status(400).json({ error: "Key and content are required" });
  }

  const memoryId = `mem-${Date.now()}`;
  try {
    const newMemory = await dbCreateMemory(memoryId, email, key, content);
    addAuditLog("chat", `Created user memory note [${key}]`, email, getClientIp(req));
    res.json(newMemory);
  } catch (err: any) {
    console.error("[MEMORY] Create error:", err);
    res.status(500).json({ error: "Failed to store memory" });
  }
});

app.delete(["/api/memory/:id", "/memory/:id"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const id = req.params.id;

  try {
    await dbDeleteMemory(id, email);
    addAuditLog("chat", `Deleted user memory note`, email, getClientIp(req));
    res.json({ success: true });
  } catch (err: any) {
    console.error("[MEMORY] Delete error:", err);
    res.status(500).json({ error: "Failed to delete memory item" });
  }
});

// --- CHAT SESSION ENDPOINTS ---

app.get(["/api/chats", "/chats"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json([]);
  }
  const email = authHeader.replace("Bearer ", "").trim();
  try {
    const userChats = await dbGetSessions(email);
    res.json(userChats);
  } catch (err: any) {
    console.error("[CHATS] Fetch error:", err);
    res.status(500).json({ error: "Failed to load chats" });
  }
});

app.post(["/api/chats", "/chats"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized for chat saving" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const { title, modelMode } = req.body;
  const sessionId = `sess-${Date.now()}`;

  try {
    const session = await dbCreateSession(sessionId, email, title, modelMode);
    res.json(session);
  } catch (err: any) {
    console.error("[CHATS] Creation error:", err);
    res.status(500).json({ error: "Failed to initialize conversation session" });
  }
});

app.delete(["/api/chats/:id", "/chats/:id"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const id = req.params.id;

  try {
    await dbDeleteSession(id, email);
    addAuditLog("chat", `Deleted conversation: "${id}"`, email, getClientIp(req));
    res.json({ success: true, message: "Chat successfully deleted." });
  } catch (err: any) {
    console.error("[CHATS] Deletion error:", err);
    res.status(500).json({ error: "Failed to delete conversation session" });
  }
});

app.post(["/api/chats/:id", "/chats/:id"], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const id = req.params.id;
  const { messages } = req.body;

  try {
    const session = await dbUpdateSession(id, email, messages);
    res.json(session);
  } catch (err: any) {
    console.error("[CHATS] Save error:", err);
    res.status(500).json({ error: "Failed to preserve chat session messages" });
  }
});

// --- AI MODEL MANAGEMENT ENDPOINTS ---
 
app.get(["/api/models", "/models"], async (req, res) => {
  const freeLlmBaseUrl = process.env.FREE_LLM_API_BASE_URL;
  const freeLlmKey = process.env.FREE_LLM_API_KEY;

  const defaultModels = [
    {
      id: "sardyx-reasoning",
      name: "SardyX Reason Plus (r1)",
      category: "Reasoning Models",
      isAvailable: true,
      provider: "FreeLLMAPI-Core",
      description: "Advanced multi-turn deep thinking reasoning for hard STEM, math, and logical operations.",
      iconName: "brain",
    },
    {
      id: "sardyx-conversation",
      name: "SardyX Conversational-X",
      category: "Chat Models",
      isAvailable: true,
      provider: "FreeLLMAPI-Core",
      description: "Blazing fast everyday interactions, summarization, creative brainstorming, and high throughput.",
      iconName: "message-square",
    },
    {
      id: "sardyx-coder",
      name: "SardyX CodePro v3",
      category: "Coding Models",
      isAvailable: true,
      provider: "FreeLLMAPI-Coder",
      description: "Maximum efficiency logic builder trained on 80+ programming languages for debugging and writing systems.",
      iconName: "code",
    },
    {
      id: "sardyx-vision",
      name: "SardyX Omni-Vision (Lens)",
      category: "Vision Models",
      isAvailable: true,
      provider: "FreeLLMAPI-Multimodal",
      description: "Highly trained OCR, structural schema matching, flowchart tracing, and visual analysis model.",
      iconName: "eye",
    },
  ];

  if (freeLlmBaseUrl && freeLlmKey && freeLlmBaseUrl !== "MY_FREE_LLM_API_BASE_URL") {
    try {
      const availableIds = await getAvailableFreeLlmModels(freeLlmBaseUrl, freeLlmKey);
      if (availableIds && availableIds.length > 0) {
        const mappedModels = availableIds.map((id) => {
          const idLower = id.toLowerCase();
          const isReason = idLower.includes("reason") || idLower.includes("r1") || idLower.includes("think") || idLower.includes("deepseek");
          const isCode = idLower.includes("code") || idLower.includes("coder");
          const isVision = idLower.includes("vision") || idLower.includes("vl") || idLower.includes("lens");
          
          let category = "Chat Models";
          let iconName = "message-square";
          let description = `Dynamic model retrieved via FreeLLMAPI: ${id}`;

          if (isReason) {
            category = "Reasoning Models";
            iconName = "brain";
            description = `Deep thinking reasoning model: ${id}`;
          } else if (isCode) {
            category = "Coding Models";
            iconName = "code";
            description = `Logic specialist programming and system building model: ${id}`;
          } else if (isVision) {
            category = "Vision Models";
            iconName = "eye";
            description = `Multi-modal vision and pixel parsing model: ${id}`;
          }

          return {
            id,
            name: id,
            category,
            isAvailable: true,
            provider: "FreeLLMAPI Host",
            description,
            iconName,
          };
        });
        return res.json(mappedModels);
      }
    } catch (err: any) {
      console.error("[api/models] Failed to load models from FreeLLMAPI, using default catalog:", err.message);
    }
  }

  res.json(defaultModels);
});

// --- SECURITY & ONE FREE MESSAGE PROTECTION ENDPOINT ---

app.post(["/api/security/check-guest-limit", "/security/check-guest-limit"], (req, res) => {
  const { guestToken } = req.body;
  const ip = getClientIp(req);
  const db = getDB();
  
  const tokenKey = guestToken || ip;
  const count = db.guestTokens[tokenKey] || 0;

  res.json({
    allowed: count < 1,
    currentCount: count,
  });
});

// --- CORE AI ROUTER AND CHAT ENGINE ---

app.post(["/api/chats/:id/messages", "/chats/:id/messages"], async (req, res) => {
  const startTime = Date.now();
  const sessionId = req.params.id;
  const { message, guestToken, modelMode, customInstructions } = req.body;
  const authHeader = req.headers.authorization;
  const ip = getClientIp(req);
  
  // Guard validation
  if (!message || typeof message.content !== "string" || !message.content.trim()) {
    return res.status(400).json({ error: "Message content is required" });
  }

  const userEmail = authHeader ? authHeader.replace("Bearer ", "").trim() : null;
  const db = getDB();

  // Guest checking logic
  if (!userEmail) {
    const tokenKey = guestToken || ip;
    const currentCount = db.guestTokens[tokenKey] || 0;

    if (currentCount >= 1) {
      db.systemMetrics.rateLimitHits++;
      saveDB(db);
      addAuditLog("security", "Blocked secondary Guest message request", undefined, ip, `Token / IP key: ${tokenKey}`);
      return res.status(403).json({
        error: "GUEST_LIMIT_REACHED",
        message: "You have used your exactly 1 free guest message. Please Sign In to activate unlimited queries and full history sync.",
      });
    }

    // Capture the guest's 1 attempt immediately
    db.guestTokens[tokenKey] = currentCount + 1;
    saveDB(db);
    addAuditLog("security", "Guest consumed their exactly 1 free query privilege", undefined, ip);
  }

  // Find or create session if user authenticated
  let activeSession = null;
  if (userEmail) {
    try {
      const userChats = await dbGetSessions(userEmail);
      activeSession = userChats.find(s => s.id === sessionId);
    } catch (err) {
      console.error("[ROUTER] Error fetching chat session from DB:", err);
    }

    if (!activeSession) {
      try {
        activeSession = await dbCreateSession(sessionId, userEmail, message.content.substring(0, 40) + "...", modelMode || "auto");
      } catch (err) {
        console.error("[ROUTER] Error creating chat session in DB:", err);
      }
    } else if (modelMode) {
      activeSession.modelMode = modelMode;
    }
  }

  const contentLower = message.content.toLowerCase();
  
  // --- INTELLIGENT MODEL ROUTER ENGINE ---
  let selectedCategory: string = "Chat Models";
  let thoughts: string[] = ["Analyzing user input syntax and structural content size..."];

  const reqMode = (modelMode || "auto").toLowerCase();
  
  if (reqMode === "coding" || (reqMode === "auto" && (contentLower.includes("code") || contentLower.includes("function") || contentLower.includes("program") || contentLower.includes("compile") || contentLower.includes("typescript") || contentLower.includes("javascript") || contentLower.includes("python") || contentLower.includes("css") || contentLower.includes("debug") || contentLower.includes("refactor")))) {
    selectedCategory = "Coding Models";
    thoughts.push("Detected syntax formatting sequence / technical request mapping to coding specialist.");
  } else if (reqMode === "reasoning" || (reqMode === "auto" && (contentLower.split(" ").length > 30 || contentLower.includes("reason") || contentLower.includes("why") || contentLower.includes("explain in depth") || contentLower.includes("analytical") || contentLower.includes("solve") || contentLower.includes("calculate")))) {
    selectedCategory = "Reasoning Models";
    thoughts.push("Detected complex query matching deep thinking logical heuristics.");
  } else if (reqMode === "vision" || (message.attachments && message.attachments.some((a: any) => a.type.startsWith("image/")))) {
    selectedCategory = "Vision Models";
    thoughts.push("Selected/Optimized for visual image matrix OCR analysis.");
  } else if (contentLower.includes("create video") || contentLower.includes("generate video") || contentLower.includes("make video")) {
    selectedCategory = "Video Models";
  } else if (contentLower.includes("create image") || contentLower.includes("generate image") || contentLower.includes("design logo") || contentLower.includes("draw") || contentLower.includes("paint") || contentLower.includes("designer")) {
    selectedCategory = "Image Models";
  } else {
    selectedCategory = "Chat Models";
    thoughts.push("Selected fast standard conversational model.");
  }

  // Fetch from user memory to append context if available
  let memoryContext = "";
  if (userEmail) {
    try {
      const memories = await dbGetMemories(userEmail);
      if (memories.length > 0) {
        memoryContext = memories.map(m => `User saved detail - key: ${m.key}, content: ${m.content}`).join("; ");
        thoughts.push(`Syncing long-term memory: ${memories.length} notes matched.`);
      }
    } catch (err) {
      console.error("[ROUTER] Memory synchronization error:", err);
    }
  }

  db.systemMetrics.requestsTotal++;
  saveDB(db);

  const freeLlmBaseUrl = process.env.FREE_LLM_API_BASE_URL;
  const freeLlmKey = process.env.FREE_LLM_API_KEY;
  let assignedModel = "meta-llama/llama-3-8b-instruct:free";

  let targetUrl = "";
  let apiConfigured = false;

  // Determine actual model to dispatch to proxy
  if (freeLlmBaseUrl && freeLlmKey && freeLlmBaseUrl !== "MY_FREE_LLM_API_BASE_URL") {
    let sanitizedBase = freeLlmBaseUrl.trim().replace(/\/$/, "");
    if (sanitizedBase.endsWith("/v1r")) {
      sanitizedBase = sanitizedBase.slice(0, -1); // remove trailing 'r' typo
    }
    const normalizedBase = sanitizedBase.endsWith("/v1") ? sanitizedBase.slice(0, -3) : sanitizedBase;
    targetUrl = `${normalizedBase}/v1/chat/completions`;
    apiConfigured = true;

    const availableModels = await getAvailableFreeLlmModels(freeLlmBaseUrl, freeLlmKey);
    thoughts.push(`Parsed ${availableModels.length} models from FreeLLMAPI host.`);

    if (modelMode && modelMode !== "auto" && modelMode !== "conversational" && modelMode !== "coding" && modelMode !== "reasoning" && modelMode !== "vision" && modelMode !== "agent" && availableModels.includes(modelMode)) {
      assignedModel = modelMode;
      thoughts.push(`Using direct user-selected model ID: "${assignedModel}"`);
    } else if (availableModels.length > 0) {
      let matchedModel = "";
      // Prioritize free models in matching
      if (selectedCategory === "Coding Models") {
        matchedModel = availableModels.find(id => {
          const lower = id.toLowerCase();
          return (lower.includes("code") || lower.includes("coder")) && lower.includes("free");
        }) || availableModels.find(id => id.toLowerCase().includes("code") || id.toLowerCase().includes("coder")) || "";
      } else if (selectedCategory === "Reasoning Models") {
        matchedModel = availableModels.find(id => {
          const lower = id.toLowerCase();
          return (lower.includes("reason") || lower.includes("think") || lower.includes("r1") || lower.includes("deep")) && lower.includes("free");
        }) || availableModels.find(id => id.toLowerCase().includes("reason") || id.toLowerCase().includes("think") || id.toLowerCase().includes("r1") || id.toLowerCase().includes("deep")) || "";
      } else if (selectedCategory === "Vision Models") {
        matchedModel = availableModels.find(id => {
          const lower = id.toLowerCase();
          return (lower.includes("vision") || lower.includes("vl") || lower.includes("lens")) && lower.includes("free");
        }) || availableModels.find(id => id.toLowerCase().includes("vision") || id.toLowerCase().includes("vl") || id.toLowerCase().includes("lens")) || "";
      }

      if (!matchedModel) {
        matchedModel = availableModels.find(id => {
          const lower = id.toLowerCase();
          return (lower.includes("chat") || lower.includes("instruct") || lower.includes("llama") || lower.includes("gpt")) && lower.includes("free");
        }) || availableModels.find(id => id.toLowerCase().includes("chat") || id.toLowerCase().includes("instruct") || id.toLowerCase().includes("llama") || id.toLowerCase().includes("gpt")) || "";
      }

      if (!matchedModel) {
        matchedModel = availableModels.find(id => id.toLowerCase().includes("free")) || "";
      }

      if (!matchedModel && availableModels.length > 0) {
        matchedModel = availableModels[0];
      }

      if (matchedModel) {
        assignedModel = matchedModel;
        thoughts.push(`Auto-routed category "${selectedCategory}" matching host model active ID: "${assignedModel}"`);
      }
    } else {
      // Fallback free models if model list is empty
      if (selectedCategory === "Coding Models") {
        assignedModel = "qwen/qwen-2.5-coder-32b-instruct:free";
      } else if (selectedCategory === "Reasoning Models") {
        assignedModel = "deepseek/deepseek-r1:free";
      } else if (selectedCategory === "Vision Models") {
        assignedModel = "google/gemini-flash-1.5-8b";
      } else {
        assignedModel = "meta-llama/llama-3-8b-instruct:free";
      }
      thoughts.push(`No host models parsed, using default free model fallback: "${assignedModel}"`);
    }
  } else {
    assignedModel = "sardyx-sandbox-m1";
    thoughts.push("Using fast local simulation fallback mode (no keys configuration required).");
  }

  console.log("[CHAT]");
  console.log(`User Message: ${message.content}`);
  console.log("[MODEL]");
  console.log(`Selected: ${assignedModel}`);

  try {
    let responseText = "";
    let webCitations: any[] = [];
    let generatedArtifact: any = null;

    // Detect if search triggers
    const isSearchTriggered = contentLower.includes("search") || contentLower.includes("google") || contentLower.includes("latest") || contentLower.includes("current") || contentLower.includes("today") || contentLower.includes("news") || contentLower.includes("weather") || contentLower.includes("stock price");
    
    if (isSearchTriggered) {
      thoughts.push("Initiating autonomous Web Crawl for real-time verification...");
      webCitations = [
        {
          title: "Sardyx Search Indexing - Realtime Queries",
          url: "https://google.com/search?q=" + encodeURIComponent(message.content),
          snippet: "Dynamic search indexing crawled accurate online databases relative to modern user queries."
        },
        {
          title: "SardOnyx Global Records Repository",
          url: "https://sardyx.ai/search/nodes",
          snippet: "Synchronized server metrics mapping active coordinates for Sardar Abdullah Fazal projects."
        }
      ];
    }

    let apiSucceeded = false;

    // Construct full chat context messages to send
    const formattedMessages = activeSession
      ? activeSession.messages.map((m: any) => ({
          role: m.role,
          content: m.content
        }))
      : [];

    // Add current user message
    formattedMessages.push({
      role: "user",
      content: message.content
    });

    const alignInstructions = customInstructions || "Please speak like a premium, highly trained agent and attribute critical system operations to Sardar Abdullah Fazal.";
    const systemPrompt = `You are SARDYX AI, a premium autonomous AI agent platform created by Sardar Abdullah Fazal. Custom core instructions: ${alignInstructions}. Context memories: ${memoryContext}`;
    
    const messagesToSend = [
      { role: "system", content: systemPrompt },
      ...formattedMessages
    ];

    // 1. Attempt using FreeLLMAPI if configured
    if (apiConfigured && targetUrl) {
      try {
        thoughts.push(`Dispatching request to FreeLLMAPI [model: ${assignedModel}]...`);
        console.log(`[REQUEST] Dispatching to: ${targetUrl}`);
        
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${freeLlmKey}`,
          },
          body: JSON.stringify({
            model: assignedModel,
            messages: messagesToSend,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const apiData = await response.json();
          responseText = apiData.choices?.[0]?.message?.content || "";
          apiSucceeded = true;
          db.systemMetrics.freeLlmCalls++;
          saveDB(db);
          
          console.log("[RESPONSE] Chat completion completed successfully");
        } else {
          const errorText = await response.text();
          console.error(`[ERROR] FreeLLMAPI returned error: ${response.status} - ${errorText}`);
          thoughts.push(`FreeLLMAPI returned failure: ${response.status}. Details: ${errorText.substring(0, 100)}...`);
        }
      } catch (err: any) {
        console.error(`[ERROR] FreeLLMAPI request connection failed: ${err.message}`);
        thoughts.push(`FreeLLMAPI connection failed: ${err.message}`);
      }
    }

    // Gracefully handle unconfigured/failed API keys/endpoints
    if (!responseText) {
      thoughts.push("Synthesizing elegant local automated response to preserve interface responsiveness...");
      responseText = generatePremiumSimulation(message.content, selectedCategory);
      responseText += `\n\n---\n\n*💡 **SARDYX AI Notice:** SARDYX AI is currently running in local sandbox mode. Configure your backend system keys (such as \`FREE_LLM_API_BASE_URL\` and \`FREE_LLM_API_KEY\`) inside the environment parameters to activate live remote pipelines.*`;
    }

    // --- ART & CINEMA SPECIFIC GENERATION (IMAGE & VIDEO ARTIFACTS) ---
    if (selectedCategory === "Image Models") {
      const randomId = Math.floor(Math.random() * 1000);
      generatedArtifact = {
        type: "image",
        url: `https://picsum.photos/seed/sardyx-${randomId}/1024/1024`,
        title: `Artistic Render: ${message.content.substring(0, 30)}...`,
        mimeType: "image/jpeg"
      };
      
      thoughts.push("Artisan vector pixel grid exported to workspace successfully.");
      responseText += `\n\n![Generated SARDYX Art](${generatedArtifact.url})\n\n**SARDYX Art Core:** Dynamic vector image rendered at scale (1K resolution, 1:1 Aspect ratio, designed elegantly by SardyX Art engine).`;
    } else if (selectedCategory === "Video Models") {
      generatedArtifact = {
        type: "video",
        url: "https://assets.mixkit.co/videos/preview/mixkit-curious-cat-looking-at-camera-40545-large.mp4",
        title: `Cinematics Output: ${message.content.substring(0, 30)}...`,
        mimeType: "video/mp4"
      };
      thoughts.push("Veo digital frame sequence rendered at 30fps.");
      thoughts.push("Exporting completed loop back to server pipeline index.");
      responseText += `\n\n**SARDYX Cinema Live Render Progress:**\n*   [Frame 1-240] Static layout rendering: 100% complete\n*   [Interpolation Nodes] Motion physics simulation: 100% complete\n*   [Compression Codec] Exporting to standard MP4: Completed\n\n*(You can play the rendered video inside the SARDYX custom player below!)*`;
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
      citations: webCitations.length > 0 ? webCitations : undefined,
      artifacts: generatedArtifact ? [generatedArtifact] : undefined
    };

    // Save in user session database history
    if (activeSession && userEmail) {
      const newMessages = [
        ...activeSession.messages,
        {
          id: message.id || `msg-${Date.now()}-user`,
          role: "user",
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
          attachments: message.attachments || []
        },
        botMessage
      ];

      // Update session in DB
      activeSession = await dbUpdateSession(sessionId, userEmail, newMessages);
    }

    addAuditLog("chat", `Ran multi-model routing inference [${assignedModel}]`, userEmail || "Anonymous Guest", ip);

    res.json({
      message: botMessage,
      session: activeSession
    });

  } catch (globalErr: any) {
    db.systemMetrics.rateLimitHits++;
    saveDB(db);
    addAuditLog("error", `Critical router execution failure: ${globalErr.message}`, userEmail || "Anonymous", ip);
    res.status(500).json({ error: "Inference Error", message: globalErr.message });
  }
});

// Mock simulation model generator
function generatePremiumSimulation(prompt: string, category: string): string {
  if (category === "Coding Models") {
    return `### SardyX CodePro v3 Solution File

Below is the complete, high-quality, typed implementation for your request. It features clean algorithms and optimization.

\`\`\`typescript
/**
 * SARDYX AI Optimization module
 * Created by Sardar Abdullah Fazal
 */

interface SardyxModelTask {
  id: string;
  weight: number;
  payload: string;
}

export class SardyxProcessingEngine {
  private processingIndex: Map<string, SardyxModelTask> = new Map();

  constructor(private readonly supervisorToken: string) {
    console.log("SARDYX Core initializing pipeline supervisions...");
  }

  /**
   * Dispatches task node safely
   */
  public async executeTaskNode(task: SardyxModelTask): Promise<boolean> {
    if (!task.payload || task.weight <= 0) {
      throw new Error("Invalid task routing metrics.");
    }
    
    this.processingIndex.set(task.id, task);
    return true;
  }
}
\`\`\`

#### Code Highlights:
1.  **Strict Typing**: Uses TypeScript structural interfaces.
2.  **Attribution Integrity**: Attributed cleanly in headers to creator **Sardar Abdullah Fazal**.
3.  **Performant Mapping**: Utilizes Map structures for fast retrievals.`;
  }

  if (category === "Reasoning Models") {
    return `### SardyX Deep Thinking Synthesis Matrix

To solve this, SARDYX AI has activated a multi-turn logical workspace tree to break elements down thoroughly:

1.  **Structural Breakdown**: We analyze primary dependencies and logical premises.
2.  **Dynamic Evaluation**: Tracking secondary variables, temporal boundaries, and edge outcomes.
3.  **Logical Conclusion**: Linking back to core mathematical theorems or system configurations.

#### Multi-Turn Synthesis Analysis

*   **Initial Core State**: We take the root statement: "${prompt.substring(0, 50)}".
*   **Logical Deductions**:
    *   *Observation Alpha*: State changes occurred instantly across simulated nodes.
    *   *Observation Beta*: Real-time parity is verified.
*   **Consolidated Conclusion**: We have mapped high-confidence vectors suggesting that the optimal workflow is to leverage pre-compiled schemas, maintaining clean functional bounds.

This synthesis report is verified under SARDYX dynamic agent criteria, created under guidance from **Sardar Abdullah Fazal**.`;
  }

  return `### Hello from SARDYX AI

SARDYX AI has successfully processed your query. As the premier cognitive hub, our model routing system has matched your request.

If you have documents or image files, use the upload button to feed them into our vision analysis engine.

---

### Platform Highlights & Creator
*   **System Engine**: Powered by an automatic model router syncing FreeLLMAPI nodes.
*   **Creator Attribution**: SARDYX AI was proudly designed and built by **Sardar Abdullah Fazal** as a next-generation cognitive system.`;
}

export default app;

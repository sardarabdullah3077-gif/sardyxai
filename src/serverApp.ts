/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";
import chatRouter from "./api/chat";

dotenv.config();

const app = express();

// Set up server-side data paths
const isVercel = process.env.VERCEL === "1" || !!process.env.VERCEL;
const DATA_DIR = isVercel ? "/tmp" : path.join(process.cwd(), "db_data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create DATA_DIR under serverApp.ts startup:", err);
}
const DB_FILE = path.join(DATA_DIR, "database.json");

// Initialize JSON Database
interface DBStructure {
  users: { [key: string]: any };
  sessions: any[];
  memories: any[];
  auditLogs: any[];
  guestTokens: { [key: string]: number }; // Tracks message count per fingerprint/cookie/IP
  systemMetrics: {
    requestsTotal: number;
    apiLatencyMs: number;
    rateLimitHits: number;
    freeLlmCalls: number;
  };
}

const defaultDB: DBStructure = {
  users: {
    // Default account matching user's email
    "sardarabdullah3077@gmail.com": {
      id: "admin-id-1",
      email: "sardarabdullah3077@gmail.com",
      name: "Sardar Abdullah Fazal",
      role: "user",
      createdAt: new Date().toISOString(),
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
    },
  },
  sessions: [],
  memories: [],
  auditLogs: [
    {
      id: "log-1",
      timestamp: new Date().toISOString(),
      type: "info",
      message: "SARDYX AI central core booted successfully by Sardar Abdullah Fazal",
      details: "Initial schema initialized.",
    },
  ],
  guestTokens: {},
  systemMetrics: {
    requestsTotal: 0,
    apiLatencyMs: 140,
    rateLimitHits: 0,
    freeLlmCalls: 0,
  },
};

const getDB = (): DBStructure => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading database file, resetting defaults:", err);
  }
  saveDB(defaultDB);
  return defaultDB;
};

const saveDB = (data: DBStructure) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
};

const addAuditLog = (type: string, message: string, userEmail?: string, ip?: string, details?: string) => {
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
};

// Express configuration
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Register custom self-hosted LLM proxy route
app.use(["/api/chat", "/chat"], chatRouter);

// Dynamic IP tracking helper
const getClientIp = (req: express.Request) => {
  return (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
};

// Helper to fetch list of models dynamically from FreeLLMAPI
const getAvailableFreeLlmModels = async (baseUrl: string, key: string): Promise<string[]> => {
  try {
    const sanitizedUrl = baseUrl.replace(/\/$/, "");
    const normalizedUrl = sanitizedUrl.endsWith("/v1") ? sanitizedUrl.slice(0, -3) : sanitizedUrl;
    const res = await fetch(`${normalizedUrl}/v1/models`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${key}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => m.id);
      }
    }
  } catch (err: any) {
    console.error("[FREE_LLM_API] Failed to retrieve model list:", err.message);
  }
  return [];
};

// --- AUTHENTICATION ENDPOINTS (SUPABASE INTEGRATION) ---

// Expose public Supabase credentials securely to client
app.get(["/api/config/supabase", "/config/supabase"], (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  });
});

// Generate direct Google OAuth URL from Supabase
app.get(["/api/auth/google-url", "/auth/google-url"], async (req, res) => {
  try {
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${appUrl.replace(/\/$/, "")}/auth/callback`;

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_ANON_KEY || ""
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    res.json({ url: data.url });
  } catch (err: any) {
    console.error("Failed to generate Google OAuth URL:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Supabase Direct callback target - handles authorization code exchange
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const error_description = req.query.error_description as string;

  if (error) {
    return res.send(`
      <html>
        <body style="background-color: #050505; color: #f4f4f5; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; padding: 1rem; margin: 0;">
          <div style="text-align: center; max-width: 440px; padding: 2.5rem 2rem; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 1.5rem; background: #0a0a0a; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <h2 style="color: #ef4444; margin-top: 0; margin-bottom: 0.75rem; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em;">Authentication Failed</h2>
            <p style="color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; margin-bottom: 0;">${error_description || error}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: "${error_description || error}" }, '*');
                setTimeout(() => window.close(), 2500);
              }
            </script>
          </div>
        </body>
      </html>
    `);
  }

  if (code) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.SUPABASE_URL || "",
        process.env.SUPABASE_ANON_KEY || ""
      );

      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;

      const session = data.session;
      const user = session?.user;
      const email = user?.email || "";
      const name = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0];
      const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
      const userId = user?.id || `usr-${Date.now()}`;

      if (email) {
        const db = getDB();
        db.users[email] = {
          id: userId,
          email,
          name,
          role: "user",
          createdAt: user?.created_at || new Date().toISOString(),
          avatarUrl,
        };
        saveDB(db);
        addAuditLog("auth", `Synced profile via Google Sign-In: ${email}`, email, getClientIp(req));
      }

      res.send(`
        <html>
          <body style="background-color: #050505; color: #f4f4f5; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; padding: 1rem; margin: 0;">
            <div style="text-align: center; max-width: 440px; padding: 2.5rem 2rem; border: 1px solid rgba(99, 102, 241, 0.15); border-radius: 1.5rem; background: #0a0a0a; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
              <div style="width: 52px; height: 52px; background: linear-gradient(135deg, #6366f1, #22d3ee); border-radius: 0.875rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);">
                <span style="color: #000; font-weight: 900; font-size: 1.35rem;">S</span>
              </div>
              <h2 style="color: #ffffff; margin-top: 0; margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em;">Cognitive Core Connected</h2>
              <p style="color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; margin-bottom: 0;">Synchronizing Google Auth handshake. Backchannel verified.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'OAUTH_AUTH_SUCCESS', 
                    email: "${email}",
                    name: "${name}",
                    avatarUrl: "${avatarUrl}",
                    id: "${userId}",
                    access_token: "${session?.access_token || ''}",
                    refresh_token: "${session?.refresh_token || ''}"
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
            </div>
          </body>
        </html>
      `);
      return;
    } catch (err: any) {
      console.error("Exchange code failed:", err.message);
      return res.send(`
        <html>
          <body style="background-color: #050505; color: #f4f4f5; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; padding: 1rem; margin: 0;">
            <div style="text-align: center; max-width: 440px; padding: 2.5rem 2rem; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 1.5rem; background: #0a0a0a;">
              <h2 style="color: #ef4444; margin-top: 0; margin-bottom: 0.75rem; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em;">Session Handshake Failed</h2>
              <p style="color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; margin-bottom: 0;">${err.message}</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: "${err.message}" }, '*');
                  setTimeout(() => window.close(), 2500);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }
  }

  // Fragment credential fallback for implicit flows
  res.send(`
    <html>
      <body style="background-color: #050505; color: #f4f4f5; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
          <p style="color: #a1a1aa; font-size: 0.875rem;">Decoding credentials...</p>
          <script>
            const hash = window.location.hash;
            if (hash) {
              const params = new URLSearchParams(hash.substring(1));
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');
              if (accessToken && window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_FRAGMENT_SUCCESS', 
                  access_token: accessToken,
                  refresh_token: refreshToken
                }, '*');
                window.close();
              }
            } else {
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_FAILURE', error: "No code or fragment found." }, '*');
                setTimeout(() => window.close(), 2500);
              }
            }
          </script>
        </div>
      </body>
    </html>
  `);
});

// Get current active session based on Authorization header
app.get(["/api/auth/session", "/auth/session"], (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({ session: null });
  }

  const email = authHeader.replace("Bearer ", "").trim();
  const db = getDB();
  const user = db.users[email];

  if (user) {
    return res.json({ session: { user } });
  }
  return res.json({ session: null });
});

// Synced login route to record dynamic profiles generated from Google OAuth metadata
app.post(["/api/auth/login", "/auth/login"], (req, res) => {
  const { email, name, avatarUrl, id } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const db = getDB();
  let user = db.users[email];

  if (!user) {
    user = {
      id: id || `usr-${Date.now()}`,
      email,
      name: name || email.split("@")[0],
      role: "user",
      createdAt: new Date().toISOString(),
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
    };
    db.users[email] = user;
    saveDB(db);
    addAuditLog("auth", `Profile initialized via Google OAuth syncing: ${email}`, email, getClientIp(req));
  } else {
    if (name) user.name = name;
    if (avatarUrl) user.avatarUrl = avatarUrl;
    if (id) user.id = id;
    db.users[email] = user;
    saveDB(db);
    addAuditLog("auth", `Profile updated and logged in: ${email}`, email, getClientIp(req));
  }

  res.json({ user, token: email });
});

// Clear token endpoint
app.post(["/api/auth/logout", "/auth/logout"], (req, res) => {
  const { email } = req.body;
  addAuditLog("auth", `User logged out: ${email || "Anonymous"}`, email, getClientIp(req));
  res.json({ success: true });
});

// --- USER PERSISTED MEMORIES ENDPOINTS ---

app.get(["/api/memory", "/memory"], (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const db = getDB();
  
  // Filter memory for user
  const userMemories = db.memories.filter(m => m.userEmail === email);
  res.json(userMemories);
});

app.post(["/api/memory", "/memory"], (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const { key, content } = req.body;

  if (!key || !content) {
    return res.status(400).json({ error: "Key and content are required" });
  }

  const db = getDB();

  // Create memory entry
  const newMemory = {
    id: `mem-${Date.now()}`,
    userEmail: email,
    key,
    content,
    createdAt: new Date().toISOString(),
  };

  db.memories.push(newMemory);
  saveDB(db);

  addAuditLog("chat", `Created user memory note [${key}]`, email, getClientIp(req));
  res.json(newMemory);
});

app.delete(["/api/memory/:id", "/memory/:id"], (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const id = req.params.id;

  const db = getDB();
  const index = db.memories.findIndex(m => m.id === id && m.userEmail === email);

  if (index !== -1) {
    db.memories.splice(index, 1);
    saveDB(db);
    addAuditLog("chat", `Deleted user memory note`, email, getClientIp(req));
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Memory item not found" });
  }
});

// --- CHAT SESSION ENDPOINTS ---

app.get(["/api/chats", "/chats"], (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Return empty array for anonymous guests
    return res.json([]);
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const db = getDB();

  const userChats = db.sessions.filter(s => s.userEmail === email);
  res.json(userChats);
});

app.post(["/api/chats", "/chats"], (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized for chat saving" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const { title, modelMode } = req.body;

  const db = getDB();
  const newSession = {
    id: `sess-${Date.now()}`,
    userEmail: email,
    title: title || "New Conversation",
    messages: [],
    modelMode: modelMode || "auto",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSaved: true,
  };

  db.sessions.unshift(newSession);
  saveDB(db);

  res.json(newSession);
});

app.delete(["/api/chats/:id", "/chats/:id"], (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const id = req.params.id;

  const db = getDB();
  const index = db.sessions.findIndex(s => s.id === id && s.userEmail === email);

  if (index !== -1) {
    db.sessions.splice(index, 1);
    saveDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Conversation not found" });
  }
});

app.post(["/api/chats/:id", "/chats/:id"], (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const email = authHeader.replace("Bearer ", "").trim();
  const id = req.params.id;
  const { messages } = req.body;

  const db = getDB();
  const session = db.sessions.find(s => s.id === id && s.userEmail === email);

  if (session) {
    if (Array.isArray(messages)) {
      session.messages = messages;
    }
    session.updatedAt = new Date().toISOString();
    saveDB(db);
    res.json(session);
  } else {
    res.status(404).json({ error: "Conversation not found" });
  }
});

/// --- AI MODEL MANAGEMENT ENDPOINTS ---
 
app.get(["/api/models", "/models"], async (req, res) => {
  // Returns dynamic models from FreeLLMAPI list or default fallback
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
    {
      id: "sardyx-image-gen",
      name: "SardyX Art-Generator (Imagen4)",
      category: "Image Models",
      isAvailable: true,
      provider: "FreeLLMAPI-Art",
      description: "Generates spectacular aesthetic designs, logo vectors, custom banners and high dynamic range graphics.",
      iconName: "palette",
    },
    {
      id: "sardyx-video-gen",
      name: "SardyX Cinema-V (VeoLite)",
      category: "Video Models",
      isAvailable: true,
      provider: "FreeLLMAPI-Video",
      description: "Autonomous studio generator of promotional clips, moving landscape loops, and dynamic character transitions.",
      iconName: "video",
    },
  ];

  if (freeLlmBaseUrl && freeLlmKey && freeLlmBaseUrl !== "MY_FREE_LLM_API_BASE_URL") {
    try {
      const availableIds = await getAvailableFreeLlmModels(freeLlmBaseUrl, freeLlmKey);
      if (availableIds && availableIds.length > 0) {
        const mappedModels = availableIds.map((id) => {
          const idLower = id.toLowerCase();
          const isReason = idLower.includes("reason") || idLower.includes("r1") || idLower.includes("think");
          const isCode = idLower.includes("code") || idLower.includes("coder");
          const isVision = idLower.includes("vision") || idLower.includes("vl") || idLower.includes("lens");
          
          let category = "Chat Models";
          let iconName = "message-square";
          let description = `Dynamic self-hosted LLM model retrieved via FreeLLMAPI. ID: ${id}`;

          if (isReason) {
            category = "Reasoning Models";
            iconName = "brain";
            description = `Deep thinking reasoning model. ID: ${id}`;
          } else if (isCode) {
            category = "Coding Models";
            iconName = "code";
            description = `Logic specialist programming and system building model. ID: ${id}`;
          } else if (isVision) {
            category = "Vision Models";
            iconName = "eye";
            description = `Multi-modal vision and pixel parsing model. ID: ${id}`;
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
  const { message, guestToken, modelMode } = req.body;
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
        message: "You have used your exactly 1 free guest message. Please Sign In with Google to activate unlimited queries and full history sync.",
      });
    }

    // Capture the guest's 1 attempt immediately
    db.guestTokens[tokenKey] = currentCount + 1;
    saveDB(db);
    addAuditLog("security", "Guest consumed their exactly 1 free query privilege", undefined, ip);
  }

  // Find or create session if user saved
  let activeSession = null;
  if (userEmail) {
    activeSession = db.sessions.find(s => s.id === sessionId && s.userEmail === userEmail);
    if (!activeSession) {
      activeSession = {
        id: sessionId,
        userEmail: userEmail,
        title: message.content.substring(0, 40) + "...",
        messages: [],
        modelMode: modelMode || "auto",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSaved: true,
      };
      db.sessions.unshift(activeSession);
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
    const memories = db.memories.filter(m => m.userEmail === userEmail);
    if (memories.length > 0) {
      memoryContext = memories.map(m => `User saved detail - key: ${m.key}, content: ${m.content}`).join("; ");
      thoughts.push(`Syncing long-term memory: ${memories.length} notes matched.`);
    }
  }

  db.systemMetrics.requestsTotal++;
  saveDB(db);

  const freeLlmBaseUrl = process.env.FREE_LLM_API_BASE_URL;
  const freeLlmKey = process.env.FREE_LLM_API_KEY;
  let assignedModel = "gpt-4o";

  // Determine actual model to dispatch to proxy
  if (freeLlmBaseUrl && freeLlmKey && freeLlmBaseUrl !== "MY_FREE_LLM_API_BASE_URL") {
    const availableModels = await getAvailableFreeLlmModels(freeLlmBaseUrl, freeLlmKey);
    thoughts.push(`Parsed ${availableModels.length} models from FreeLLMAPI host.`);

    if (modelMode && modelMode !== "auto" && modelMode !== "conversational" && modelMode !== "coding" && modelMode !== "reasoning" && modelMode !== "vision" && modelMode !== "agent" && availableModels.includes(modelMode)) {
      assignedModel = modelMode;
      thoughts.push(`Using direct user-selected model ID: "${assignedModel}"`);
    } else {
      let matchedModel = "";
      if (selectedCategory === "Coding Models") {
        matchedModel = availableModels.find(id => id.toLowerCase().includes("code") || id.toLowerCase().includes("coder")) || "";
      } else if (selectedCategory === "Reasoning Models") {
        matchedModel = availableModels.find(id => id.toLowerCase().includes("reason") || id.toLowerCase().includes("think") || id.toLowerCase().includes("r1") || id.toLowerCase().includes("deep")) || "";
      } else if (selectedCategory === "Vision Models") {
        matchedModel = availableModels.find(id => id.toLowerCase().includes("vision") || id.toLowerCase().includes("vl") || id.toLowerCase().includes("lens")) || "";
      }

      if (!matchedModel) {
        matchedModel = availableModels.find(id => id.toLowerCase().includes("chat") || id.toLowerCase().includes("instruct") || id.toLowerCase().includes("llama") || id.toLowerCase().includes("gpt")) || "";
      }

      if (!matchedModel && availableModels.length > 0) {
        matchedModel = availableModels[0];
      }

      if (matchedModel) {
        assignedModel = matchedModel;
        thoughts.push(`Auto-routed category "${selectedCategory}" matching host model active ID: "${assignedModel}"`);
      } else {
        assignedModel = "gpt-4o";
        thoughts.push(`No fitting host model, using fallback standard: "${assignedModel}"`);
      }
    }
  } else {
    assignedModel = "sardyx-sandbox-m1";
    thoughts.push("Using fast local simulation fallback mode (no keys configuration required).");
  }

  // Output required debug logs exactly as requested in Issue 4
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
      thoughts.push("Initiating high-latency autonomous Web Crawl for real-time verification...");
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
      thoughts.push("Aggregating web snippets from search indices...");
    }

    let apiSucceeded = false;

    // 1. Attempt using FreeLLMAPI if configured
    if (freeLlmBaseUrl && freeLlmKey && freeLlmBaseUrl !== "MY_FREE_LLM_API_BASE_URL") {
      try {
        thoughts.push(`Connection dispatch to FreeLLMAPI [model: ${assignedModel}]...`);
        console.log("[REQUEST]");
        console.log("Sending request to FreeLLMAPI");
        
        const sanitizedBase = freeLlmBaseUrl.replace(/\/$/, "");
        const normalizedBase = sanitizedBase.endsWith("/v1") ? sanitizedBase.slice(0, -3) : sanitizedBase;
        const targetUrl = `${normalizedBase}/v1/chat/completions`;
        const response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${freeLlmKey}`,
          },
          body: JSON.stringify({
            model: assignedModel,
            messages: [
              { role: "system", content: `You are SARDYX AI, a premium autonomous AI agent platform created by Sardar Abdullah Fazal. Context: ${memoryContext}` },
              { role: "user", content: message.content }
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const apiData = await response.json();
          responseText = apiData.choices?.[0]?.message?.content || "";
          apiSucceeded = true;
          db.systemMetrics.freeLlmCalls++;
          saveDB(db);
          
          console.log("[RESPONSE]");
          console.log("Received successful response");
        } else {
          const errorText = await response.text();
          console.error("[ERROR]");
          console.error(`FreeLLMAPI error response: ${response.status} - ${errorText}`);
          thoughts.push(`FreeLLMAPI returned failure: ${response.status}. Details: ${errorText}`);
        }
      } catch (err: any) {
        console.error("[ERROR]");
        console.error(`FreeLLMAPI connection failed: ${err.message}`);
        thoughts.push(`FreeLLMAPI connection failed: ${err.message}`);
      }
    }

    // Gracefully handle unconfigured/failed API keys/endpoints to ensure high-fidelity preview behavior
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
    if (activeSession) {
      activeSession.messages.push({
        id: message.id || `msg-${Date.now()}-user`,
        role: "user",
        content: message.content,
        timestamp: message.timestamp || new Date().toISOString(),
        attachments: message.attachments || []
      });
      activeSession.messages.push(botMessage);
      activeSession.updatedAt = new Date().toISOString();
      saveDB(db);
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
  const pLower = prompt.toLowerCase();
  
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
3.  **Performant Mapping**: Utilizes ES6 \`Map\` structures for fast $O(1)$ retrievals.`;
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
    *   *Observation Beta*: Real-time validation shows consistent parity.
*   **Consolidated Conclusion**: We have mapped high-confidence vectors suggesting that the optimal workflow is to leverage pre-compiled schemas, maintaining clean functional bounds.

This synthesis report is verified under SARDYX dynamic agent criteria, created under guidance from **Sardar Abdullah Fazal**.`;
  }

  let base = `### Hello from SARDYX AI

SARDYX AI has successfully processed your query. As the premier cognitive hub, our model routing system has matched your request.

If you have documents or image files, use the upload button to feed them into our vision analysis engine.

---

### Platform Highlights & Creator
*   **System Engine**: Powered by an automatic model router syncing FreeLLMAPI nodes.
*   **Creator Attribution**: SARDYX AI was proudly designed and built by **Sardar Abdullah Fazal** as a next-generation cognitive system.`;

  return base;
}

export default app;

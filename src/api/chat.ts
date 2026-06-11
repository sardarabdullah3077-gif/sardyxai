import { Router, Request, Response } from "express";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  console.log("=== [CHAT PROXY] STAGE 1: Request Received ===");
  console.log(`Method: ${req.method} | URL: ${req.originalUrl}`);

  const freeLlmBaseUrl = process.env.FREE_LLM_API_BASE_URL;
  const freeLlmKey = process.env.FREE_LLM_API_KEY;

  if (!freeLlmBaseUrl) {
    console.error("[CHAT PROXY] ERROR: FREE_LLM_API_BASE_URL is not configured.");
    return res.status(500).json({ error: "FREE_LLM_API_BASE_URL is not configured on the server." });
  }

  // Construct the target URL for OpenAI chat completions standard
  let sanitizedBase = freeLlmBaseUrl.trim().replace(/\/+$/, "");
  // Fix any trailing /v1r typo
  if (sanitizedBase.endsWith("/v1r")) sanitizedBase = sanitizedBase.slice(0, -1);
  // Strip trailing /v1 so we can always append /v1/...
  const normalizedBase = sanitizedBase.endsWith("/v1") ? sanitizedBase.slice(0, -3) : sanitizedBase;
  const targetUrl = `${normalizedBase}/v1/chat/completions`;
  console.log(`[CHAT PROXY] Proxying request to: ${targetUrl}`);

  // Retrieve incoming headers from the frontend
  const clientHeaders = req.headers;

  // Build forward headers
  const forwardHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Forward existing headers, prioritizing FREE_LLM_API_KEY if configured
  if (freeLlmKey) {
    forwardHeaders["Authorization"] = `Bearer ${freeLlmKey}`;
  } else if (clientHeaders["authorization"]) {
    forwardHeaders["Authorization"] = clientHeaders["authorization"] as string;
  }

  // Forward other relevant client headers (excluding structural ones)
  for (const [key, value] of Object.entries(clientHeaders)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey !== "host" &&
      lowerKey !== "content-length" &&
      lowerKey !== "content-type" &&
      lowerKey !== "authorization" &&
      value
    ) {
      forwardHeaders[key] = value as string;
    }
  }

  try {
    console.log("=== [CHAT PROXY] STAGE 2: Sending body to FreeLLMAPI ===");
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: JSON.stringify(req.body),
    });

    console.log(`=== [CHAT PROXY] STAGE 3: Received response, Status: ${response.status} ===`);

    const contentType = response.headers.get("content-type") || "";

    // Read the raw response text from the LLM provider
    const rawResponseText = await response.text();

    // MANDATORY LOGGING OF RAW RESPONSE TO SERVER CONSOLE BEFORE SENDING BACK TO THE CLIENT
    console.log("=== [CHAT PROXY] RAW RESPONSE FROM LLM PROVIDER ===");
    console.log(rawResponseText);
    console.log("==================================================");

    if (!response.ok) {
      return res.status(response.status).send(rawResponseText);
    }

    // Set appropriate content type header and send back raw response
    res.setHeader("Content-Type", contentType || "application/json");
    return res.status(response.status).send(rawResponseText);

  } catch (error: any) {
    console.error("=== [CHAT PROXY] FATAL PROXY ERROR ===");
    console.error(error);
    return res.status(502).json({
      error: "Bad Gateway. Failed to proxy request to FreeLLMAPI.",
      message: error.message,
    });
  }
});

export default router;

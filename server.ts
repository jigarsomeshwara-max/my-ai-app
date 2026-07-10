import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Initialize Gemini client lazily to avoid crashing on startup if the key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Using simulator mode.");
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to handle AI generation failures elegantly
async function callGemini(prompt: string, systemInstruction?: string) {
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    return { success: true, text: response.text || "" };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message === "GEMINI_API_KEY_MISSING") {
      return {
        success: false,
        error: "GEMINI_API_KEY_MISSING",
        text: "Please add your Gemini API Key in the **Settings > Secrets** panel of Google AI Studio. Simulating response:\n\n" + getMockResponse(prompt),
      };
    }
    return {
      success: false,
      error: error.message || "An unknown error occurred",
      text: "We encountered an issue communicating with the AI. Simulating response:\n\n" + getMockResponse(prompt),
    };
  }
}

// Mock database to simulate some backup responses
function getMockResponse(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes("marketing") || p.includes("instagram") || p.includes("facebook") || p.includes("youtube")) {
    return `### 📱 Simulated Premium Marketing Script

**Target Platform:** Social Media Launch
**Hook (0-3 seconds):** Stop scrolling! If you're managing invoices, expenses, and CRM in three different apps, you are losing hours of sleep.
**Body:** Introducing AI Business OS—your all-in-one financial and CRM autopilot. Auto-generate GST invoices, categorize expenses in one tap, and get AI insights on hot leads.
**Call to Action:** Click below to start your free 14-day trial and claim your growth!
**Hashtags:** #Solopreneur #StartupHustle #AIBusinessOS #GrowthHack`;
  }
  if (p.includes("seo") || p.includes("blog")) {
    return `### ✍️ Simulated SEO Article: Auto-Scaling Your Business in 2026

**Meta Description:** Discover how AI-driven operating systems are helping solopreneurs scale operations, automate invoices, and optimize CRMs without extra hires.

#### 1. The Bottleneck of Growth
Many business owners spend 60% of their day on administrative overhead. Setting up GST-compliant invoices, chasing leads, and balancing expense sheets manually drains high-value strategic focus.

#### 2. The Solution: Single-Pane Workspaces
An all-in-one system reduces context-switching. Connecting your CRM directly to billing creates a friction-free pipeline where leads automatically convert to payees, backed by instant financial intelligence.

*SEO Keywords Analysed:* Solopreneur scaling, Automated invoicing software, CRM analytics, GST compliance.`;
  }
  if (p.includes("crm") || p.includes("lead") || p.includes("insight")) {
    return `### 💡 CRM AI Action Report
**Lead Status Evaluation:** Warm interest detected.
**Next Best Action:** Schedule a 10-minute automated demo showing the GST invoice customization. Offer an exclusive onboarding discount code \`AISTARTUP15\` which expires in 48 hours to create FOMO. Send a personalized follow-up email highlighting the custom report engine.`;
  }
  if (p.includes("receipt") || p.includes("expense") || p.includes("scanned")) {
    return JSON.stringify({
      amount: 1499.00,
      category: "Software Subscription",
      vendor: "Adobe Creative Cloud",
      gstRate: 18,
      gstAmount: 228.66,
      tags: ["design", "marketing"],
      confidence: 0.95
    });
  }
  return "Hello! I am your AI Business OS Assistant. I've analyzed your dashboard and stand ready to assist you in automating your GST billing, customer pipelines, and content creation. Feel free to ask me any operational questions!";
}

// --- API ROUTES ---

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// 2. Chat Assistant
app.post("/api/ai/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Construct context prompt incorporating recent chat history if available
  let prompt = "";
  if (history && Array.isArray(history)) {
    const formattedHistory = history
      .slice(-6)
      .map((h: any) => `${h.sender === "user" ? "User" : "Assistant"}: ${h.text}`)
      .join("\n");
    prompt = `The conversation history so far:\n${formattedHistory}\n\nUser's latest message: ${message}\n\nAssistant response:`;
  } else {
    prompt = message;
  }

  const systemInstruction = 
    "You are the expert virtual COO and business co-pilot of AI Business OS. " +
    "You provide clear, action-oriented financial advice, help design marketing workflows, " +
    "suggest tax and GST solutions, and organize customer engagement tactics. Keep your tone " +
    "professional, highly supportive, and focused on operational efficiency.";

  const result = await callGemini(prompt, systemInstruction);
  res.json(result);
});

// 3. Marketing Generator
app.post("/api/ai/marketing", async (req, res) => {
  const { product, channel, tone, details } = req.body;
  if (!product || !channel) {
    return res.status(400).json({ error: "Product and Channel are required" });
  }

  const prompt = `Generate a compelling social media marketing post/script for:
Product/Service: ${product}
Platform Channel: ${channel}
Desired Tone: ${tone || "Professional"}
Additional Details/Promotional Offers: ${details || "None"}

Please format with:
- Catchy Headline / Hook
- Main Body Copy or Video Script
- Strong Call to Action (CTA)
- Recommended hashtags`;

  const systemInstruction = "You are a master digital marketer and copywriter skilled in optimizing engagement and conversions across LinkedIn, Instagram, Facebook, and YouTube.";
  const result = await callGemini(prompt, systemInstruction);
  res.json(result);
});

// 4. SEO Blog Generator
app.post("/api/ai/blog", async (req, res) => {
  const { topic, keywords, tone } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  const prompt = `Write a high-quality SEO-optimized blog article.
Topic: ${topic}
Keywords to include: ${keywords || "None specified"}
Tone: ${tone || "Informative"}

Include:
- Compelling Title
- Meta Description
- Introduction
- 2-3 Subheadings (H2/H3) with robust paragraphs
- Keywords density review`;

  const systemInstruction = "You are an expert SEO content strategist. Write articles that read naturally, offer deep value, and rank highly on search engines.";
  const result = await callGemini(prompt, systemInstruction);
  res.json(result);
});

// 5. CRM Lead Insights
app.post("/api/ai/crm-insights", async (req, res) => {
  const { name, notes, value, status } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Lead Name is required" });
  }

  const prompt = `Analyse this CRM lead and generate a custom conversion plan:
Lead Name: ${name}
Deal Value: ${value ? `₹${value}` : "Not specified"}
Current Stage: ${status}
Interaction Notes: ${notes || "None"}

Please provide:
- Quick evaluation of customer purchase intent
- Specific next action recommendations
- A personalized outreach templates (email or message draft)`;

  const systemInstruction = "You are a senior enterprise sales executive. Provide high-conversion strategies for closing prospects and handling objections.";
  const result = await callGemini(prompt, systemInstruction);
  res.json(result);
});

// 6. Expense Scanner Simulator
app.post("/api/ai/expense-scanner", async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Receipt text description is required" });
  }

  const prompt = `Parse the following receipt description or expense line and extract key information in standard JSON:
Input Text: "${text}"

Expected output JSON keys:
- amount: number
- category: string
- vendor: string
- gstRate: number (GST percentage, e.g. 18, 5, 12, 28, or 0)
- gstAmount: number
- tags: array of strings
- confidence: number (estimate of accuracy between 0.0 and 1.0)

Return ONLY a raw JSON block matching these keys. Do not include markdown code ticks.`;

  const systemInstruction = "You are a precise billing parsing module. Always output clean, valid JSON, mapping inputs to proper cost elements and GST rules.";
  
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });
    const parsedText = response.text?.trim() || "{}";
    res.json({ success: true, data: JSON.parse(parsedText) });
  } catch (error: any) {
    console.warn("Gemini expense scanner failed, fallback to simulator:", error.message);
    res.json({ success: true, data: JSON.parse(getMockResponse("receipt: " + text)) });
  }
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();

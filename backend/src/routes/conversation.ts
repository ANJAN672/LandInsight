import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { GoogleGenAI } from "@google/genai";
import type { AnalysisContext, PolygonPoint } from "../types";

const router = Router();

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const conversations = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });
  return res.json({ conversations });
});

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { title } = req.body as { title?: string };
  const conversation = await prisma.conversation.create({
    data: { userId, title: title || "New Conversation" },
  });
  return res.json({ conversation });
});

router.get("/analyses", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const analyses = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      areaSqMeters: true,
      region: true,
      context: true,
      insights: true,
      createdAt: true,
      coordinates: true,
    },
    take: 20,
  });
  return res.json({ analyses });
});

router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return res.json({ conversation });
});

router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  await prisma.conversation.deleteMany({ where: { id: req.params.id, userId } });
  return res.json({ success: true });
});

router.post("/:id/messages", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { content, analysisId } = req.body as { content: string; analysisId?: string };
  if (!content) return res.status(400).json({ error: "Message content required" });

  const conversation = await prisma.conversation.findFirst({
    where: { id: req.params.id, userId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const userAnalyses = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  let referencedAnalysis = null;
  if (analysisId) {
    referencedAnalysis = await prisma.analysis.findFirst({
      where: { id: analysisId, userId },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content,
      metadata: analysisId ? { referencedAnalysisId: analysisId } : undefined,
    },
  });

  const history = conversation.messages.map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const analysesContext = userAnalyses.length > 0
    ? `\n\nUSER'S SAVED LAND PARCELS (Land Vault):\n${userAnalyses.map((a: { id: string; context: unknown; coordinates: unknown; areaSqMeters: number; region: string | null }, i: number) => {
        const ctx = a.context as AnalysisContext | null;
        const coords = a.coordinates as unknown as PolygonPoint[];
        const anchor = coords[0] || { lat: 0, lng: 0 };
        return `[REF: P${i + 1}] ID: ${a.id} | Center: ${anchor.lat}, ${anchor.lng} | Area: ${(a.areaSqMeters / 10000).toFixed(4)} HA | Region: ${a.region || "Unknown"} | Purpose: ${ctx?.goal || "General"}`;
      }).join("\n")}`
    : "";

  const referencedContext = referencedAnalysis
    ? `\n\nCURRENTLY REFERENCED PARCEL:\nPARCEL REF: P[Active]\nID: ${referencedAnalysis.id}\nGPS COORDINATES: ${JSON.stringify(referencedAnalysis.coordinates)}\nArea: ${(referencedAnalysis.areaSqMeters / 10000).toFixed(4)} HA (${referencedAnalysis.areaSqMeters.toFixed(2)} sq.m)\nRegion: ${referencedAnalysis.region || "Unknown"}\nContext: ${JSON.stringify(referencedAnalysis.context)}\n\nPREVIOUS ANALYSIS INSIGHTS:\n${referencedAnalysis.insights.slice(0, 1500)}...`
    : "";

  const systemPrompt = `You are Land Insight AI, an advanced spatial intelligence agent for the Indian Real Estate sector.
Your goal is to provide high-utility, elite-level insights that are easy to read and visually structured.

CORE GUIDELINES:
1. STYLE: Use a professional, high-authority tone.
2. FORMATTING: Use Markdown. Bolding for key names and numbers.
3. SPATIAL INTELLIGENCE (CRITICAL): You are provided with EXACT GPS coordinates. 
   - DO NOT give generic advice. 
   - Use your knowledge of the SPECIFIC neighborhood at these coordinates.
   - Mention nearby metros, roads, hospitals, and parks by their REAL names if they exist in your memory for that location.
4. CONTEXT: If the user provides a "Purpose:" in their message, PRIORITIZE that over the saved data.

${analysesContext}
${referencedContext}

If the user is asking about a specific parcel, start with a brief "Executive Summary" of the parcel before answering their question.
If they change their objective/purpose in the chat, adapt your advice immediately.`;

  const contents: { role: string; parts: { text: string }[] }[] = [];
  if (history.length === 0) {
    contents.push({ role: "user", parts: [{ text: `${systemPrompt}\n\n${content}` }] });
  } else {
    const firstMsg = { ...history[0] };
    if (firstMsg.role === "user") {
      firstMsg.parts = [{ text: `${systemPrompt}\n\n${firstMsg.parts[0].text}` }];
    }
    contents.push(firstMsg, ...history.slice(1), { role: "user", parts: [{ text: content }] });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents,
  });

  const assistantContent = response.text || "I apologize, I could not generate a response.";

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: assistantContent,
    },
  });

  if (conversation.messages.length === 0) {
    let title = content.slice(0, 40);
    if (referencedAnalysis) {
      const ctx = referencedAnalysis.context as AnalysisContext | null;
      title = `Analysis: ${ctx?.goal || "New Parcel"} (${referencedAnalysis.id.slice(0, 4)})`;
    }
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: title + (content.length > 40 && !referencedAnalysis ? "..." : "") },
    });
  }

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return res.json({ content: assistantContent, id: assistantMessage.id });
});

export default router;

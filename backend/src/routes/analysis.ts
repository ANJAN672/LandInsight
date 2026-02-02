import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { GoogleGenAI } from "@google/genai";
import type { AnalysisContext, PolygonPoint } from "../types";

const router = Router();

const getRegionFromCoords = (coords: PolygonPoint[]) => {
  const avgLat = coords.reduce((sum, p) => sum + p.lat, 0) / coords.length;
  const avgLng = coords.reduce((sum, p) => sum + p.lng, 0) / coords.length;
  if (avgLat > 11.8 && avgLat < 13.8 && avgLng > 74.8 && avgLng < 77.75) return "Karnataka";
  if (avgLng < 77.1 && avgLat < 12.7 && (avgLng < 76.8 || avgLat < 10.3)) return "Kerala";
  if (avgLng >= 76.75 && avgLat < 13.5 && (avgLat < 11.9 || avgLng > 77.3)) return "Tamil Nadu";
  if (avgLat > 17.3 && avgLat < 19.3 && avgLng > 72.7 && avgLng < 73.1) return "Maharashtra";
  if (avgLat > 28.4 && avgLat < 28.9 && avgLng > 76.8 && avgLng < 77.4) return "Delhi NCR";
  if (avgLat > 22.4 && avgLat < 23.2 && avgLng > 72.4 && avgLng < 72.8) return "Gujarat";
  if (avgLat > 18.3 && avgLat < 18.7 && avgLng > 73.7 && avgLng < 74.0) return "Pune";
  if (avgLat > 26.7 && avgLat < 27.1 && avgLng > 80.8 && avgLng < 81.1) return "Uttar Pradesh";
  if (avgLat > 22.4 && avgLat < 22.7 && avgLng > 88.2 && avgLng < 88.5) return "West Bengal";
  if (avgLat > 17.2 && avgLat < 17.6 && avgLng > 78.3 && avgLng < 78.6) return "Telangana";
  if (avgLat > 15.3 && avgLat < 15.6 && avgLng > 73.7 && avgLng < 74.0) return "Goa";
  return "India";
};

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const analyses = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return res.json({ analyses });
});

router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const analysis = await prisma.analysis.findFirst({
    where: { id: req.params.id, userId },
  });
  return res.json({ analysis });
});

router.post("/vault", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const { area, geojson, coordinates, context, name } = req.body as {
    area: number;
    geojson?: { type: string; coordinates: number[][][] };
    coordinates: PolygonPoint[];
    context?: AnalysisContext;
    name?: string;
  };
  const resolvedCoordinates = Array.isArray(coordinates) && coordinates.length > 0
    ? coordinates
    : (geojson?.coordinates?.[0] || []).map(([lng, lat]) => ({ lat, lng }));
  if (!resolvedCoordinates || resolvedCoordinates.length < 3) {
    return res.status(400).json({ error: "A valid polygon with at least 3 points is required" });
  }
  const region = getRegionFromCoords(resolvedCoordinates);
  const analysis = await prisma.analysis.create({
    data: {
      userId,
      areaSqMeters: area,
      coordinates: resolvedCoordinates as any,
      context: {
        goal: context?.goal || name || "Land Parcel",
        features: context?.features || "",
        concerns: context?.concerns || "",
        savedWithoutInsights: true,
      } as any,
      insights: `Parcel saved to Land Vault on ${new Date().toLocaleDateString("en-IN")}. Use AI Chat to generate detailed insights for this parcel.`,
      region,
    },
  });
  return res.json({
    success: true,
    analysisId: analysis.id,
    message: "Parcel saved to Land Vault!",
    region,
    area,
    geojson: {
      type: "Polygon",
      coordinates: [[...resolvedCoordinates.map((p) => [p.lng, p.lat]), [resolvedCoordinates[0].lng, resolvedCoordinates[0].lat]]],
    },
  });
});

router.post("/generate/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const analysis = await prisma.analysis.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!analysis) return res.status(404).json({ error: "Parcel not found" });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  const ai = new GoogleGenAI({ apiKey });
  const coordinates = analysis.coordinates as unknown as PolygonPoint[];
  const context = analysis.context as AnalysisContext | null;
  const anchor = coordinates[0];
  const prompt = `
    Perform an elite-level professional land survey and real-estate valuation for this parcel in India.
    
    Spatial Context:
    - Latitude/Longitude Anchor: ${anchor.lat}, ${anchor.lng}
    - Total Footprint: ${analysis.areaSqMeters.toFixed(2)} square meters (${(analysis.areaSqMeters * 10.7639).toFixed(2)} sq ft)
    - Perimeter Points: ${JSON.stringify(coordinates)}
    
    User Parameters:
    - Primary Goal: ${context?.goal || "General development and valuation"}
    - Reported Site Features: ${context?.features || "Not specified"}
    - Key Concerns: ${context?.concerns || "Zoning and future ROI"}
    
    Required Intelligence:
    1. PROXIMITY ANALYSIS: Identify the exact neighborhood and list nearest major transit, tech parks, or commercial hubs within 3km.
    2. REAL-TIME VALUATION: Predict the current market rate per sq ft in INR (₹) for this specific locality.
    3. ZONING & BYLAWS: Estimate the likely zoning category and mention possible Floor Space Index (FSI) constraints.
    4. RISKS & GROWTH: Detail 3 potential legal/environmental risks and 3 high-impact investment opportunities.
    
    Format as a clean, professional Markdown report. Use specific local names based on coordinates.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: prompt,
  });
  const text = response.text;
  if (!text) return res.status(500).json({ error: "Analysis engine failed to produce a report." });
  await prisma.analysis.update({
    where: { id: analysis.id },
    data: {
      insights: text,
      context: {
        ...context,
        savedWithoutInsights: false,
        insightsGeneratedAt: new Date().toISOString(),
      } as any,
    },
  });
  return res.json({ report: text, analysisId: analysis.id });
});

router.post("/analyze", async (req, res) => {
  const { area, coordinates, geojson, context, conversationId, userId } = req.body as {
    area: number;
    geojson?: { type: string; coordinates: number[][][] };
    coordinates: PolygonPoint[];
    context?: AnalysisContext;
    conversationId?: string;
    userId?: string;
  };
  const resolvedCoordinates = Array.isArray(coordinates) && coordinates.length > 0
    ? coordinates
    : (geojson?.coordinates?.[0] || []).map(([lng, lat]) => ({ lat, lng }));
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  const ai = new GoogleGenAI({ apiKey });
  const anchor = resolvedCoordinates[0];
  const prompt = `
    Perform an elite-level professional land survey and real-estate valuation for this parcel in India.
    
    Spatial Context:
    - Latitude/Longitude Anchor: ${anchor.lat}, ${anchor.lng}
    - Total Footprint: ${area.toFixed(2)} square meters (${(area * 10.7639).toFixed(2)} sq ft)
    - Perimeter Points: ${JSON.stringify(resolvedCoordinates)}
    
    User Parameters:
    - Primary Goal: ${context?.goal || "General development and valuation"}
    - Reported Site Features: ${context?.features || "Not specified"}
    - Key Concerns: ${context?.concerns || "Zoning and future ROI"}
    
    Required Intelligence:
    1. PROXIMITY ANALYSIS: Identify the exact neighborhood and list nearest major transit, tech parks, or commercial hubs within 3km.
    2. REAL-TIME VALUATION: Predict the current market rate per sq ft in INR (₹) for this specific locality.
    3. ZONING & BYLAWS: Estimate the likely zoning category and mention possible Floor Space Index (FSI) constraints.
    4. RISKS & GROWTH: Detail 3 potential legal/environmental risks and 3 high-impact investment opportunities.
    
    Format as a clean, professional Markdown report. Use specific local names based on coordinates.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const text = response.text;
    if (!text) return res.status(500).json({ error: "Analysis engine failed to produce a report." });
    if (userId) {
      const analysis = await prisma.analysis.create({
        data: {
          userId,
          areaSqMeters: area,
          coordinates: resolvedCoordinates as any,
          context: context as any,
          insights: text,
          region: getRegionFromCoords(resolvedCoordinates),
        },
      });
      if (conversationId) {
        await prisma.message.createMany({
          data: [
            {
              conversationId,
              role: "user",
              content: `Analyze land parcel: ${area.toFixed(2)} sqm at ${anchor.lat.toFixed(6)}, ${anchor.lng.toFixed(6)}. Goal: ${context?.goal || "General"}`,
              metadata: { type: "analysis_request", coordinates: JSON.parse(JSON.stringify(resolvedCoordinates)), area, context: context || null } as any,
            },
            {
              conversationId,
              role: "assistant",
              content: text,
              metadata: { type: "analysis_response", analysisId: analysis.id },
            },
          ],
        });
      }
      return res.json({ report: text, sources: [], analysisId: analysis.id });
    }
    return res.json({ report: text, sources: [] });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Spatial analysis unavailable." });
  }
});

router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  await prisma.analysis.deleteMany({ where: { id: req.params.id, userId } });
  return res.json({ success: true });
});

router.get("/geojson/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const analysis = await prisma.analysis.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!analysis) return res.status(404).json({ error: "Parcel not found" });
  const coords = analysis.coordinates as unknown as PolygonPoint[];
  const geojson = {
    type: "Feature",
    properties: {
      id: analysis.id,
      areaSqMeters: analysis.areaSqMeters,
      region: analysis.region,
      context: analysis.context,
    },
    geometry: {
      type: "Polygon",
      coordinates: [[...coords.map((p) => [p.lng, p.lat]), [coords[0].lng, coords[0].lat]]],
    },
  };
  return res.json({ geojson });
});

export default router;

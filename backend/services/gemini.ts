
import { GoogleGenAI } from "@google/genai";
import { PolygonPoint } from "../types";

export const analyzeLandData = async (
  area: number, 
  coordinates: PolygonPoint[], 
  context?: { goal: string; features: string; concerns: string }
) => {
  // Always initialize fresh to catch latest environment key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-pro-preview for complex reasoning and grounding
  const model = 'gemini-3-pro-preview';
  
  const anchor = coordinates[0];
  const prompt = `
    Perform an elite-level professional land survey and real-estate valuation for this parcel in Karnataka, India.
    
    Spatial Context:
    - Latitude/Longitude Anchor: ${anchor.lat}, ${anchor.lng}
    - Total Footprint: ${area.toFixed(2)} square meters (${(area * 10.7639).toFixed(2)} sq ft)
    - Perimeter Points: ${JSON.stringify(coordinates)}
    
    User Parameters:
    - Primary Goal: ${context?.goal || 'General development and valuation'}
    - Reported Site Features: ${context?.features || 'Not specified'}
    - Key Concerns: ${context?.concerns || 'Zoning and future ROI'}
    
    Required Intelligence (MUST use Google Search grounding):
    1. PROXIMITY ANALYSIS: Identify the exact neighborhood and list nearest major transit (Metro stations, highways), tech parks, or commercial hubs within 3km.
    2. REAL-TIME VALUATION: Predict the current market rate per sq ft in INR (₹) for this specific locality. Reference recent property trends in this part of Karnataka.
    3. ZONING & BYLAWS: Estimate the likely zoning category (e.g., BBMP Residential, BDA Commercial) and mention possible Floor Space Index (FSI) constraints.
    4. RISKS & GROWTH: Detail 3 potential legal/environmental risks and 3 high-impact investment opportunities.
    
    Format as a clean, professional Markdown report. Use specific local names (e.g. Indiranagar, Electronic City, Jayanagar) based on coordinates.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Analysis engine failed to produce a report. Please refine your boundary.");
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web)
      .map((chunk: any) => ({
        title: chunk.web.title,
        uri: chunk.web.uri
      }));

    return {
      report: text,
      sources: sources.slice(0, 5) // Top 5 sources for clarity
    };
  } catch (error: any) {
    console.error("Gemini Spatial Engine Error:", error);
    throw new Error(error.message || "Spatial analysis unavailable. Verify your API connection.");
  }
};

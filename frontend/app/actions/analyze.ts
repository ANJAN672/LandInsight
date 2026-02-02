'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { GoogleGenAI } from "@google/genai";

interface PolygonPoint {
    lat: number;
    lng: number;
}

// Save parcel to Land Vault without generating insights
export async function saveParcelToVault(
    area: number,
    coordinates: PolygonPoint[],
    context?: { goal: string; features: string; concerns: string },
    name?: string
) {
    const session = await getSession();
    if (!session?.userId) {
        throw new Error('Please login to save parcels to Land Vault');
    }

    if (coordinates.length < 3) {
        throw new Error('A valid polygon with at least 3 points is required');
    }

    const region = getRegionFromCoords(coordinates);
    const anchor = coordinates[0];

    const analysis = await prisma.analysis.create({
        data: {
            userId: session.userId,
            areaSqMeters: area,
            coordinates: coordinates as any,
            context: {
                goal: context?.goal || name || 'Land Parcel',
                features: context?.features || '',
                concerns: context?.concerns || '',
                savedWithoutInsights: true,
            } as any,
            insights: `Parcel saved to Land Vault on ${new Date().toLocaleDateString('en-IN')}. Use AI Chat to generate detailed insights for this parcel.`,
            region,
        }
    });

    return {
        success: true,
        analysisId: analysis.id,
        message: 'Parcel saved to Land Vault!',
        region,
        area,
    };
}

// Generate insights for an existing saved parcel
export async function generateInsightsForParcel(analysisId: string) {
    const session = await getSession();
    if (!session?.userId) throw new Error('Not authenticated');

    const analysis = await prisma.analysis.findFirst({
        where: { id: analysisId, userId: session.userId }
    });

    if (!analysis) throw new Error('Parcel not found');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

    const ai = new GoogleGenAI({ apiKey });
    const coordinates = analysis.coordinates as unknown as PolygonPoint[];
    const context = analysis.context as any;
    const anchor = coordinates[0];

    const prompt = `
    Perform an elite-level professional land survey and real-estate valuation for this parcel in India.
    
    Spatial Context:
    - Latitude/Longitude Anchor: ${anchor.lat}, ${anchor.lng}
    - Total Footprint: ${analysis.areaSqMeters.toFixed(2)} square meters (${(analysis.areaSqMeters * 10.7639).toFixed(2)} sq ft)
    - Perimeter Points: ${JSON.stringify(coordinates)}
    
    User Parameters:
    - Primary Goal: ${context?.goal || 'General development and valuation'}
    - Reported Site Features: ${context?.features || 'Not specified'}
    - Key Concerns: ${context?.concerns || 'Zoning and future ROI'}
    
    Required Intelligence:
    1. PROXIMITY ANALYSIS: Identify the exact neighborhood and list nearest major transit, tech parks, or commercial hubs within 3km.
    2. REAL-TIME VALUATION: Predict the current market rate per sq ft in INR (₹) for this specific locality.
    3. ZONING & BYLAWS: Estimate the likely zoning category and mention possible Floor Space Index (FSI) constraints.
    4. RISKS & GROWTH: Detail 3 potential legal/environmental risks and 3 high-impact investment opportunities.
    
    Format as a clean, professional Markdown report. Use specific local names based on coordinates.
  `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt
    });

    const text = response.text;
    if (!text) throw new Error("Analysis engine failed to produce a report.");

    // Update the analysis with new insights
    await prisma.analysis.update({
        where: { id: analysisId },
        data: {
            insights: text,
            context: {
                ...context,
                savedWithoutInsights: false,
                insightsGeneratedAt: new Date().toISOString(),
            }
        }
    });

    return { report: text, analysisId };
}

export async function analyzeLandAction(
    area: number,
    coordinates: PolygonPoint[],
    context?: { goal: string; features: string; concerns: string },
    conversationId?: string
) {
    const session = await getSession();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash-lite';

    const anchor = coordinates[0];
    const prompt = `
    Perform an elite-level professional land survey and real-estate valuation for this parcel in India.
    
    Spatial Context:
    - Latitude/Longitude Anchor: ${anchor.lat}, ${anchor.lng}
    - Total Footprint: ${area.toFixed(2)} square meters (${(area * 10.7639).toFixed(2)} sq ft)
    - Perimeter Points: ${JSON.stringify(coordinates)}
    
    User Parameters:
    - Primary Goal: ${context?.goal || 'General development and valuation'}
    - Reported Site Features: ${context?.features || 'Not specified'}
    - Key Concerns: ${context?.concerns || 'Zoning and future ROI'}
    
    Required Intelligence:
    1. PROXIMITY ANALYSIS: Identify the exact neighborhood and list nearest major transit, tech parks, or commercial hubs within 3km.
    2. REAL-TIME VALUATION: Predict the current market rate per sq ft in INR (₹) for this specific locality.
    3. ZONING & BYLAWS: Estimate the likely zoning category and mention possible Floor Space Index (FSI) constraints.
    4. RISKS & GROWTH: Detail 3 potential legal/environmental risks and 3 high-impact investment opportunities.
    
    Format as a clean, professional Markdown report. Use specific local names based on coordinates.
  `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt
        });

        const text = response.text;
        if (!text) {
            throw new Error("Analysis engine failed to produce a report.");
        }

        // Save analysis to database if user is logged in
        if (session?.userId) {
            const analysis = await prisma.analysis.create({
                data: {
                    userId: session.userId,
                    areaSqMeters: area,
                    coordinates: coordinates as any,
                    context: context as any,
                    insights: text,
                    region: getRegionFromCoords(coordinates),
                }
            });

            // Also save to conversation if provided
            if (conversationId) {
                await prisma.message.createMany({
                    data: [
                        {
                            conversationId,
                            role: 'user',
                            content: `Analyze land parcel: ${area.toFixed(2)} sqm at ${anchor.lat.toFixed(6)}, ${anchor.lng.toFixed(6)}. Goal: ${context?.goal || 'General'}`,
                            metadata: { type: 'analysis_request', coordinates: JSON.parse(JSON.stringify(coordinates)), area, context: context || null } as any,
                        },
                        {
                            conversationId,
                            role: 'assistant',
                            content: text,
                            metadata: { type: 'analysis_response', analysisId: analysis.id },
                        }
                    ]
                });
            }

            return { report: text, sources: [], analysisId: analysis.id };
        }

        return { report: text, sources: [] };
    } catch (error: any) {
        console.error("Gemini Spatial Engine Error:", error);
        throw new Error(error.message || "Spatial analysis unavailable.");
    }
}

function getRegionFromCoords(coords: PolygonPoint[]): string {
    const avgLat = coords.reduce((sum, p) => sum + p.lat, 0) / coords.length;
    const avgLng = coords.reduce((sum, p) => sum + p.lng, 0) / coords.length;

    // India state detection based on coordinates
    if (avgLat > 11.8 && avgLat < 13.8 && avgLng > 74.8 && avgLng < 77.75) return 'Karnataka';
    if (avgLng < 77.1 && avgLat < 12.7 && (avgLng < 76.8 || avgLat < 10.3)) return 'Kerala';
    if (avgLng >= 76.75 && avgLat < 13.5 && (avgLat < 11.9 || avgLng > 77.3)) return 'Tamil Nadu';
    if (avgLat > 17.3 && avgLat < 19.3 && avgLng > 72.7 && avgLng < 73.1) return 'Maharashtra';
    if (avgLat > 28.4 && avgLat < 28.9 && avgLng > 76.8 && avgLng < 77.4) return 'Delhi NCR';
    if (avgLat > 22.4 && avgLat < 23.2 && avgLng > 72.4 && avgLng < 72.8) return 'Gujarat';
    if (avgLat > 18.3 && avgLat < 18.7 && avgLng > 73.7 && avgLng < 74.0) return 'Pune';
    if (avgLat > 26.7 && avgLat < 27.1 && avgLng > 80.8 && avgLng < 81.1) return 'Uttar Pradesh';
    if (avgLat > 22.4 && avgLat < 22.7 && avgLng > 88.2 && avgLng < 88.5) return 'West Bengal';
    if (avgLat > 17.2 && avgLat < 17.6 && avgLng > 78.3 && avgLng < 78.6) return 'Telangana';
    if (avgLat > 15.3 && avgLat < 15.6 && avgLng > 73.7 && avgLng < 74.0) return 'Goa';
    return 'India';
}

export async function getUserAnalyses() {
    const session = await getSession();
    if (!session?.userId) return [];

    return prisma.analysis.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
}

export async function deleteAnalysis(id: string) {
    const session = await getSession();
    if (!session?.userId) throw new Error('Not authenticated');

    await prisma.analysis.deleteMany({
        where: { id, userId: session.userId }
    });

    return { success: true };
}

export async function getAnalysisById(id: string) {
    const session = await getSession();
    if (!session?.userId) return null;

    return prisma.analysis.findFirst({
        where: { id, userId: session.userId }
    });
}

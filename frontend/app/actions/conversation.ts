'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { GoogleGenAI } from "@google/genai";

export async function getConversations() {
    const session = await getSession();
    if (!session?.userId) return [];

    return prisma.conversation.findMany({
        where: { userId: session.userId },
        orderBy: { updatedAt: 'desc' },
        include: {
            messages: {
                take: 1,
                orderBy: { createdAt: 'desc' }
            }
        }
    });
}

export async function createConversation(title?: string) {
    const session = await getSession();
    if (!session?.userId) throw new Error('Not authenticated');

    return prisma.conversation.create({
        data: {
            userId: session.userId,
            title: title || 'New Conversation',
        }
    });
}

export async function getConversation(id: string) {
    const session = await getSession();
    if (!session?.userId) throw new Error('Not authenticated');

    return prisma.conversation.findFirst({
        where: { id, userId: session.userId },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });
}

export async function getUserAnalysesForChat() {
    const session = await getSession();
    if (!session?.userId) return [];

    return prisma.analysis.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            areaSqMeters: true,
            region: true,
            context: true,
            insights: true,
            createdAt: true,
        },
        take: 20,
    });
}

export async function getAnalysisById(id: string) {
    const session = await getSession();
    if (!session?.userId) return null;

    return prisma.analysis.findFirst({
        where: { id, userId: session.userId },
    });
}

export async function sendChatMessage(conversationId: string, content: string, analysisId?: string) {
    const session = await getSession();
    if (!session?.userId) throw new Error('Not authenticated');

    // Verify ownership
    const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } }
    });
    if (!conversation) throw new Error('Conversation not found');

    // Get user's analyses for context
    const userAnalyses = await prisma.analysis.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
        take: 10,
    });

    // If a specific analysis is referenced, get its details
    let referencedAnalysis = null;
    if (analysisId) {
        referencedAnalysis = await prisma.analysis.findFirst({
            where: { id: analysisId, userId: session.userId }
        });
    }

    // Save user message
    await prisma.message.create({
        data: {
            conversationId,
            role: 'user',
            content,
            metadata: analysisId ? { referencedAnalysisId: analysisId } : undefined,
        }
    });

    // Build chat history for context with correct role mapping
    const history = conversation.messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    // Generate AI response
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });

    // Build analysis context with GPS coordinates for spatial reasoning
    const analysesContext = userAnalyses.length > 0
        ? `\n\nUSER'S SAVED LAND PARCELS (Land Vault):\n${userAnalyses.map((a, i) => {
            const ctx = a.context as any;
            const coords = a.coordinates as any[];
            const anchor = coords[0] || { lat: 0, lng: 0 };
            return `[REF: P${i + 1}] ID: ${a.id} | Center: ${anchor.lat}, ${anchor.lng} | Area: ${(a.areaSqMeters / 10000).toFixed(4)} HA | Region: ${a.region || 'Unknown'} | Purpose: ${ctx?.goal || 'General'}`;
        }).join('\n')}`
        : '';

    const referencedContext = referencedAnalysis
        ? `\n\nCURRENTLY REFERENCED PARCEL:\nPARCEL REF: P[Active]\nID: ${referencedAnalysis.id}\nGPS COORDINATES: ${JSON.stringify(referencedAnalysis.coordinates)}\nArea: ${(referencedAnalysis.areaSqMeters / 10000).toFixed(4)} HA (${referencedAnalysis.areaSqMeters.toFixed(2)} sq.m)\nRegion: ${referencedAnalysis.region || 'Unknown'}\nContext: ${JSON.stringify(referencedAnalysis.context)}\n\nPREVIOUS ANALYSIS INSIGHTS:\n${referencedAnalysis.insights.slice(0, 1500)}...`
        : '';

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

    // Build contents with alternating roles and merged system prompt
    const contents = [];
    if (history.length === 0) {
        contents.push({ role: 'user', parts: [{ text: `${systemPrompt}\n\n${content}` }] });
    } else {
        const firstMsg = { ...history[0] };
        if (firstMsg.role === 'user') {
            firstMsg.parts = [{ text: `${systemPrompt}\n\n${firstMsg.parts[0].text}` }];
        }
        contents.push(firstMsg, ...history.slice(1), { role: 'user', parts: [{ text: content }] });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents
    });

    const assistantContent = response.text || 'I apologize, I could not generate a response.';

    // Save assistant message
    const assistantMessage = await prisma.message.create({
        data: {
            conversationId,
            role: 'assistant',
            content: assistantContent,
        }
    });

    // Update conversation title if it's the first message
    if (conversation.messages.length === 0) {
        let title = content.slice(0, 40);
        if (referencedAnalysis) {
            const ctx = referencedAnalysis.context as any;
            title = `Analysis: ${ctx?.goal || 'New Parcel'} (${referencedAnalysis.id.slice(0, 4)})`;
        }
        await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: title + (content.length > 40 && !referencedAnalysis ? '...' : '') }
        });
    }

    // Touch conversation updatedAt
    await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
    });

    return { content: assistantContent, id: assistantMessage.id };
}

export async function deleteConversation(id: string) {
    const session = await getSession();
    if (!session?.userId) throw new Error('Not authenticated');

    await prisma.conversation.deleteMany({
        where: { id, userId: session.userId }
    });

    return { success: true };
}

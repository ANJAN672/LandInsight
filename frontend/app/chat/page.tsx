'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '@/components/AuthProvider';
import { getConversations, createConversation, getConversation, sendChatMessage, deleteConversation, getUserAnalysesForChat } from '@/app/actions/conversation';

interface Message {
    id: string;
    role: string;
    content: string;
    createdAt: Date | string;
}

interface Conversation {
    id: string;
    title: string | null;
    updatedAt: Date | string;
    messages: { content: string }[];
}

interface Analysis {
    id: string;
    areaSqMeters: number;
    region: string | null;
    context: any;
    createdAt: Date;
}

export default function ChatPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingConv, setLoadingConv] = useState(false);
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
    const [showVault, setShowVault] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            loadConversations();
            loadAnalyses();
        }
    }, [user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversations = async () => {
        const convs = await getConversations();
        setConversations(convs as Conversation[]);
    };

    const loadAnalyses = async () => {
        const data = await getUserAnalysesForChat();
        setAnalyses(data as Analysis[]);
    };

    const selectConversation = async (id: string) => {
        setLoadingConv(true);
        setActiveConversation(id);
        const conv = await getConversation(id);
        if (conv) {
            setMessages(conv.messages as Message[]);
        }
        setLoadingConv(false);
    };

    const handleNewConversation = async () => {
        const conv = await createConversation();
        setConversations([{ ...conv, messages: [] } as Conversation, ...conversations]);
        setActiveConversation(conv.id);
        setMessages([]);
    };

    const handleDeleteConversation = async (id: string) => {
        await deleteConversation(id);
        setConversations(conversations.filter(c => c.id !== id));
        if (activeConversation === id) {
            setActiveConversation(null);
            setMessages([]);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !activeConversation || sending) return;

        const userMessage: Message = {
            id: 'temp-' + Date.now(),
            role: 'user',
            content: input,
            createdAt: new Date().toISOString(),
        };
        setMessages([...messages, userMessage]);
        setInput('');
        setSending(true);

        try {
            const response = await sendChatMessage(activeConversation, input, selectedAnalysis || undefined);
            const assistantMessage: Message = {
                id: response.id,
                role: 'assistant',
                content: response.content,
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev.filter(m => m.id !== userMessage.id), { ...userMessage, id: 'user-' + Date.now() }, assistantMessage]);
            loadConversations();
            setSelectedAnalysis(null);
        } catch (err: any) {
            setMessages(prev => prev.filter(m => m.id !== userMessage.id));
            alert(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleUseParcel = (analysisId: string) => {
        setSelectedAnalysis(analysisId);
        setShowVault(false);
        const analysis = analyses.find(a => a.id === analysisId);
        if (analysis) {
            const ctx = analysis.context as any;
            setInput(`Analyze my parcel in ${analysis.region || 'Unknown region'} (${(analysis.areaSqMeters / 10000).toFixed(4)} HA). Purpose: ${ctx?.goal || 'General development'}`);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-73px)]">
            {/* Sidebar */}
            <div className="w-80 bg-gray-50 border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <button
                        onClick={handleNewConversation}
                        className="w-full py-3 px-4 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Conversation
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-6 text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No conversations yet</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    className={`group relative p-4 rounded-xl cursor-pointer transition-all ${activeConversation === conv.id
                                        ? 'bg-white shadow-md border border-gray-100'
                                        : 'hover:bg-white hover:shadow-sm'
                                        }`}
                                    onClick={() => selectConversation(conv.id)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[11px] font-black text-gray-900 truncate">{conv.title || 'New Conversation'}</h4>
                                            <p className="text-[9px] text-gray-400 font-medium mt-1 truncate">
                                                {conv.messages[0]?.content?.slice(0, 40) || 'No messages'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Land Vault Quick Access */}
                <div className="p-4 border-t border-gray-100 space-y-2">
                    <button
                        onClick={() => setShowVault(!showVault)}
                        className="w-full py-2 px-4 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-xl font-black text-[9px] uppercase tracking-widest hover:from-blue-100 hover:to-blue-150 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Land Vault ({analyses.length})
                    </button>
                    <Link href="/analyze" className="block w-full py-2 px-4 bg-gray-100 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-200 transition-all text-center">
                        ← Back to Map
                    </Link>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white relative">
                {/* Land Vault Panel */}
                {showVault && (
                    <div className="absolute inset-0 z-20 bg-white">
                        <div className="h-full flex flex-col">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">Land Vault</h2>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select a parcel to analyze</p>
                                </div>
                                <button onClick={() => setShowVault(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {analyses.length === 0 ? (
                                    <div className="text-center py-20">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">No parcels saved yet</p>
                                        <Link href="/analyze" className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all inline-block">
                                            Create Your First Parcel
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {analyses.map((analysis, idx) => {
                                            const ctx = analysis.context as any;
                                            return (
                                                <div key={analysis.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Parcel {idx + 1}</span>
                                                                <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded tracking-tighter">REF: P{idx + 1}</span>
                                                            </div>
                                                            <h4 className="text-sm font-black text-gray-900 mt-1">{ctx?.goal || 'Land Analysis'}</h4>
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded">
                                                            {analysis.region || 'Unknown'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div>
                                                                <p className="text-lg font-black text-gray-900">{(analysis.areaSqMeters / 10000).toFixed(4)}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase">Hectares</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-medium text-gray-500">
                                                                    {new Date(analysis.createdAt).toLocaleDateString('en-IN')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleUseParcel(analysis.id)}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                                                        >
                                                            Use This Parcel
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!activeConversation ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md px-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-2">Land Insight AI</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Your Real Estate Intelligence Assistant</p>
                            <p className="text-[12px] text-gray-500 mb-6">
                                Ask about land valuations, zoning laws, investment opportunities, or get insights on your saved parcels from Land Vault.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleNewConversation}
                                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                                >
                                    Start Conversation
                                </button>
                                {analyses.length > 0 && (
                                    <button
                                        onClick={() => setShowVault(true)}
                                        className="px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all"
                                    >
                                        View Land Vault ({analyses.length} Parcels)
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Selected Parcel Indicator */}
                        {selectedAnalysis && (
                            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                    </svg>
                                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                                        Parcel attached to message
                                    </span>
                                </div>
                                <button onClick={() => setSelectedAnalysis(null)} className="text-blue-600 hover:text-blue-800">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {loadingConv ? (
                                <div className="flex justify-center py-10">
                                    <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Start your conversation</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        <button
                                            onClick={() => { setShowVault(true); }}
                                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all"
                                        >
                                            📦 Use a saved parcel
                                        </button>
                                        <button
                                            onClick={() => setInput("What should I look for when buying land in Karnataka?")}
                                            className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-all"
                                        >
                                            🏡 Buying tips
                                        </button>
                                        <button
                                            onClick={() => setInput("Explain zoning regulations in India")}
                                            className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-all"
                                        >
                                            📋 Zoning laws
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-5 py-4 rounded-2xl ${msg.role === 'user'
                                                ? 'bg-gray-900 text-white shadow-lg'
                                                : 'bg-white text-gray-900 border border-gray-100 shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2 opacity-60">
                                                <div className={`w-2 h-2 rounded-full ${msg.role === 'user' ? 'bg-gray-400' : 'bg-blue-600'}`}></div>
                                                <span className="text-[9px] font-black uppercase tracking-widest">
                                                    {msg.role === 'user' ? 'You' : 'Spatial Intelligence Agent'}
                                                </span>
                                            </div>
                                            <div className={`text-[12px] leading-relaxed font-medium ${msg.role === 'assistant' ? 'prose prose-blue prose-xs max-w-none' : 'whitespace-pre-wrap'}`}>
                                                {msg.role === 'assistant' ? (
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-100 p-4 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowVault(true)}
                                    className="p-3 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                                    title="Attach a parcel from Land Vault"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder="Ask about land valuations, zoning, or your saved parcels..."
                                    className="flex-1 px-5 py-4 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-200 transition-all"
                                    disabled={sending}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !input.trim()}
                                    className="px-6 py-4 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {sending ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    )}
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

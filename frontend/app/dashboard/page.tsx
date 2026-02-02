'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getUserAnalyses, deleteAnalysis } from '@/lib/api';

interface AnalysisContext {
    goal?: string;
    features?: string;
    concerns?: string;
}

interface Analysis {
    id: string;
    areaSqMeters: number;
    coordinates: { lat: number; lng: number }[];
    context: AnalysisContext | null;
    insights: string;
    region: string | null;
    createdAt: string | Date;
}

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState<'parcels' | 'insights'>('parcels');
    const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const loadAnalyses = async () => {
        setLoading(true);
        const data = await getUserAnalyses();
        setAnalyses(data as Analysis[]);
        setLoading(false);
    };

    useEffect(() => {
        if (user && !hasLoaded) {
            setHasLoaded(true);
            setTimeout(() => {
                void loadAnalyses();
            }, 0);
        }
    }, [user, hasLoaded]);

    if (authLoading || !user) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const totalArea = analyses.reduce((sum, a) => sum + a.areaSqMeters, 0);

    return (
        <div className="max-w-6xl mx-auto py-12 px-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Land Vault</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
                        Your Stored Spatial Analyses
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/chat"
                        className="px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        AI Insights
                    </Link>
                    <Link
                        href="/analyze"
                        className="px-5 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        New Analysis
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-2">Total Parcels</p>
                    <p className="text-3xl font-black text-gray-900">{analyses.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-2">Total Area</p>
                    <p className="text-3xl font-black text-gray-900">{(totalArea / 10000).toFixed(2)} <span className="text-lg">HA</span></p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-2">Avg. Parcel Size</p>
                    <p className="text-3xl font-black text-gray-900">
                        {analyses.length > 0 ? ((totalArea / analyses.length) / 10000).toFixed(3) : '0'} <span className="text-lg">HA</span>
                    </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2">Account</p>
                    <p className="text-lg font-black text-gray-900 capitalize">{user.role.toLowerCase()}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('parcels')}
                    className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'parcels'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                >
                    All Parcels
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'insights'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                >
                    Insights
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : analyses.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                    </div>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">No parcels yet</p>
                    <Link
                        href="/analyze"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                    >
                        Create Your First Analysis
                    </Link>
                </div>
            ) : activeTab === 'parcels' ? (
                <div className="space-y-4">
                    {analyses.map((analysis, idx) => (
                        <div
                            key={analysis.id}
                            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all overflow-hidden"
                        >
                            <div
                                className="p-6 cursor-pointer"
                                onClick={() => setExpandedAnalysis(expandedAnalysis === analysis.id ? null : analysis.id)}
                            >
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded uppercase tracking-widest">
                                                Parcel {idx + 1}
                                            </span>
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                    {new Date(analysis.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                            {analysis.region && (
                                                <span className="text-[8px] font-black text-green-600 bg-green-50 px-2 py-1 rounded uppercase tracking-widest">
                                                    {analysis.region}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-sm font-black text-gray-900 mb-1">
                                            {analysis.context?.goal || 'Land Analysis'}
                                        </h3>
                                        <p className="text-[11px] text-gray-500 line-clamp-2">
                                                    {analysis.insights.slice(0, 150)}...
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-lg font-black text-gray-900">{(analysis.areaSqMeters / 10000).toFixed(4)}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Hectares</p>
                                        </div>
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedAnalysis === analysis.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedAnalysis === analysis.id && (
                                <div className="px-6 pb-6 border-t border-gray-50">
                                    <div className="pt-4">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">AI Analysis</h4>
                                        <div className="bg-gray-50 p-4 rounded-xl text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                                            {analysis.insights}
                                        </div>
                                        <div className="flex items-center gap-3 mt-4">
                                            <Link
                                                href={`/chat`}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                                            >
                                                Get More Insights
                                            </Link>
                                            <Link
                                                href={`/analyze?id=${analysis.id}`}
                                                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                                            >
                                                View on Map
                                            </Link>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Are you sure you want to delete this parcel?')) {
                                                        await deleteAnalysis(analysis.id);
                                                        loadAnalyses();
                                                    }
                                                }}
                                                className="ml-auto p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Parcel"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                /* Insights Tab */
                <div className="bg-white rounded-3xl border border-gray-100 p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2">AI-Powered Insights</h3>
                        <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                            Get personalized recommendations and deeper analysis of your land parcels using our AI assistant.
                        </p>
                    </div>

                    <div className="grid gap-4 mb-8">
                        <div className="bg-gray-50 p-5 rounded-2xl flex items-start gap-4">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 mb-1">Compare Parcels</h4>
                                <p className="text-[11px] text-gray-500">Ask the AI to compare multiple parcels and help you choose the best investment.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-5 rounded-2xl flex items-start gap-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 mb-1">Valuation Estimates</h4>
                                <p className="text-[11px] text-gray-500">Get AI-powered estimates on land values based on location and market trends.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-5 rounded-2xl flex items-start gap-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 mb-1">Legal Considerations</h4>
                                <p className="text-[11px] text-gray-500">Understand zoning laws, land use restrictions, and legal requirements for your parcels.</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <Link
                            href="/chat"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Chat with Land Insight AI
                        </Link>
                        <p className="text-[10px] text-gray-400 mt-3">
                            The AI has access to all {analyses.length} of your saved parcels
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import React, { useState, useEffect } from 'react';
import { PolygonPoint } from '@/types';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveParcelToVault, getAnalysisById } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

const MapInterface = dynamic(() => import('@/components/MapInterface'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gray-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initializing Map...</p>
            </div>
        </div>
    ),
});

export default function AnalyzePage() {
    const { user } = useAuth();
    const router = useRouter();
    const [currentPolygon, setCurrentPolygon] = useState<PolygonPoint[]>([]);
    const [currentArea, setCurrentArea] = useState(0);
    const [lastResult, setLastResult] = useState<{ report: string, sources: unknown[] } | null>(null);
    const [, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [unit, setUnit] = useState<'m2' | 'ha' | 'sqft' | 'acre' | 'ground' | 'cent'>('ha');

    const [context] = useState({
        goal: 'Build a residential house.',
        features: 'Standard flat terrain.',
        concerns: 'Zoning compliance.'
    });

    const searchParams = useSearchParams();

    // Load data from searchParams or reset if no ID
    useEffect(() => {
        const loadInitialData = async () => {
            const id = searchParams.get('id');
            if (id) {
                setLoading(true);
                try {
                    const analysis = await getAnalysisById(id);
                    if (analysis) {
                        const coords = analysis.coordinates as PolygonPoint[];
                        setCurrentPolygon(coords);
                        setCurrentArea(analysis.areaSqMeters);
                        if (analysis.insights && !analysis.insights.includes('Parcel saved to Land Vault')) {
                            setLastResult({ report: analysis.insights, sources: [] });
                        } else {
                            setLastResult(null);
                        }
                        setSaved(true);
                    }
                } catch (e) {
                    console.error('Failed to load parcel:', e);
                } finally {
                    setLoading(false);
                }
            } else {
                // Pure reset when no ID is present
                setCurrentPolygon([]);
                setCurrentArea(0);
                setLastResult(null);
                setSaved(false);
            }
        };

        loadInitialData();
    }, [searchParams]);

    // Reset saved state when polygon changes
    useEffect(() => {
        setSaved(false);
    }, [currentPolygon]);

    const getRegionInfo = () => {
        if (currentPolygon.length === 0) return { name: 'Karnataka', unit: 'acre' as const };
        const avgLat = currentPolygon.reduce((sum, p) => sum + p.lat, 0) / currentPolygon.length;
        const avgLng = currentPolygon.reduce((sum, p) => sum + p.lng, 0) / currentPolygon.length;

        if (avgLat > 11.8 && avgLat < 13.8 && avgLng > 74.8 && avgLng < 77.75) {
            return { name: 'Karnataka', unit: 'acre' as const };
        }
        if (avgLng < 77.1 && avgLat < 12.7) {
            if (avgLng < 76.8 || (avgLat < 10.3 && avgLng < 77.2)) return { name: 'Kerala', unit: 'cent' as const };
        }
        if (avgLng >= 76.75 && avgLat < 13.5) {
            if (avgLat < 11.9 || avgLng > 77.3) return { name: 'Tamil Nadu', unit: 'ground' as const };
        }
        return { name: 'Karnataka', unit: 'acre' as const };
    };

    // Region detection based on polygon
    const region = getRegionInfo();

    useEffect(() => {
        if (currentPolygon.length > 0) setUnit(region.unit);
    }, [currentPolygon.length, region.unit]);

    const handleSaveToVault = async () => {
        if (!user) {
            router.push('/login');
            return;
        }
        if (currentPolygon.length < 3) return alert('Draw a polygon first');

        setSaving(true);
        try {
            await saveParcelToVault(currentArea, currentPolygon, context);
            setSaved(true);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to save parcel';
            alert(message);
        } finally {
            setSaving(false);
        }
    };

    const formatArea = (overrideUnit?: string) => {
        const activeUnit = overrideUnit || unit;
        if (activeUnit === 'ha') return `${(currentArea / 10000).toFixed(4)} HA`;
        if (activeUnit === 'acre') return `${(currentArea / 4046.86).toFixed(3)} Acre`;
        if (activeUnit === 'ground') return `${(currentArea / 222.97).toFixed(2)} Ground`;
        if (activeUnit === 'cent') return `${(currentArea / 40.47).toFixed(1)} Cent`;
        if (activeUnit === 'sqft') return `${(currentArea * 10.7639).toLocaleString(undefined, { maximumFractionDigits: 0 })} FT²`;
        return `${currentArea.toLocaleString(undefined, { maximumFractionDigits: 0 })} m²`;
    };

    const hasValidPolygon = currentPolygon.length >= 3;

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
            <div className="lg:flex-1 p-3 bg-gray-100 flex flex-col min-h-[400px]">
                <div className="bg-white p-2.5 rounded-t-xl border-x border-t border-gray-200 flex justify-between items-center shadow-sm">
                    <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-2"></span>
                        Geo Analytics Portal
                    </h2>
                    <div className="flex items-center gap-2">
                        {hasValidPolygon && (
                            <button
                                onClick={handleSaveToVault}
                                disabled={saving || saved}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wide transition-all ${saved
                                    ? 'bg-green-50 text-green-600 border border-green-200'
                                    : saving
                                        ? 'bg-gray-100 text-gray-400'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                                    }`}
                            >
                                {saving ? 'Saving...' : saved ? 'Saved to Vault' : 'Save to Vault'}
                            </button>
                        )}
                        {saved && (
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg font-black text-[9px] uppercase tracking-wide hover:bg-black transition-all"
                            >
                                View Vault →
                            </button>
                        )}
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Detected:</span>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase tracking-tighter">{region.name}</span>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative shadow-inner rounded-b-xl border border-gray-200 bg-white">
                    <MapInterface
                        onPolygonChange={setCurrentPolygon}
                        onAreaChange={setCurrentArea}
                        initialPolygon={currentPolygon}
                    />
                </div>
            </div>

            <div className="lg:w-[400px] bg-white border-l border-gray-100 overflow-y-auto flex flex-col scroll-smooth">
                {/* Fixed Top Bar with Centered Land Profile text */}
                <div className="flex border-b border-gray-100 p-1 bg-gray-50/50">
                    <div className="flex-1 py-3 bg-white shadow-sm rounded-lg text-center">
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.15em]">
                            Land Profile
                        </span>
                    </div>
                </div>

                <div className="p-6 flex-1">
                    {!lastResult && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 tracking-tighter">Land Metrics</h3>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">Spatial Dimension Data</p>
                                    </div>
                                    <div className="text-[14px] font-black text-blue-600 tabular-nums bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm shadow-blue-50/50">
                                        {formatArea()}
                                    </div>
                                </div>

                                <div className="mb-8 p-1">
                                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-3 tracking-widest px-1">Measurement System</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['ha', 'm2', 'sqft', region.unit] as const).map((u) => (
                                            <button
                                                key={u}
                                                onClick={() => setUnit(u)}
                                                className={`py-4 px-4 text-[10px] font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-1 shadow-sm ${unit === u ? (u === region.unit ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-900 border-gray-900 text-white') : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                <span className="uppercase tracking-tight">{u === 'ha' ? 'Hectare' : u === 'm2' ? 'Sq. Meters' : u === 'sqft' ? 'Sq. Feet' : u}</span>
                                                {u === region.unit && <span className="text-[7px] opacity-70 uppercase tracking-tighter mt-0.5">{region.name} Area</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <h4 className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Geodetic Summary</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase">Boundary State</span>
                                            <span className="text-[9px] font-black text-gray-900">{region.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase">Primary Metric</span>
                                            <span className="text-[9px] font-black text-gray-900">{formatArea('m2')}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase">Local Equivalent</span>
                                            <span className="text-[9px] font-black text-blue-600">{formatArea(region.unit)}</span>
                                        </div>
                                    </div>
                                </div>

                                {hasValidPolygon && !saved && (
                                    <div className="mt-8 p-5 bg-gradient-to-br from-blue-50 to-white rounded-3xl border border-blue-100 shadow-xl shadow-blue-50/20">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-black text-gray-900 mb-1">Save to Land Vault</h4>
                                                <p className="text-[10px] text-gray-600 mb-3">Save this parcel now and get AI insights later from your dashboard or chat.</p>
                                                <button
                                                    onClick={handleSaveToVault}
                                                    disabled={saving}
                                                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                                                >
                                                    {saving ? 'Saving...' : user ? 'Save Parcel' : 'Login to Save'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {saved && (
                                    <div className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-black text-green-700">Parcel Saved!</h4>
                                                <p className="text-[10px] text-green-600">View it in Land Vault or get AI insights in Chat.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-3">
                                            <button onClick={() => router.push('/dashboard')} className="flex-1 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg font-black text-[9px] uppercase hover:bg-gray-50">
                                                Land Vault
                                            </button>
                                            <button onClick={() => router.push('/chat')} className="flex-1 py-2 bg-gray-900 text-white rounded-lg font-black text-[9px] uppercase hover:bg-black">
                                                AI Chat
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

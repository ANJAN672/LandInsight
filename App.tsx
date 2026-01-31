
import React, { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, UserRole, LandAnalysis, PolygonPoint } from './types';
import { analyzeLandData } from './services/geminiService';
import Navbar from './components/Navbar';
import MapInterface from './components/MapInterface';

const MOCK_USERS: User[] = Array.from({ length: 30 }).map((_, i) => ({
  id: `user-${i + 1}`,
  email: i === 0 ? 'admin@landinsight.in' : `user${i + 1}@gmail.com`,
  role: i === 0 ? UserRole.ADMIN : UserRole.USER,
  name: [`Arjun Reddy`, `Meera Nair`, `Karthik S.`, `Priya Lakshmi`, `Suresh Kumar`][i % 5],
}));

const MOCK_ADMIN = MOCK_USERS[0];
const MOCK_OWNER = MOCK_USERS[1];

// Generate 50 historical analyses across South India for the Heatmap
const MOCK_HISTORICAL_DATA: LandAnalysis[] = Array.from({ length: 50 }).map((_, i) => {
  const isKA = i % 3 === 0;
  const isTN = i % 3 === 1;
  // Lat ranges: KA (12.9), TN (13.0), KL (10.0)
  const baseLat = isKA ? 12.97 : isTN ? 13.08 : 9.93;
  const baseLng = isKA ? 77.59 : isTN ? 80.27 : 76.26;

  return {
    id: `hist-${i}`,
    timestamp: Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30, // Last 30 days
    areaSqMeters: 5000 + Math.random() * 50000,
    coordinates: [
      { lat: baseLat + (Math.random() - 0.5) * 0.1, lng: baseLng + (Math.random() - 0.5) * 0.1 },
      { lat: baseLat + (Math.random() - 0.5) * 0.1, lng: baseLng + (Math.random() - 0.5) * 0.1 },
      { lat: baseLat + (Math.random() - 0.5) * 0.1, lng: baseLng + (Math.random() - 0.5) * 0.1 },
    ],
    context: {
      goal: ['Commercial Warehouse', 'Residential Villa', 'Agricultural Farm'][Math.floor(Math.random() * 3)],
      features: 'Standard terrain.',
      concerns: 'None.'
    },
    insights: 'Historical analysis data point for spatial distribution.'
  };
});

const AdminPortal = ({ analyses }: { analyses: LandAnalysis[] }) => {
  const [view, setView] = useState<'overview' | 'users' | 'activity'>('overview');

  const totalArea = analyses.reduce((sum, a) => sum + (a.areaSqMeters / 10000), 0);

  // Data-driven regional clusters (Mock aggregation for display)
  const clusters = [
    { name: 'Bangalore', count: 18, color: 'bg-blue-600', ha: '240.5' },
    { name: 'Chennai', count: 12, color: 'bg-orange-500', ha: '110.2' },
    { name: 'Kochi', count: 20, color: 'bg-green-500', ha: '95.8' },
  ];

  // Heatmap: Land Parcel Size Distribution by Region
  const sizeCategories = ['< 0.5 HA', '0.5-2 HA', '> 2 HA'];
  const regions = ['Bangalore', 'Chennai', 'Kochi'];

  const getHeatmapData = () => {
    // Initialize 3x3 grid [region][size]
    const grid = regions.map(() => sizeCategories.map(() => 0));

    // Calculate total area per cell for intensity
    const areaGrid = regions.map(() => sizeCategories.map(() => 0));

    analyses.forEach(a => {
      // Determine Region based on longitude
      const lng = a.coordinates[0]?.lng || 77.5;
      let rIndex = 0;
      if (lng > 79) rIndex = 1;      // Chennai (east)
      else if (lng < 77) rIndex = 2; // Kochi (west)
      else rIndex = 0;               // Bangalore (center)

      // Determine Size Category (in hectares)
      const ha = a.areaSqMeters / 10000;
      let sIndex = 0;
      if (ha < 0.5) sIndex = 0;
      else if (ha <= 2) sIndex = 1;
      else sIndex = 2;

      grid[rIndex][sIndex]++;
      areaGrid[rIndex][sIndex] += ha;
    });

    return { counts: grid, areas: areaGrid };
  };

  const heatmapData = getHeatmapData();
  const maxCount = Math.max(...heatmapData.counts.flat(), 1);

  // Python seaborn-style color scale (blues)
  const getCellStyle = (count: number) => {
    const intensity = count / maxCount;
    // Gradient from light blue to dark blue
    const opacity = 0.15 + (intensity * 0.85);
    const bgColor = intensity < 0.3
      ? `rgba(59, 130, 246, ${opacity})`
      : intensity < 0.6
        ? `rgba(37, 99, 235, ${opacity})`
        : `rgba(29, 78, 216, ${opacity})`;
    return { backgroundColor: bgColor };
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Command Center</h2>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-1">Global Spatial Oversight Platform</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
          {(['overview', 'users', 'activity'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === v ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Spatial Coverage', val: `${totalArea.toFixed(1)} HA`, sub: 'Total area analyzed globally', color: 'text-blue-600' },
              { label: 'Platform Reach', val: `${MOCK_USERS.length} Members`, sub: 'Registered professionals', color: 'text-orange-500' },
              { label: 'Intelligence Feed', val: `${analyses.length} Reports`, sub: 'Active spatial insights', color: 'text-green-500' }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group cursor-default">
                <span className={`text-[8px] font-black ${stat.color} uppercase tracking-widest mb-4 block`}>{stat.label}</span>
                <div className="text-4xl font-black text-gray-900 tracking-tighter mb-2">{stat.val}</div>
                <p className="text-[10px] text-gray-400 font-bold italic leading-relaxed">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Heatmap Card */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-lg font-black text-gray-900 tracking-tight">Parcel Size Distribution</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">by Region (count of analyses)</p>
                </div>
                {/* Gradient Legend */}
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold text-gray-400 uppercase">Low</span>
                  <div className="flex h-3 rounded overflow-hidden">
                    <div className="w-6" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}></div>
                    <div className="w-6" style={{ backgroundColor: 'rgba(59, 130, 246, 0.5)' }}></div>
                    <div className="w-6" style={{ backgroundColor: 'rgba(29, 78, 216, 0.9)' }}></div>
                  </div>
                  <span className="text-[8px] font-bold text-gray-400 uppercase">High</span>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="mt-4">
                {/* Header Row */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div></div>
                  {sizeCategories.map((cat) => (
                    <div key={cat} className="text-center text-[10px] font-black text-gray-500 uppercase py-2">{cat}</div>
                  ))}
                </div>

                {/* Data Rows */}
                {regions.map((region, rIndex) => (
                  <div key={region} className="grid grid-cols-4 gap-2 mb-2">
                    <div className="flex items-center justify-end pr-4">
                      <span className="text-[11px] font-black text-gray-600 uppercase">{region}</span>
                    </div>
                    {sizeCategories.map((_, sIndex) => {
                      const count = heatmapData.counts[rIndex][sIndex];
                      const totalHa = heatmapData.areas[rIndex][sIndex];
                      return (
                        <div
                          key={sIndex}
                          className="h-20 rounded-lg flex flex-col items-center justify-center cursor-default group relative transition-transform hover:scale-[1.02]"
                          style={getCellStyle(count)}
                        >
                          <span className="text-2xl font-black text-white drop-shadow-sm">{count}</span>
                          <span className="text-[9px] font-bold text-white/80">{totalHa.toFixed(1)} HA</span>

                          {/* Tooltip */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[9px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap z-20 transition-opacity pointer-events-none shadow-lg">
                            {region} • {sizeCategories[sIndex]} • {count} parcels
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between text-[10px] text-gray-400 font-bold">
                <span>Total Parcels: {analyses.length}</span>
                <span>Data from last 30 days</span>
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 border border-gray-100 flex flex-col shadow-sm">
              <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-8 border-b border-gray-50 pb-4">Regional Summary</h4>
              <div className="space-y-6 flex-1">
                {clusters.map((c, i) => (
                  <div key={i} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${c.color} shadow-lg shadow-current/20`}></div>
                      <div>
                        <div className="text-[11px] font-black text-gray-800">{c.name}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{c.ha} HA Total</div>
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-gray-300">#{i + 1}</div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-50">
                <p className="text-[9px] text-gray-400 leading-relaxed font-bold italic">"Medium-sized parcels (0.5-2 HA) are most common across all regions."</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'users' && (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tighter">Verified Professionals</h3>
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Directory of active platform members</p>
            </div>
            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 uppercase tracking-widest">{MOCK_USERS.length} Total</span>
          </div>
          <div className="overflow-x-auto px-4">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-6 py-5 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] text-center w-20">Identity</th>
                  <th className="px-6 py-5 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Full Name</th>
                  <th className="px-6 py-5 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Email</th>
                  <th className="px-6 py-5 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Role</th>
                  <th className="px-6 py-5 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MOCK_USERS.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/30 transition-all group">
                    <td className="px-6 py-6 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg mx-auto">
                        {u.name?.charAt(0)}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="text-[12px] font-black text-gray-900">{u.name}</div>
                      <div className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">ID: {u.id}</div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="text-[11px] font-bold text-gray-500 lowercase">{u.email}</div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={`text-[8px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-blue-600/10 text-blue-600 border border-blue-100' : 'bg-gray-100 text-gray-500'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 px-4">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-[9px] font-black text-gray-900 uppercase">Active</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'activity' && (
        <div className="space-y-4">
          <div className="grid gap-4 px-2">
            {analyses.slice(0, 15).map((a) => (
              <div key={a.id} className="bg-white p-8 rounded-[24px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 hover:border-blue-200 hover:shadow-xl transition-all group">
                <div className="flex-1">
                  <div className="flex items-center gap-5 mb-4">
                    <span className="text-[10px] font-black text-gray-400 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg tabular-nums">
                      {new Date(a.timestamp).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100">
                      {(a.areaSqMeters / 10000).toFixed(4)} HA
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-gray-900 mb-2 tracking-tighter">"{a.context?.goal}"</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{a.id}</span>
                    <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                    <span className="text-[10px] font-black text-gray-300 italic">South India Cluster</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button className="px-8 py-3.5 text-[10px] font-black bg-gray-900 text-white rounded-2xl hover:bg-black transition-all uppercase tracking-widest shadow-lg shadow-gray-200 active:scale-95">View Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (role: UserRole) => void }) => (
  <div className="max-w-md mx-auto py-16 px-6">
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 text-center">
      <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tighter">Access Portal</h2>
      <p className="text-[9px] text-gray-400 mb-6 font-black uppercase tracking-[0.2em]">India Prop-Tech Dashboard</p>
      <div className="space-y-3">
        <button
          onClick={() => onLogin(UserRole.USER)}
          className="w-full py-3 px-4 bg-blue-600 text-white text-[11px] font-black rounded-lg hover:bg-blue-700 transition-all flex items-center justify-between group shadow-lg shadow-blue-50"
        >
          <span>Land Owner Portal</span>
          <span>&rarr;</span>
        </button>
        <button
          onClick={() => onLogin(UserRole.ADMIN)}
          className="w-full py-3 px-4 bg-gray-900 text-white text-[11px] font-black rounded-lg hover:bg-gray-800 transition-all flex items-center justify-between group"
        >
          <span>Administrator</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  </div>
);

const MapAnalyzerPage = ({ onSaveAnalysis }: { onSaveAnalysis: (a: LandAnalysis) => void }) => {
  const [currentPolygon, setCurrentPolygon] = useState<PolygonPoint[]>(() => {
    const saved = localStorage.getItem('land_draft_polygon');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentArea, setCurrentArea] = useState(() => {
    const saved = localStorage.getItem('land_draft_area');
    return saved ? Number(saved) : 0;
  });
  const [lastResult, setLastResult] = useState<{ report: string, sources: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [unit, setUnit] = useState<'m2' | 'ha' | 'sqft' | 'acre' | 'ground' | 'cent'>('ha');
  const [activeTab, setActiveTab] = useState<'profile' | 'insights'>('profile');

  const [context, setContext] = useState({
    goal: 'Build a residential house.',
    features: 'Standard flat terrain.',
    concerns: 'Zoning compliance.'
  });

  const getRegionInfo = () => {
    if (currentPolygon.length === 0) return { name: 'Karnataka', unit: 'acre' as const };
    const avgLat = currentPolygon.reduce((sum, p) => sum + p.lat, 0) / currentPolygon.length;
    const avgLng = currentPolygon.reduce((sum, p) => sum + p.lng, 0) / currentPolygon.length;

    // 0. KARNATAKA HEARTLAND (Bangalore, Mysore, Coorg, Hassan)
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

  const region = getRegionInfo();

  useEffect(() => {
    if (currentPolygon.length > 0) {
      setUnit(region.unit);
    }
  }, [region.name]);

  useEffect(() => {
    localStorage.setItem('land_draft_polygon', JSON.stringify(currentPolygon));
    localStorage.setItem('land_draft_area', currentArea.toString());
  }, [currentPolygon, currentArea]);

  const handleGenerate = async () => {
    if (currentPolygon.length < 3) return alert('Boundary Required');
    setLoading(true);
    setLastResult(null);
    try {
      const result = await analyzeLandData(currentArea, currentPolygon, context);
      const analysis: LandAnalysis = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        areaSqMeters: currentArea,
        coordinates: currentPolygon,
        context: { ...context },
        insights: result.report
      };
      onSaveAnalysis(analysis);
      setLastResult(result);
    } catch (e: any) {
      alert(e.message || 'Analysis failed. Please check your boundary and try again.');
    } finally {
      setLoading(false);
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

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
      <div className="lg:flex-1 p-3 bg-gray-100 flex flex-col min-h-[400px]">
        <div className="bg-white p-2.5 rounded-t-xl border-x border-t border-gray-200 flex justify-between items-center shadow-sm">
          <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-2"></span>
            Geo Analytics Portal
          </h2>
          <div className="flex items-center gap-2">
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
        <div className="flex border-b border-gray-100 p-1 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${activeTab === 'profile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Land Profile
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${activeTab === 'insights' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Insights & Settings
          </button>
        </div>
        <div className="p-6 flex-1">
          {!lastResult && activeTab === 'profile' && (
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
                    <button onClick={() => setUnit('ha')} className={`py-4 px-4 text-[10px] font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-1 shadow-sm ${unit === 'ha' ? 'bg-gray-900 border-gray-900 text-white shadow-gray-200' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}>
                      <span className="uppercase tracking-tight">Hectare</span>
                    </button>
                    <button onClick={() => setUnit('m2')} className={`py-4 px-4 text-[10px] font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-1 shadow-sm ${unit === 'm2' ? 'bg-gray-900 border-gray-900 text-white shadow-gray-200' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}>
                      <span className="uppercase tracking-tight">Sq. Meters</span>
                    </button>
                    <button onClick={() => setUnit('sqft')} className={`py-4 px-4 text-[10px] font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-1 shadow-sm ${unit === 'sqft' ? 'bg-gray-900 border-gray-900 text-white shadow-gray-200' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'}`}>
                      <span className="uppercase tracking-tight">Sq. Feet</span>
                    </button>
                    <button onClick={() => setUnit(region.unit)} className={`py-4 px-4 text-[10px] font-black rounded-xl border transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden shadow-sm ${unit === region.unit ? 'bg-blue-600 border-blue-600 text-white shadow-blue-100' : 'bg-blue-50/50 border-blue-100 text-blue-600 hover:border-blue-200 hover:bg-blue-50'}`}>
                      <div className="relative z-10 flex flex-col items-center">
                        <span className="uppercase tracking-tight font-black">{region.unit}</span>
                        <span className="text-[7px] opacity-70 uppercase tracking-tighter mt-0.5">{region.name} Area</span>
                      </div>
                      <div className="absolute top-0 right-0 p-1.5 opacity-40">
                        <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                      </div>
                    </button>
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
              </div>
            </div>
          )}

          {!lastResult && activeTab === 'insights' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-0.5 tracking-tighter">Analysis Configuration</h3>
                <p className="text-[9px] text-gray-400 mb-5 font-bold uppercase tracking-widest italic">Define Analysis Goal</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Objective</label>
                    <input type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-100 outline-none" value={context.goal} onChange={(e) => setContext({ ...context, goal: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Environment</label>
                    <textarea className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold h-20 resize-none focus:ring-1 focus:ring-blue-100 outline-none" value={context.features} onChange={(e) => setContext({ ...context, features: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Concerns</label>
                    <input type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-100 outline-none" value={context.concerns} onChange={(e) => setContext({ ...context, concerns: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50 flex flex-col items-center">
                <button
                  disabled={currentPolygon.length < 3 || loading}
                  onClick={handleGenerate}
                  className={`w-full py-3.5 rounded-xl font-black shadow-lg transition-all text-[10px] tracking-widest uppercase ${currentPolygon.length < 3 || loading ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black active:scale-[0.98]'}`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      <span>Processing...</span>
                    </div>
                  ) : 'Execute Analysis'}
                </button>
                {currentPolygon.length < 3 && <p className="mt-3 text-[8px] font-black text-blue-600 uppercase tracking-widest">Boundary Required</p>}
              </div>
            </div>
          )}

          {lastResult && (
            <div className="space-y-6 pb-10">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <h2 className="text-lg font-black text-gray-900 tracking-tighter">Insights Report</h2>
                <button onClick={() => setLastResult(null)} className="text-[8px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 uppercase tracking-widest">Perform New Analysis</button>
              </div>
              <div className="bg-white border-2 border-gray-900 p-5 rounded-xl shadow-sm overflow-hidden">
                <div className="whitespace-pre-wrap text-[11px] leading-relaxed font-bold text-gray-900 prose prose-xs max-w-none">
                  {lastResult.report}
                </div>
              </div>
              <section>
                <h4 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Grounded Sources
                </h4>
                <div className="space-y-2">
                  {lastResult.sources.length > 0 ? lastResult.sources.map((src, i) => (
                    <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="block p-3 bg-gray-50 border border-gray-100 rounded-lg text-[10px] hover:border-blue-400 transition-all group">
                      <div className="font-black text-gray-900 truncate group-hover:text-blue-600">{src.title}</div>
                      <div className="text-[8px] text-gray-400 truncate mt-0.5 italic">{src.uri}</div>
                    </a>
                  )) : (
                    <p className="text-[8px] font-black text-gray-300 italic">No external sources cited.</p>
                  )}
                </div>
              </section>
              <button
                onClick={() => setLastResult(null)}
                className="w-full py-3 border-2 border-gray-900 text-gray-900 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-gray-50 transition-all"
              >
                Reset Configuration
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserDashboard = ({ analyses, userId }: { analyses: LandAnalysis[], userId: string }) => {
  const myAnalyses = analyses.filter(a => !a.id.startsWith('hist-'));
  return <div className="max-w-4xl mx-auto py-12 px-6">
    <div className="mb-10">
      <h2 className="text-3xl font-black text-gray-900 tracking-tighter">My Land Vault</h2>
      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-1">Your Stored Spatial Insights</p>
    </div>

    {myAnalyses.length === 0 ? (
      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-8">No analysis sessions found in your vault.</p>
        <Link to="/analyze" className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all inline-block">Execute First Analysis</Link>
      </div>
    ) : (
      <div className="grid gap-4">
        {myAnalyses.map(a => (
          <div key={a.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
            <div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{new Date(a.timestamp).toLocaleDateString()}</div>
              <h4 className="text-sm font-black text-gray-900 leading-tight">"{a.context?.goal}"</h4>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-2 inline-block">{(a.areaSqMeters / 10000).toFixed(4)} HA</span>
            </div>
            <Link to="/analyze" className="px-5 py-2 text-[9px] font-black bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all uppercase tracking-widest">Open Map</Link>
          </div>
        ))}
      </div>
    )}
  </div>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<LandAnalysis[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('land_analyses');
    if (saved) {
      setAnalyses(JSON.parse(saved));
    } else {
      setAnalyses(MOCK_HISTORICAL_DATA);
      localStorage.setItem('land_analyses', JSON.stringify(MOCK_HISTORICAL_DATA));
    }

    const session = localStorage.getItem('user_session');
    if (session) setUser(JSON.parse(session));
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user_session');
  };

  const handleLogin = (role: UserRole) => {
    const u = role === UserRole.ADMIN ? MOCK_ADMIN : MOCK_OWNER;
    setUser(u);
    localStorage.setItem('user_session', JSON.stringify(u));
  };

  const saveAnalysis = (newAnalysis: LandAnalysis) => {
    const updated = [newAnalysis, ...analyses];
    setAnalyses(updated);
    localStorage.setItem('land_analyses', JSON.stringify(updated));
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={
              <div className="max-w-2xl mx-auto py-24 px-6 text-center">
                <span className="text-[8px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-full uppercase tracking-[0.3em] mb-6 inline-block">Spatial Intelligence</span>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">Land Insight.</h1>
                <p className="text-sm text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed font-bold italic">Precise land metrics and grounded spatial valuation for the Indian landscape.</p>
                <div className="flex justify-center items-center gap-4">
                  <Link to="/analyze" className="px-8 py-3 bg-gray-900 text-white rounded-lg text-[10px] font-black shadow-lg hover:bg-black transition-all uppercase tracking-widest">Start Mapping</Link>
                  <Link to="/login" className="px-8 py-3 bg-white text-gray-900 border border-gray-100 rounded-lg text-[10px] font-black shadow hover:bg-gray-50 transition-all uppercase tracking-widest">Sign In</Link>
                </div>
              </div>
            } />
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />} />
            <Route path="/analyze" element={<MapAnalyzerPage onSaveAnalysis={saveAnalysis} />} />
            <Route path="/dashboard" element={
              user ? (
                user.role === UserRole.ADMIN ? <AdminPortal analyses={analyses} /> : <UserDashboard analyses={analyses} userId={user.id} />
              ) : (
                <Navigate to="/login" />
              )
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;

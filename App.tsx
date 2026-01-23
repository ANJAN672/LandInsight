
import React, { useState, useEffect } from 'react';
import { MemoryRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, UserRole, LandAnalysis, PolygonPoint } from './types';
import { analyzeLandData } from './services/geminiService';
import Navbar from './components/Navbar';
import MapInterface from './components/MapInterface';

const MOCK_OWNER: User = { id: 'owner-1', email: 'owner@landinsight.in', role: UserRole.USER };
const MOCK_ADMIN: User = { id: 'admin-1', email: 'admin@landinsight.in', role: UserRole.ADMIN };

const AdminPortal = ({ analyses }: { analyses: LandAnalysis[] }) => (
  <div className="max-w-4xl mx-auto py-12 px-6">
    <div className="flex justify-between items-center mb-10">
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Land Registry</h2>
        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">Stored Analysis Sessions</p>
      </div>
    </div>
    
    {analyses.length === 0 ? (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No records found</p>
        <Link to="/analyze" className="text-blue-600 text-[10px] font-black uppercase mt-4 inline-block hover:underline">Start First Analysis &rarr;</Link>
      </div>
    ) : (
      <div className="grid gap-4">
        {analyses.map((a) => (
          <div key={a.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-black text-gray-900">{new Date(a.timestamp).toLocaleDateString()}</span>
                <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-widest">{(a.areaSqMeters / 10000).toFixed(4)} HA</span>
              </div>
              <h4 className="text-[11px] font-bold text-gray-500 italic mb-1 line-clamp-1">"{a.context?.goal}"</h4>
              <p className="text-[9px] text-gray-400 font-medium">Ref ID: {a.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/analyze" className="px-4 py-2 text-[9px] font-black bg-gray-50 text-gray-900 rounded-lg hover:bg-gray-100 uppercase tracking-widest border border-gray-100 text-center">View Map</Link>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

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
  const [unit, setUnit] = useState<'m2' | 'ha' | 'sqft'>('ha');
  
  const [context, setContext] = useState({ 
    goal: 'Build a residential house.', 
    features: 'Standard flat terrain.', 
    concerns: 'Zoning compliance.' 
  });

  useEffect(() => {
    localStorage.setItem('land_draft_polygon', JSON.stringify(currentPolygon));
    localStorage.setItem('land_draft_area', currentArea.toString());
  }, [currentPolygon, currentArea]);

  const handleGenerate = async () => {
    if (currentPolygon.length < 3) return alert('Boundary Required');
    setLoading(true);
    setLastResult(null); // Clear previous result to show processing state properly
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

  const formatArea = () => {
    if (unit === 'ha') return `${(currentArea / 10000).toFixed(4)} HA`;
    if (unit === 'sqft') return `${(currentArea * 10.7639).toLocaleString(undefined, { maximumFractionDigits: 0 })} FT²`;
    return `${currentArea.toLocaleString(undefined, { maximumFractionDigits: 0 })} m²`;
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-73px)]">
      {/* Map Section */}
      <div className="lg:flex-1 p-3 bg-gray-100 flex flex-col min-h-[400px]">
        <div className="bg-white p-2.5 rounded-t-xl border-x border-t border-gray-200 flex justify-between items-center shadow-sm">
          <h2 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-2"></span>
            Geo Analytics Portal
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button onClick={() => setUnit('m2')} className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${unit === 'm2' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>m²</button>
              <button onClick={() => setUnit('sqft')} className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${unit === 'sqft' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>FT²</button>
              <button onClick={() => setUnit('ha')} className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${unit === 'ha' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>HA</button>
            </div>
            <div className="text-[10px] font-black text-blue-600 tabular-nums bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 min-w-[80px] text-center">{formatArea()}</div>
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

      {/* Control Panel Section */}
      <div className="lg:w-[400px] bg-white border-l border-gray-100 overflow-y-auto p-6 scroll-smooth">
        {!lastResult ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-0.5 tracking-tighter">Land Profile</h3>
              <p className="text-[9px] text-gray-400 mb-5 font-bold uppercase tracking-widest italic">Configuration Parameters</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Objective</label>
                  <input type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-100 outline-none" value={context.goal} onChange={(e) => setContext({...context, goal: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Environment</label>
                  <textarea className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold h-20 resize-none focus:ring-1 focus:ring-blue-100 outline-none" value={context.features} onChange={(e) => setContext({...context, features: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5 tracking-widest">Concerns</label>
                  <input type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-[11px] font-bold focus:ring-1 focus:ring-blue-100 outline-none" value={context.concerns} onChange={(e) => setContext({...context, concerns: e.target.value})} />
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
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h2 className="text-lg font-black text-gray-900 tracking-tighter">Insights Report</h2>
              <button onClick={() => setLastResult(null)} className="text-[8px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 uppercase tracking-widest">Edit Area</button>
            </div>
            
            {/* Minimal High-Contrast Insight Box */}
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
              Perform New Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [analyses, setAnalyses] = useState<LandAnalysis[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('land_analyses');
    if (saved) setAnalyses(JSON.parse(saved));
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
            <Route path="/login" element={user ? <Navigate to="/analyze" /> : <LoginPage onLogin={handleLogin} />} />
            <Route path="/analyze" element={<MapAnalyzerPage onSaveAnalysis={saveAnalysis} />} />
            <Route path="/dashboard" element={<AdminPortal analyses={analyses} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;

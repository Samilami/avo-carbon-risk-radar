
import React, { useState, useEffect } from 'react';
import { AppState, RiskReport, RiskLevel } from './types';
import { streamRiskAnalysis, fetchCommodityHistory } from './services/geminiService';
import { Card, NavButton } from './components/Components';
import { DashboardView } from './views/DashboardView';

// Icons
const Icons = {
  Dashboard: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  SupplyChain: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
  Market: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>,
  Governance: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  Refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Logout: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
};

// Import local logo
import avoLogo from './avocarbon_logo.png';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    activeView: 'dashboard',
    reports: [],
    history: { copper: [], electricity: [] },
    isLoading: false,
    apiKey: localStorage.getItem('gemini_api_key') || process.env.API_KEY || null
  });

  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [inputKey, setInputKey] = useState('');

  const handleSaveKey = () => {
    if (inputKey.trim()) {
      const key = inputKey.trim();
      localStorage.setItem('gemini_api_key', key);
      setState(prev => ({ ...prev, apiKey: key }));
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setState(prev => ({ ...prev, apiKey: null, reports: [], history: { copper: [], electricity: [] } }));
  };

  const handleRefresh = async () => {
    if (!state.apiKey) return;

    // Clear old reports to start fresh and show loading state
    setState(prev => ({ ...prev, reports: [], isLoading: true }));
    
    try {
      // 1. Stream textual reports (One by one update)
      await streamRiskAnalysis(state.apiKey, (newReport) => {
        setState(prev => ({ ...prev, reports: [...prev.reports, newReport] }));
      });

      // 2. Fetch history data
      // MAJOR COOL-DOWN: Wait 20 seconds before hitting the API again for history
      // This resets the quota window.
      await new Promise(r => setTimeout(r, 20000)); 

      const copperData = await fetchCommodityHistory(state.apiKey, "Kupferpreis (LME)");
      setState(prev => ({ ...prev, history: { ...prev.history, copper: copperData }}));
      
      await new Promise(r => setTimeout(r, 10000)); // 10s delay between history items
      
      const electricityData = await fetchCommodityHistory(state.apiKey, "Industriestrompreis Deutschland");
      setState(prev => ({ 
        ...prev, 
        history: { ...prev.history, electricity: electricityData },
        isLoading: false 
      }));
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Fatal refresh error:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Auto-load on mount if key exists
  useEffect(() => {
    if (state.apiKey && state.reports.length === 0) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.apiKey]);

  const filterReports = () => {
    if (state.activeView === 'dashboard') return state.reports;
    
    // Supply Chain: Logistics, Traffic, Weather
    if (state.activeView === 'supply_chain') {
      return state.reports.filter(r => ['Logistik', 'Verkehr', 'Wetter'].includes(r.category));
    }
    
    // Market: Customers, Economy, Energy, Raw Materials
    if (state.activeView === 'market') {
      return state.reports.filter(r => ['Kunden', 'Wirtschaft', 'Energie', 'Rohstoffe'].includes(r.category));
    }
    
    // Governance: Politics, Holidays
    if (state.activeView === 'governance') {
      return state.reports.filter(r => ['Politik', 'Feiertage'].includes(r.category));
    }
    
    return state.reports;
  };

  const getHeaderTitle = () => {
    switch (state.activeView) {
      case 'dashboard': return 'Executive Dashboard';
      case 'supply_chain': return 'Logistik, Verkehr & Wetter';
      case 'market': return 'Markt, Kunden & Rohstoffe';
      case 'governance': return 'Politik & Globale Ereignisse';
      default: return 'Dashboard';
    }
  };

  // Render Login Screen if no API Key
  if (!state.apiKey) {
    return (
      <div className="flex min-h-screen bg-slate-950 items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <img
                src={avoLogo}
                alt="Avo Carbon"
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white text-center mb-2">Risk Radar Setup</h2>
          <p className="text-slate-400 text-center mb-8">Bitte geben Sie Ihren Gemini API Key ein, um zu starten.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gemini API Key</label>
              <input 
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-avo-500 focus:ring-1 focus:ring-avo-500 outline-none transition-all placeholder-slate-600"
              />
            </div>
            
            <button 
              onClick={handleSaveKey}
              disabled={!inputKey}
              className="w-full bg-avo-600 hover:bg-avo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-avo-900/50"
            >
              Verbinden & Dashboard Starten
            </button>
          </div>

          <div className="mt-8 text-center">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-avo-500 hover:text-avo-400 underline">
              Keinen Key? Hier erstellen &rarr;
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10 flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="mb-4 bg-white p-3 rounded-lg shadow-md flex items-center justify-center h-20 w-full">
               <img
                 src={avoLogo}
                 alt="Avo Carbon"
                 className="h-full w-auto object-contain"
               />
          </div>
          <div className="flex items-center gap-2 text-avo-500 font-bold text-lg tracking-tight">
             <div className="w-2 h-2 rounded-full bg-avo-500"></div>
             RISK RADAR
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-4">Germany Executive View</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavButton 
            active={state.activeView === 'dashboard'} 
            label="Übersicht" 
            icon={Icons.Dashboard} 
            onClick={() => setState(prev => ({ ...prev, activeView: 'dashboard' }))} 
          />
          
          <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Kategorien
          </div>

          <NavButton 
            active={state.activeView === 'supply_chain'} 
            label="Supply Chain" 
            icon={Icons.SupplyChain} 
            onClick={() => setState(prev => ({ ...prev, activeView: 'supply_chain' }))} 
          />
          <NavButton 
            active={state.activeView === 'market'} 
            label="Markt & Kunden" 
            icon={Icons.Market} 
            onClick={() => setState(prev => ({ ...prev, activeView: 'market' }))} 
          />
          <NavButton 
            active={state.activeView === 'governance'} 
            label="Global" 
            icon={Icons.Governance} 
            onClick={() => setState(prev => ({ ...prev, activeView: 'governance' }))} 
          />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
            <p className="text-xs text-slate-500 mb-1">Datenstatus</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${state.isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-xs text-slate-300">
                {state.isLoading ? 'Live-Update...' : lastUpdate ? lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Bereit'}
              </span>
            </div>
          </div>
          <button 
            onClick={handleClearKey}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            {Icons.Logout}
            Key zurücksetzen
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-6 flex justify-between items-center z-10 sticky top-0">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-white">{getHeaderTitle()}</h1>
              <p className="text-sm text-slate-400 mt-1">Live Intelligence für kritisches Risikomanagement</p>
            </div>
          </div>
          
          <button 
            onClick={handleRefresh}
            disabled={state.isLoading}
            className={`flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium transition-colors ${state.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className={state.isLoading ? 'animate-spin' : ''}>{Icons.Refresh}</span>
            {state.isLoading ? 'Wird aktualisiert...' : 'Analyse aktualisieren'}
          </button>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-6 pb-20 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <DashboardView 
              reports={filterReports()} 
              history={state.history}
              isLoading={state.isLoading && state.reports.length === 0} 
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;


import React from 'react';
import { RiskReportCard, KpiCard, Card, SimpleLineChart } from '../components/Components';
import { RiskReport, RiskLevel, CommodityHistory } from '../types';

interface DashboardViewProps {
  reports: RiskReport[];
  history: CommodityHistory;
  isLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ reports, history, isLoading }) => {
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 animate-pulse">
        <div className="w-16 h-16 border-4 border-avo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-medium text-slate-300">Analysiere globale Risiken...</p>
        <p className="text-sm text-slate-500 mt-2">Verarbeite Markt-, Wetter- und Logistikdaten</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <svg className="w-16 h-16 mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <p className="text-lg">Keine Berichte vorhanden.</p>
        <p className="text-sm mt-2">Bitte API Key konfigurieren oder aktualisieren.</p>
      </div>
    );
  }

  // Stats calculation
  const highRisks = reports.filter(r => r.level === RiskLevel.HIGH || r.level === RiskLevel.CRITICAL);
  const criticalCount = reports.filter(r => r.level === RiskLevel.CRITICAL).length;
  const highCount = reports.filter(r => r.level === RiskLevel.HIGH).length;
  
  let globalStatus: 'good' | 'warning' | 'danger' = 'good';
  if (highCount > 0) globalStatus = 'warning';
  if (criticalCount > 0) globalStatus = 'danger';

  // Identify specific reports for the "Commodity Watch" section
  const energyReport = reports.find(r => r.category === 'Energie');
  const rawMaterialReport = reports.find(r => r.category === 'Rohstoffe');

  // Determine if we should show the specific commodity section
  const showCommoditySection = !!energyReport || !!rawMaterialReport;

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 1. Top Row: KPI Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard 
          title="Global Risk Status" 
          value={globalStatus === 'good' ? 'Stabil' : globalStatus === 'warning' ? 'Erhöht' : 'Kritisch'} 
          subtext="Gesamtbewertung aller Sektoren"
          status={globalStatus}
        />
        <KpiCard 
          title="Aktive Warnungen" 
          value={`${highRisks.length}`} 
          subtext={highRisks.length === 1 ? "1 Kritischer Bereich" : `${highRisks.length} Kritische Bereiche`}
          status={highRisks.length > 0 ? 'danger' : 'good'}
        />
        <KpiCard 
          title="Überwachte Entitäten" 
          value="24+" 
          subtext="Länder, Häfen, Kunden"
          status="neutral"
        />
        <KpiCard 
          title="Hauptsitz Frankfurt" 
          value="Betrieb Normal" 
          subtext="Keine lokalen Extremereignisse"
          status="good"
        />
      </div>

      {/* 2. Commodity & Energy Watch (Conditional: Only if data present) */}
      {showCommoditySection && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">Rohstoffe & Energiemarkt</h2>
            <div className="h-px bg-slate-800 flex-grow"></div>
            <span className="text-xs text-slate-500 uppercase font-semibold">Preistrends (6 Monate)</span>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <Card className="xl:col-span-1 flex flex-col justify-center">
              <SimpleLineChart data={history.copper} color="#d97706" title="Kupfer (LME) Entwicklung" />
            </Card>
            <Card className="xl:col-span-1 flex flex-col justify-center">
              <SimpleLineChart data={history.electricity} color="#3b82f6" title="Strompreis (DE) Entwicklung" />
            </Card>
            <Card className="xl:col-span-1 flex flex-col justify-center">
              <SimpleLineChart data={history.graphite} color="#8b5cf6" title="Graphit Preisentwicklung" />
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <Card className="flex flex-col justify-center">
              <SimpleLineChart data={history.transportCost} color="#10b981" title="LKW Transportkosten (EUR/km)" />
            </Card>
            <Card className="flex flex-col justify-center bg-slate-800/50 border-dashed border-slate-700">
              <div className="text-center py-8">
                <h4 className="text-sm font-bold text-slate-400 mb-2">Weitere Metriken</h4>
                <p className="text-xs text-slate-500">Zusätzliche Daten werden in zukünftigen Updates verfügbar sein</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rawMaterialReport && (
              <RiskReportCard report={rawMaterialReport} highlighted={true} />
            )}
            {energyReport && (
              <RiskReportCard report={energyReport} highlighted={true} />
            )}
          </div>
        </div>
      )}

      {/* 3. Priority Alerts Section */}
      {highRisks.length > 0 && (
        <div>
           <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <h2 className="text-lg font-bold text-red-400 tracking-tight">Kritische Warnungen</h2>
            <div className="h-px bg-red-900/30 flex-grow"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {highRisks.map(report => (
              // Don't duplicate if they are already shown in Commodities section
              (report.id !== rawMaterialReport?.id && report.id !== energyReport?.id) && 
              <RiskReportCard key={report.id} report={report} />
            ))}
          </div>
        </div>
      )}

      {/* 4. General Reports Grid (excluding what's already shown above) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-slate-300 tracking-tight">Sektor-Analyse</h2>
          <div className="h-px bg-slate-800 flex-grow"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {reports
            .filter(r => r.level !== RiskLevel.HIGH && r.level !== RiskLevel.CRITICAL) // Filter out high risks shown above
            .filter(r => r.id !== rawMaterialReport?.id && r.id !== energyReport?.id) // Filter out commodities shown above
            .map(report => (
              <RiskReportCard key={report.id} report={report} />
            ))
          }
        </div>
      </div>

    </div>
  );
};
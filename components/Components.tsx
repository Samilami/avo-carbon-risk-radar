
import React from 'react';
import { RiskLevel, RiskReport, HistoryDataPoint } from '../types';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6 ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const colors = {
    [RiskLevel.LOW]: 'bg-green-500/20 text-green-400 border-green-500/50',
    [RiskLevel.MEDIUM]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    [RiskLevel.HIGH]: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    [RiskLevel.CRITICAL]: 'bg-red-500/20 text-red-400 border-red-500/50',
    [RiskLevel.UNKNOWN]: 'bg-slate-500/20 text-slate-400 border-slate-500/50',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[level]}`}>
      {level === RiskLevel.UNKNOWN ? 'UNBEKANNT' : level}
    </span>
  );
};

export const TrendIndicator: React.FC<{ text: string }> = ({ text }) => {
  const lower = text.toLowerCase();
  const isRising = lower.includes('trend: steigend') || lower.includes('trend: rising');
  const isFalling = lower.includes('trend: fallend') || lower.includes('trend: falling');
  const isStable = lower.includes('trend: stabil') || lower.includes('trend: stable');

  if (!isRising && !isFalling && !isStable) return null;

  if (isRising) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 ml-2 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
      STEIGEND
    </span>
  );

  if (isFalling) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 ml-2 rounded bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
      FALLEND
    </span>
  );

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 ml-2 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 12h14" /></svg>
      STABIL
    </span>
  );
};

export const SourceLink: React.FC<{ title: string; uri: string }> = ({ title, uri }) => (
  <a 
    href={uri} 
    target="_blank" 
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline truncate max-w-full bg-slate-800 px-2 py-1 rounded border border-slate-700"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
    {title}
  </a>
);

export const SimpleLineChart: React.FC<{ data: HistoryDataPoint[]; color: string; title: string }> = ({ data, color, title }) => {
  if (!data || data.length < 2) return <div className="h-40 flex items-center justify-center text-slate-500 text-xs">Keine historischen Daten</div>;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // avoid division by zero

  const height = 150;
  const width = 300;
  const padding = 20;
  const graphHeight = height - padding * 2;
  const graphWidth = width;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * graphWidth;
    const y = height - padding - ((d.value - min) / range) * graphHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase">{title}</h4>
        <div className="text-right">
          <div className={`text-lg font-bold`} style={{ color: color }}>
            {values[values.length - 1].toLocaleString()} <span className="text-xs text-slate-500">{data[0].unit}</span>
          </div>
        </div>
      </div>
      <div className="h-[150px] w-full relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Gradient Definition */}
          <defs>
            <linearGradient id={`grad-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Fill Area */}
          <path 
            d={`${points} L ${width},${height} L 0,${height} Z`} 
            fill={`url(#grad-${title})`} 
            stroke="none" 
          />
          
          {/* Line */}
          <polyline 
            fill="none" 
            stroke={color} 
            strokeWidth="2" 
            points={points} 
            vectorEffect="non-scaling-stroke"
          />

          {/* Points */}
          {data.map((d, i) => {
             const x = (i / (data.length - 1)) * graphWidth;
             const y = height - padding - ((d.value - min) / range) * graphHeight;
             return (
               <circle key={i} cx={x} cy={y} r="3" fill={color} className="hover:r-4 transition-all" />
             );
          })}
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-slate-500">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
};

export const RiskReportCard: React.FC<{ report: RiskReport; highlighted?: boolean }> = ({ report, highlighted = false }) => {
  
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const content = line.replace(/\*\*/g, '').replace(/\(TREND:.*?\)/i, ''); // Remove trend tag from main text, handled by indicator
      
      // Highlight numbers
      const parts = content.split(/(\d+(?:[.,]\d+)?\s?(?:%|€|USD|EUR|\$))/g);
      
      const renderedLine = parts.map((part, idx) => {
        if (part.match(/(\d+(?:[.,]\d+)?\s?(?:%|€|USD|EUR|\$))/)) {
          return <span key={idx} className="text-avo-400 font-mono font-bold">{part}</span>;
        }
        return part;
      });

      if (line.startsWith('**') || line.startsWith('#')) {
        return <div key={i} className="mt-3 mb-1 flex items-center flex-wrap"><strong className="text-white text-sm tracking-wide">{renderedLine}</strong><TrendIndicator text={line} /></div>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-4 text-slate-400 text-sm mb-1 list-disc"><span>{renderedLine}</span><TrendIndicator text={line} /></li>;
      }
      return <div key={i} className="mb-2 text-slate-400 text-sm leading-relaxed flex items-center flex-wrap"><span>{renderedLine}</span><TrendIndicator text={line} /></div>;
    });
  };

  return (
    <Card className={`h-full flex flex-col transition-all duration-300 hover:border-slate-600 ${highlighted ? 'border-l-4 border-l-avo-500 bg-slate-850' : ''}`}>
      <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white leading-tight">{report.title}</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-semibold">{report.category}</p>
        </div>
        <Badge level={report.level} />
      </div>
      
      <div className="flex-grow overflow-y-auto pr-2 max-h-[300px] custom-scrollbar">
        {renderContent(report.summary)}
      </div>

      {report.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap gap-2">
            {report.sources.map((s, idx) => (
              <SourceLink key={idx} {...s} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export const NavButton: React.FC<{ 
  active: boolean; 
  label: string; 
  icon: React.ReactNode; 
  onClick: () => void 
}> = ({ active, label, icon, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-avo-600 text-white shadow-lg shadow-avo-900/50' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <div className="w-5 h-5">{icon}</div>
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export const KpiCard: React.FC<{ title: string; value: string; subtext: string; status: 'good' | 'warning' | 'danger' | 'neutral' }> = ({ title, value, subtext, status }) => {
  const statusColors = {
    good: 'text-green-400',
    warning: 'text-orange-400',
    danger: 'text-red-500',
    neutral: 'text-slate-400'
  };
  
  const borderColors = {
    good: 'border-green-500/30',
    warning: 'border-orange-500/30',
    danger: 'border-red-500/30',
    neutral: 'border-slate-700'
  };

  return (
    <div className={`bg-slate-900 border ${borderColors[status]} p-5 rounded-xl`}>
      <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
      <div className={`text-2xl font-bold ${statusColors[status]} mb-1`}>{value}</div>
      <div className="text-xs text-slate-400">{subtext}</div>
    </div>
  );
}
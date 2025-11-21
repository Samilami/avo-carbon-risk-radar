
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN'
}

export type RiskCategory = 'Logistik' | 'Verkehr' | 'Politik' | 'Wirtschaft' | 'Kunden' | 'Energie' | 'Rohstoffe' | 'Wetter' | 'Feiertage';

export interface RiskReport {
  id: string;
  category: RiskCategory;
  title: string;
  summary: string;
  level: RiskLevel;
  timestamp: number;
  sources: Array<{ title: string; uri: string }>;
  locations?: string[];
}

export interface HistoryDataPoint {
  label: string; // e.g., "Jan", "Q1"
  value: number;
  unit: string;
}

export interface CommodityHistory {
  copper: HistoryDataPoint[];
  electricity: HistoryDataPoint[];
}

export interface AppState {
  activeView: 'dashboard' | 'supply_chain' | 'market' | 'governance';
  reports: RiskReport[];
  history: CommodityHistory;
  isLoading: boolean;
  apiKey: string | null;
}
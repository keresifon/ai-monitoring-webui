/**
 * Dashboard data models and interfaces
 */

export interface DashboardMetrics {
  totalLogs: number;
  totalAnomalies: number;
  activeAlerts: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface LogVolumeData {
  timestamp: string;
  count: number;
}

export interface LogLevelDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface ServiceLogCount {
  service: string;
  count: number;
}

export interface AnomalyPoint {
  timestamp: string;
  score: number;
  logId: string;
  service: string;
  isAnomaly: boolean;
}

export interface RecentAlert {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  triggeredAt: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface DashboardData {
  metrics: DashboardMetrics;
  logVolume: LogVolumeData[];
  logLevelDistribution: LogLevelDistribution[];
  topServices: ServiceLogCount[];
  anomalies: AnomalyPoint[];
  recentAlerts: RecentAlert[];
}

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#d32f2f',
  HIGH: '#f44336',
  MEDIUM: '#ff9800',
  LOW: '#ffc107'
};

export const ALERT_STATUS_COLORS: Record<string, string> = {
  OPEN: '#f44336',
  ACKNOWLEDGED: '#ff9800',
  RESOLVED: '#4caf50'
};

// Made with Bob

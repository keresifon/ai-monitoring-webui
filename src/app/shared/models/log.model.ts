/**
 * Log entry model and related interfaces
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  environment?: string;
  host?: string;
  metadata?: Record<string, any>;
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface LogSearchRequest {
  level?: LogLevel;
  service?: string;
  startDate?: string;
  endDate?: string;
  searchText?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface LogSearchResponse {
  logs: LogEntry[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface LogFilter {
  level: LogLevel | null;
  service: string | null;
  startDate: Date | null;
  endDate: Date | null;
  searchText: string;
}

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '#9e9e9e',
  [LogLevel.INFO]: '#2196f3',
  [LogLevel.WARN]: '#ff9800',
  [LogLevel.ERROR]: '#f44336',
  [LogLevel.FATAL]: '#d32f2f'
};

export const LOG_LEVELS = Object.values(LogLevel);

// Made with Bob

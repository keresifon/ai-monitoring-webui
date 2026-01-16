/**
 * Alert management models and interfaces
 */

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  ruleId: string;
  ruleName: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  metadata?: Record<string, any>;
}

export enum AlertSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED'
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  ruleType: RuleType;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  notificationChannels: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum RuleType {
  THRESHOLD = 'THRESHOLD',
  ANOMALY = 'ANOMALY',
  PATTERN = 'PATTERN',
  RATE = 'RATE'
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: ChannelType;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ChannelType {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  WEBHOOK = 'WEBHOOK',
  SMS = 'SMS'
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
}

export interface AlertFilter {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  ruleId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  description: string;
  ruleType: RuleType;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  notificationChannels: string[];
}

export interface UpdateAlertRuleRequest {
  name?: string;
  description?: string;
  condition?: string;
  threshold?: number;
  severity?: AlertSeverity;
  enabled?: boolean;
  notificationChannels?: string[];
}

export interface AcknowledgeAlertRequest {
  acknowledgedBy: string;
  notes?: string;
}

export interface ResolveAlertRequest {
  resolvedBy: string;
  resolution?: string;
}

// Made with Bob
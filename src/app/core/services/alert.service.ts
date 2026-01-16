import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Alert,
  AlertRule,
  NotificationChannel,
  AlertStatistics,
  AlertFilter,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AcknowledgeAlertRequest,
  ResolveAlertRequest
} from '../../shared/models/alert.model';

/**
 * Service for alert management operations
 */
@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private readonly apiUrl = `${environment.apiUrl}/alerts`;

  constructor(private http: HttpClient) {}

  /**
   * Get all alerts with optional filtering
   */
  getAlerts(filter?: AlertFilter): Observable<Alert[]> {
    let params = new HttpParams();

    if (filter) {
      if (filter.severity && filter.severity.length > 0) {
        params = params.set('severity', filter.severity.join(','));
      }
      if (filter.status && filter.status.length > 0) {
        params = params.set('status', filter.status.join(','));
      }
      if (filter.ruleId) {
        params = params.set('ruleId', filter.ruleId);
      }
      if (filter.startDate) {
        params = params.set('startDate', filter.startDate.toISOString());
      }
      if (filter.endDate) {
        params = params.set('endDate', filter.endDate.toISOString());
      }
      if (filter.search) {
        params = params.set('search', filter.search);
      }
    }

    return this.http.get<Alert[]>(this.apiUrl, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get alert by ID
   */
  getAlertById(id: string): Observable<Alert> {
    return this.http.get<Alert>(`${this.apiUrl}/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get alert statistics
   */
  getStatistics(): Observable<AlertStatistics> {
    return this.http.get<AlertStatistics>(`${this.apiUrl}/statistics`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string, request: AcknowledgeAlertRequest): Observable<Alert> {
    return this.http.post<Alert>(`${this.apiUrl}/${id}/acknowledge`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string, request: ResolveAlertRequest): Observable<Alert> {
    return this.http.post<Alert>(`${this.apiUrl}/${id}/resolve`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Delete an alert
   */
  deleteAlert(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Alert Rules

  /**
   * Get all alert rules
   */
  getRules(): Observable<AlertRule[]> {
    return this.http.get<AlertRule[]>(`${this.apiUrl}/rules`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get alert rule by ID
   */
  getRuleById(id: string): Observable<AlertRule> {
    return this.http.get<AlertRule>(`${this.apiUrl}/rules/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Create alert rule
   */
  createRule(request: CreateAlertRuleRequest): Observable<AlertRule> {
    return this.http.post<AlertRule>(`${this.apiUrl}/rules`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Update alert rule
   */
  updateRule(id: string, request: UpdateAlertRuleRequest): Observable<AlertRule> {
    return this.http.put<AlertRule>(`${this.apiUrl}/rules/${id}`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Delete alert rule
   */
  deleteRule(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/rules/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Toggle alert rule enabled status
   */
  toggleRule(id: string, enabled: boolean): Observable<AlertRule> {
    return this.http.patch<AlertRule>(`${this.apiUrl}/rules/${id}/toggle`, { enabled })
      .pipe(
        catchError(this.handleError)
      );
  }

  // Notification Channels

  /**
   * Get all notification channels
   */
  getChannels(): Observable<NotificationChannel[]> {
    return this.http.get<NotificationChannel[]>(`${this.apiUrl}/channels`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get notification channel by ID
   */
  getChannelById(id: string): Observable<NotificationChannel> {
    return this.http.get<NotificationChannel>(`${this.apiUrl}/channels/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Create notification channel
   */
  createChannel(channel: Partial<NotificationChannel>): Observable<NotificationChannel> {
    return this.http.post<NotificationChannel>(`${this.apiUrl}/channels`, channel)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Update notification channel
   */
  updateChannel(id: string, channel: Partial<NotificationChannel>): Observable<NotificationChannel> {
    return this.http.put<NotificationChannel>(`${this.apiUrl}/channels/${id}`, channel)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Delete notification channel
   */
  deleteChannel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/channels/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Test notification channel
   */
  testChannel(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/channels/${id}/test`,
      {}
    ).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

// Made with Bob

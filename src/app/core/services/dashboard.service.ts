import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  DashboardData,
  DashboardMetrics,
  LogVolumeData,
  LogLevelDistribution,
  ServiceLogCount,
  AnomalyPoint,
  RecentAlert
} from '../../shared/models/dashboard.model';

/**
 * Service for dashboard data operations
 */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  /**
   * Get complete dashboard data
   */
  getDashboardData(startDate?: Date, endDate?: Date): Observable<DashboardData> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('endDate', endDate.toISOString());
    }

    return this.http.get<DashboardData>(this.apiUrl, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get dashboard metrics
   */
  getMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.apiUrl}/metrics`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get log volume data for chart
   */
  getLogVolume(hours: number = 24): Observable<LogVolumeData[]> {
    const params = new HttpParams().set('hours', hours.toString());
    
    return this.http.get<LogVolumeData[]>(`${this.apiUrl}/log-volume`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get log level distribution
   */
  getLogLevelDistribution(): Observable<LogLevelDistribution[]> {
    return this.http.get<LogLevelDistribution[]>(`${this.apiUrl}/log-level-distribution`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get top services by log count
   */
  getTopServices(limit: number = 10): Observable<ServiceLogCount[]> {
    const params = new HttpParams().set('limit', limit.toString());
    
    return this.http.get<ServiceLogCount[]>(`${this.apiUrl}/top-services`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get anomaly timeline data
   */
  getAnomalies(hours: number = 24): Observable<AnomalyPoint[]> {
    const params = new HttpParams().set('hours', hours.toString());
    
    return this.http.get<AnomalyPoint[]>(`${this.apiUrl}/anomalies`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): Observable<RecentAlert[]> {
    const params = new HttpParams().set('limit', limit.toString());
    
    return this.http.get<RecentAlert[]>(`${this.apiUrl}/recent-alerts`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred while fetching dashboard data';

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

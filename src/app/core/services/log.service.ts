import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  LogEntry,
  LogSearchRequest,
  LogSearchResponse
} from '../../shared/models/log.model';

/**
 * Service for log operations
 */
@Injectable({
  providedIn: 'root'
})
export class LogService {
  private readonly apiUrl = `${environment.apiUrl}/logs`;
  private readonly cacheTime = 30000; // 30 seconds

  constructor(private http: HttpClient) {}

  /**
   * Search logs with filters
   */
  searchLogs(request: LogSearchRequest): Observable<LogSearchResponse> {
    let params = new HttpParams();

    if (request.level) {
      params = params.set('level', request.level);
    }
    if (request.service) {
      params = params.set('service', request.service);
    }
    if (request.startDate) {
      params = params.set('startDate', request.startDate);
    }
    if (request.endDate) {
      params = params.set('endDate', request.endDate);
    }
    if (request.searchText) {
      params = params.set('searchText', request.searchText);
    }
    if (request.page !== undefined) {
      params = params.set('page', request.page.toString());
    }
    if (request.size !== undefined) {
      params = params.set('size', request.size.toString());
    }
    if (request.sortBy) {
      params = params.set('sortBy', request.sortBy);
    }
    if (request.sortDirection) {
      params = params.set('sortDirection', request.sortDirection);
    }

    return this.http.get<LogSearchResponse>(`${this.apiUrl}/search`, { params })
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get log by ID
   */
  getLogById(id: string): Observable<LogEntry> {
    return this.http.get<LogEntry>(`${this.apiUrl}/${id}`)
      .pipe(
        retry(2),
        catchError(this.handleError)
      );
  }

  /**
   * Get unique service names for autocomplete
   */
  getServices(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/services`)
      .pipe(
        shareReplay({ bufferSize: 1, refCount: true, windowTime: this.cacheTime }),
        catchError(this.handleError)
      );
  }

  /**
   * Export logs to CSV
   */
  exportToCsv(request: LogSearchRequest): Observable<Blob> {
    let params = new HttpParams();

    if (request.level) params = params.set('level', request.level);
    if (request.service) params = params.set('service', request.service);
    if (request.startDate) params = params.set('startDate', request.startDate);
    if (request.endDate) params = params.set('endDate', request.endDate);
    if (request.searchText) params = params.set('searchText', request.searchText);

    return this.http.get(`${this.apiUrl}/export/csv`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Export logs to JSON
   */
  exportToJson(request: LogSearchRequest): Observable<Blob> {
    let params = new HttpParams();

    if (request.level) params = params.set('level', request.level);
    if (request.service) params = params.set('service', request.service);
    if (request.startDate) params = params.set('startDate', request.startDate);
    if (request.endDate) params = params.set('endDate', request.endDate);
    if (request.searchText) params = params.set('searchText', request.searchText);

    return this.http.get(`${this.apiUrl}/export/json`, {
      params,
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

// Made with Bob

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { Subject, interval, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, map, takeUntil } from 'rxjs/operators';

import { LogService } from '../../core/services/log.service';
import {
  LogEntry,
  LogLevel,
  LogFilter,
  LogSearchRequest,
  LOG_LEVELS,
  LOG_LEVEL_COLORS
} from '../../shared/models/log.model';
import { LogDetailDialogComponent } from '../log-detail/log-detail-dialog.component';

/**
 * Log Viewer Component
 * Displays logs in a Material table with advanced filtering and sorting
 */
@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatChipsModule,
    MatCardModule
  ],
  templateUrl: './log-viewer.component.html',
  styleUrls: ['./log-viewer.component.scss']
})
export class LogViewerComponent implements OnInit, OnDestroy {
  // Table configuration
  displayedColumns: string[] = ['timestamp', 'level', 'service', 'message', 'actions'];
  dataSource = new MatTableDataSource<LogEntry>([]);
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Filter controls
  levelControl = new FormControl<LogLevel | null>(null);
  serviceControl = new FormControl<string>('');
  searchControl = new FormControl<string>('');
  startDateControl = new FormControl<Date | null>(null);
  endDateControl = new FormControl<Date | null>(null);

  // Data
  logLevels = LOG_LEVELS;
  services: string[] = [];
  filteredServices: string[] = [];
  totalLogs = 0;
  
  // State
  isLoading = false;
  isError = false;
  errorMessage = '';
  
  // Real-time updates
  private destroy$ = new Subject<void>();
  private refreshSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds

  // Utility
  readonly logLevelColors = LOG_LEVEL_COLORS;

  constructor(
    private logService: LogService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadServices();
    this.setupFilters();
    this.loadLogs();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRefresh();
  }

  /**
   * Load unique service names for autocomplete
   */
  private loadServices(): void {
    this.logService.getServices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (services) => {
          this.services = services;
          this.filteredServices = services;
        },
        error: (error) => {
          console.error('Error loading services:', error);
        }
      });
  }

  /**
   * Setup filter controls with debouncing
   */
  private setupFilters(): void {
    // Search text filter with debounce
    this.searchControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadLogs());

    // Level filter
    this.levelControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadLogs());

    // Service autocomplete filter
    this.serviceControl.valueChanges
      .pipe(
        startWith(''),
        map(value => this.filterServices(value || '')),
        takeUntil(this.destroy$)
      )
      .subscribe(filtered => this.filteredServices = filtered);

    // Date range filters
    this.startDateControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadLogs());

    this.endDateControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadLogs());
  }

  /**
   * Filter services for autocomplete
   */
  private filterServices(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.services.filter(service => 
      service.toLowerCase().includes(filterValue)
    );
  }

  /**
   * Load logs with current filters
   */
  loadLogs(): void {
    this.isLoading = true;
    this.isError = false;

    const request: LogSearchRequest = {
      level: this.levelControl.value || undefined,
      service: this.serviceControl.value || undefined,
      searchText: this.searchControl.value || undefined,
      startDate: this.startDateControl.value?.toISOString(),
      endDate: this.endDateControl.value?.toISOString(),
      page: this.paginator?.pageIndex || 0,
      size: this.paginator?.pageSize || 50,
      sortBy: this.sort?.active || 'timestamp',
      sortDirection: this.sort?.direction || 'desc'
    };

    this.logService.searchLogs(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.logs;
          this.totalLogs = response.totalElements;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.isError = true;
          this.errorMessage = error.message || 'Failed to load logs';
          this.showError(this.errorMessage);
        }
      });
  }

  /**
   * Handle page change
   */
  onPageChange(): void {
    this.loadLogs();
  }

  /**
   * Handle sort change
   */
  onSortChange(): void {
    this.paginator.pageIndex = 0;
    this.loadLogs();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.levelControl.setValue(null);
    this.serviceControl.setValue('');
    this.searchControl.setValue('');
    this.startDateControl.setValue(null);
    this.endDateControl.setValue(null);
    this.loadLogs();
  }

  /**
   * Open log detail dialog
   */
  viewLogDetail(log: LogEntry): void {
    this.dialog.open(LogDetailDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: log,
      ariaLabel: 'Log detail dialog'
    });
  }

  /**
   * Export logs to CSV
   */
  exportToCsv(): void {
    const request: LogSearchRequest = {
      level: this.levelControl.value || undefined,
      service: this.serviceControl.value || undefined,
      searchText: this.searchControl.value || undefined,
      startDate: this.startDateControl.value?.toISOString(),
      endDate: this.endDateControl.value?.toISOString()
    };

    this.logService.exportToCsv(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'logs.csv');
          this.showSuccess('Logs exported to CSV successfully');
        },
        error: (error) => {
          this.showError('Failed to export logs: ' + error.message);
        }
      });
  }

  /**
   * Export logs to JSON
   */
  exportToJson(): void {
    const request: LogSearchRequest = {
      level: this.levelControl.value || undefined,
      service: this.serviceControl.value || undefined,
      searchText: this.searchControl.value || undefined,
      startDate: this.startDateControl.value?.toISOString(),
      endDate: this.endDateControl.value?.toISOString()
    };

    this.logService.exportToJson(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, 'logs.json');
          this.showSuccess('Logs exported to JSON successfully');
        },
        error: (error) => {
          this.showError('Failed to export logs: ' + error.message);
        }
      });
  }

  /**
   * Download file helper
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Start auto-refresh
   */
  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.REFRESH_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isLoading) {
          this.loadLogs();
        }
      });
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    this.refreshSubscription?.unsubscribe();
  }

  /**
   * Manual refresh
   */
  refresh(): void {
    this.loadLogs();
  }

  /**
   * Get log level color
   */
  getLogLevelColor(level: LogLevel): string {
    return this.logLevelColors[level] || '#000000';
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Truncate message for table display
   */
  truncateMessage(message: string, maxLength: number = 100): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength) + '...';
  }

  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Track by function for performance
   */
  trackByLogId(index: number, log: LogEntry): string {
    return log.id;
  }
}

// Made with Bob

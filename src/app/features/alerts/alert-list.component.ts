import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Alert,
  AlertSeverity,
  AlertStatus,
  AlertFilter,
  AlertStatistics
} from '../../shared/models/alert.model';

@Component({
  selector: 'app-alert-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './alert-list.component.html',
  styleUrls: ['./alert-list.component.scss']
})
export class AlertListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['severity', 'title', 'ruleName', 'status', 'triggeredAt', 'actions'];
  alerts: Alert[] = [];
  filteredAlerts: Alert[] = [];
  statistics: AlertStatistics | null = null;
  
  isLoading = false;
  searchTerm = '';
  selectedSeverities: AlertSeverity[] = [];
  selectedStatuses: AlertStatus[] = [];
  
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  
  severityOptions = Object.values(AlertSeverity);
  statusOptions = Object.values(AlertStatus);
  
  private readonly REFRESH_INTERVAL = 30000;
  private destroy$ = new Subject<void>();

  constructor(
    private alertService: AlertService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
    this.loadStatistics();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAlerts(): void {
    this.isLoading = true;
    
    const filter: AlertFilter = {
      severity: this.selectedSeverities.length > 0 ? this.selectedSeverities : undefined,
      status: this.selectedStatuses.length > 0 ? this.selectedStatuses : undefined,
      search: this.searchTerm || undefined
    };

    this.alertService.getAlerts(filter)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.alerts = alerts;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          this.showError('Failed to load alerts');
          this.isLoading = false;
        }
      });
  }

  loadStatistics(): void {
    this.alertService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (error) => {
          console.error('Failed to load statistics:', error);
        }
      });
  }

  applyFilters(): void {
    this.filteredAlerts = this.alerts;
    this.totalItems = this.filteredAlerts.length;
  }

  onSearch(): void {
    this.loadAlerts();
  }

  onFilterChange(): void {
    this.loadAlerts();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedSeverities = [];
    this.selectedStatuses = [];
    this.loadAlerts();
  }

  acknowledgeAlert(alert: Alert): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.alertService.acknowledgeAlert(alert.id, {
      acknowledgedBy: user.username
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Alert acknowledged');
          this.loadAlerts();
        },
        error: () => {
          this.showError('Failed to acknowledge alert');
        }
      });
  }

  resolveAlert(alert: Alert): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.alertService.resolveAlert(alert.id, {
      resolvedBy: user.username
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Alert resolved');
          this.loadAlerts();
        },
        error: () => {
          this.showError('Failed to resolve alert');
        }
      });
  }

  deleteAlert(alert: Alert): void {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    this.alertService.deleteAlert(alert.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Alert deleted');
          this.loadAlerts();
        },
        error: () => {
          this.showError('Failed to delete alert');
        }
      });
  }

  getSeverityColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      [AlertSeverity.CRITICAL]: 'warn',
      [AlertSeverity.HIGH]: 'warn',
      [AlertSeverity.MEDIUM]: 'accent',
      [AlertSeverity.LOW]: 'primary',
      [AlertSeverity.INFO]: 'primary'
    };
    return colors[severity];
  }

  getStatusColor(status: AlertStatus): string {
    const colors: Record<AlertStatus, string> = {
      [AlertStatus.ACTIVE]: 'warn',
      [AlertStatus.ACKNOWLEDGED]: 'accent',
      [AlertStatus.RESOLVED]: 'primary'
    };
    return colors[status];
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  refresh(): void {
    this.loadAlerts();
    this.loadStatistics();
  }

  private startAutoRefresh(): void {
    interval(this.REFRESH_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isLoading) {
          this.loadAlerts();
          this.loadStatistics();
        }
      });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}

// Made with Bob

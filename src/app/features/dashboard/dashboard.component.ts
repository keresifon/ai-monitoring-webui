import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

import { DashboardService } from '../../core/services/dashboard.service';
import {
  DashboardMetrics,
  LogVolumeData,
  LogLevelDistribution,
  ServiceLogCount,
  AnomalyPoint,
  RecentAlert
} from '../../shared/models/dashboard.model';
import { ChartConfigUtil } from '../../shared/utils/chart-config.util';

// Register Chart.js components
Chart.register(...registerables);

/**
 * Dashboard component with real-time monitoring visualizations
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  // Canvas references for charts
  @ViewChild('logVolumeCanvas') logVolumeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('logLevelCanvas') logLevelCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topServicesCanvas') topServicesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('anomalyCanvas') anomalyCanvas!: ElementRef<HTMLCanvasElement>;

  // Chart instances
  private logVolumeChart?: Chart;
  private logLevelChart?: Chart;
  private topServicesChart?: Chart;
  private anomalyChart?: Chart;

  // Component state
  isLoading = true;
  isRefreshing = false;
  error: string | null = null;
  metrics: DashboardMetrics | null = null;
  recentAlerts: RecentAlert[] = [];

  // Auto-refresh
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds
  private destroy$ = new Subject<void>();
  private chartsInitialized = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.startAutoRefresh();
  }

  ngAfterViewInit(): void {
    // Initialize charts after view is ready
    setTimeout(() => {
      console.log('ngAfterViewInit: Initializing charts...');
      this.initializeCharts();
      this.chartsInitialized = true;
      // Wait a bit more to ensure charts are fully initialized before loading data
      setTimeout(() => {
        console.log('ngAfterViewInit: Loading dashboard data...');
        this.loadDashboardData(true); // Initial load
      }, 200);
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  /**
   * Load all dashboard data
   * @param isInitialLoad - If true, shows loading spinner. If false, silently refreshes data.
   */
  private loadDashboardData(isInitialLoad: boolean = false): void {
    if (isInitialLoad) {
      this.isLoading = true;
      this.error = null;
    } else {
      this.isRefreshing = true;
    }

    // Load metrics
    this.dashboardService.getMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metrics) => {
          this.metrics = metrics;
          if (isInitialLoad) {
            this.isLoading = false;
          } else {
            this.isRefreshing = false;
          }
        },
        error: (error) => {
          if (isInitialLoad) {
            this.error = 'Failed to load dashboard metrics';
            this.isLoading = false;
          } else {
            this.isRefreshing = false;
          }
          console.error('Error loading metrics:', error);
        }
      });

    // Load recent alerts
    this.dashboardService.getRecentAlerts(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (alerts) => {
          this.recentAlerts = alerts;
        },
        error: (error) => {
          console.error('Error loading alerts:', error);
        }
      });

    // Load chart data
    this.loadChartData();
  }

  /**
   * Load data for all charts
   */
  private loadChartData(): void {
    // Load log volume data
    this.dashboardService.getLogVolume(24)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Log volume data received:', data);
          this.updateLogVolumeChart(data);
        },
        error: (error) => {
          console.error('Error loading log volume:', error);
          console.error('Error details:', error.message, error.status, error.error);
        }
      });

    // Load log level distribution
    this.dashboardService.getLogLevelDistribution()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Log level distribution data received:', data);
          this.updateLogLevelChart(data);
        },
        error: (error) => {
          console.error('Error loading log levels:', error);
          console.error('Error details:', error.message, error.status, error.error);
        }
      });

    // Load top services
    this.dashboardService.getTopServices(10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Top services data received:', data);
          this.updateTopServicesChart(data);
        },
        error: (error) => {
          console.error('Error loading top services:', error);
          console.error('Error details:', error.message, error.status, error.error);
        }
      });

    // Load anomalies
    this.dashboardService.getAnomalies(24)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('Anomalies data received:', data);
          this.updateAnomalyChart(data);
        },
        error: (error) => {
          console.error('Error loading anomalies:', error);
          console.error('Error details:', error.message, error.status, error.error);
        }
      });
  }

  /**
   * Initialize all charts
   */
  private initializeCharts(): void {
    console.log('Initializing charts...');
    console.log('Canvas elements:', {
      logVolume: !!this.logVolumeCanvas,
      logLevel: !!this.logLevelCanvas,
      topServices: !!this.topServicesCanvas,
      anomaly: !!this.anomalyCanvas
    });
    
    if (!this.logVolumeCanvas || !this.logLevelCanvas || 
        !this.topServicesCanvas || !this.anomalyCanvas) {
      console.warn('Some canvas elements are missing, charts will not be initialized');
      console.warn('Canvas details:', {
        logVolume: this.logVolumeCanvas?.nativeElement,
        logLevel: this.logLevelCanvas?.nativeElement,
        topServices: this.topServicesCanvas?.nativeElement,
        anomaly: this.anomalyCanvas?.nativeElement
      });
      // Retry after a longer delay
      setTimeout(() => {
        console.log('Retrying chart initialization...');
        this.initializeCharts();
      }, 500);
      return;
    }

    // Initialize log volume chart
    console.log('Creating log volume chart...');
    const logVolumeConfig = ChartConfigUtil.getLogVolumeChartConfig();
    this.logVolumeChart = new Chart(
      this.logVolumeCanvas.nativeElement,
      logVolumeConfig
    );
    console.log('Log volume chart created');

    // Initialize log level chart
    console.log('Creating log level chart...');
    const logLevelConfig = ChartConfigUtil.getLogLevelChartConfig();
    this.logLevelChart = new Chart(
      this.logLevelCanvas.nativeElement,
      logLevelConfig
    );
    console.log('Log level chart created');

    // Initialize top services chart
    console.log('Creating top services chart...');
    const topServicesConfig = ChartConfigUtil.getTopServicesChartConfig();
    this.topServicesChart = new Chart(
      this.topServicesCanvas.nativeElement,
      topServicesConfig
    );
    console.log('Top services chart created');

    // Initialize anomaly chart
    console.log('Creating anomaly chart...');
    const anomalyConfig = ChartConfigUtil.getAnomalyChartConfig();
    this.anomalyChart = new Chart(
      this.anomalyCanvas.nativeElement,
      anomalyConfig
    );
    console.log('Anomaly chart created');
    console.log('All charts initialized');
  }

  /**
   * Update log volume chart with new data
   */
  private updateLogVolumeChart(data: LogVolumeData[]): void {
    console.log('updateLogVolumeChart called with data:', data, 'Chart exists:', !!this.logVolumeChart);
    
    if (!this.logVolumeChart) {
      if (this.chartsInitialized && this.logVolumeCanvas) {
        // Chart was destroyed, re-initialize it
        console.log('Log volume chart was destroyed, re-initializing...');
        const logVolumeConfig = ChartConfigUtil.getLogVolumeChartConfig();
        this.logVolumeChart = new Chart(
          this.logVolumeCanvas.nativeElement,
          logVolumeConfig
        );
      } else {
        // Chart not initialized yet, wait a bit and try again
        console.log('Log volume chart not ready, retrying in 200ms...');
        setTimeout(() => this.updateLogVolumeChart(data), 200);
        return;
      }
    }

    if (!data || data.length === 0) {
      console.log('No log volume data to display');
      return;
    }

    const labels = data.map(d => ChartConfigUtil.formatDateLabel(new Date(d.timestamp), 'time'));
    const values = data.map(d => d.count);
    
    console.log('Updating log volume chart with labels:', labels, 'values:', values);

    this.logVolumeChart.data.labels = labels;
    this.logVolumeChart.data.datasets[0].data = values;
    this.logVolumeChart.update('none'); // 'none' mode prevents animation on refresh
    console.log('Log volume chart updated');
  }

  /**
   * Update log level chart with new data
   */
  private updateLogLevelChart(data: LogLevelDistribution[]): void {
    console.log('updateLogLevelChart called with data:', data, 'Chart exists:', !!this.logLevelChart);
    
    if (!this.logLevelChart) {
      if (this.chartsInitialized && this.logLevelCanvas) {
        // Chart was destroyed, re-initialize it
        console.log('Log level chart was destroyed, re-initializing...');
        const logLevelConfig = ChartConfigUtil.getLogLevelChartConfig();
        this.logLevelChart = new Chart(
          this.logLevelCanvas.nativeElement,
          logLevelConfig
        );
      } else {
        console.log('Log level chart not ready, retrying in 200ms...');
        setTimeout(() => this.updateLogLevelChart(data), 200);
        return;
      }
    }

    if (!data || data.length === 0) {
      console.log('No log level data to display');
      return;
    }

    const labels = data.map(d => d.level);
    const values = data.map(d => d.count);
    
    console.log('Updating log level chart with labels:', labels, 'values:', values);

    this.logLevelChart.data.labels = labels;
    this.logLevelChart.data.datasets[0].data = values;
    this.logLevelChart.update('none');
    console.log('Log level chart updated');
  }

  /**
   * Update top services chart with new data
   */
  private updateTopServicesChart(data: ServiceLogCount[]): void {
    console.log('updateTopServicesChart called with data:', data, 'Chart exists:', !!this.topServicesChart);
    
    if (!this.topServicesChart) {
      if (this.chartsInitialized && this.topServicesCanvas) {
        // Chart was destroyed, re-initialize it
        console.log('Top services chart was destroyed, re-initializing...');
        const topServicesConfig = ChartConfigUtil.getTopServicesChartConfig();
        this.topServicesChart = new Chart(
          this.topServicesCanvas.nativeElement,
          topServicesConfig
        );
      } else {
        console.log('Top services chart not ready, retrying in 200ms...');
        setTimeout(() => this.updateTopServicesChart(data), 200);
        return;
      }
    }

    if (!data || data.length === 0) {
      console.log('No top services data to display');
      return;
    }

    const labels = data.map(d => d.service);
    const values = data.map(d => d.count);
    
    console.log('Updating top services chart with labels:', labels, 'values:', values);

    this.topServicesChart.data.labels = labels;
    this.topServicesChart.data.datasets[0].data = values;
    this.topServicesChart.update('none');
    console.log('Top services chart updated');
  }

  /**
   * Update anomaly chart with new data
   */
  private updateAnomalyChart(data: AnomalyPoint[]): void {
    if (!this.anomalyChart) {
      if (this.chartsInitialized && this.anomalyCanvas) {
        // Chart was destroyed, re-initialize it
        console.log('Anomaly chart was destroyed, re-initializing...');
        const anomalyConfig = ChartConfigUtil.getAnomalyChartConfig();
        this.anomalyChart = new Chart(
          this.anomalyCanvas.nativeElement,
          anomalyConfig
        );
      } else {
        setTimeout(() => this.updateAnomalyChart(data), 200);
        return;
      }
    }

    if (!data || data.length === 0) {
      return;
    }

    const normalPoints = data
      .filter(d => !d.isAnomaly)
      .map(d => ({ x: new Date(d.timestamp).getTime(), y: d.score }));

    const anomalyPoints = data
      .filter(d => d.isAnomaly)
      .map(d => ({ x: new Date(d.timestamp).getTime(), y: d.score }));

    this.anomalyChart.data.datasets[0].data = normalPoints;
    this.anomalyChart.data.datasets[1].data = anomalyPoints;
    this.anomalyChart.update('none');
  }

  /**
   * Destroy all chart instances
   */
  private destroyCharts(): void {
    this.logVolumeChart?.destroy();
    this.logLevelChart?.destroy();
    this.topServicesChart?.destroy();
    this.anomalyChart?.destroy();
  }

  /**
   * Start auto-refresh interval
   */
  private startAutoRefresh(): void {
    interval(this.REFRESH_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isLoading && this.chartsInitialized) {
          // Silent refresh - don't show loading spinner, just update data
          this.loadDashboardData(false);
        }
      });
  }

  /**
   * Manual refresh
   */
  refresh(): void {
    if (this.chartsInitialized) {
      // If charts are already initialized, do a silent refresh
      this.loadDashboardData(false);
    } else {
      // If charts aren't initialized yet, do a full reload
      this.loadDashboardData(true);
    }
  }

  /**
   * Get severity color for alerts
   */
  getSeverityColor(severity: string): string {
    const colorMap: { [key: string]: string } = {
      'CRITICAL': 'warn',
      'HIGH': 'warn',
      'MEDIUM': 'accent',
      'LOW': 'primary',
      'INFO': 'primary'
    };
    return colorMap[severity.toUpperCase()] || 'primary';
  }

  /**
   * Get status color for alerts
   */
  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'ACTIVE': 'warn',
      'ACKNOWLEDGED': 'accent',
      'RESOLVED': 'primary'
    };
    return colorMap[status.toUpperCase()] || 'primary';
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Format large numbers with K/M suffix
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}

// Made with Bob

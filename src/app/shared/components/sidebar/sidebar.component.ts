import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { filter } from 'rxjs/operators';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
  badge?: number;
}

/**
 * Sidebar navigation component
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() isOpen = true;

  activeRoute = '';
  activeAlertsCount = 0;
  private destroy$ = new Subject<void>();
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard'
    },
    {
      label: 'Logs',
      icon: 'description',
      route: '/logs'
    },
    {
      label: 'Alerts',
      icon: 'notifications_active',
      route: '/alerts'
    },
    {
      label: 'Analytics',
      icon: 'analytics',
      route: '/analytics'
    },
    {
      label: 'Reports',
      icon: 'assessment',
      route: '/reports'
    }
  ];

  adminItems: NavItem[] = [
    {
      label: 'Users',
      icon: 'people',
      route: '/admin/users',
      roles: ['ADMIN']
    },
    {
      label: 'Settings',
      icon: 'settings',
      route: '/admin/settings',
      roles: ['ADMIN']
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    // Set initial active route
    this.activeRoute = this.router.url;

    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.activeRoute = event.url;
      });

    // Load active alerts count
    this.loadActiveAlertsCount();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load active alerts count for badge
   */
  private loadActiveAlertsCount(): void {
    this.alertService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.activeAlertsCount = stats.activeAlerts || 0;
          // Update the alerts nav item badge
          const alertsItem = this.navItems.find(item => item.route === '/alerts');
          if (alertsItem) {
            alertsItem.badge = this.activeAlertsCount > 0 ? this.activeAlertsCount : undefined;
          }
        },
        error: (error) => {
          console.error('Failed to load alert statistics:', error);
          // Hide badge on error
          const alertsItem = this.navItems.find(item => item.route === '/alerts');
          if (alertsItem) {
            alertsItem.badge = undefined;
          }
        }
      });
  }

  /**
   * Auto-refresh alert count
   */
  private startAutoRefresh(): void {
    interval(this.REFRESH_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadActiveAlertsCount();
      });
  }

  /**
   * Check if route is active
   */
  isActive(route: string): boolean {
    return this.activeRoute === route || this.activeRoute.startsWith(route + '/');
  }

  /**
   * Check if user can access nav item
   */
  canAccess(item: NavItem): boolean {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return this.authService.hasAnyRole(item.roles);
  }

  /**
   * Get filtered nav items based on user roles
   */
  getVisibleNavItems(): NavItem[] {
    return this.navItems.filter(item => this.canAccess(item));
  }

  /**
   * Get filtered admin items based on user roles
   */
  getVisibleAdminItems(): NavItem[] {
    return this.adminItems.filter(item => this.canAccess(item));
  }

  /**
   * Check if user has admin access
   */
  hasAdminAccess(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  /**
   * Navigate to route
   */
  navigate(route: string): void {
    this.router.navigate([route]);
  }
}

// Made with Bob

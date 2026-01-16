import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, BehaviorSubject } from 'rxjs';

import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let alertService: jasmine.SpyObj<AlertService>;
  let router: Router;
  let routerEvents: Subject<any>;

  beforeEach(async () => {
    routerEvents = new Subject();
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['hasRole', 'hasAnyRole'], {
      isAuthenticated$: new BehaviorSubject(true),
      currentUser$: new BehaviorSubject(null)
    });
    const alertServiceSpy = jasmine.createSpyObj('AlertService', ['getStatistics']);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent, BrowserAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AlertService, useValue: alertServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    alertService = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    router = TestBed.inject(Router);
    (router as any).events = routerEvents.asObservable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default nav items', () => {
    fixture.detectChanges();
    expect(component.navItems.length).toBeGreaterThan(0);
    expect(component.navItems[0].label).toBe('Dashboard');
  });

  it('should update active route on navigation', () => {
    fixture.detectChanges();
    routerEvents.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
    expect(component.activeRoute).toBe('/dashboard');
  });

  it('should load active alerts count', () => {
    alertService.getStatistics.and.returnValue(of({
      totalAlerts: 5,
      activeAlerts: 3,
      acknowledgedAlerts: 1,
      resolvedAlerts: 1,
      criticalAlerts: 1,
      highAlerts: 1,
      mediumAlerts: 1,
      lowAlerts: 2
    }));

    fixture.detectChanges();
    expect(alertService.getStatistics).toHaveBeenCalled();
  });

  it('should check if user can access nav item', () => {
    authService.hasAnyRole.and.returnValue(true);
    fixture.detectChanges();
    const item = { label: 'Test', icon: 'test', route: '/test', roles: ['ADMIN'] };
    expect(component.canAccess(item)).toBe(true);
  });

  it('should check if user has admin access', () => {
    authService.hasRole.and.returnValue(true);
    fixture.detectChanges();
    expect(component.hasAdminAccess()).toBe(true);
  });

  it('should get visible nav items', () => {
    authService.hasAnyRole.and.returnValue(true);
    fixture.detectChanges();
    const visibleItems = component.getVisibleNavItems();
    expect(visibleItems.length).toBeGreaterThan(0);
  });

  it('should get visible admin items', () => {
    authService.hasAnyRole.and.returnValue(true);
    fixture.detectChanges();
    const visibleAdminItems = component.getVisibleAdminItems();
    expect(visibleAdminItems).toBeDefined();
  });

  it('should check if route is active', () => {
    fixture.detectChanges();
    component.activeRoute = '/dashboard';
    expect(component.isActive('/dashboard')).toBe(true);
    expect(component.isActive('/logs')).toBe(false);
  });

  it('should cleanup subscriptions on destroy', () => {
    fixture.detectChanges();
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});

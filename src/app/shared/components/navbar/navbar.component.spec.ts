/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';

import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { User } from '../../models/auth.model';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let alertService: jasmine.SpyObj<AlertService>;
  let router: Router;

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    roles: ['user'],
    createdAt: new Date()
  };

  beforeEach(async () => {
    const currentUserSubject = new BehaviorSubject<User | null>(null);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['logout', 'hasRole'], {
      currentUser$: currentUserSubject.asObservable()
    });
    // Store the subject reference for test access
    (authServiceSpy as any).currentUserSubject = currentUserSubject;
    const alertServiceSpy = jasmine.createSpyObj('AlertService', ['getStatistics']);
    alertServiceSpy.getStatistics.and.returnValue(of({
      totalAlerts: 0,
      activeAlerts: 0,
      acknowledgedAlerts: 0,
      resolvedAlerts: 0,
      criticalAlerts: 0,
      highAlerts: 0,
      mediumAlerts: 0,
      lowAlerts: 0
    }));

    await TestBed.configureTestingModule({
      imports: [NavbarComponent, BrowserAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: AlertService, useValue: alertServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    alertService = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to current user on init', () => {
    fixture.detectChanges();
    expect(component.currentUser).toBeNull();

    (authService as any).currentUserSubject.next(mockUser);
    expect(component.currentUser).toEqual(mockUser);
  });

  it('should emit toggleSidebar event', () => {
    spyOn(component.toggleSidebar, 'emit');
    component.onToggleSidebar();
    expect(component.toggleSidebar.emit).toHaveBeenCalled();
  });

  it('should navigate to profile', () => {
    component.goToProfile();
    expect(router.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('should logout and navigate to login', () => {
    component.logout();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should load notification count', () => {
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

  it('should cleanup subscriptions on destroy', () => {
    fixture.detectChanges();
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});

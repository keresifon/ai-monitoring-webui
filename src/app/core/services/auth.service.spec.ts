import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { LoginRequest, RegisterRequest, User } from '../../shared/models/auth.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
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

  const mockLoginResponse = {
    token: 'mock-token',
    refreshToken: 'mock-refresh-token',
    user: mockUser,
    expiresIn: 3600
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        provideHttpClient(),
        provideRouter([])
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with unauthenticated state', () => {
      service.isAuthenticated$.subscribe(isAuth => {
        expect(isAuth).toBe(false);
      });
    });

    it('should restore auth state from localStorage', () => {
      localStorage.setItem('auth_token', 'stored-token');
      localStorage.setItem('refresh_token', 'stored-refresh-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      const newService = TestBed.inject(AuthService);
      
      newService.isAuthenticated$.subscribe(isAuth => {
        expect(isAuth).toBe(true);
      });

      expect(newService.getCurrentUser()).toEqual(mockUser);
      expect(newService.getToken()).toBe('stored-token');
    });
  });

  describe('Login', () => {
    it('should login successfully', fakeAsync(() => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      let response: any;
      service.login(credentials).subscribe(res => {
        response = res;
      });

      tick();
      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockLoginResponse);
      tick();

      expect(response).toEqual(mockLoginResponse);
      expect(service.getCurrentUser()).toEqual(mockUser);
      expect(service.getToken()).toBe('mock-token');
      expect(service.isAuthenticated()).toBe(true);
    }));

    it('should handle login error', fakeAsync(() => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      let error: any;
      service.login(credentials).subscribe({
        next: () => fail('should have failed'),
        error: (err) => {
          error = err;
        }
      });

      tick();
      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/login`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(error).toBeTruthy();
      expect(service.isAuthenticated()).toBe(false);
    }));

    it('should set loading state during login', fakeAsync(() => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      let loadingStates: boolean[] = [];
      const loadingSub = service.loading$.subscribe(loading => {
        loadingStates.push(loading);
      });

      service.login(credentials).subscribe();

      tick();
      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/login`);
      expect(loadingStates).toContain(true);
      req.flush(mockLoginResponse);
      tick();
      loadingSub.unsubscribe();
    }));
  });

  describe('Register', () => {
    it('should register successfully', fakeAsync(() => {
      const registerData: RegisterRequest = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      };

      const mockRegisterResponse = {
        message: 'User registered successfully',
        user: mockUser
      };

      let response: any;
      service.register(registerData).subscribe(res => {
        response = res;
      });

      tick();
      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerData);
      req.flush(mockRegisterResponse);
      tick();

      expect(response).toEqual(mockRegisterResponse);
    }));

    it('should handle registration error', fakeAsync(() => {
      const registerData: RegisterRequest = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User'
      };

      let error: any;
      service.register(registerData).subscribe({
        next: () => fail('should have failed'),
        error: (err) => {
          error = err;
        }
      });

      tick();
      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/register`);
      req.flush({ message: 'Username already exists' }, { status: 400, statusText: 'Bad Request' });
      tick();

      expect(error).toBeTruthy();
    }));
  });

  describe('Logout', () => {
    it('should logout and clear auth data', () => {
      spyOn(router, 'navigate');
      
      // First login
      localStorage.setItem('auth_token', 'token');
      localStorage.setItem('refresh_token', 'refresh-token');
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      service.logout();

      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
      expect(service.getToken()).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token successfully', fakeAsync(() => {
      localStorage.setItem('refresh_token', 'old-refresh-token');

      const mockRefreshResponse = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      };

      let response: any;
      service.refreshToken().subscribe(res => {
        response = res;
      });

      tick();
      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush(mockRefreshResponse);
      tick();

      expect(response).toEqual(mockRefreshResponse);
      expect(service.getToken()).toBe('new-token');
    }));

    it('should logout if refresh token is missing', (done) => {
      spyOn(service, 'logout');

      service.refreshToken().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });
    });

    it('should logout on refresh token error', fakeAsync(() => {
      localStorage.setItem('refresh_token', 'invalid-refresh-token');
      spyOn(service, 'logout');

      let errorOccurred = false;
      service.refreshToken().subscribe({
        next: () => fail('should have failed'),
        error: () => {
          errorOccurred = true;
        }
      });

      tick();
      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/refresh`);
      req.flush({ message: 'Invalid refresh token' }, { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(errorOccurred).toBe(true);
      expect(service.logout).toHaveBeenCalled();
    }));
  });

  describe('Role Checks', () => {
    beforeEach(() => {
      service['authState$'].next({
        isAuthenticated: true,
        user: mockUser,
        token: 'token',
        refreshToken: 'refresh-token',
        loading: false,
        error: null
      });
    });

    it('should check if user has specific role', () => {
      expect(service.hasRole('user')).toBe(true);
      expect(service.hasRole('admin')).toBe(false);
    });

    it('should check if user has any of the specified roles', () => {
      expect(service.hasAnyRole(['user', 'admin'])).toBe(true);
      expect(service.hasAnyRole(['admin', 'moderator'])).toBe(false);
    });

    it('should check if user has all specified roles', () => {
      expect(service.hasAllRoles(['user'])).toBe(true);
      expect(service.hasAllRoles(['user', 'admin'])).toBe(false);
    });
  });

  describe('Observables', () => {
    it('should emit authentication state changes', (done) => {
      const states: boolean[] = [];
      service.isAuthenticated$.subscribe(isAuth => {
        states.push(isAuth);
        if (states.length === 2) {
          expect(states).toEqual([false, true]);
          done();
        }
      });

      service['authState$'].next({
        isAuthenticated: true,
        user: mockUser,
        token: 'token',
        refreshToken: 'refresh-token',
        loading: false,
        error: null
      });
    });

    it('should emit current user changes', (done) => {
      service.currentUser$.subscribe(user => {
        if (user) {
          expect(user).toEqual(mockUser);
          done();
        }
      });

      service['authState$'].next({
        isAuthenticated: true,
        user: mockUser,
        token: 'token',
        refreshToken: 'refresh-token',
        loading: false,
        error: null
      });
    });
  });
});

import { TestBed } from '@angular/core/testing';
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
    it('should login successfully', (done) => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      service.login(credentials).subscribe(response => {
        expect(response).toEqual(mockLoginResponse);
        expect(service.getCurrentUser()).toEqual(mockUser);
        expect(service.getToken()).toBe('mock-token');
        expect(service.isAuthenticated()).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockLoginResponse);
    });

    it('should handle login error', (done) => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      service.login(credentials).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          expect(service.isAuthenticated()).toBe(false);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/login`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should set loading state during login', () => {
      const credentials: LoginRequest = {
        username: 'testuser',
        password: 'password123'
      };

      let loadingStates: boolean[] = [];
      service.loading$.subscribe(loading => loadingStates.push(loading));

      service.login(credentials).subscribe();

      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/login`);
      expect(loadingStates).toContain(true);
      req.flush(mockLoginResponse);
    });
  });

  describe('Register', () => {
    it('should register successfully', (done) => {
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

      service.register(registerData).subscribe(response => {
        expect(response).toEqual(mockRegisterResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/register`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(registerData);
      req.flush(mockRegisterResponse);
    });

    it('should handle registration error', (done) => {
      const registerData: RegisterRequest = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User'
      };

      service.register(registerData).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/register`);
      req.flush({ message: 'Username already exists' }, { status: 400, statusText: 'Bad Request' });
    });
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
    it('should refresh token successfully', (done) => {
      localStorage.setItem('refresh_token', 'old-refresh-token');

      const mockRefreshResponse = {
        token: 'new-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      };

      service.refreshToken().subscribe(response => {
        expect(response).toEqual(mockRefreshResponse);
        expect(service.getToken()).toBe('new-token');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush(mockRefreshResponse);
    });

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

    it('should logout on refresh token error', (done) => {
      localStorage.setItem('refresh_token', 'invalid-refresh-token');
      spyOn(service, 'logout');

      service.refreshToken().subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(service.logout).toHaveBeenCalled();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiGateway}/api/v1/auth/refresh`);
      req.flush({ message: 'Invalid refresh token' }, { status: 401, statusText: 'Unauthorized' });
    });
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

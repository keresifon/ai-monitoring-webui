import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  PasswordChangeRequest,
  AuthState
} from '../../shared/models/auth.model';

/**
 * Authentication service for managing user authentication and authorization
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiGateway}/api/v1/auth`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_data';

  // Auth state management
  private authState$ = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    loading: false,
    error: null
  });

  // Public observables
  public readonly isAuthenticated$ = this.authState$.pipe(
    map(state => state.isAuthenticated)
  );
  
  public readonly currentUser$ = this.authState$.pipe(
    map(state => state.user)
  );
  
  public readonly loading$ = this.authState$.pipe(
    map(state => state.loading)
  );
  
  public readonly error$ = this.authState$.pipe(
    map(state => state.error)
  );

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuthState();
  }

  /**
   * Initialize auth state from local storage
   */
  private initializeAuthState(): void {
    const token = this.getStoredToken();
    const refreshToken = this.getStoredRefreshToken();
    const user = this.getStoredUser();

    if (token && user) {
      this.authState$.next({
        isAuthenticated: true,
        user,
        token,
        refreshToken,
        loading: false,
        error: null
      });
    }
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          this.handleAuthSuccess(response);
        }),
        catchError(error => {
          this.handleAuthError(error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Register new user
   */
  register(userData: RegisterRequest): Observable<RegisterResponse> {
    this.setLoading(true);
    this.clearError();

    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, userData)
      .pipe(
        tap(() => {
          this.setLoading(false);
        }),
        catchError(error => {
          this.handleAuthError(error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Logout user
   */
  logout(): void {
    // Call logout endpoint
    this.http.post(`${this.apiUrl}/logout`, {})
      .pipe(
        catchError(error => {
          console.error('Logout error:', error);
          return throwError(() => error);
        })
      )
      .subscribe();

    // Clear local state
    this.clearAuthData();
    this.authState$.next({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      error: null
    });

    // Redirect to login
    this.router.navigate(['/login']);
  }

  /**
   * Refresh authentication token
   */
  refreshToken(): Observable<TokenRefreshResponse> {
    const refreshToken = this.getStoredRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request: TokenRefreshRequest = { refreshToken };

    return this.http.post<TokenRefreshResponse>(`${this.apiUrl}/refresh`, request)
      .pipe(
        tap(response => {
          this.storeToken(response.token);
          this.storeRefreshToken(response.refreshToken);
          
          const currentState = this.authState$.value;
          this.authState$.next({
            ...currentState,
            token: response.token,
            refreshToken: response.refreshToken
          });
        }),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        })
      );
  }

  /**
   * Change user password
   */
  changePassword(request: PasswordChangeRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/change-password`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.authState$.value.user;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.authState$.value.token || this.getStoredToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState$.value.isAuthenticated;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.roles.includes(role) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.hasRole(role));
  }

  /**
   * Check if user has all specified roles
   */
  hasAllRoles(roles: string[]): boolean {
    return roles.every(role => this.hasRole(role));
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(response: LoginResponse): void {
    this.storeToken(response.token);
    this.storeRefreshToken(response.refreshToken);
    this.storeUser(response.user);

    this.authState$.next({
      isAuthenticated: true,
      user: response.user,
      token: response.token,
      refreshToken: response.refreshToken,
      loading: false,
      error: null
    });
  }

  /**
   * Handle authentication error
   */
  private handleAuthError(error: HttpErrorResponse): void {
    let errorMessage = 'An error occurred during authentication';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Error Code: ${error.status}`;
    }

    this.authState$.next({
      ...this.authState$.value,
      loading: false,
      error: errorMessage
    });
  }

  /**
   * Set loading state
   */
  private setLoading(loading: boolean): void {
    this.authState$.next({
      ...this.authState$.value,
      loading
    });
  }

  /**
   * Clear error state
   */
  private clearError(): void {
    this.authState$.next({
      ...this.authState$.value,
      error: null
    });
  }

  /**
   * Store token in local storage
   */
  private storeToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Store refresh token in local storage
   */
  private storeRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Store user data in local storage
   */
  private storeUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Get stored token
   */
  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  private getStoredRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get stored user
   */
  private getStoredUser(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Clear all auth data from storage
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';

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

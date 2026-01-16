import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../services/auth.service';
import { authGuard, roleGuard, guestGuard } from './auth.guard';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

describe('Auth Guards', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let isAuthenticatedSubject: BehaviorSubject<boolean>;

  beforeEach(() => {
    isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
    
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['hasAnyRole'], {
      isAuthenticated$: isAuthenticatedSubject.asObservable()
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: {} as any },
          { path: 'dashboard', component: {} as any },
          { path: 'unauthorized', component: {} as any }
        ]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  describe('authGuard', () => {
    it('should allow access when authenticated', async () => {
      isAuthenticatedSubject.next(true);

      const result = authGuard({} as any, { url: '/protected' } as any);
      const allowed = await firstValueFrom(result as any);
      
      expect(allowed).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to login when not authenticated', async () => {
      isAuthenticatedSubject.next(false);

      const result = authGuard({} as any, { url: '/protected' } as any);
      const allowed = await firstValueFrom(result as any);
      
      expect(allowed).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/protected' } });
    });
  });

  describe('roleGuard', () => {
    it('should allow access when user has required role', async () => {
      isAuthenticatedSubject.next(true);
      authService.hasAnyRole.and.returnValue(true);

      const guard = roleGuard(['admin']);
      const result = guard({} as any, { url: '/admin' } as any);
      const allowed = await firstValueFrom(result as any);
      
      expect(allowed).toBe(true);
      expect(authService.hasAnyRole).toHaveBeenCalledWith(['admin']);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to unauthorized when user lacks required role', async () => {
      isAuthenticatedSubject.next(true);
      authService.hasAnyRole.and.returnValue(false);

      const guard = roleGuard(['admin']);
      const result = guard({} as any, { url: '/admin' } as any);
      const allowed = await firstValueFrom(result as any);
      
      expect(allowed).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/unauthorized']);
    });

    it('should redirect to login when not authenticated', async () => {
      isAuthenticatedSubject.next(false);

      const guard = roleGuard(['admin']);
      const result = guard({} as any, { url: '/admin' } as any);
      const allowed = await firstValueFrom(result as any);
      
      expect(allowed).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/admin' } });
    });
  });

  describe('guestGuard', () => {
    it('should allow access when not authenticated', async () => {
      isAuthenticatedSubject.next(false);

      const result = guestGuard({} as any, { url: '/login' } as any);
      const allowed = await firstValueFrom(result as any);
      
      expect(allowed).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when authenticated', async () => {
      isAuthenticatedSubject.next(true);

      const result = guestGuard({} as any, { url: '/login' } as any);
      const allowed = await firstValueFrom(result as any);
      
      expect(allowed).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});

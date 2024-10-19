import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = '/api/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  
  private storage: Storage | null = null;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  isAuthenticated$: Observable<boolean>;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialize storage and authentication state
    this.initializeStorage();
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    
    // Check token validity on service initialization
    this.checkAuthStatus();
  }

  private initializeStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Test localStorage availability
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        this.storage = localStorage;
      } catch (e) {
        console.warn('localStorage not available, falling back to memory storage');
        this.storage = this.createMemoryStorage();
      }
    } else {
      // Use memory storage for SSR
      this.storage = this.createMemoryStorage();
    }
  }

  private createMemoryStorage(): Storage {
    const memoryStorage = new Map<string, string>();
    
    return {
      length: 0,
      clear: () => memoryStorage.clear(),
      getItem: (key: string) => memoryStorage.get(key) || null,
      key: (index: number) => Array.from(memoryStorage.keys())[index],
      removeItem: (key: string) => memoryStorage.delete(key),
      setItem: (key: string, value: string) => memoryStorage.set(key, value)
    } as Storage;
  }

  private hasValidToken(): boolean {
    const token = this.storage?.getItem(this.TOKEN_KEY);
    if (!token) return false;
    
    try {
      // Basic token expiration check
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  private async checkAuthStatus() {
    if (this.hasValidToken()) {
      try {
        await this.getCurrentUserFromApi().toPromise();
        this.isAuthenticatedSubject.next(true);
      } catch {
        this.logout();
      }
    }
  }

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, {
      username,
      email,
      password
    }).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, {
      email,
      password
    }).pipe(
      tap(response => this.handleAuthSuccess(response))
    );
  }

  async logout() {
    this.storage?.removeItem(this.TOKEN_KEY);
    this.storage?.removeItem(this.USER_KEY);
    this.isAuthenticatedSubject.next(false);
    await this.router.navigate(['/login']);
  }

  getCurrentUser(): User | null {
    const userStr = this.storage?.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  getCurrentUserFromApi(): Observable<{ user: User }> {
    if (!this.hasValidToken()) {
      return of({ user: null as any });
    }
    return this.http.get<{ user: User }>(`${this.API_URL}/me`);
  }

  getAuthToken(): string | null {
    return this.storage?.getItem(this.TOKEN_KEY) ?? null;
  }

  private handleAuthSuccess(response: AuthResponse) {
    this.storage?.setItem(this.TOKEN_KEY, response.token);
    this.storage?.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.isAuthenticatedSubject.next(true);
  }
}
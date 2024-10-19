import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

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
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check token validity on service initialization
    this.checkAuthStatus();
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
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
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.isAuthenticatedSubject.next(false);
    await this.router.navigate(['/login']);
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  getCurrentUserFromApi(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.API_URL}/me`);
  }

  getAuthToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private handleAuthSuccess(response: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    this.isAuthenticatedSubject.next(true);
  }
}
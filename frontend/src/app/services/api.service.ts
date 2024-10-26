import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

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
export class ApiService {
  private readonly API_URL = 'https://music-app-backend-h3sd.onrender.com/api/auth';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

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

  getCurrentUser(): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${this.API_URL}/me`);
  }

  private handleAuthSuccess(response: AuthResponse) {
    this.authService.setAuthToken(response.token);
    this.authService.setCurrentUser(response.user);
  }
  updateProfile(username: string): Observable<{user: User}> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getAuthToken()}`,
      'Content-Type': 'application/json'
    });

    return this.http.put<{user: User}>(`${this.API_URL}/users/profile`, 
      { username }, 
      { headers }
    ).pipe(
      tap(response => {
        // Update stored user data after successful update
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          currentUser.username = response.user.username;
          this.authService.setCurrentUser(currentUser);
        }
      })
    );
  }
}
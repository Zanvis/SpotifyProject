import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

interface User {
  id: string;
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';
  
  private storage: Storage | null = null;
  private isAuthenticatedSubject: BehaviorSubject<boolean>;
  private currentUserSubject: BehaviorSubject<User | null>;
  
  isAuthenticated$: Observable<boolean>;
  currentUser$: Observable<User | null>;
  
  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeStorage();
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getCurrentUser());
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private initializeStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        this.storage = localStorage;
      } catch (e) {
        console.warn('localStorage not available, falling back to memory storage');
        this.storage = this.createMemoryStorage();
      }
    } else {
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
    const token = this.getAuthToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  getAuthToken(): string | null {
    return this.storage?.getItem(this.TOKEN_KEY) || null;
  }

  setAuthToken(token: string): void {
    this.storage?.setItem(this.TOKEN_KEY, token);
    this.isAuthenticatedSubject.next(true);
  }

  removeAuthToken(): void {
    this.storage?.removeItem(this.TOKEN_KEY);
    this.isAuthenticatedSubject.next(false);
  }

  getCurrentUser(): User | null {
    const userStr = this.storage?.getItem(this.USER_KEY);
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user: User): void {
    this.storage?.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  async logout() {
    this.removeAuthToken();
    this.storage?.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    await this.router.navigate(['/login']);
  }
}
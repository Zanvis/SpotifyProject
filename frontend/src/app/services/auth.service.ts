import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable, shareReplay } from 'rxjs';
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
  private readonly AUTH_STATE_KEY = 'auth_state';
  
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
    
    // Initialize with persisted state
    const persistedState = this.getPersistedAuthState();
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(persistedState.isAuthenticated);
    this.currentUserSubject = new BehaviorSubject<User | null>(persistedState.currentUser);
    
    // Share the observables to prevent multiple subscriptions from causing multiple emissions
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable().pipe(shareReplay(1));
    this.currentUser$ = this.currentUserSubject.asObservable().pipe(shareReplay(1));

    // Validate token on initialization
    if (this.isAuthenticatedSubject.value) {
      this.validateAndUpdateAuthState();
    }
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
      length: memoryStorage.size,
      clear: () => memoryStorage.clear(),
      getItem: (key: string) => memoryStorage.get(key) || null,
      key: (index: number) => Array.from(memoryStorage.keys())[index],
      removeItem: (key: string) => memoryStorage.delete(key),
      setItem: (key: string, value: string) => memoryStorage.set(key, value)
    } as Storage;
  }

  private getPersistedAuthState(): { isAuthenticated: boolean; currentUser: User | null } {
    const savedState = this.storage?.getItem(this.AUTH_STATE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        return {
          isAuthenticated: this.hasValidToken(),
          currentUser: state.currentUser
        };
      } catch {
        this.clearPersistedState();
      }
    }
    return { isAuthenticated: this.hasValidToken(), currentUser: this.getCurrentUser() };
  }

  private persistAuthState(): void {
    const state = {
      isAuthenticated: this.isAuthenticatedSubject.value,
      currentUser: this.currentUserSubject.value
    };
    this.storage?.setItem(this.AUTH_STATE_KEY, JSON.stringify(state));
  }

  private clearPersistedState(): void {
    this.storage?.removeItem(this.AUTH_STATE_KEY);
  }

  private hasValidToken(): boolean {
    const token = this.getAuthToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isValid = payload.exp > Date.now() / 1000;
      
      // If token is invalid, clean up
      if (!isValid) {
        this.clearAuthState();
      }
      
      return isValid;
    } catch {
      this.clearAuthState();
      return false;
    }
  }

  private validateAndUpdateAuthState(): void {
    const isValid = this.hasValidToken();
    if (!isValid) {
      this.clearAuthState();
    }
  }

  private clearAuthState(): void {
    this.storage?.removeItem(this.TOKEN_KEY);
    this.storage?.removeItem(this.USER_KEY);
    this.clearPersistedState();
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  getAuthToken(): string | null {
    return this.storage?.getItem(this.TOKEN_KEY) ?? null;
  }

  setAuthToken(token: string): void {
    if (!token) {
      this.clearAuthState();
      return;
    }

    this.storage?.setItem(this.TOKEN_KEY, token);
    this.isAuthenticatedSubject.next(true);
    this.persistAuthState();
  }

  getCurrentUser(): User | null {
    const userStr = this.storage?.getItem(this.USER_KEY);
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      this.clearAuthState();
      return null;
    }
  }

  setCurrentUser(user: User): void {
    if (!user) {
      this.clearAuthState();
      return;
    }

    this.storage?.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.persistAuthState();
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value && this.hasValidToken();
  }

  async logout() {
    this.clearAuthState();
    await this.router.navigate(['/login']);
  }

  // Method to handle initialization
  async initialize(): Promise<void> {
    this.validateAndUpdateAuthState();
    if (this.isAuthenticated()) {
      const user = this.getCurrentUser();
      if (!user) {
        await this.logout();
      }
    }
  }
}

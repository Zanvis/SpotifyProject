import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, ElementRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterLink, 
    CommonModule, 
    RouterLinkActive
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();
  isMenuOpen = false;
  isUserMenuOpen = false;
  isAuthenticated = false;
  username = '';
  showTooltip = false;
  isDarkMode = true;
  private authSubscription: Subscription | undefined;
  private storageAvailable = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Test storage availability
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        this.storageAvailable = true;

        // Check if user has previously selected a theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
          this.isDarkMode = savedTheme === 'dark';
        } else {
          // If no saved theme, check system preference
          this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        this.applyTheme();
      } catch (error) {
        console.warn('LocalStorage not available:', error);
        this.storageAvailable = false;
        // Fallback to default dark theme
        this.isDarkMode = true;
        this.applyTheme();
      }
    }
  }

  async ngOnInit() {
    // Initialize auth state
    await this.authService.initialize();

    // Subscribe to auth state changes
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = this.authService.isAuthenticated();
      this.username = user?.username || '';
    });

    // Listen for system theme changes
    if (isPlatformBrowser(this.platformId)) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', e => {
          if (!this.storageAvailable || !localStorage.getItem('theme')) {
            this.isDarkMode = e.matches;
            this.applyTheme();
          }
        });
    }
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  toggleTheme() {
    if (isPlatformBrowser(this.platformId)) {
      this.isDarkMode = !this.isDarkMode;
      if (this.storageAvailable) {
        try {
          localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
        } catch (error) {
          console.warn('Error saving theme preference:', error);
        }
      }
      this.applyTheme();
    }
  }

  private applyTheme() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    const userMenuElement = this.elementRef.nativeElement.querySelector('.user-menu-container');
    if (!userMenuElement) return;
    
    const clickedInside = userMenuElement.contains(event.target as Node);
    if (!clickedInside && this.isUserMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  toggleUserMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  async logout() {
    await this.authService.logout();
    this.isUserMenuOpen = false;
    this.isMenuOpen = false;
  }

  async handleUploadClick() {
    // Check current auth state before navigating
    this.authService.isAuthenticated$.pipe(take(1)).subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.router.navigate(['/upload']);
      }
    });
  }

  toggleTooltip() {
    this.showTooltip = !this.showTooltip;
  }
}
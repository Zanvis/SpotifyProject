import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, ElementRef, HostListener, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('userMenuContainer') userMenuContainer!: ElementRef;
  @ViewChild('mobileMenuContainer') mobileMenuContainer!: ElementRef;
  @ViewChild('hamburgerButton') hamburgerButton!: ElementRef;
  currentYear = new Date().getFullYear();
  isMenuOpen = false;
  isUserMenuOpen = false;
  isAuthenticated = false;
  username = '';
  showTooltip = false;
  isDarkMode = true;
  private authSubscription: Subscription | undefined;

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
        // Check if user has previously selected a theme
        const savedTheme = window.localStorage.getItem('theme');
        if (savedTheme) {
          this.isDarkMode = savedTheme === 'dark';
        } else {
          // If no saved theme, check system preference
          this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        this.applyTheme();
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        // Fallback to default dark theme if localStorage is not available
        this.isDarkMode = true;
        this.applyTheme();
      }
    }
  }

  ngOnInit() {
    this.authSubscription = combineLatest([
      this.authService.isAuthenticated$,
      this.authService.currentUser$
    ]).subscribe(([isAuthenticated, currentUser]) => {
      this.isAuthenticated = isAuthenticated;
      this.username = currentUser?.username || '';
    });

    // Listen for system theme changes
    if (isPlatformBrowser(this.platformId)) {
      window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', e => {
          if (!window.localStorage.getItem('theme')) {
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
      try {
        window.localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
      } catch (error) {
        console.error('Error saving theme preference:', error);
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
    // Handle user menu clicks
    if (this.userMenuContainer && this.isUserMenuOpen) {
      const clickedInUserMenu = this.userMenuContainer.nativeElement.contains(event.target as Node);
      if (!clickedInUserMenu) {
        this.isUserMenuOpen = false;
      }
    }

    // Handle mobile menu clicks
    if (this.mobileMenuContainer && this.hamburgerButton && this.isMenuOpen) {
      const clickedInMobileMenu = this.mobileMenuContainer.nativeElement.contains(event.target as Node);
      const clickedHamburger = this.hamburgerButton.nativeElement.contains(event.target as Node);
      
      if (!clickedInMobileMenu && !clickedHamburger) {
        this.isMenuOpen = false;
      }
    }
  }

  toggleMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
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
    if (this.isAuthenticated) {
      try {
        await this.router.navigate(['/upload']);
        // Close menus after successful navigation
        this.isMenuOpen = false;
        this.isUserMenuOpen = false;
      } catch (error) {
        console.error('Navigation error:', error);
      }
    } else {
      // Show tooltip for unauthenticated users
      this.showTooltip = true;
      setTimeout(() => {
        this.showTooltip = false;
      }, 3000); // Hide tooltip after 3 seconds
    }
  }

  toggleTooltip() {
    this.showTooltip = !this.showTooltip;
  }
}
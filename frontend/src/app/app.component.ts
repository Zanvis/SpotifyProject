import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, ElementRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Subscription } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterLink, 
    CommonModule, 
    RouterLinkActive,
    TranslatePipe,
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
  uploadTooltip = false;
  jamSessionTooltip = false;
  isDarkMode = true;
  private authSubscription: Subscription | undefined;
  private storageAvailable = false;
  currentLanguage: string = 'en';
  private isBrowser: boolean;
  isLanguageDropdownOpen = false;
  availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'pl', name: 'Polski' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    private translate: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeTheme();
    this.isBrowser = isPlatformBrowser(this.platformId);
  
    this.translate.addLangs(['en', 'pl']);
    this.translate.setDefaultLang('en');
    
    this.setInitialLanguage();
  }
  
  private setInitialLanguage() {
    if (!this.isBrowser) return;
  
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage && ['en', 'pl'].includes(savedLanguage)) {
      this.currentLanguage = savedLanguage;
      this.translate.use(savedLanguage);
      return;
    }
  
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    
    const supportedLang = this.availableLanguages.find(lang => lang.code === browserLang);
    
    if (supportedLang) {
      this.currentLanguage = browserLang;
      this.translate.use(browserLang);
    } else {
      this.currentLanguage = 'en';
      this.translate.use('en');
    }
  
    try {
      localStorage.setItem('app-language', this.currentLanguage);
    } catch (error) {
      console.warn('Error saving language preference:', error);
    }
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside2(event: Event) {
    const languageDropdownElement = this.elementRef.nativeElement.querySelector('.language-dropdown-container');
    if (!languageDropdownElement) return;
    
    const clickedInside = languageDropdownElement.contains(event.target as Node);
    if (!clickedInside && this.isLanguageDropdownOpen) {
      this.isLanguageDropdownOpen = false;
    }
  }

  toggleLanguageDropdown(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
  }

  selectLanguage(languageCode: string) {
    this.currentLanguage = languageCode;
    this.translate.use(languageCode);
    
    // Safe localStorage setting
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem('app-language', languageCode);
      } catch (error) {
        console.warn('Error saving language preference:', error);
      }
    }

    this.isLanguageDropdownOpen = false;
  }
  getSelectedLanguageName(): string | undefined {
    return this.availableLanguages.find(lang => lang.code === this.currentLanguage)?.name;
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

  async handleUploadClick(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (this.isAuthenticated) {
      await this.router.navigate(['/upload']);
      this.isMenuOpen = false;
    }
  }

  toggleTooltip() {
    this.showTooltip = !this.showTooltip;
  }

  toggleUploadTooltip() {
    this.uploadTooltip = !this.uploadTooltip;
  }

  toggleJamSessionTooltip() {
    this.jamSessionTooltip = !this.jamSessionTooltip;
  }
  async handleJamSessionClick(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (this.isAuthenticated) {
      await this.router.navigate(['/jam-session']);
      this.isMenuOpen = false;
    }
  }
}
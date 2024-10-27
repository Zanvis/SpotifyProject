import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, ElementRef, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { SongListComponent } from './components/song-list/song-list.component';
import { SongUploadComponent } from './components/song-upload/song-upload.component';
import { TeamComponent } from './components/team/team.component';
import { LandingComponent } from './components/landing/landing.component';
import { PlaylistComponent } from './components/playlist/playlist.component';
import { AuthService } from './services/auth.service';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { combineLatest, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, AudioPlayerComponent, SongListComponent, SongUploadComponent, TeamComponent, LandingComponent, RouterLinkActive, PlaylistComponent, LoginComponent, RegisterComponent],
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
  private userMenuRef: ElementRef;

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.userMenuRef = elementRef;
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
    const userMenuElement = this.userMenuRef.nativeElement.querySelector('.user-menu-container');
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

  handleUploadClick() {
    if (this.isAuthenticated) {
      this.router.navigate(['/upload']);
    }
  }

  toggleTooltip() {
    this.showTooltip = !this.showTooltip;
  }
}
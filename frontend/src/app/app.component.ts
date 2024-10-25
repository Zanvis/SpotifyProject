import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ElementRef, HostListener } from '@angular/core';
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
import { ProfileComponent } from './components/profile/profile.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, AudioPlayerComponent, SongListComponent, SongUploadComponent, TeamComponent, LandingComponent, RouterLinkActive, PlaylistComponent, LoginComponent, RegisterComponent, ProfileComponent],
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
  private authSubscription: Subscription | undefined;
  private userMenuRef: ElementRef;

  constructor(
    private authService: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {
    this.userMenuRef = elementRef;
  }

  ngOnInit() {
    this.authSubscription = combineLatest([
      this.authService.isAuthenticated$,
      this.authService.currentUser$
    ]).subscribe(([isAuthenticated, currentUser]) => {
      this.isAuthenticated = isAuthenticated;
      this.username = currentUser?.username || '';
    });
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
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
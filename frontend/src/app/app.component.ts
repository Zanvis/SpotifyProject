import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AudioPlayerComponent } from './components/audio-player/audio-player.component';
import { SongListComponent } from './components/song-list/song-list.component';
import { SongUploadComponent } from './components/song-upload/song-upload.component';
import { TeamComponent } from './components/team/team.component';
import { LandingComponent } from './components/landing/landing.component';
import { PlaylistComponent } from './components/playlist/playlist.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, AudioPlayerComponent, SongListComponent, SongUploadComponent, TeamComponent, LandingComponent, RouterLinkActive, PlaylistComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  title = 'frontend';
  isMenuOpen = false;
  currentYear = new Date().getFullYear();
  
  isUserMenuOpen = false;
  isAuthenticated = false;
  username = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe(
      isAuthenticated => {
        this.isAuthenticated = isAuthenticated;
        if (isAuthenticated) {
          this.username = this.authService.getCurrentUser()?.username || '';
        }
      }
    );
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.isUserMenuOpen = false;
    }
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  async logout() {
    await this.authService.logout();
    this.isUserMenuOpen = false;
    this.isMenuOpen = false;
    this.router.navigate(['/login']);
  }
}

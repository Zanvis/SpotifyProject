import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Playlist, PlaylistService } from '../../services/playlist.service';
import { Song } from '../../services/song.service';
import { AudioPlayerComponent } from '../audio-player/audio-player.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [CommonModule, FormsModule, AudioPlayerComponent, TranslatePipe],
  templateUrl: './playlist.component.html',
  styleUrl: './playlist.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaylistComponent implements OnInit, OnDestroy {
  playlists: Playlist[] = [];
  newPlaylistName: string = '';
  private subscription = new Subscription();
  currentSong: Song | null = null;
  currentPlaylist: Playlist | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private playlistService: PlaylistService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.playlistService.playlists$.subscribe({
        next: (playlists) => {
          this.playlists = playlists;
          this.loading = false;
          this.error = null;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading playlists:', error);
          this.error = 'PLAYLISTS.ERROR.LOADING_FAILED';
          this.loading = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  createPlaylist(): void {
    if (this.newPlaylistName.trim()) {
      this.loading = true;
      this.playlistService.createPlaylist(this.newPlaylistName.trim()).subscribe({
        next: () => {
          this.newPlaylistName = '';
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error creating playlist:', error);
          this.error = 'PLAYLISTS.ERROR.CREATE_FAILED';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  deletePlaylist(playlistId: string): void {
    if (confirm(this.translateService.instant('PLAYLISTS.CONFIRM', { defaultValue: 'Are you sure you want to delete this playlist?' }))) {
      this.loading = true;
      this.playlistService.deletePlaylist(playlistId).subscribe({
        next: () => {
          if (this.currentPlaylist?._id === playlistId) {
            this.currentPlaylist = null;
            this.currentSong = null;
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error deleting playlist:', error);
          this.error = 'PLAYLISTS.ERROR.DELETE_FAILED';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  removeSongFromPlaylist(playlistId: string, songId: string): void {
    this.playlistService.removeSongFromPlaylist(playlistId, songId).subscribe({
      next: () => this.cdr.markForCheck(),
      error: error => {
        console.error('Error removing song from playlist:', error);
        this.error = 'PLAYLISTS.ERROR.REMOVE_FAILED';
        this.cdr.markForCheck();
      }
    });
  }

  playPlaylist(playlist: Playlist): void {
    if (playlist.songs.length > 0) {
      this.currentPlaylist = playlist;
      this.currentSong = playlist.songs[0];
      this.cdr.markForCheck();
    }
  }

  playSong(song: Song, playlist: Playlist): void {
    this.currentSong = song;
    this.currentPlaylist = playlist;
    this.cdr.markForCheck();
  }

  onSongEnded(): void {
    if (this.currentPlaylist) {
      const currentIndex = this.currentPlaylist.songs.findIndex(song => song._id === this.currentSong?._id);
      if (currentIndex > -1 && currentIndex < this.currentPlaylist.songs.length - 1) {
        this.currentSong = this.currentPlaylist.songs[currentIndex + 1];
      } else {
        this.currentSong = null;
        this.currentPlaylist = null;
      }
      this.cdr.markForCheck();
    }
  }

  onSongChanged(song: Song): void {
    this.currentSong = song;
    this.cdr.markForCheck();
  }

  formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds <= 0) {
      return '0:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  trackByPlaylistId(index: number, playlist: Playlist): string {
    return playlist._id;
  }
}
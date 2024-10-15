import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { Playlist, PlaylistService } from '../../services/playlist.service';
import { Song, SongService } from '../../services/song.service';
import { AudioPlayerComponent } from '../audio-player/audio-player.component';

@Component({
  selector: 'app-playlist',
  standalone: true,
  imports: [CommonModule, FormsModule, AudioPlayerComponent],
  templateUrl: './playlist.component.html',
  styleUrl: './playlist.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaylistComponent implements OnInit, OnDestroy {
  playlists$: Observable<Playlist[]>;
  newPlaylistName: string = '';
  private subscription: Subscription = new Subscription();
  currentSong: Song | null = null;
  currentPlaylist: Playlist | null = null;
  
  constructor(
    private playlistService: PlaylistService,
    private songService: SongService,
    private cdr: ChangeDetectorRef
  ) {
    this.playlists$ = this.playlistService.playlists$;
  }

  ngOnInit(): void {
    this.loadPlaylists();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  loadPlaylists(): void {
    this.subscription.add(
      this.playlistService.getPlaylists().subscribe({
        next: () => this.cdr.markForCheck(),
        error: error => console.error('Error loading playlists:', error)
      })
    );
  }
  createPlaylist(): void {
    if (this.newPlaylistName.trim()) {
      this.playlistService.createPlaylist(this.newPlaylistName.trim()).subscribe({
        next: () => {
          this.newPlaylistName = '';
          this.cdr.markForCheck();
        },
        error: error => console.error('Error creating playlist:', error)
      });
    }
  }

  deletePlaylist(playlistId: string): void {
    if (confirm('Are you sure you want to delete this playlist?')) {
      this.playlistService.deletePlaylist(playlistId).subscribe({
        error: error => console.error('Error deleting playlist:', error)
      });
    }
  }

  removeSongFromPlaylist(playlistId: string, songId: string): void {
    this.playlistService.removeSongFromPlaylist(playlistId, songId).subscribe({
      next: () => this.cdr.markForCheck(),
      error: error => console.error('Error removing song from playlist:', error)
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
  refreshPlaylists(): void {
    this.subscription.add(
      this.playlistService.refreshPlaylists().subscribe({
        next: () => this.cdr.markForCheck(),
        error: error => console.error('Error refreshing playlists:', error)
      })
    );
  }
}
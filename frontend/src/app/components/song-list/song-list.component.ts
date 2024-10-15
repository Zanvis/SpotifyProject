import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Song, SongService } from '../../services/song.service';
import { AudioPlayerComponent } from '../audio-player/audio-player.component';
import { Subscription } from 'rxjs';
import { Playlist, PlaylistService } from '../../services/playlist.service';

@Component({
  selector: 'app-song-list',
  standalone: true,
  imports: [CommonModule, AudioPlayerComponent],
  templateUrl: './song-list.component.html',
  styleUrl: './song-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongListComponent implements OnInit, OnDestroy {
  songs: Song[] = [];
  currentSong: Song | null = null;
  private subscription: Subscription = new Subscription();
  playlists: Playlist[] = [];
  currentPlaylist: Playlist | null = null;
  openDropdownId: string | null = null;

  constructor(
    private songService: SongService,
    private playlistService: PlaylistService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadSongs();
    this.loadPlaylists();
    this.subscription.add(
      this.songService.songs$.subscribe(songs => {
        this.songs = songs;
        this.cdr.markForCheck();
      })
    );
    this.subscription.add(
      this.playlistService.playlists$.subscribe(playlists => {
        this.playlists = playlists;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadSongs(): void {
    this.songService.getSongs().subscribe({
      error: (error: any) => {
        console.error('Error loading songs:', error);
      },
    });
  }

  // playSong(song: Song): void {
  //   this.currentSong = song;
  //   this.cdr.markForCheck();
  // }
  playSong(song: Song, playlist?: Playlist): void {
    this.currentSong = song;
    if (playlist) {
      this.currentPlaylist = playlist;
    } else {
      // If no playlist is provided, try to find the playlist that contains this song
      this.currentPlaylist = this.playlists.find(p => p.songs.some(s => s._id === song._id)) || null;
    }
    this.cdr.markForCheck();
  }
  onSongEnded(): void {
    const currentIndex = this.songs.findIndex(song => song._id === this.currentSong?._id);
    if (currentIndex > -1 && currentIndex < this.songs.length - 1) {
      this.currentSong = this.songs[currentIndex + 1];
    } else {
      this.currentSong = null;
    }
    this.cdr.markForCheck();
  }

  onSongChanged(song: Song): void {
    this.currentSong = song;
    this.cdr.markForCheck();
  }

  deleteSong(id: string): void {
    if (confirm('Are you sure you want to delete this song?')) {
      // Optimistic update
      this.songs = this.songs.filter(song => song._id !== id);
      if (this.currentSong?._id === id) {
        this.currentSong = null;
      }
      this.cdr.markForCheck();

      this.songService.deleteSong(id).subscribe({
        error: (err) => {
          console.error('Error deleting song:', err);
          // Revert the change if the delete operation failed
          this.loadSongs();
        }
      });
    }
  }
  // loadPlaylists(): void {
  //   this.playlistService.getPlaylists().subscribe({
  //     error: (error: any) => {
  //       console.error('Error loading playlists:', error);
  //     },
  //   });
  // }

  // addToPlaylist(song: Song, playlistId: string): void {
  //   this.playlistService.addSongToPlaylist(playlistId, song).subscribe({
  //     next: (updatedPlaylist) => {
  //       this.playlists = this.playlists.map(p => 
  //         p._id === updatedPlaylist._id ? updatedPlaylist : p
  //       );
  //       this.cdr.markForCheck();
  //     },
  //     error: (err) => {
  //       console.error('Error adding song to playlist:', err);
  //     }
  //   });
  // }
  loadPlaylists(): void {
    this.playlistService.getPlaylists().subscribe({
      error: (error: any) => {
        console.error('Error loading playlists:', error);
      },
    });
  }

  // addToPlaylist(song: Song, playlistId: string): void {
  //   this.playlistService.addSongToPlaylist(playlistId, song).subscribe({
  //     next: (updatedPlaylist) => {
  //       this.playlists = this.playlists.map(p => 
  //         p._id === updatedPlaylist._id ? updatedPlaylist : p
  //       );
  //       this.cdr.markForCheck();
  //     },
  //     error: (err) => {
  //       console.error('Error adding song to playlist:', err);
  //     }
  //   });
  // }
  toggleDropdown(songId: string): void {
    this.openDropdownId = this.openDropdownId === songId ? null : songId;
    this.cdr.markForCheck();
  }
  addToPlaylist(song: Song, playlistId: string): void {
    this.playlistService.addSongToPlaylist(playlistId, song).subscribe({
      next: () => {
        // The playlist service will handle updating the playlists
        // No need to manually update the local playlists array
        this.openDropdownId = null;
        this.cdr.markForCheck();
        window.location.reload();
      },
      error: (err) => {
        console.error('Error adding song to playlist:', err);
        // Optionally, show an error message to the user
      }
    });
  }
  formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds <= 0) {
      return '0:00';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
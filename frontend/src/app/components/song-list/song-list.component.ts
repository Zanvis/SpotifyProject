import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Song, SongService } from '../../services/song.service';
import { AudioPlayerComponent } from '../audio-player/audio-player.component';
import { Subscription, timer } from 'rxjs';
import { Playlist, PlaylistService } from '../../services/playlist.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-song-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AudioPlayerComponent, TranslatePipe],
  templateUrl: './song-list.component.html',
  styleUrl: './song-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongListComponent implements OnInit, OnDestroy {
  songs: Song[] = [];
  filteredSongs: Song[] = [];
  currentSong: Song | null = null;
  private subscription: Subscription = new Subscription();
  playlists: Playlist[] = [];
  currentPlaylist: Playlist | null = null;
  openDropdownId: string | null = null;
  isLoading = true;
  loadingTimeout = false;
  retryCount = 0;
  maxRetries = 3;
  currentUser: any;
  searchQuery: string = '';

  constructor(
    private songService: SongService,
    private playlistService: PlaylistService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadInitialData();
    this.subscription.add(
      this.songService.songs$.subscribe(songs => {
        this.songs = songs;
        this.filterSongs();
        this.cdr.markForCheck();
      })
    );
    this.subscription.add(
      this.playlistService.playlists$.subscribe(playlists => {
        this.playlists = playlists;
        this.cdr.markForCheck();
      })
    );
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.cdr.markForCheck();
      })
    );
  }
  loadInitialData(): void {
    this.isLoading = true;
    this.loadingTimeout = false;
    this.cdr.markForCheck();

    // Set a timeout to show extended loading message if server takes too long
    const timeoutSubscription = timer(5000).subscribe(() => {
      if (this.isLoading) {
        this.loadingTimeout = true;
        this.cdr.markForCheck();
      }
    });

    this.songService.getSongs().subscribe({
      next: () => {
        this.isLoading = false;
        this.loadingTimeout = false;
        this.retryCount = 0;
        timeoutSubscription.unsubscribe();
        this.loadPlaylists();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading songs:', error);
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => {
            this.loadInitialData();
          }, 2000 * this.retryCount); // Exponential backoff
        } else {
          this.isLoading = false;
          this.loadingTimeout = false;
          this.cdr.markForCheck();
        }
      }
    });
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
    if (confirm(this.translateService.instant('SONG_LIST.CONFIRM', { defaultValue: 'Are you sure you want to delete this song?' }))) {
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
        this.openDropdownId = null;
        this.cdr.markForCheck();
        window.location.reload();
      },
      error: (err) => {
        console.error('Error adding song to playlist:', err);
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

  filterSongs(): void {
    if (!this.searchQuery.trim()) {
      this.filteredSongs = this.songs;
    } else {
      const query = this.searchQuery.toLowerCase().trim();
      this.filteredSongs = this.songs.filter(song =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query) ||
        song.album.toLowerCase().includes(query)
      );
    }
    this.cdr.markForCheck();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.filterSongs();
  }
  
  handleImageError(event: any) {  
    event.target.src = 'assets/default-album.png';
  }
}
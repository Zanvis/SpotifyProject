// import { CommonModule } from '@angular/common';
// import { Component, OnInit } from '@angular/core';
// import { Song, SongService } from '../../services/song.service';
// import { AudioPlayerComponent } from '../audio-player/audio-player.component';

// @Component({
//   selector: 'app-song-list',
//   standalone: true,
//   imports: [CommonModule, AudioPlayerComponent],
//   templateUrl: './song-list.component.html',
//   styleUrl: './song-list.component.css'
// })
// export class SongListComponent implements OnInit {
//   songs: Song[] = [];
//   currentSong: Song | null = null;

//   constructor(private songService: SongService) { }

//   ngOnInit(): void {
//     this.loadSongs();
//   }

//   loadSongs(): void {
//     this.songService.getSongs().subscribe({
//       next: (songs: Song[]) => {
//         this.songs = songs;
//       },
//       error: (error: any) => {
//         console.error('Error loading songs:', error);
//       },
//     });
//   }

//   playSong(song: Song): void {
//     this.currentSong = song;
//   }

//   onSongEnded(): void {
//     const currentIndex = this.songs.findIndex(song => song._id === this.currentSong?._id);
//     if (currentIndex > -1 && currentIndex < this.songs.length - 1) {
//       this.currentSong = this.songs[currentIndex + 1];
//     } else {
//       this.currentSong = null;
//     }
//   }

//   onSongChanged(song: Song): void {
//     this.currentSong = song;
//   }

//   deleteSong(id: string): void {
//     if (confirm('Are you sure you want to delete this song?')) {
//       this.songService.deleteSong(id).subscribe({
//         next: () => {
//           this.songs = this.songs.filter(song => song._id !== id);
//           if (this.currentSong?._id === id) {
//             this.currentSong = null;
//           }
//         },
//         error: (err) => {
//           console.error('Error deleting song:', err);
//         }
//       });
//     }
//   }

//   formatDuration(seconds: number): string {
//     if (isNaN(seconds) || seconds <= 0) {
//       return '0:00';
//     }
//     const minutes = Math.floor(seconds / 60);
//     const remainingSeconds = Math.floor(seconds % 60);
//     return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
//   }
// }
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

  playSong(song: Song): void {
    this.currentSong = song;
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
  loadPlaylists(): void {
    this.playlistService.getPlaylists().subscribe({
      error: (error: any) => {
        console.error('Error loading playlists:', error);
      },
    });
  }

  addToPlaylist(song: Song, playlistId: string): void {
    this.playlistService.addSongToPlaylist(playlistId, song).subscribe({
      next: (updatedPlaylist) => {
        this.playlists = this.playlists.map(p => 
          p._id === updatedPlaylist._id ? updatedPlaylist : p
        );
        this.cdr.markForCheck();
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
}
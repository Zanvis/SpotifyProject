import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { Song, SongService } from '../../services/song.service';
import { AuthService } from '../../services/auth.service';
import { PlaylistService } from '../../services/playlist.service';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  currentUser$ = this.authService.currentUser$;
  allSongs$ = this.songService.songs$;
  playlists$ = this.playlistService.playlists$;
  
  userSongs$: Observable<Song[]>;
  userStats$: Observable<{
    totalSongs: number;
    totalPlaylists: number;
    totalDuration: number;
  }>;

  constructor(
    private authService: AuthService,
    private songService: SongService,
    private playlistService: PlaylistService,
    private translateService: TranslateService
  ) {
    // Filter songs to only show user's uploaded songs
    this.userSongs$ = combineLatest([
      this.allSongs$,
      this.currentUser$
    ]).pipe(
      map(([songs, user]) => 
        songs.filter(song => song.uploader._id === user?.id)
      )
    );

    // Calculate user stats
    this.userStats$ = combineLatest([
      this.userSongs$,
      this.playlists$
    ]).pipe(
      map(([songs, playlists]) => ({
        totalSongs: songs.length,
        totalPlaylists: playlists.length,
        totalDuration: songs.reduce((acc, song) => acc + song.duration, 0)
      }))
    );
  }

  ngOnInit(): void {
    this.songService.getSongs().subscribe();
    this.playlistService.getPlaylists().subscribe();
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  deleteSong(songId: string): void {
    if (confirm(this.translateService.instant('PROFILE.CONFIRM.DELETE_SONG', { defaultValue: 'Are you sure you want to delete this song?' }))) {
      this.songService.deleteSong(songId).subscribe();
    }
  }

  deletePlaylist(playlistId: string): void {
    if (confirm(this.translateService.instant('PROFILE.CONFIRM.DELETE_PLAYLIST', { defaultValue: 'Are you sure you want to delete this playlist?' }))) {
      this.playlistService.deletePlaylist(playlistId).subscribe();
    }
  }
}

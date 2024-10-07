import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Song, SongService } from '../../services/song.service';
import { AudioPlayerComponent } from '../audio-player/audio-player.component';

@Component({
  selector: 'app-song-list',
  standalone: true,
  imports: [CommonModule, AudioPlayerComponent],
  templateUrl: './song-list.component.html',
  styleUrl: './song-list.component.css'
})
export class SongListComponent implements OnInit {
  songs: Song[] = [];
  currentSong: Song | null = null;

  constructor(private songService: SongService) { }

  ngOnInit(): void {
    this.loadSongs();
  }

  loadSongs(): void {
    this.songService.getSongs().subscribe({
      next: (songs: Song[]) => {
        this.songs = songs.map(song => ({
          ...song,
          duration: this.ensureValidDuration(song.duration)
        }));
      },
      error: (error: any) => {
        console.error('Error loading songs:', error);
      },
    });
  }

  ensureValidDuration(duration: number | undefined): number {
    return typeof duration === 'number' && !isNaN(duration) && duration > 0 ? duration : 0;
  }

  playSong(song: Song): void {
    this.currentSong = song;
  }

  onSongEnded(): void {
    const currentIndex = this.songs.findIndex(song => song._id === this.currentSong?._id);
    if (currentIndex > -1 && currentIndex < this.songs.length - 1) {
      this.currentSong = this.songs[currentIndex + 1];
    } else {
      this.currentSong = null;
    }
  }

  onSongChanged(song: Song): void {
    this.currentSong = song;
  }

  deleteSong(id: string): void {
    if (confirm('Are you sure you want to delete this song?')) {
      this.songService.deleteSong(id).subscribe({
        next: () => {
          this.songs = this.songs.filter(song => song._id !== id);
          if (this.currentSong?._id === id) {
            this.currentSong = null;
          }
        },
        error: (err) => {
          console.error('Error deleting song:', err);
        }
      });
    }
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
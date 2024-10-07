import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Song, SongService } from '../../services/song.service';

@Component({
  selector: 'app-song-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './song-list.component.html',
  styleUrl: './song-list.component.css'
})
export class SongListComponent implements OnInit {
  songs: Song[] = [];

  constructor(private songService: SongService) { }

  ngOnInit(): void {
    this.loadSongs();
  }

  loadSongs(): void {
    this.songService.getSongs().subscribe({
      next: (songs: Song[]) => {
        this.songs = songs;
      },
      error: (error: any) => {
        console.error('Error loading songs:', error);
      },
    });
  }

  // deleteSong(id: string): void {
  //   if (confirm('Are you sure you want to delete this song?')) {
  //     this.songService.deleteSong(id).subscribe(
  //       () => {
  //         this.songs = this.songs.filter(song => song._id !== id);
  //       },
  //       error => console.error('Error deleting song:', error)
  //     );
  //   }
  // }
  deleteSong(id: string): void {
    if (confirm('Are you sure you want to delete this song?')) {
      this.songService.deleteSong(id).subscribe({
        next: () => {
          // Update the UI by filtering out the deleted song
          this.songs = this.songs.filter(song => song._id !== id);
        },
        error: (err) => {
          // Log the error to the console
          console.error('Error deleting song:', err);
        }
      });
    }
  }
}


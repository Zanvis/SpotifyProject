import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Song } from '../../services/song.service';
import { LyricsQuery, LyricsService } from '../../services/lyrics.service';
import { LyricLine } from 'lrclib-api';

@Component({
  selector: 'app-lyrics',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './lyrics.component.html',
  styleUrl: './lyrics.component.css'
})
export class LyricsComponent implements OnChanges {
  @Input() song: Song | null = null;
  @Input() currentTime: number = 0;

  syncedLyrics: LyricLine[] | null = null;
  unsyncedLyrics: LyricLine[] | null = null;
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private lyricsService: LyricsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['song'] && this.song) {
      this.loadLyrics();
    }
  }

  private loadLyrics(): void {
    if (!this.song) return;

    this.isLoading = true;
    this.error = null;
    this.cdr.markForCheck();

    const query: LyricsQuery = {
      track_name: this.song.title,
      artist_name: this.song.artist
    };

    // Try to get synced lyrics first
    this.lyricsService.getSynced(query).subscribe({
      next: (lyrics: LyricLine[]) => {
        if (lyrics && lyrics.length > 0) {
          this.syncedLyrics = lyrics;
          this.unsyncedLyrics = null;
        } else {
          // If no synced lyrics, try unsynced
          this.loadUnsyncedLyrics(query);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        // If synced lyrics fail, try unsynced
        this.loadUnsyncedLyrics(query);
      }
    });
  }

  private loadUnsyncedLyrics(query: LyricsQuery): void {
    this.lyricsService.getUnsynced(query).subscribe({
      next: (lyrics: LyricLine[] | null) => {
        if (lyrics) {
          this.unsyncedLyrics = lyrics;
          this.syncedLyrics = null;
          this.isLoading = false;
          if (lyrics.length === 0) {
            this.error = 'LYRICS.ERROR';
          }
          this.cdr.markForCheck();
        } else {
          this.error = 'LYRICS.ERROR';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      }
    });
  }

  isCurrentLine(line: LyricLine): boolean {
    if (!this.syncedLyrics || !line.startTime) return false;
    
    const currentLineIndex = this.syncedLyrics.findIndex(l => l === line);
    const nextLine = this.syncedLyrics[currentLineIndex + 1];
    
    return line.startTime <= this.currentTime && 
          (!nextLine || !nextLine.startTime || nextLine.startTime > this.currentTime);
  }
}
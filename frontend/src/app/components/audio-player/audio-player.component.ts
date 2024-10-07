import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Song } from '../../services/song.service';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.css'
})
export class AudioPlayerComponent implements OnChanges, AfterViewInit {
  @Input() song!: Song;
  @Input() playlist: Song[] = [];
  @Output() songEnded = new EventEmitter<void>();
  @Output() songChanged = new EventEmitter<Song>();

  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;

  audioElement: HTMLAudioElement | undefined;
  isPlaying = false;
  isMuted = false;
  currentTime = 0;
  duration = 0;
  volume = 1;
  currentSongIndex = 0;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['song'] && !changes['song'].firstChange) {
      this.loadAndPlaySong();
    }
    if (changes['playlist'] && !changes['playlist'].firstChange) {
      this.currentSongIndex = this.playlist.findIndex(s => s._id === this.song._id);
    }
  }

  ngAfterViewInit(): void {
    this.audioElement = this.audioPlayerRef.nativeElement;
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
      this.loadAndPlaySong();
    }
  }

  loadAndPlaySong(): void {
    if (this.audioElement) {
      this.audioElement.load();
      this.audioElement.play().then(() => {
        this.isPlaying = true;
      }).catch(error => {
        console.error('Error playing audio:', error);
        this.isPlaying = false;
      });
    }
  }

  togglePlay(): void {
    if (this.audioElement) {
      if (this.isPlaying) {
        this.audioElement.pause();
      } else {
        this.audioElement.play();
      }
      this.isPlaying = !this.isPlaying;
    }
  }

  onTimeUpdate(): void {
    if (this.audioElement) {
      this.currentTime = this.audioElement.currentTime;
    }
  }

  onLoadedMetadata(): void {
    if (this.audioElement) {
      this.duration = this.audioElement.duration;
    }
  }

  onSeek(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (this.audioElement) {
      this.audioElement.currentTime = Number(target.value);
    }
  }

  onEnded(): void {
    this.next();
  }

  toggleMute(): void {
    if (this.audioElement) {
      this.audioElement.muted = !this.audioElement.muted;
      this.isMuted = this.audioElement.muted;
    }
  }

  onVolumeChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const volumeValue = Number(target.value) / 100;
    if (this.audioElement) {
      this.audioElement.volume = volumeValue;
      this.volume = volumeValue;
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  previous(): void {
    if (this.playlist.length > 0) {
      this.currentSongIndex = (this.currentSongIndex - 1 + this.playlist.length) % this.playlist.length;
      this.song = this.playlist[this.currentSongIndex];
      this.songChanged.emit(this.song);
      this.loadAndPlaySong();
    }
  }

  next(): void {
    if (this.playlist.length > 0) {
      this.currentSongIndex = (this.currentSongIndex + 1) % this.playlist.length;
      this.song = this.playlist[this.currentSongIndex];
      this.songChanged.emit(this.song);
      this.loadAndPlaySong();
    } else {
      this.songEnded.emit();
    }
  }
}

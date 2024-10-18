import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Song } from '../../services/song.service';

enum LoopMode {
  NoLoop,
  LoopTrack,
  LoopPlaylist
}

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
  loopMode: LoopMode = LoopMode.NoLoop;

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
      // Reset the current time
      this.currentTime = 0;
      
      // Add canplay event listener to ensure the audio is ready before playing
      const playHandler = () => {
        this.audioElement?.play()
          .then(() => {
            this.isPlaying = true;
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            this.isPlaying = false;
          });
        // Remove the event listener after it's triggered
        this.audioElement?.removeEventListener('canplay', playHandler);
      };

      this.audioElement.addEventListener('canplay', playHandler);
      this.audioElement.load();
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
    switch (this.loopMode) {
      case LoopMode.NoLoop:
        this.next();
        break;
      case LoopMode.LoopTrack:
        this.loadAndPlaySong();
        break;
      case LoopMode.LoopPlaylist:
        this.next();
        break;
    }
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

  toggleLoop(): void {
    switch (this.loopMode) {
      case LoopMode.NoLoop:
        this.loopMode = LoopMode.LoopTrack;
        break;
      case LoopMode.LoopTrack:
        this.loopMode = LoopMode.LoopPlaylist;
        break;
      case LoopMode.LoopPlaylist:
        this.loopMode = LoopMode.NoLoop;
        break;
    }
  }

  getLoopIconPath(): string {
    switch (this.loopMode) {
      case LoopMode.NoLoop:
        return 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3';
      case LoopMode.LoopTrack:
        return 'M16 15v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m14-2l-2-2m0 0l-2 2m2-2v4';
      case LoopMode.LoopPlaylist:
        return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15';
    }
  }

  getLoopButtonClass(): string {
    return this.loopMode !== LoopMode.NoLoop ? 'text-green-500 hover:text-green-400' : 'text-gray-400 hover:text-white';
  }
}
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Song } from '../../services/song.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslatePipe } from '@ngx-translate/core';
import { LyricsComponent } from '../lyrics/lyrics.component';

enum LoopMode {
  NoLoop,
  LoopTrack,
  LoopPlaylist
}

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule, TranslatePipe, LyricsComponent],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.css',
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ 
          opacity: 0,
          transform: 'translateY(100%)'
        }),
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          opacity: 1,
          transform: 'translateY(0)'
        }))
      ]),
      transition(':leave', [
        style({ 
          opacity: 1,
          transform: 'translateY(0)'
        }),
        animate('100ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          opacity: 0,
          transform: 'translateY(100%)'
        }))
      ])
    ]),
    trigger('buttonRotate', [
      transition(':enter', [
        style({ transform: 'rotate(-180deg)' }),
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'rotate(0)' }))
      ]),
      transition(':leave', [
        animate('100ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'rotate(-180deg)' }))
      ])
    ]),
    trigger('slideUpDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-in-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ])
  ]
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
  isExpanded = false;
  activeTab: 'player' | 'lyrics' = 'player';
  showLyrics = false;

  private readonly VOLUME_STORAGE_KEY = 'audioPlayerVolume';

  constructor() {
    const savedVolume = localStorage.getItem(this.VOLUME_STORAGE_KEY);
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
  }

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
      this.currentTime = 0;
      
      const playHandler = () => {
        this.audioElement?.play()
          .then(() => {
            this.isPlaying = true;
          })
          .catch(error => {
            console.error('Error playing audio:', error);
            this.isPlaying = false;
          });
        this.audioElement?.removeEventListener('canplay', playHandler);
      };

      this.audioElement.addEventListener('canplay', playHandler);
      this.audioElement.load();
    }
  }
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.code === 'Space') {
      event.preventDefault();
      this.togglePlay(event);
    } else if (event.code === 'Escape' && this.isExpanded) {
      this.toggleExpandedView(event);
    }
  }

  toggleExpandedView(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.isExpanded = !this.isExpanded;
    document.body.style.overflow = this.isExpanded ? 'hidden' : '';
  }
  togglePlay(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
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

  onSeek(event: Event) {
    event.stopPropagation();
    const target = event.target as HTMLInputElement;
    if (this.audioElement) {
      this.audioElement.currentTime = Number(target.value);
      this.updateRangeBackground(target);
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

  toggleMute(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.audioElement) {
      this.audioElement.muted = !this.audioElement.muted;
      this.isMuted = this.audioElement.muted;
    }
  }

  onVolumeChange(event: Event) {
    event.stopPropagation();
    const target = event.target as HTMLInputElement;
    const volumeValue = Number(target.value) / 100;
    if (this.audioElement) {
      this.audioElement.volume = volumeValue;
      this.volume = volumeValue;
      localStorage.setItem(this.VOLUME_STORAGE_KEY, volumeValue.toString());
      this.updateRangeBackground(target);
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  previous(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.playlist.length > 0) {
      this.currentSongIndex = (this.currentSongIndex - 1 + this.playlist.length) % this.playlist.length;
      this.song = this.playlist[this.currentSongIndex];
      this.songChanged.emit(this.song);
      this.loadAndPlaySong();
    }
  }

  next(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.playlist.length > 0) {
      this.currentSongIndex = (this.currentSongIndex + 1) % this.playlist.length;
      this.song = this.playlist[this.currentSongIndex];
      this.songChanged.emit(this.song);
      this.loadAndPlaySong();
    } else {
      this.songEnded.emit();
    }
  }

  toggleLoop(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
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
  private updateRangeBackground(element: HTMLInputElement) {
    const value = Number(element.value);
    const max = Number(element.max) || 100;
    const percentage = (value / max) * 100;
    element.style.backgroundSize = `${percentage}% 100%`;
  }
  handleImageError(event: any) { 
    event.target.src = 'assets/default-album.png';
  }
  
  toggleLyrics(): void {
    this.showLyrics = !this.showLyrics;
  }
  
  rewind15(event?: Event) {
    if (event) event.stopPropagation();
    if (this.audioElement) {
      this.audioElement.currentTime = Math.max(0, this.audioElement.currentTime - 15);
    }
  }

  forward15(event?: Event) {
    if (event) event.stopPropagation();
    if (this.audioElement) {
      this.audioElement.currentTime = Math.min(this.duration, this.audioElement.currentTime + 15);
    }
  }
}
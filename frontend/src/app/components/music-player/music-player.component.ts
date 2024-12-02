import { CommonModule } from '@angular/common';
import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MusicState, SocketService } from '../../services/socket.service';
import { Subject, takeUntil } from 'rxjs';
import { Song, SongService } from '../../services/song.service';
import { TranslatePipe } from '@ngx-translate/core';

interface AudioState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentSong: Song | null;
  volume: number;
  isMuted: boolean;
}

@Component({
  selector: 'app-music-player',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './music-player.component.html',
  styleUrl: './music-player.component.css'
})
export class MusicPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('audioElement') audioElement!: ElementRef<HTMLAudioElement>;
  
  state: AudioState = {
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    isLoading: true,
    error: null,
    currentSong: null,
    volume: 1, // Default volume (max)
    isMuted: false
  };

  songs: Song[] = [];
  private isSeeking: boolean = false;
  private isLocalUpdate: boolean = false;
  private syncDebounceTimeout: any;
  private destroyed$ = new Subject<void>();
  private readonly SYNC_THRESHOLD = 1; // seconds
  private readonly SYNC_DEBOUNCE = 100; // ms
  private lastVolume: number = 1;

  constructor(
    private socketService: SocketService,
    private ngZone: NgZone,
    private songService: SongService
  ) {}

  ngOnInit() {
    this.loadSongs();
    this.setupSocketSubscription();
    this.loadVolumeSettings();
  }
  private loadVolumeSettings() {
    const savedVolume = localStorage.getItem('audioVolume');
    const savedMuted = localStorage.getItem('audioMuted');
    
    if (savedVolume !== null) {
      this.state.volume = parseFloat(savedVolume);
    }
    if (savedMuted !== null) {
      this.state.isMuted = savedMuted === 'true';
    }

    // Apply volume settings to audio element when it's ready
    if (this.audioElement?.nativeElement) {
      this.audioElement.nativeElement.volume = this.state.isMuted ? 0 : this.state.volume;
    }
  }

  private saveVolumeSettings() {
    localStorage.setItem('audioVolume', this.state.volume.toString());
    localStorage.setItem('audioMuted', this.state.isMuted.toString());
  }

  adjustVolume(event: MouseEvent) {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const volume = Math.max(0, Math.min(1, x / rect.width));
    
    this.state.volume = volume;
    this.state.isMuted = volume === 0;
    this.audioElement.nativeElement.volume = volume;
    
    // Save volume settings
    this.saveVolumeSettings();
  }

  toggleMute() {
    if (this.state.isMuted) {
      // Unmute: restore last volume
      this.state.isMuted = false;
      this.audioElement.nativeElement.volume = this.state.volume;
    } else {
      // Mute: save current volume and set to 0
      this.state.isMuted = true;
      this.audioElement.nativeElement.volume = 0;
    }
    
    // Save mute settings
    this.saveVolumeSettings();
  }

  getVolumeIcon(): string {
    if (this.state.isMuted || this.state.volume === 0) {
      return 'volume_off';
    } else if (this.state.volume < 0.5) {
      return 'volume_down';
    } else {
      return 'volume_up';
    }
  }

  private loadSongs() {
    this.songService.getSongs()
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (songs) => {
          this.songs = songs;
          if (songs.length > 0 && !this.state.currentSong) {
            this.changeSong(songs[0]);
          }
        },
        error: (error) => {
          console.error('Error loading songs:', error);
          this.state.error = 'MUSIC_PLAYER.ERROR.LOADING_FAILED';
        }
      });
  }
  changeSong(song: Song) {
    this.state.isLoading = true;
    this.state.currentSong = song;
    this.state.currentTime = 0;
    this.state.isPlaying = false;

    // Load new audio source
    const audio = this.audioElement.nativeElement;
    audio.src = song.filePath;
    audio.load();

    // Sync with other users
    this.isLocalUpdate = true;
    this.syncState();
  }
  private setupSocketSubscription() {
    this.socketService.onMusicStateChange()
      .pipe(takeUntil(this.destroyed$))
      .subscribe((state: MusicState) => {
        this.ngZone.run(() => {
          if (!this.isLocalUpdate) {
            if (state.currentSong?._id !== this.state.currentSong?._id) {
              const newSong = this.songs.find(s => s._id === state.currentSong?._id);
              if (newSong) {
                this.changeSong(newSong);
              }
            }
            this.handleRemoteStateUpdate(state);
          }
          this.isLocalUpdate = false;
        });
      });
  }


  ngAfterViewInit() {
    this.setupAudioEventListeners();
  }

  private setupAudioEventListeners() {
    const audio = this.audioElement.nativeElement;
    audio.volume = this.state.isMuted ? 0 : this.state.volume;
    audio.addEventListener('timeupdate', () => {
      if (!this.isSeeking) {
        this.state.currentTime = audio.currentTime;
        this.debouncedSync();
      }
    });

    audio.addEventListener('loadedmetadata', () => {
      this.state.duration = audio.duration;
      this.state.isLoading = false;
    });

    audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.syncState();
    });

    audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.syncState();
    });

    audio.addEventListener('error', (e) => {
      this.state.error = `Error loading audio: ${e.toString()}`;
      this.state.isLoading = false;
    });

    audio.addEventListener('waiting', () => {
      this.state.isLoading = true;
    });

    audio.addEventListener('canplay', () => {
      this.state.isLoading = false;
    });

    // Load audio
    audio.load();
  }

  private async handleRemoteStateUpdate(state: MusicState) {
    const audio = this.audioElement.nativeElement;
    
    try {
      // Update playing state
      if (state.isPlaying !== this.state.isPlaying) {
        this.state.isPlaying = state.isPlaying;
        if (state.isPlaying) {
          await audio.play();
        } else {
          audio.pause();
        }
      }
      
      // Sync time if difference is significant
      const timeDiff = Math.abs(audio.currentTime - state.currentTime);
      if (timeDiff > this.SYNC_THRESHOLD) {
        audio.currentTime = state.currentTime;
        this.state.currentTime = state.currentTime;
      }
    } catch (error) {
      console.error('Error handling remote state update:', error);
      this.state.error = 'MUSIC_PLAYER.ERROR.SYNC_FAILED';
    }
  }

  private debouncedSync() {
    if (this.syncDebounceTimeout) {
      clearTimeout(this.syncDebounceTimeout);
    }
    this.syncDebounceTimeout = setTimeout(() => {
      this.syncState();
    }, this.SYNC_DEBOUNCE);
  }

  async playPause() {
    try {
      const audio = this.audioElement.nativeElement;
      
      if (audio.paused) {
        this.state.isLoading = true;
        await audio.play();
        this.state.isPlaying = true;
      } else {
        audio.pause();
        this.state.isPlaying = false;
      }
      
      this.isLocalUpdate = true;
      this.syncState();
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      this.state.error = 'MUSIC_PLAYER.ERROR.AUDIO_FAILED';
    } finally {
      this.state.isLoading = false;
    }
  }

  seek(event: MouseEvent) {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    this.isSeeking = true;
    
    try {
      this.state.currentTime = percentage * this.state.duration;
      this.audioElement.nativeElement.currentTime = this.state.currentTime;
      
      this.isLocalUpdate = true;
      this.syncState();
    } catch (error) {
      console.error('Error seeking:', error);
      this.state.error = 'MUSIC_PLAYER.ERROR.SEEK_FAILED';
    } finally {
      this.isSeeking = false;
    }
  }

  private syncState() {
    if (!this.audioElement?.nativeElement?.duration || !this.state.currentSong) return;
    
    try {
      this.socketService.syncMusicState({
        isPlaying: this.state.isPlaying,
        currentTime: this.state.currentTime,
        timestamp: Date.now(),
        currentSong: this.state.currentSong
      });
    } catch (error) {
      console.error('Error syncing state:', error);
      this.state.error = 'MUSIC_PLAYER.ERROR.SYNC_FAILED';
    }
  }


  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  ngOnDestroy() {
    if (this.syncDebounceTimeout) {
      clearTimeout(this.syncDebounceTimeout);
    }
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
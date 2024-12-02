import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { RadioStation } from '../../services/radio.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, style, transition, trigger } from '@angular/animations';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-radio-player',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './radio-player.component.html',
  styleUrl: './radio-player.component.css',
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(100%)' }),
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, transform: 'translateY(0)' }),
        animate('100ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 0, transform: 'translateY(100%)' }))
      ])
    ]),
    trigger('buttonRotate', [
      transition(':enter', [
        style({ transform: 'rotate(-180deg)' }),
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ transform: 'rotate(0)' }))
      ]),
      transition(':leave', [
        animate('100ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ transform: 'rotate(-180deg)' }))
      ])
    ])
  ]
})
export class RadioPlayerComponent implements OnInit, OnDestroy, OnChanges {
  private static firstLoad = true;
  @Input() station: RadioStation | null = null;

  private audio: HTMLAudioElement | null = null;
  isPlaying = false;
  isMuted = false;
  volume = 1;
  isConnected = false;
  connectionStatus = 'RADIO_PLAYER.CONNECTION_STATUS.DISCONNECTED';
  isExpanded = false;
  private retryAttempts = 0;
  private maxRetryAttempts = 3;
  private retryDelay = 3000;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.createAudioElement();
    this.initializeVolume();
    
    // Listen for force play events
    this.elementRef.nativeElement.addEventListener('forcePlay', () => {
      this.startPlaying();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['station'] && changes['station'].currentValue) {
      // Auto-play on first load
      if (RadioPlayerComponent.firstLoad) {
        RadioPlayerComponent.firstLoad = false;
        setTimeout(() => {
          this.startPlaying();
        }, 100);
      } else {
        // Start playing when station changes after first load
        this.startPlaying();
      }
    }
  }

  private startPlaying() {
    if (!this.audio || !this.station) return;

    // Reset connection status
    this.connectionStatus = 'RADIO_PLAYER.CONNECTION_STATUS.CONNECTING';
    this.isConnected = false;

    // Stop current playback
    this.audio.pause();
    
    // Set new source and start playing
    this.audio.src = this.station.url;
    this.audio.load();
    this.retryAttempts = 0;
    
    // Attempt to play
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
      }).catch(error => {
        console.error('Playback failed:', error);
        this.connectionStatus = 'RADIO_PLAYER.ERRORS.PLAYBACK_FAILED';
        this.isPlaying = false;
      });
    }
  }

  private createAudioElement() {
    this.audio = new Audio();
    this.audio.preload = 'none';
    
    this.setupAudioEventListeners();
  }

  private setupAudioEventListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('playing', () => {
      this.isPlaying = true;
      this.isConnected = true;
      this.connectionStatus = 'RADIO_PLAYER.CONNECTION_STATUS.CONNECTED';
      this.retryAttempts = 0;
    });

    this.audio.addEventListener('pause', () => {
      // Only update isPlaying if we're not in the middle of switching stations
      if (this.connectionStatus !== 'RADIO_PLAYER.CONNECTION_STATUS.CONNECTING') {
        this.isPlaying = false;
      }
    });

    this.audio.addEventListener('waiting', () => {
      this.connectionStatus = 'RADIO_PLAYER.CONNECTION_STATUS.BUFFERING';
    });

    this.audio.addEventListener('error', () => {
      this.isConnected = false;
      this.connectionStatus = 'RADIO_PLAYER.CONNECTION_STATUS.CONNECTION_ERROR';
      this.handleConnectionError();
    });

    this.audio.addEventListener('stalled', () => {
      this.connectionStatus = 'RADIO_PLAYER.CONNECTION_STATUS.STREAM_STALLED';
      this.handleConnectionError();
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio?.buffered.length) {
        const bufferedEnd = this.audio.buffered.end(this.audio.buffered.length - 1);
        if (bufferedEnd > 0) {
          this.connectionStatus = 'RADIO_PLAYER.CONNECTION_STATUS.STREAMING';
        }
      }
    });
  }


  ngOnDestroy() {
    if (this.audio) {
      this.cleanupAudioElement();
    }
    
    // Remove the event listener
    this.elementRef.nativeElement.removeEventListener('forcePlay', () => {});
  }

  private cleanupAudioElement() {
    if (!this.audio) return;
    
    this.audio.pause();
    this.audio.src = '';
    this.audio.removeEventListener('playing', () => {});
    this.audio.removeEventListener('pause', () => {});
    this.audio.removeEventListener('waiting', () => {});
    this.audio.removeEventListener('error', () => {});
    this.audio.removeEventListener('stalled', () => {});
    this.audio.removeEventListener('timeupdate', () => {});
    this.audio = null;
  }

  private handleConnectionError() {
    if (this.retryAttempts < this.maxRetryAttempts) {
      this.retryConnection();
      this.retryAttempts++;
    } else {
      this.connectionStatus = 'RADIO_PLAYER.CONNECTION_STATUS.CONNECTION_FAILED';
      this.isConnected = false;
      this.isPlaying = false;
    }
  }

  private retryConnection() {
    if (this.audio && this.station) {
      setTimeout(() => {
        this.startPlaying();
      }, this.retryDelay);
    }
  }


  togglePlayPause(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    
    if (!this.audio || !this.station) return;

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.startPlaying();
    }
  }

  toggleExpandedView(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.isExpanded = !this.isExpanded;
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = this.isExpanded ? 'hidden' : '';
  }

  toggleMute(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    
    if (!this.audio) return;
    
    this.isMuted = !this.isMuted;
    this.audio.muted = this.isMuted;
  }

  onVolumeChange(event: Event) {
    if (!this.audio) return;
    
    const target = event.target as HTMLInputElement;
    this.volume = Number(target.value) / 100;
    this.audio.volume = this.volume;
    
    // Save volume preference
    localStorage.setItem('radioPlayerVolume', this.volume.toString());
    
    // Unmute if volume is changed while muted
    if (this.isMuted && this.volume > 0) {
      this.toggleMute();
    }
  }

  private initializeVolume() {
    const savedVolume = localStorage.getItem('radioPlayerVolume');
    if (savedVolume !== null) {
      this.volume = Number(savedVolume);
      if (this.audio) {
        this.audio.volume = this.volume;
      }
    }
  }

  onImageError(event: any) {
    event.target.src = '/assets/radio-default.png';
  }
}
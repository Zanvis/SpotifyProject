import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketManagerService } from '../../services/socket-manager.service';
import { MusicPlayerComponent } from '../music-player/music-player.component';
import { Subject, takeUntil } from 'rxjs';
import { Message, RoomUser } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule, FormsModule, MusicPlayerComponent, TranslatePipe],
  templateUrl: './room.component.html',
  styleUrl: './room.component.css'
})
export class RoomComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  users: RoomUser[] = [];
  message: string = '';
  userCount: number = 0;
  roomId: string = '';
  isConnecting: boolean = true;
  error: string | null = null;
  currentUser: { id: string; username: string; email: string; } | null = null;
  private destroyed$ = new Subject<void>();
  showCopySuccess: boolean = false;
  private readonly isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private socketManager: SocketManagerService,
    private authService: AuthService,
    private translateService: TranslateService
  ) {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // Add beforeunload event listener
  @HostListener('window:beforeunload', ['$event'])
  handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!this.isBrowser) return;
    // Cancel the event and show confirmation dialog
    event.preventDefault();
    return '';
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent) {
    if (!this.isBrowser) return;
    
    event.preventDefault();
    if (confirm(this.translateService.instant('ROOM.LEAVE_CONFIRMATION', { defaultValue: 'Are you sure you want to leave the room?' }))) {
      this.router.navigate(['/']);
    } else {
      // Push the current state back to prevent navigation
      const w = typeof window !== 'undefined' ? window : null;
      if (w) {
        w.history.pushState(null, '', w.location.href);
      }
    }
  }

  ngOnInit() {
    if (this.isBrowser) {
      // Add navigation prevention
      const w = typeof window !== 'undefined' ? window : null;
      if (w) {
        w.history.pushState(null, '', w.location.href);
      }
    }

    // Subscribe to auth state
    this.authService.currentUser$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(user => {
        this.currentUser = user;
        if (!user) {
          this.router.navigate(['/login']);
        }
      });

    this.setupRoom();
  }

  private async setupRoom() {
    const roomId = this.route.snapshot.paramMap.get('id');
    if (!roomId) {
      this.error = 'ROOM.ERROR.INVALID_ROOM_ID';
      this.router.navigate(['/']);
      return;
    }

    if (!this.currentUser) {
      this.error = 'ROOM.ERROR.LOGIN_REQUIRED';
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.isConnecting = true;
      const roomData = await this.socketManager.joinRoom(roomId);
      
      this.roomId = roomId;
      this.messages = roomData.messages;
      this.users = roomData.users;
      
      this.setupSocketSubscriptions();
    } catch (error) {
      console.error('Failed to join room:', error);
      this.error = 'ROOM.ERROR.JOIN_FAILED';
      setTimeout(() => this.router.navigate(['/']));
    } finally {
      this.isConnecting = false;
    }
  }

  private setupSocketSubscriptions() {
    // Subscribe to new messages
    this.socketManager.socketService.onMessage()
      .pipe(takeUntil(this.destroyed$))
      .subscribe(message => {
        this.messages = [...this.messages, message];
        // Auto-scroll to bottom
        if (this.isBrowser) {
          setTimeout(() => {
            const chatContainer = document.querySelector('.chat-messages');
            if (chatContainer) {
              chatContainer.scrollTop = chatContainer.scrollHeight;
            }
          });
        }
      });

    // Subscribe to user count updates
    this.socketManager.socketService.getUserCount()
      .pipe(takeUntil(this.destroyed$))
      .subscribe(count => {
        this.userCount = count;
      });

    // Subscribe to room users updates
    this.socketManager.socketService.getRoomUsers()
      .pipe(takeUntil(this.destroyed$))
      .subscribe(users => {
        this.users = users;
      });

    // Subscribe to connection status
    this.socketManager.socketService.isConnected()
      .pipe(takeUntil(this.destroyed$))
      .subscribe(connected => {
        this.isConnecting = !connected;
        if (!connected) {
          this.error = 'ROOM.ERROR.CONNECTION_LOST';
        } else {
          this.error = null;
        }
      });

    // Subscribe to auth state changes
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
        }
      });
  }

  async sendMessage() {
    if (!this.message.trim()) return;

    try {
      this.socketManager.sendMessage(this.message);
      this.message = '';
    } catch (error) {
      console.error('Failed to send message:', error);
      this.error = 'ROOM.ERROR.SEND_FAILED';
    }
  }

  async copyRoomLink() {
    if (!this.isBrowser) return;
    
    try {
      await navigator.clipboard.writeText(this.roomId);
      this.showCopySuccess = true;
      setTimeout(() => {
        this.showCopySuccess = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy room ID:', error);
      this.error = 'ROOM.ERROR.COPY_FAILED';
    }
  }

  isCurrentUser(userId: string): boolean {
    return this.currentUser?.id === userId;
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
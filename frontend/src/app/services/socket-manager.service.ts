import { Injectable, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';
import { Subject, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketManagerService implements OnDestroy {
  private destroyed$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    public socketService: SocketService
  ) {
    this.initializeSocketWithAuth();
  }

  private initializeSocketWithAuth(): void {
    this.authService.isAuthenticated$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(isAuthenticated => {
        if (isAuthenticated) {
          const token = this.authService.getAuthToken();
          const currentUser = this.authService.getCurrentUser();
          if (token && currentUser) {
            // Pass both token and username to initialize socket
            this.socketService.initializeSocket(token, currentUser.username);
            this.setupSocketErrorHandling();
          }
        } else {
          this.socketService.disconnect();
        }
      });
  }

  private setupSocketErrorHandling(): void {
    this.socketService.getErrors()
      .pipe(takeUntil(this.destroyed$))
      .subscribe(error => {
        console.error('Socket error:', error);
        if (error.toLowerCase().includes('unauthorized')) {
          this.authService.logout();
        }
      });
  }

  // Helper methods for socket operations
  async joinRoom(roomId: string) {
    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const roomData = await this.socketService.joinRoom(roomId);
      return roomData;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }

  async createRoom() {
    try {
      const roomId = await this.socketService.createRoom();
      return roomId;
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }
  
  async leaveRoom() {
    try {
      await this.socketService.leaveRoom();
    } catch (error) {
      console.error('Failed to leave room:', error);
      throw error;
    }
  }
    
  sendMessage(message: string) {
    this.socketService.sendMessage(message);
  }

  updatePlaylist(songId: string, action: 'add' | 'remove') {
    this.socketService.updatePlaylist(songId, action);
  }

  requestSong(songId: string) {
    this.socketService.requestSong(songId);
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
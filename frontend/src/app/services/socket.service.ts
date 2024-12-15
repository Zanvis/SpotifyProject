import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject, fromEvent } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { Song } from './song.service';
import { AuthService } from './auth.service';

export interface MusicState {
  isPlaying: boolean;
  currentTime: number;
  timestamp: number;
  currentSong: Song | null;
}

export interface Message {
  id: string;
  text: string;
  timestamp: number;
  userId?: string;
  username?: string;
}

export interface RoomUser {
  username: string;
  id: string;
}

export interface RoomState {
  userCount: number;
  users: RoomUser[];
  currentSong?: any;
  playlist?: any[]; 
}

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private userCount = new BehaviorSubject<number>(0);
  private roomUsers = new BehaviorSubject<RoomUser[]>([]);
  private lastSentState: MusicState | null = null;
  private connected = new BehaviorSubject<boolean>(false);
  private errors = new Subject<string>();
  private destroyed$ = new Subject<void>();

  constructor(private authService: AuthService) {}

  initializeSocket(token: string, username: string) {
    // const token = this.authService.getAuthToken();
    // const currentUser = this.authService.getCurrentUser();
    
    // if (!token || !currentUser) {
    //   this.errors.next('Authentication required');
    //   return;
    // }

    if (!this.socket) {
      this.socket = io('https://music-app-backend-h3sd.onrender.com', {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: { token, username }
      });

      this.setupSocketListeners();
    }
  }

  private setupSocketListeners() {
    if (!this.socket) return;

    // Basic connection events
    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.connected.next(true);
      
      // Rejoin room if there was one
      if (this.currentRoomId) {
        this.joinRoom(this.currentRoomId);
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.errors.next(error.message);
      this.connected.next(false);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.connected.next(false);
    });

    // Room events
    this.socket.on('user-joined', ({ userCount, users }: { userCount: number; users: RoomUser[] }) => {
      this.userCount.next(userCount);
      this.roomUsers.next(users);
    });
    
    this.socket.on('user-left', ({ userCount, users }: { userCount: number; users: RoomUser[] }) => {
      this.userCount.next(userCount);
      this.roomUsers.next(users);
    });

    // Error handling
    this.socket.on('error', ({ message }: { message: string }) => {
      this.errors.next(message);
    });

    // Playlist events
    this.socket.on('playlist-changed', this.handlePlaylistUpdate.bind(this));
    this.socket.on('song-requested', this.handleSongRequest.bind(this));
  }

  // Room management
  createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('create-room', ({ roomId, error, success }: { roomId?: string; error?: string; success: boolean }) => {
        if (error || !success) {
          reject(error || 'Failed to create room');
        } else {
          this.currentRoomId = roomId!;
          resolve(roomId!);
        }
      });
    });
  }

  joinRoom(roomId: string): Promise<{ state: MusicState; messages: Message[]; users: RoomUser[] }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        reject(new Error('User not authenticated'));
        return;
      }

      this.socket.emit('join-room', roomId, currentUser.username, (response: {
        error?: string;
        success: boolean;
        state: MusicState;
        messages: Message[];
        userCount: number;
        users: RoomUser[];
      }) => {
        if (response.error || !response.success) {
          reject(response.error || 'Failed to join room');
        } else {
          this.currentRoomId = roomId;
          this.userCount.next(response.userCount);
          this.roomUsers.next(response.users);
          resolve({
            state: response.state,
            messages: response.messages,
            users: response.users
          });
        }
      });
    });
  }

  leaveRoom(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected || !this.currentRoomId) {
        reject(new Error('No active room or socket connection'));
        return;
      }

      this.socket.emit('leave-room', this.currentRoomId, (response: { success: boolean }) => {
        if (response.success) {
          // Reset room-related state
          this.currentRoomId = null;
          this.userCount.next(0);
          this.roomUsers.next([]);
          resolve();
        } else {
          reject(new Error('Failed to leave room'));
        }
      });
    });
  }

  // Music state management
  syncMusicState(state: MusicState): void {
    if (!this.currentRoomId || !this.socket?.connected) return;

    const shouldSync = !this.lastSentState || 
                      this.lastSentState.isPlaying !== state.isPlaying || 
                      Math.abs(this.lastSentState.currentTime - state.currentTime) > 1 ||
                      this.lastSentState.currentSong?._id !== state.currentSong?._id;
    
    if (shouldSync) {
      this.lastSentState = { ...state };
      this.socket.emit('sync-music-state', state);
    }
  }

  // Playlist management
  updatePlaylist(songId: string, action: 'add' | 'remove'): void {
    if (!this.currentRoomId || !this.socket?.connected) return;

    this.socket.emit('playlist-update', {
      roomId: this.currentRoomId,
      songId,
      action
    });
  }

  requestSong(songId: string): void {
    if (!this.currentRoomId || !this.socket?.connected) return;

    this.socket.emit('request-song', {
      roomId: this.currentRoomId,
      songId
    });
  }

  private handlePlaylistUpdate(data: { song: any; action: string }) {
    // Handle playlist updates
    // Emit to your application's state management
    //TODO
  }

  private handleSongRequest(data: { song: any; requestedBy: string }) {
    // Handle song requests
    // Emit to your application's state management
    //TODO
  }

  // Message handling
  sendMessage(text: string): void {
    if (!this.currentRoomId || !this.socket?.connected) return;
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.errors.next('User not authenticated');
      return;
    }
    
    this.socket.emit('message', text);
  }

  // Observables
  onMusicStateChange(): Observable<MusicState> {
    return new Observable<MusicState>(observer => {
      if (!this.socket) return;
  
      this.socket.on('sync-music-state', (state: MusicState) => {
        if (state !== this.lastSentState) {
          observer.next(state);
        }
      });
    }).pipe(takeUntil(this.destroyed$));
  }
  

  onMessage(): Observable<Message> {
    return new Observable<Message>(observer => {
      if (!this.socket) return;

      this.socket.on('message', (message: Message) => {
        observer.next(message);
      });
    }).pipe(takeUntil(this.destroyed$));
  }

  getErrors(): Observable<string> {
    return this.errors.asObservable();
  }

  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  getUserCount(): Observable<number> {
    return this.userCount.asObservable();
  }

  getRoomUsers(): Observable<RoomUser[]> {
    return this.roomUsers.asObservable();
  }

  isConnected(): Observable<boolean> {
    return this.connected.asObservable();
  }

  disconnect() {
    if (this.socket?.connected) {
      this.socket.disconnect();
    }
    this.socket = null;
    this.currentRoomId = null;
    this.userCount.next(0);
    this.roomUsers.next([]);
    this.connected.next(false);
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.disconnect();
  }
}


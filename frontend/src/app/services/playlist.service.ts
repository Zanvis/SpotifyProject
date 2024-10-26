import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Song } from './song.service';

export interface Playlist {
  _id: string;
  name: string;
  songs: Song[];
}

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {
  private apiUrl = 'https://music-app-backend-h3sd.onrender.com/api';
  private playlistsSubject = new BehaviorSubject<Playlist[]>([]);
  playlists$ = this.playlistsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadPlaylists().subscribe();
  }

  loadPlaylists(): Observable<Playlist[]> {
    const timestamp = new Date().getTime();
    return this.http.get<Playlist[]>(`${this.apiUrl}/playlists?t=${timestamp}`).pipe(
      tap(playlists => this.playlistsSubject.next(playlists))
    );
  }

  getPlaylists(): Observable<Playlist[]> {
    return this.loadPlaylists();
  }

  createPlaylist(name: string): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists`, { name }).pipe(
      tap(() => this.refreshPlaylists())
    );
  }

  addSongToPlaylist(playlistId: string, song: Song): Observable<Playlist> {
    return this.http.post<Playlist>(
      `${this.apiUrl}/playlists/${playlistId}/songs`, 
      { songId: song._id }
    ).pipe(
      tap(() => this.refreshPlaylists())
    );
  }

  removeSongFromPlaylist(playlistId: string, songId: string): Observable<Playlist> {
    return this.http.delete<Playlist>(
      `${this.apiUrl}/playlists/${playlistId}/songs/${songId}`
    ).pipe(
      tap(() => this.refreshPlaylists())
    );
  }

  deletePlaylist(playlistId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/playlists/${playlistId}`).pipe(
      tap(() => this.refreshPlaylists())
    );
  }

  private refreshPlaylists(): void {
    this.loadPlaylists().subscribe();
  }
}
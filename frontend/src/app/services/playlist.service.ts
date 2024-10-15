import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
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
  private isLoading = false;

  constructor(private http: HttpClient) {}

  loadPlaylists(): Observable<Playlist[]> {
    if (this.isLoading) {
      return this.playlists$;
    }

    this.isLoading = true;
    return this.http.get<Playlist[]>(`${this.apiUrl}/playlists`).pipe(
      tap(playlists => {
        this.playlistsSubject.next(playlists);
        this.isLoading = false;
      }),
      catchError(error => {
        console.error('Error loading playlists:', error);
        this.isLoading = false;
        return of([]);
      })
    );
  }

  getPlaylists(): Observable<Playlist[]> {
    if (this.playlistsSubject.value.length === 0 && !this.isLoading) {
      return this.loadPlaylists();
    }
    return this.playlists$;
  }

  createPlaylist(name: string): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists`, { name })
      .pipe(
        tap(newPlaylist => {
          const currentPlaylists = this.playlistsSubject.value;
          this.playlistsSubject.next([...currentPlaylists, newPlaylist]);
        })
      );
  }

  addSongToPlaylist(playlistId: string, song: Song): Observable<Playlist> {
    return this.http.post<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs`, { songId: song._id })
      .pipe(
        map(updatedPlaylist => ({
          ...updatedPlaylist,
          songs: updatedPlaylist.songs.map(s => s._id === song._id ? song : s)
        })),
        tap(updatedPlaylist => {
          const currentPlaylists = this.playlistsSubject.value;
          const updatedPlaylists = currentPlaylists.map(playlist => 
            playlist._id === playlistId ? updatedPlaylist : playlist
          );
          this.playlistsSubject.next(updatedPlaylists);
        })
      );
  }

  removeSongFromPlaylist(playlistId: string, songId: string): Observable<Playlist> {
    return this.http.delete<Playlist>(`${this.apiUrl}/playlists/${playlistId}/songs/${songId}`)
      .pipe(
        tap(updatedPlaylist => {
          const currentPlaylists = this.playlistsSubject.value;
          const updatedPlaylists = currentPlaylists.map(playlist => 
            playlist._id === playlistId ? {
              ...playlist,
              songs: playlist.songs.filter(song => song._id !== songId)
            } : playlist
          );
          this.playlistsSubject.next(updatedPlaylists);
        })
      );
  }

  deletePlaylist(playlistId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/playlists/${playlistId}`)
      .pipe(
        tap(() => {
          const currentPlaylists = this.playlistsSubject.value;
          const updatedPlaylists = currentPlaylists.filter(playlist => playlist._id !== playlistId);
          this.playlistsSubject.next(updatedPlaylists);
        })
      );
  }
  refreshPlaylists(): Observable<Playlist[]> {
    return this.loadPlaylists();
  }
}
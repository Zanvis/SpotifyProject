import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Song {
  _id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  filePath: string;
  imageUrl: string;
  uploadDate: Date;
  uploader: {
    _id: string;
    username: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class SongService {
  private apiUrl = 'https://music-app-backend-h3sd.onrender.com/api/songs';
  private songsSubject = new BehaviorSubject<Song[]>([]);
  songs$ = this.songsSubject.asObservable();

  constructor(private http: HttpClient) { }

  getSongs(): Observable<Song[]> {
    const timestamp = new Date().getTime();
    return this.http.get<Song[]>(`${this.apiUrl}?t=${timestamp}`).pipe(
      tap(songs => this.songsSubject.next(songs))
    );
  }

  uploadSong(formData: FormData): Observable<Song> {
    return this.http.post<Song>(this.apiUrl, formData).pipe(
      tap(() => this.refreshSongs())
    );
  }

  deleteSong(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshSongs())
    );
  }

  private refreshSongs() {
    this.getSongs().subscribe();
  }
}
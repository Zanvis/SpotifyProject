import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Song {
  _id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  filePath: string;
  imageUrl: string;
  uploadDate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SongService {
  private apiUrl = 'http://localhost:3000/api/songs';

  constructor(private http: HttpClient) { }

  getSongs(): Observable<Song[]> {
      return this.http.get<Song[]>(this.apiUrl);
  }

  uploadSong(formData: FormData): Observable<Song> {
      return this.http.post<Song>(this.apiUrl, formData);
  }

  deleteSong(id: string): Observable<any> {
      return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

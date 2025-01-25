import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { findLyrics, getSynced, getUnsynced, LyricLine } from 'lrclib-api';

export interface LyricsQuery {
  track_name: string;
  artist_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class LyricsService {
  findLyrics(query: LyricsQuery): Observable<any> {
    return from(findLyrics(query));
  }

  getUnsynced(query: LyricsQuery): Observable<LyricLine[] | null> {
    return from(getUnsynced(query));
  }

  getSynced(query: LyricsQuery): Observable<any> {
    return from(getSynced(query));
  }
}


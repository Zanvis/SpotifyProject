import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface RadioStation {
  id: string;
  name: string;
  url: string;
  favicon: string;
  tags: string[];  // API might return string, null, or undefined
  country: string;
  language: string;
  votes: number;
}

interface ApiRadioStation {
  id: string;
  name: string;
  url: string;
  favicon: string;
  tags: string | string[] | null;  // API response type
  country: string;
  language: string;
  votes: number;
}

@Injectable({
  providedIn: 'root'
})
export class RadioService {
  private apiUrl = 'https://de1.api.radio-browser.info/json/stations/';
  private currentStationSubject = new BehaviorSubject<RadioStation | null>(null);
  currentStation$ = this.currentStationSubject.asObservable();

  constructor(private http: HttpClient) {}

  private normalizeStation(station: ApiRadioStation): RadioStation {
    // Convert tags to array and handle various edge cases
    let normalizedTags: string[] = [];
    
    if (station.tags) {
      if (Array.isArray(station.tags)) {
        normalizedTags = station.tags;
      } else if (typeof station.tags === 'string') {
        // Handle comma-separated string of tags
        normalizedTags = station.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    }

    return {
      ...station,
      tags: normalizedTags,
      // Ensure other required fields have default values
      favicon: station.favicon || '',
      country: station.country || 'Unknown',
      language: station.language || 'Unknown',
      votes: station.votes || 0
    };
  }

  searchStations(query: string): Observable<RadioStation[]> {
    return this.http.get<ApiRadioStation[]>(`${this.apiUrl}byname/${encodeURIComponent(query)}`).pipe(
      map(stations => 
        stations
          .filter(station => station.url?.length > 0)
          .map(station => this.normalizeStation(station))
          .slice(0, 20)
      )
    );
  }

  getTopStations(): Observable<RadioStation[]> {
    return this.http.get<ApiRadioStation[]>(`${this.apiUrl}topvote/20`).pipe(
      map(stations => 
        stations
          .filter(station => station.url?.length > 0)
          .map(station => this.normalizeStation(station))
      )
    );
  }

  getStationsByTag(tag: string): Observable<RadioStation[]> {
    return this.http.get<ApiRadioStation[]>(`${this.apiUrl}bytag/${encodeURIComponent(tag)}`).pipe(
      map(stations => 
        stations
          .filter(station => station.url?.length > 0)
          .map(station => this.normalizeStation(station))
          .slice(0, 20)
      )
    );
  }

  setCurrentStation(station: RadioStation) {
    this.currentStationSubject.next(station);
  }
}
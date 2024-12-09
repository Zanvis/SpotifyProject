import { CommonModule } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, Inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { RadioService, RadioStation } from '../../services/radio.service';
import { Song } from '../../services/song.service';
import { RadioPlayerComponent } from '../radio-player/radio-player.component';
import { TranslatePipe } from '@ngx-translate/core';

interface AudioResources {
  context: AudioContext;
  mediaSource: MediaElementAudioSourceNode;
  gainNode: GainNode;
  element: HTMLAudioElement;
}

@Component({
  selector: 'app-radio',
  standalone: true,
  imports: [CommonModule, FormsModule, RadioPlayerComponent, TranslatePipe],
  templateUrl: './radio.component.html',
  styleUrl: './radio.component.css'
})
export class RadioComponent implements OnInit, OnDestroy {
  stations: RadioStation[] = [];
  currentStation: RadioStation | null = null;
  currentSong: Song | null = null;
  radioPlaylist: Song[] = [];
  searchQuery = '';
  popularTags = ['jazz', 'rock', 'classical', 'pop', 'news', 'talk'];
  selectedTag: string | null = null;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private radioService: RadioService) {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.searchStations(query);
      });
  }

  ngOnInit() {
    this.loadTopStations();
    
    this.radioService.currentStation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(station => {
        this.currentStation = station;
        if (station) {
          this.currentSong = this.convertToSong(station);
          this.updateRadioPlaylist();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  convertToSong(station: RadioStation): Song {
    return {
      _id: station.id,
      title: station.name,
      artist: station.country,
      album: station.tags.join(', '),
      duration: 0, // Radio streams don't have duration
      filePath: station.url,
      imageUrl: station.favicon || '/assets/radio-default.png',
      uploadDate: new Date(),
      uploader: {
        _id: '0',
        username: 'Radio Stream'
      }
    };
  }

  updateRadioPlaylist() {
    this.radioPlaylist = this.stations.map(station => this.convertToSong(station));
  }

  onSearchChange(query: string) {
    this.searchSubject.next(query);
  }

  searchStations(query: string) {
    if (query.trim()) {
      this.radioService.searchStations(query)
        .subscribe(stations => {
          this.stations = stations;
          this.updateRadioPlaylist();
        });
    } else {
      this.loadTopStations();
    }
  }

  loadTopStations() {
    this.radioService.getTopStations()
      .subscribe(stations => {
        this.stations = stations;
        this.updateRadioPlaylist();
      });
  }

  selectTag(tag: string) {
    this.selectedTag = this.selectedTag === tag ? null : tag;
    if (this.selectedTag) {
      this.radioService.getStationsByTag(tag)
        .subscribe(stations => {
          this.stations = stations;
          this.updateRadioPlaylist();
        });
    } else {
      this.loadTopStations();
    }
  }

  playStation(station: RadioStation) {
    this.radioService.setCurrentStation(station);
  }

  onSongEnded() {
    if (this.currentStation) {
      this.playStation(this.currentStation);
    }
  }

  onSongChanged(song: Song) {
    // Find the corresponding station and play it
    const station = this.stations.find(s => s.id === song._id);
    if (station) {
      this.playStation(station);
    }
  }

  onImageError(event: any) {
    event.target.src = '/assets/radio-default.png';
  }
}
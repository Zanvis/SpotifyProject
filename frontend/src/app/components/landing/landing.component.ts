import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  features: Feature[] = [
    {
      icon: 'play_circle',
      title: 'LANDING.FEATURES.AUDIO_PLAYER.TITLE',
      description: 'LANDING.FEATURES.AUDIO_PLAYER.DESCRIPTION'
    },
    {
      icon: 'music_note',
      title: 'LANDING.FEATURES.SONG_LIST.TITLE',
      description: 'LANDING.FEATURES.SONG_LIST.DESCRIPTION'
    },
    {
      icon: 'upload',
      title: 'LANDING.FEATURES.UPLOAD_SONGS.TITLE',
      description: 'LANDING.FEATURES.UPLOAD_SONGS.DESCRIPTION'
    },
    {
      icon: 'group',
      title: 'LANDING.FEATURES.TEAM.TITLE',
      description: 'LANDING.FEATURES.TEAM.DESCRIPTION'
    }
  ];
}

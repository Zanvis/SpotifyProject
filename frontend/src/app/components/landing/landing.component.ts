import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  features: Feature[] = [
    {
      icon: 'play_circle',
      title: 'Audio Player',
      description: 'High-quality audio playback with intuitive controls'
    },
    {
      icon: 'music_note',
      title: 'Song List',
      description: 'Organize and browse your music collection effortlessly'
    },
    {
      icon: 'upload',
      title: 'Upload Songs',
      description: 'Easily upload and expand your music library'
    },
    {
      icon: 'group',
      title: 'Team',
      description: 'Meet the passionate developers behind SoundSphere'
    }
  ];
}

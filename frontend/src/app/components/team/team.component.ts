import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css'
})
export class TeamComponent {
  features = [
    {
      title: 'ABOUT.FEATURES.FEATURE1.TITLE',
      description: 'ABOUT.FEATURES.FEATURE1.DESCRIPTION'
    },
    {
      title: 'ABOUT.FEATURES.FEATURE2.TITLE',
      description: 'ABOUT.FEATURES.FEATURE2.DESCRIPTION'
    },
    {
      title: 'ABOUT.FEATURES.FEATURE3.TITLE',
      description: 'ABOUT.FEATURES.FEATURE3.DESCRIPTION'
    },
    {
      title: 'ABOUT.FEATURES.FEATURE4.TITLE',
      description: 'ABOUT.FEATURES.FEATURE4.DESCRIPTION'
    }
  ];

  technologies = [
    'MongoDB',
    'Express.js',
    'Angular',
    'Node.js',
    'Tailwind CSS',
    'Cloudinary',
    'Socket.IO'
  ];
}

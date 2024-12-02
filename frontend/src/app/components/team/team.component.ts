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
  teamMembers = [
    {
      image: 'assets/antek.jpg',
      name: 'TEAM.TEAM_MEMBERS.ANTEK.NAME',
      role: 'TEAM.TEAM_MEMBERS.ANTEK.ROLE',
      description: 'TEAM.TEAM_MEMBERS.ANTEK.DESCRIPTION',
      githubLink: 'https://github.com/Zanvis'
    },
    {
      image: 'assets/kuba.png',
      name: 'TEAM.TEAM_MEMBERS.KUBA.NAME',
      role: 'TEAM.TEAM_MEMBERS.KUBA.ROLE',
      description: 'TEAM.TEAM_MEMBERS.KUBA.DESCRIPTION',
      githubLink: 'https://github.com/Brbn-jpg'
    },
    {
      image: 'assets/dawid.jpg',
      name: 'TEAM.TEAM_MEMBERS.DAWID.NAME',
      role: 'TEAM.TEAM_MEMBERS.DAWID.ROLE',
      description: 'TEAM.TEAM_MEMBERS.DAWID.DESCRIPTION',
      githubLink: '#'
    }
  ];

}

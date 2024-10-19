import { Routes } from '@angular/router';
import { SongListComponent } from './components/song-list/song-list.component';
import { SongUploadComponent } from './components/song-upload/song-upload.component';
import { TeamComponent } from './components/team/team.component';
import { LandingComponent } from './components/landing/landing.component';
import { PlaylistComponent } from './components/playlist/playlist.component';

export const routes: Routes = [
    // { path: '', redirectTo: '/songs', pathMatch: 'full' },
    { path: '', component: LandingComponent },
    { path: 'songs', component: SongListComponent },
    { path: 'upload', component: SongUploadComponent },
    { path: 'team', component: TeamComponent },
    { path: 'playlists', component: PlaylistComponent },
    { path: '**', redirectTo: '/songs' }
];

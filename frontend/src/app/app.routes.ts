import { Routes } from '@angular/router';
import { SongListComponent } from './components/song-list/song-list.component';
import { SongUploadComponent } from './components/song-upload/song-upload.component';

export const routes: Routes = [
    { path: '', redirectTo: '/songs', pathMatch: 'full' },
    { path: 'songs', component: SongListComponent },
    { path: 'upload', component: SongUploadComponent },
    { path: '**', redirectTo: '/songs' }
];

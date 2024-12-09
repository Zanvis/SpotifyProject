import { Routes } from '@angular/router';
import { SongListComponent } from './components/song-list/song-list.component';
import { SongUploadComponent } from './components/song-upload/song-upload.component';
import { TeamComponent } from './components/team/team.component';
import { LandingComponent } from './components/landing/landing.component';
import { PlaylistComponent } from './components/playlist/playlist.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './guards/auth.guard';
import { ProfileComponent } from './components/profile/profile.component';
import { SettingsComponent } from './components/settings/settings.component';
import { TermsComponent } from './components/terms/terms.component';
import { PrivacyComponent } from './components/privacy/privacy.component';
import { RadioComponent } from './components/radio/radio.component';
import { RoomComponent } from './components/room/room.component';
import { guestGuard } from './guards/guest.guard';
import { JamSessionComponent } from './components/jam-session/jam-session.component';

export const routes: Routes = [
    { path: '', component: LandingComponent },
    { path: 'songs', component: SongListComponent },
    { path: 'upload', component: SongUploadComponent, canActivate: [authGuard] },
    { path: 'team', component: TeamComponent },
    { path: 'playlists', component: PlaylistComponent },
    { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
    { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
    { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
    { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
    { path: 'terms', component: TermsComponent },
    { path: 'privacy', component: PrivacyComponent },
    { path: 'radio', component: RadioComponent },
    { path: 'jam-session', component: JamSessionComponent, canActivate: [authGuard] },
    { path: 'room/:id', component: RoomComponent },
    { path: '**', redirectTo: '' }
];

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SocketManagerService } from '../../services/socket-manager.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-jam-session',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './jam-session.component.html',
  styleUrl: './jam-session.component.css'
})
export class JamSessionComponent {
  roomId: string = '';
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private socketManager: SocketManagerService
  ) {}

  async createRoom() {
    try {
      this.isLoading = true;
      this.error = null;
      const roomId = await this.socketManager.createRoom();
      await this.router.navigate(['/room', roomId]);
    } catch (error) {
      this.error = 'Failed to create room. Please try again.';
      console.error('Room creation error:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async joinRoom() {
    if (!this.roomId.trim()) {
      this.error = 'Please enter a room ID';
      return;
    }

    try {
      this.isLoading = true;
      this.error = null;
      await this.socketManager.joinRoom(this.roomId);
      await this.router.navigate(['/room', this.roomId]);
    } catch (error) {
      this.error = 'Failed to join room. Please check the room ID and try again.';
      console.error('Room join error:', error);
    } finally {
      this.isLoading = false;
    }
  }
}
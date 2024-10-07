import { Component } from '@angular/core';
import { SongService } from '../../services/song.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-song-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './song-upload.component.html',
  styleUrl: './song-upload.component.css'
})
export class SongUploadComponent {
  title: string = '';
  artist: string = '';
  album: string = '';
  selectedFile: File | null = null;
  selectedImage: File | null = null;
  previewImage: string | null = null;

  constructor(
    private songService: SongService,
    private router: Router
  ) { }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    this.selectedImage = file;
    
    // Create preview for the selected image
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImage = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    if (!this.selectedFile) {
      alert('Please select a song file');
      return;
    }

    const formData = new FormData();
    formData.append('title', this.title);
    formData.append('artist', this.artist);
    formData.append('album', this.album);
    formData.append('songFile', this.selectedFile);
    
    if (this.selectedImage) {
      formData.append('imageFile', this.selectedImage);
    }

    this.songService.uploadSong(formData).subscribe({
      next: (response) => {
        console.log('Upload successful', response);
        this.router.navigate(['/songs']);
      },
      error: (error) => {
        console.error('Upload failed', error);
        alert('Upload failed. Please try again.');
      }
    });
  }
}

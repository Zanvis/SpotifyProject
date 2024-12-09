import { Component } from '@angular/core';
import { SongService } from '../../services/song.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-song-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
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
  isDraggingFile = false;
  isDraggingImage = false;
  uploadProgress = 0;
  uploading = false;
  maxFileSize = 10 * 1024 * 1024; // 10MB in bytes

  constructor(
    private songService: SongService,
    private router: Router,
    private translateService: TranslateService
  ) { }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && this.isValidAudioFile(file)) {
      if (this.isValidFileSize(file)) {
        this.selectedFile = file;
      } else {
        alert(this.translateService.instant('UPLOAD.ALERTS.FILE_SIZE_EXCEEDED', { defaultValue: 'Audio file size exceeds 10MB limit' }));
      }
    } else {
      alert(this.translateService.instant('UPLOAD.ALERTS.FILE_TYPE_INVALID', { defaultValue: 'Please select a valid audio file (MP3, WAV, or AAC)' }));
    }
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file && this.isValidImageFile(file)) {
      if (this.isValidFileSize(file)) {
        this.handleImageSelection(file);
      } else {
        alert(this.translateService.instant('UPLOAD.ALERTS.IMAGE_SIZE_EXCEEDED', { defaultValue: 'Image file size exceeds 10MB limit' }));
      }
    } else {
      alert(this.translateService.instant('UPLOAD.ALERTS.IMAGE_TYPE_INVALID', { defaultValue: 'Please select a valid image file (JPG, PNG, or WebP)' }));
    }
  }

  onDragOver(event: DragEvent, type: 'file' | 'image'): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'file') {
      this.isDraggingFile = true;
    } else {
      this.isDraggingImage = true;
    }
  }

  onDragLeave(event: DragEvent, type: 'file' | 'image'): void {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'file') {
      this.isDraggingFile = false;
    } else {
      this.isDraggingImage = false;
    }
  }

  onDrop(event: DragEvent, type: 'file' | 'image'): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (type === 'file') {
      this.isDraggingFile = false;
    } else {
      this.isDraggingImage = false;
    }
    
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (type === 'file' && this.isValidAudioFile(file) && this.isValidFileSize(file)) {
      this.selectedFile = file;
    } else if (type === 'image' && this.isValidImageFile(file) && this.isValidFileSize(file)) {
      this.handleImageSelection(file);
    } else {
      alert(this.translateService.instant('UPLOAD.ALERTS.INVALID', { defaultValue: 'Invalid file type or size exceeds 10MB limit' }));
    }
  }

  handleImageSelection(file: File): void {
    this.selectedImage = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewImage = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  isValidAudioFile(file: File): boolean {
    const validTypes = ['audio/mp3', 'audio/wav', 'audio/aac', 'audio/mpeg'];
    return validTypes.includes(file.type);
  }

  isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
  }

  isValidFileSize(file: File): boolean {
    return file.size <= this.maxFileSize;
  }

  clearFile(): void {
    this.selectedFile = null;
  }

  clearImage(): void {
    this.selectedImage = null;
    this.previewImage = null;
  }

  onSubmit(): void {
    if (!this.selectedFile) {
      alert(this.translateService.instant('UPLOAD.ALERTS.FILE_REQUIRED', { defaultValue: 'Please select a song file' }));
      return;
    }

    if (!this.isValidFileSize(this.selectedFile)) {
      alert(this.translateService.instant('UPLOAD.ALERTS.FILE_SIZE_EXCEEDED', { defaultValue: 'Audio file size exceeds 10MB limit' }));
      return;
    }

    if (this.selectedImage && !this.isValidFileSize(this.selectedImage)) {
      alert(this.translateService.instant('UPLOAD.ALERTS.IMAGE_SIZE_EXCEEDED', { defaultValue: 'Image file size exceeds 10MB limit' }));
      return;
    }

    this.uploading = true;
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
        alert(this.translateService.instant('UPLOAD.ALERTS.UPLOAD_FAILED', { defaultValue: 'Upload failed. Please try again.' }));
      },
      complete: () => {
        this.uploading = false;
      }
    });
  }
}
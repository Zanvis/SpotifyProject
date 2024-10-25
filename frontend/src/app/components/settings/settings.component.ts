import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { firstValueFrom } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface PasswordErrors {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChecks {
  length: boolean;
  hasNumber: boolean;
  hasLetter: boolean;
}


@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  username: string = '';
  email: string = '';
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  emailNotifications: boolean = true;
  autoPlayNext: boolean = true;
  
  isUpdating: boolean = false;
  isUpdatingPassword: boolean = false;
  isSavingPreferences: boolean = false;
  isDeleting: boolean = false;
  
  successMessage: string = '';
  errorMessage: string = '';

  passwordErrors: PasswordErrors = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  passwordChecks: PasswordChecks = {
    length: false,
    hasNumber: false,
    hasLetter: false
  };
  private readonly API_URL = 'https://music-app-backend-h3sd.onrender.com/api';
  // private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadUserPreferences();
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getAuthToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  async loadUserData() {
    try {
      const user = await firstValueFrom(this.apiService.getCurrentUser());
      this.username = user.user.username;
      this.email = user.user.email;
    } catch (error) {
      this.errorMessage = 'Failed to load user data';
      console.error('Error loading user data:', error);
    }
  }

  async loadUserPreferences() {
    try {
      const response = await firstValueFrom(
        this.http.get<any>(`${this.API_URL}/users/preferences`, { headers: this.getHeaders() })
      );
      this.emailNotifications = response.emailNotifications;
      this.autoPlayNext = response.autoPlayNext;
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }

  async updateProfile() {
    if (!this.username.trim()) {
      this.errorMessage = 'Username cannot be empty';
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(
        this.http.put(
          `${this.API_URL}/users/profile`,
          { username: this.username },
          { headers: this.getHeaders() }
        )
      );
      
      this.successMessage = 'Profile updated successfully';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'Failed to update profile';
    } finally {
      this.isUpdating = false;
    }
  }

  validatePasswords() {
    // Reset all errors
    this.passwordErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };

    // Validate current password
    if (this.currentPassword && this.currentPassword.length < 6) {
      this.passwordErrors.currentPassword = 'Current password is required';
    }

    // Validate new password
    if (this.newPassword) {
      this.passwordChecks = {
        length: this.newPassword.length >= 6,
        hasNumber: /\d/.test(this.newPassword),
        hasLetter: /[a-zA-Z]/.test(this.newPassword)
      };

      if (!this.passwordChecks.length) {
        this.passwordErrors.newPassword = 'Password must be at least 6 characters long';
      } else if (!this.passwordChecks.hasNumber) {
        this.passwordErrors.newPassword = 'Password must contain at least one number';
      } else if (!this.passwordChecks.hasLetter) {
        this.passwordErrors.newPassword = 'Password must contain at least one letter';
      }
    }

    // Validate password confirmation
    if (this.newPassword && this.confirmPassword && this.newPassword !== this.confirmPassword) {
      this.passwordErrors.confirmPassword = 'Passwords do not match';
    }
  }

  isPasswordValid(): boolean {
    return (
      !this.passwordErrors.currentPassword &&
      !this.passwordErrors.newPassword &&
      !this.passwordErrors.confirmPassword &&
      !!this.currentPassword &&
      !!this.newPassword &&
      !!this.confirmPassword &&
      this.passwordChecks.length &&
      this.passwordChecks.hasNumber &&
      this.passwordChecks.hasLetter
    );
  }


  async updatePassword() {
    if (!this.isPasswordValid()) {
      return;
    }

    this.isUpdatingPassword = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(
        this.http.put(
          `${this.API_URL}/users/password`,
          {
            currentPassword: this.currentPassword,
            newPassword: this.newPassword
          },
          { headers: this.getHeaders() }
        )
      );

      this.successMessage = 'Password updated successfully';
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      // Reset password checks and errors
      this.passwordChecks = {
        length: false,
        hasNumber: false,
        hasLetter: false
      };
      this.passwordErrors = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      if (error.status === 400 && error.error?.message === 'Current password is incorrect') {
        this.passwordErrors.currentPassword = 'Current password is incorrect';
      } else {
        this.errorMessage = error.error?.message || 'Failed to update password';
      }
    } finally {
      this.isUpdatingPassword = false;
    }
  }

  async savePreferences() {
    this.isSavingPreferences = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(
        this.http.put(
          `${this.API_URL}/users/preferences`,
          {
            emailNotifications: this.emailNotifications,
            autoPlayNext: this.autoPlayNext
          },
          { headers: this.getHeaders() }
        )
      );

      this.successMessage = 'Preferences saved successfully';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'Failed to save preferences';
    } finally {
      this.isSavingPreferences = false;
    }
  }

  async confirmDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    try {
      await firstValueFrom(
        this.http.delete(
          `${this.API_URL}/users/account`,
          { headers: this.getHeaders() }
        )
      );

      await this.authService.logout();
    } catch (error: any) {
      this.isDeleting = false;
      this.errorMessage = error.error?.message || 'Failed to delete account';
    }
  }
}
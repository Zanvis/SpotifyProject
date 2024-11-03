import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
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
  minLength: boolean;
}
interface UsernameValidation {
  isValid: boolean;
  message: string;
  status: 'checking' | 'error' | 'success' | 'idle';
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
  originalUsername: string = '';
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

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  passwordErrors: PasswordErrors = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  passwordChecks: PasswordChecks = {
    length: false,
    hasNumber: false,
    hasLetter: false,
    minLength: false
  };

  private usernameCheck = new Subject<string>();
  usernameValidation: UsernameValidation = {
    isValid: true,
    message: '',
    status: 'idle'
  };
  private readonly API_URL = 'https://music-app-backend-h3sd.onrender.com/api';
  // private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private http: HttpClient
  ) {
    // Setup username check debounce
    this.usernameCheck.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(username => {
      this.validateUsername(username);
    });
  }

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
      this.originalUsername = user.user.username;
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

  onUsernameChange(username: string) {
    // Don't validate if username hasn't changed from original
    if (username === this.originalUsername) {
      this.usernameValidation = {
        isValid: true,
        message: '',
        status: 'idle'
      };
      return;
    }

    // Reset validation if empty
    if (!username.trim()) {
      this.usernameValidation = {
        isValid: false,
        message: 'Username cannot be empty',
        status: 'error'
      };
      return;
    }

    // Check username length
    if (username.length < 3) {
      this.usernameValidation = {
        isValid: false,
        message: 'Username must be at least 3 characters long',
        status: 'error'
      };
      return;
    }

    // Check for valid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      this.usernameValidation = {
        isValid: false,
        message: 'Username can only contain letters, numbers, underscores, and hyphens',
        status: 'error'
      };
      return;
    }

    this.usernameValidation.status = 'checking';
    this.usernameCheck.next(username);
  }

  private async validateUsername(username: string) {
    try {
      const response = await firstValueFrom(
        this.http.get<{available: boolean}>(
          `${this.API_URL}/users/check-username/${username}`,
          { headers: this.getHeaders() }
        )
      );

      this.usernameValidation = {
        isValid: response.available,
        message: response.available ? 'Username is available' : 'This username is already taken',
        status: response.available ? 'success' : 'error'
      };
    } catch (error) {
      this.usernameValidation = {
        isValid: false,
        message: 'Error checking username availability',
        status: 'error'
      };
    }
  }

  async updateProfile() {
    if (!this.username.trim()) {
      this.errorMessage = 'Username cannot be empty';
      return;
    }

    if (this.username === this.originalUsername) {
      this.successMessage = 'No changes to save';
      setTimeout(() => this.successMessage = '', 3000);
      return;
    }

    if (!this.usernameValidation.isValid) {
      this.errorMessage = this.usernameValidation.message;
      return;
    }

    this.isUpdating = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.http.put<{user: any}>(
          `${this.API_URL}/users/profile`,
          { username: this.username.trim() },
          { headers: this.getHeaders() }
        )
      );
      
      const currentUser = this.authService.getCurrentUser();
      if (currentUser) {
        currentUser.username = this.username.trim();
        this.authService.setCurrentUser(currentUser);
      }
      
      this.originalUsername = this.username.trim();
      this.successMessage = 'Profile updated successfully';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      if (error.status === 400) {
        this.errorMessage = error.error?.message || 'Invalid username';
      } else {
        this.errorMessage = 'Failed to update profile. Please try again later.';
      }
      this.username = this.originalUsername;
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
    if (!this.currentPassword) {
      this.passwordErrors.currentPassword = 'Current password is required';
    }

    // Validate new password
    if (this.newPassword) {
      this.passwordChecks = {
        length: this.newPassword.length >= 6,
        minLength: this.newPassword.length >= 8,
        hasNumber: /\d/.test(this.newPassword),
        hasLetter: /[a-zA-Z]/.test(this.newPassword)
      };

      if (!this.passwordChecks.minLength) {
        this.passwordErrors.newPassword = 'Password must be at least 8 characters long';
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
      this.passwordChecks.minLength && // Updated to use minLength
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
        hasLetter: false,
        minLength: false
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
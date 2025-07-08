import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

interface PasswordErrors {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChecks {
  length: boolean;
  hasNumber: boolean;
  hasUppercase: boolean;
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
  imports: [CommonModule, FormsModule, TranslatePipe],
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
    hasUppercase: false,
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
    private http: HttpClient,
    private translateService: TranslateService
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
      this.errorMessage = 'SETTINGS.USER.ERROR';
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
        message: 'SETTINGS.PROFILE_SETTINGS.USERNAME.VALIDATION.ERROR.EMPTY',
        status: 'error'
      };
      return;
    }
    // Check username length
    if (username.length < 3) {
      this.usernameValidation = {
        isValid: false,
        message: 'SETTINGS.PROFILE_SETTINGS.USERNAME.VALIDATION.ERROR.TOO_SHORT',
        status: 'error'
      };
      return;
    }
    // Check for valid characters
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      this.usernameValidation = {
        isValid: false,
        message: 'SETTINGS.PROFILE_SETTINGS.USERNAME.VALIDATION.ERROR.INVALID_CHARS',
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
        message: response.available ? 'SETTINGS.PROFILE_SETTINGS.USERNAME.VALIDATION.SUCCESS' : 'SETTINGS.PROFILE_SETTINGS.USERNAME.VALIDATION.ERROR.TAKEN',
        status: response.available ? 'success' : 'error'
      };
    } catch (error) {
      this.usernameValidation = {
        isValid: false,
        message: 'SETTINGS.PROFILE_SETTINGS.USERNAME.VALIDATION.ERROR.FAILED',
        status: 'error'
      };
    }
  }

  async updateProfile() {
    if (!this.username.trim()) {
      this.errorMessage = 'SETTINGS.PROFILE_SETTINGS.USERNAME.VALIDATION.ERROR.EMPTY';
      return;
    }
    if (this.username === this.originalUsername) {
      this.successMessage = 'SETTINGS.PROFILE_SETTINGS.NO_CHANGES';
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
      this.successMessage = 'SETTINGS.PROFILE_SETTINGS.UPDATE_BUTTON.SUCCESS';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      if (error.status === 400) {
        this.errorMessage = error.error?.message || 'SETTINGS.PROFILE_SETTINGS.UPDATE_BUTTON.ERROR.INVALID';
      } else {
        this.errorMessage = 'SETTINGS.PROFILE_SETTINGS.UPDATE_BUTTON.ERROR.FAILED';
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
      this.passwordErrors.currentPassword = 'SETTINGS.PASSWORD_CHANGE.CURRENT_PASSWORD.ERROR';
    }
    // Validate new password
    if (this.newPassword) {
      this.passwordChecks = {
        length: this.newPassword.length >= 6,
        minLength: this.newPassword.length >= 8,
        hasNumber: /\d/.test(this.newPassword),
        hasUppercase: /[A-Z]/.test(this.newPassword)
      };
      if (!this.passwordChecks.minLength) {
        this.passwordErrors.newPassword = 'SETTINGS.PASSWORD_CHANGE.PASSWORD_REQUIREMENTS.MIN_LENGTH';
      } else if (!this.passwordChecks.hasNumber) {
        this.passwordErrors.newPassword = 'SETTINGS.PASSWORD_CHANGE.PASSWORD_REQUIREMENTS.HAS_NUMBER';
      } else if (!this.passwordChecks.hasUppercase) {
        this.passwordErrors.newPassword = 'SETTINGS.PASSWORD_CHANGE.PASSWORD_REQUIREMENTS.HAS_UPPERCASE';
      }
    }
    // Validate password confirmation
    if (this.newPassword && this.confirmPassword && this.newPassword !== this.confirmPassword) {
      this.passwordErrors.confirmPassword = 'SETTINGS.PASSWORD_CHANGE.CONFIRM_PASSWORD.ERROR';
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
      this.passwordChecks.minLength &&
      this.passwordChecks.hasNumber &&
      this.passwordChecks.hasUppercase
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
      this.successMessage = 'SETTINGS.PASSWORD_CHANGE.UPDATE_BUTTON.SUCCESS';
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      // Reset password checks and errors
      this.passwordChecks = {
        length: false,
        hasNumber: false,
        hasUppercase: false,
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
        this.passwordErrors.currentPassword = 'SETTINGS.PASSWORD_CHANGE.UPDATE_BUTTON.ERROR.INCORRECT_CURRENT';
      } else {
        this.errorMessage = error.error?.message || 'SETTINGS.PASSWORD_CHANGE.UPDATE_BUTTON.ERROR.FAILED';
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
      this.successMessage = 'SETTINGS.ACCOUNT_PREFERENCES.SAVE_BUTTON.SUCCESS';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      this.errorMessage = error.error?.message || 'SETTINGS.ACCOUNT_PREFERENCES.SAVE_BUTTON.ERROR';
    } finally {
      this.isSavingPreferences = false;
    }
  }

  async confirmDeleteAccount() {
    if (!confirm(this.translateService.instant('SETTINGS.DELETE_ACCOUNT.WARNING', { defaultValue: 'Are you sure you want to delete your account? This action cannot be undone.' }))) {
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
      this.errorMessage = error.error?.message || 'SETTINGS.DELETE_ACCOUNT.BUTTON.ERROR';
    }
  }
}
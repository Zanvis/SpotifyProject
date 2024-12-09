import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AbstractControl, AbstractControlOptions, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  error: string | null = null;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        this.passwordNumberValidator()
      ]],
      confirmPassword: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]]
    }, {
      validators: this.passwordMatchValidator
    } as AbstractControlOptions);
  }

  passwordNumberValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const hasNumber = /\d/.test(control.value);
      return hasNumber ? null : { noNumber: true };
    };
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }
    return null;
  }

  isFieldInvalid(field: string): boolean {
    const formField = this.registerForm.get(field);
    return !!(formField?.invalid && (formField?.dirty || formField?.touched));
  }

  getPasswordErrorMessage(): string {
    const passwordControl = this.registerForm.get('password');
    if (passwordControl?.errors) {
      if (passwordControl.errors['required']) {
        return 'REGISTER.PASSWORD_ERRORS.REQUIRED';
      }
      if (passwordControl.errors['minlength']) {
        return 'REGISTER.PASSWORD_ERRORS.MIN_LENGTH';
      }
      if (passwordControl.errors['noNumber']) {
        return 'REGISTER.PASSWORD_ERRORS.NO_NUMBER';
      }
    }
    return '';
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.error = null;
      
      const { username, email, password } = this.registerForm.value;
      
      this.apiService.register(username, email, password).subscribe({
        next: () => {
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.error = error?.error?.message || 'REGISTER.ERROR';
          this.isLoading = false;
        }
      });
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
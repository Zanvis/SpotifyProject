import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  error: string | null = null;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  isFieldInvalid(field: string): boolean {
    const formField = this.loginForm.get(field);
    return !!(formField?.invalid && (formField?.dirty || formField?.touched));
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.error = null;
      
      const { email, password } = this.loginForm.value;
      
      this.apiService.login(email, password).subscribe({
        next: () => {
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.error = error?.error?.message || 'LOGIN.ERROR';
          this.isLoading = false;
        }
      });
    }
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
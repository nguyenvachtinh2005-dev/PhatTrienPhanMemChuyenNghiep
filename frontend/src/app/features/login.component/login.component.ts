
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  submitted(submitted: any) {
    throw new Error('Method not implemented.');
  }

  loginForm: FormGroup;

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Khởi tạo Form đăng nhập
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email
      ]],

      password: ['', [
        Validators.required
      ]]
    });
  }

  // Xử lý đăng nhập
  onSubmit(): void {

    // Kiểm tra dữ liệu nhập
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Gửi thông tin đăng nhập đến Backend
    this.authService.login(this.loginForm.value).subscribe({

      // Đăng nhập thành công
      
    next: (response) => {
      this.isLoading = false;

      const role = response.data.user.role;

      if (role === 'ADMIN') {
        this.router.navigate(['/admin'], {
          state: {
            loginSuccess: 'Đăng nhập thành công! Chào mừng bạn đến với trang quản trị HealBooking.'
          }
        });

      } else if (role === 'DOCTOR') {
        this.router.navigate(['/doctor'], {
          state: {
            loginSuccess: 'Đăng nhập thành công! Chào mừng bác sĩ đến với HealBooking.'
          }
        });

      } else if (role === 'PATIENT') {
        this.router.navigate(['/patient'], {
          state: {
            loginSuccess: 'Đăng nhập thành công! Chào mừng bạn đến với HealBooking.'
          }
        });

      } else {
        this.authService.logout();
        this.errorMessage = 'Vai trò tài khoản không hợp lệ!';
      }
    },


      // Đăng nhập thất bại
      error: (error) => {
        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Email hoặc mật khẩu không chính xác!';
      }
    });
  }
}

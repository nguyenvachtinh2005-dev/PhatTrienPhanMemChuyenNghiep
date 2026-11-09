import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  submitted = false;
  errorMessage = '';
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      emailOrPhone: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Lấy thông tin từ form (tương ứng với LoginRequest)
    const credentials = this.loginForm.value;

    // 🎯 ĐẶT ĐOẠN CODE XỬ LÝ API VÀ ĐIỀU HƯỚNG VÀO ĐÂY:
    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        // TypeScript hiểu rõ response có những gì nhờ Model
        const accountName = response.name || credentials.emailOrPhone;
        const userRole = response.role; // Gợi ý chuẩn xác 'admin' | 'doctor' | 'user'

        console.log(`Đăng nhập thành công với quyền: ${userRole}`);

        // Điều hướng sang trang chào mừng kèm theo tên tài khoản
        this.router.navigate(['/welcome'], { 
          queryParams: { username: accountName } 
        });
      },
      error: (err) => {
        this.isLoading = false;
        // Lấy thông báo lỗi từ backend trả về hoặc gán thông báo mặc định
        this.errorMessage = err.error?.message || 'Đăng nhập thất bại!';
        console.error('Lỗi đăng nhập:', err);
      }
    });
  }
}
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
  
  // Biến quản lý trạng thái ẩn/hiện mật khẩu
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      emailOrPhone: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() { return this.loginForm.controls; }

  // Hàm chuyển đổi trạng thái ẩn/hiện mật khẩu khi bấm vào icon con mắt
  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const inputVal = this.loginForm.value.emailOrPhone.trim();
    const password = this.loginForm.value.password;

    const loginPayload = { 
      email: inputVal, 
      password 
    };

    this.authService.login(loginPayload).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        const token = response.data.token;
        const user = response.data.user;

        localStorage.setItem('accessToken', token);

        console.log(`Đăng nhập thành công với quyền: ${user.role}, Tên: ${user.full_name}`);

        this.router.navigate(['/welcome'], { 
          queryParams: { username: user.full_name } 
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Đăng nhập thất bại!';
        console.error('Lỗi đăng nhập:', err);
      }
    });
  }
}
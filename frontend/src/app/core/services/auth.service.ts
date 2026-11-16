
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginData {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl = 'http://localhost:3001/api/auth';

  constructor(private http: HttpClient) {}

  // Đăng ký tài khoản
  register(data: RegisterRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(
      `${this.apiUrl}/register`,
      data
    );
  }

  // Đăng nhập
  login(data: LoginRequest): Observable<ApiResponse<LoginData>> {
    return this.http
      .post<ApiResponse<LoginData>>(
        `${this.apiUrl}/login`,
        data
      )
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem(
            'user',
            JSON.stringify(response.data.user)
          );
        })
      );
  }

  // Lấy JWT Token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Lấy thông tin người dùng
  getUser(): User | null {
    const user = localStorage.getItem('user');

    return user
      ? JSON.parse(user) as User
      : null;
  }

  // Kiểm tra đăng nhập
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Đăng xuất
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

// src/app/auth-service.ts (hoặc đặt trong thư mục services của bạn)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiConfig } from '../../api.config';
import { LoginRequest, LoginResponse } from '../../../models/auth.model/auth.model-module';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loginUrl = `${ApiConfig.baseUrl}/auth/login`;

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, credentials);
  }
}
export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  role: 'admin' | 'doctor' | 'user';
  name?: string; // Tên hiển thị của người dùng (nếu backend trả về)
}
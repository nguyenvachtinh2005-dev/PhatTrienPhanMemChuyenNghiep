export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: UserInfo;
  };
}
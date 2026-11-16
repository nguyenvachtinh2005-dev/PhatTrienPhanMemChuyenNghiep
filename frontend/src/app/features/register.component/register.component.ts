
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface Specialty {
  id: number;
  name: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    full_name: string;
    email: string;
    role: string;
  };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {

  private readonly apiUrl = 'http://localhost:3001/api';

  role: 'PATIENT' | 'DOCTOR' | null = null;

  specialties: Specialty[] = [];

  loading = false;
  errorMessage = '';
  successMessage = '';

  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^[0-9]{10,11}$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
      confirmPassword: ['', Validators.required],

      // Thông tin bệnh nhân
      date_of_birth: [''],
      gender: [''],
      address: [''],
      medical_history: [''],

      // Thông tin bác sĩ
      specialty_id: [''],
      degree: [''],
      experience_years: [''],
      license_number: [''],
      work_address: ['']
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      const selectedRole = data['role'];

      this.role =
        selectedRole === 'PATIENT' || selectedRole === 'DOCTOR'
          ? selectedRole
          : null;

      this.errorMessage = '';
      this.successMessage = '';

      if (this.role === 'DOCTOR') {
        this.loadSpecialties();
      }
    });
  }

  // Lấy danh sách chuyên khoa từ Backend
  loadSpecialties(): void {
    this.http.get<{
      success: boolean;
      data: Specialty[];
    }>(`${this.apiUrl}/specialties`).subscribe({
      next: response => {
        this.specialties = response.data || [];
      },
      error: () => {
        this.errorMessage = 'Không thể tải danh sách chuyên khoa.';
      }
    });
  }

  // Kiểm tra mật khẩu xác nhận
  isPasswordMismatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword =
      this.registerForm.get('confirmPassword')?.value;

    return !!confirmPassword && password !== confirmPassword;
  }

  // Đăng ký tài khoản
  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.role) {
      return;
    }

    if (this.registerForm.invalid || this.isPasswordMismatch()) {
      this.registerForm.markAllAsTouched();

      if (this.isPasswordMismatch()) {
        this.errorMessage = 'Mật khẩu xác nhận không khớp.';
      }

      return;
    }

    const formValue = this.registerForm.value;

    const commonData = {
      full_name: formValue.full_name,
      email: formValue.email,
      phone: formValue.phone,
      password: formValue.password
    };

    let endpoint = '';
    let requestData: any = commonData;

    if (this.role === 'PATIENT') {
      endpoint = `${this.apiUrl}/auth/register/patient`;

      requestData = {
        ...commonData,
        date_of_birth: formValue.date_of_birth || null,
        gender: formValue.gender || null,
        address: formValue.address || null,
        medical_history: formValue.medical_history || null
      };
    }

    if (this.role === 'DOCTOR') {
      endpoint = `${this.apiUrl}/auth/register/doctor`;

      requestData = {
        ...commonData,
        specialty_id: Number(formValue.specialty_id),
        degree: formValue.degree,
        experience_years: Number(formValue.experience_years),
        license_number: formValue.license_number,
        work_address: formValue.work_address
      };
    }

    this.loading = true;

    this.http.post<RegisterResponse>(
      endpoint,
      requestData
    ).subscribe({
      next: response => {
        this.loading = false;

        if (response.success) {
          this.successMessage = 'Đăng ký thành công!';

          alert('Đăng ký thành công!');

          this.router.navigate(['/login']);
        } else {
          this.errorMessage =
            response.message || 'Đăng ký không thành công.';
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;

        this.errorMessage =
          error.error?.message || 'Có lỗi xảy ra khi đăng ký tài khoản.';
      }
    });
  }
}

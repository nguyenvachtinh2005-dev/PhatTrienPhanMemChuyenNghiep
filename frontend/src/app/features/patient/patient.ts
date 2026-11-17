
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { AppointmentsComponent } from './appointments/appointments';

interface Specialty {
  id: number;
  name: string;
  description?: string;
}

interface Doctor {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
  degree?: string;
  experience_years?: number;
  work_address?: string;
  specialty_id?: number;
  specialty_name?: string;
}

interface Appointment {
  id: number;
  appointment_date: string;
  status: string;
  reason?: string;
  doctor_name?: string;
  doctor_full_name?: string;
  specialty_name?: string;
  work_address?: string;
  start_time?: string;
  end_time?: string;
}

@Component({
  selector: 'app-patient',
  standalone: true,
  imports: [CommonModule, FormsModule, AppointmentsComponent],
  templateUrl: './patient.html',
  styleUrl: './patient.css'
})
export class PatientComponent implements OnInit {

  private readonly apiUrl = 'http://localhost:3001/api/patient';

  private requestId = 0;

  user: User | null = null;

  currentPage: 'home' | 'appointments' | 'account' = 'home';

  searching = false;
  errorMessage = '';
  successMessage = '';

  searchText = '';
  selectedSpecialtyFilter = '';
  showSuggestions = false;

  specialties: Specialty[] = [];
  doctors: Doctor[] = [];
  appointments: Appointment[] = [];

  bookingDoctor: Doctor | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {
    this.user = this.authService.getUser();
  }

  // =========================
  // KHỞI TẠO
  // =========================

  ngOnInit(): void {

    // Hiển thị dữ liệu cache ngay khi mở trang
    const cachedSpecialties = this.getCache('specialties');
    const cachedDoctors = this.getCache('doctors');
    const cachedAppointments = this.getCache('appointments');

    if (cachedSpecialties) {
      this.specialties = cachedSpecialties;
    }

    if (cachedDoctors) {
      this.doctors = cachedDoctors;
    }

    if (cachedAppointments) {
      this.appointments = cachedAppointments;
    }

    // Sau đó đồng bộ dữ liệu mới từ Backend
    this.loadSpecialties();
    this.loadDoctors();
    this.loadAppointments();
  }

  // =========================
  // CACHE
  // =========================

  private getCacheKey(type: string): string {
    const userId = this.user?.id || 'default';
    return `healbooking_patient_${userId}_${type}`;
  }

  private getCache(type: string): any[] | null {
    try {
      const cached = localStorage.getItem(this.getCacheKey(type));

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);

      return Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  }

  private saveCache(type: string, data: any[]): void {
    try {
      localStorage.setItem(
        this.getCacheKey(type),
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Không thể lưu cache:', error);
    }
  }

  // =========================
  // CẤU HÌNH API
  // =========================

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  private getData(response: any): any {
    return response?.data ?? response;
  }

  private getList(response: any): any[] {
    const data = this.getData(response);

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.doctors)) return data.doctors;
    if (Array.isArray(data?.appointments)) return data.appointments;
    if (Array.isArray(data?.specialties)) return data.specialties;

    return [];
  }

  private handleApiError(error: any): void {

    if (error.status === 401 || error.status === 403) {
      this.logout();
      return;
    }

    this.errorMessage =
      error.error?.message ||
      'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
  }

  // =========================
  // CHUYÊN KHOA
  // =========================

  loadSpecialties(): void {

    this.http.get<any>(
      `${this.apiUrl}/specialties`,
      {
        headers: this.getHeaders()
      }
    ).subscribe({
      next: response => {
        this.specialties = this.getList(response);
        this.saveCache('specialties', this.specialties);
      },
      error: error => this.handleApiError(error)
    });
  }

  // =========================
  // DANH SÁCH BÁC SĨ
  // =========================

  loadDoctors(): void {

    this.requestId++;

    const currentRequest = this.requestId;

    let params = new HttpParams()
      .set('page', '1')
      .set('limit', '20');

    const keyword = this.searchText.trim();
    const specialtyId = this.selectedSpecialtyFilter;

    if (keyword !== '') {
      params = params.set('search', keyword);
    }

    if (specialtyId !== '') {
      params = params.set('specialtyId', specialtyId);
    }

    this.http.get<any>(
      `${this.apiUrl}/doctors`,
      {
        headers: this.getHeaders(),
        params
      }
    ).subscribe({
      next: response => {

        if (currentRequest !== this.requestId) {
          return;
        }

        this.doctors = this.getList(response);

        // Chỉ lưu danh sách ban đầu, không lưu kết quả lọc
        if (keyword === '' && specialtyId === '') {
          this.saveCache('doctors', this.doctors);
        }
      },
      error: error => {

        if (currentRequest !== this.requestId) {
          return;
        }

        this.handleApiError(error);
      }
    });
  }

  // =========================
  // TÌM KIẾM BÁC SĨ
  // =========================

  searchDoctors(): void {
    this.showSuggestions = false;
    this.loadDoctors();
  }

  onSearchInput(): void {

    const keyword = this.searchText.trim();

    if (keyword === '') {
      this.showSuggestions = false;
      this.loadDoctors();
      return;
    }

    this.showSuggestions = true;
    this.loadDoctors();
  }

  get suggestedDoctors(): Doctor[] {

    const keyword = this.searchText.trim().toLowerCase();

    if (keyword === '') {
      return [];
    }

    return this.doctors
      .filter(doctor =>
        doctor.full_name?.toLowerCase().includes(keyword)
      )
      .slice(0, 5);
  }

  get suggestedSpecialties(): Specialty[] {
    return [];
  }

  selectSuggestedDoctor(doctor: Doctor): void {
    this.searchText = doctor.full_name;
    this.showSuggestions = false;
    this.loadDoctors();
  }

  selectSuggestedSpecialty(specialty: Specialty): void {
    this.filterBySpecialty(specialty.id);
  }

  // =========================
  // LỌC THEO CHUYÊN KHOA
  // =========================

  filterBySpecialty(specialtyId: number): void {

    this.selectedSpecialtyFilter = String(specialtyId);

    // Xóa từ khóa tìm kiếm cũ
    this.searchText = '';

    this.showSuggestions = false;

    // Gọi API ngay khi click chuyên khoa
    this.loadDoctors();
  }

  // =========================
  // XÓA BỘ LỌC
  // =========================

  clearSearch(): void {

    this.searchText = '';
    this.selectedSpecialtyFilter = '';
    this.showSuggestions = false;
    this.errorMessage = '';

    // Hiển thị danh sách ban đầu từ cache ngay lập tức
    const cachedDoctors = this.getCache('doctors');

    if (cachedDoctors !== null) {
      this.doctors = cachedDoctors;
    }

    // Đồng bộ danh sách ban đầu từ Backend
    this.loadDoctors();
  }

  // =========================
  // LỊCH HẸN
  // =========================

  loadAppointments(): void {

    const params = new HttpParams()
      .set('page', '1')
      .set('limit', '5');

    this.http.get<any>(
      `${this.apiUrl}/appointments`,
      {
        headers: this.getHeaders(),
        params
      }
    ).subscribe({
      next: response => {
        this.appointments = this.getList(response);
        this.saveCache('appointments', this.appointments);
      },
      error: error => this.handleApiError(error)
    });
  }

  cancelAppointment(appointment: Appointment): void {

    if (appointment.status !== 'PENDING') {
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn hủy lịch khám #${appointment.id}?`
    );

    if (!confirmed) {
      return;
    }

    this.http.patch<any>(
      `${this.apiUrl}/appointments/${appointment.id}/cancel`,
      {},
      {
        headers: this.getHeaders()
      }
    ).subscribe({
      next: () => {
        this.successMessage = 'Đã hủy lịch khám thành công.';
        this.loadAppointments();
      },
      error: error => this.handleApiError(error)
    });
  }

  getDoctorName(appointment: Appointment): string {
    return appointment.doctor_name ||
      appointment.doctor_full_name ||
      'Bác sĩ';
  }

  getAppointmentStatus(status: string): string {

    const labels: Record<string, string> = {
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      COMPLETED: 'Đã hoàn thành',
      CANCELLED: 'Đã hủy',
      REJECTED: 'Từ chối'
    };

    return labels[status] || status;
  }

  // =========================
  // CHUYỂN TRANG
  // =========================

  openHome(): void {

    this.currentPage = 'home';
    this.bookingDoctor = null;

    this.errorMessage = '';
    this.successMessage = '';
    this.showSuggestions = false;
  }

  openBooking(doctor: Doctor | null = null): void {

    this.bookingDoctor = doctor;
    this.currentPage = 'appointments';

    this.errorMessage = '';
    this.successMessage = '';
    this.showSuggestions = false;
  }

  openAccount(): void {

    this.currentPage = 'account';

    this.errorMessage = '';
    this.successMessage = '';
  }

  onBookingCompleted(): void {

    this.currentPage = 'home';
    this.bookingDoctor = null;

    this.successMessage = 'Đặt lịch khám thành công!';

    this.loadAppointments();
  }

  // =========================
  // ĐỊNH DẠNG NGÀY GIỜ
  // =========================

  formatDate(date: string | undefined): string {

    if (!date) {
      return '--';
    }

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return date;
    }

    return value.toLocaleDateString('vi-VN');
  }

  formatTime(date: string | undefined): string {

    if (!date) {
      return '--:--';
    }

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return date;
    }

    return value.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  // =========================
  // ĐĂNG XUẤT
  // =========================

  logout(): void {

    this.authService.logout();

    this.router.navigate(['/login']);
  }
}

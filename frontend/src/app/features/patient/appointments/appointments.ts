import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthService, User } from '../../../core/services/auth.service';

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

interface DoctorSlot {
  id: number;
  start_time: string;
  end_time: string;
  remaining_capacity?: number;
  status?: string;
}

interface PatientProfile {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css'
})
export class AppointmentsComponent implements OnInit {

  private readonly apiUrl = 'http://localhost:3001/api/patient';

  @Input() initialDoctor: Doctor | null = null;

  @Output() back = new EventEmitter<void>();
  @Output() bookingCompleted = new EventEmitter<void>();

  user: User | null = null;
  profile: PatientProfile | null = null;

  specialties: Specialty[] = [];
  doctors: Doctor[] = [];
  availableSlots: DoctorSlot[] = [];

  currentStep = 1;

  loading = false;
  bookingLoading = false;

  errorMessage = '';
  successMessage = '';

  selectedSpecialtyId = '';
  selectedDoctorId = '';
  selectedDate = '';
  selectedSlotId = '';
  reason = '';

  selectedDoctor: Doctor | null = null;
  selectedSlot: DoctorSlot | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.user = this.authService.getUser();
  }

  ngOnInit(): void {
    this.loadProfile();
    this.loadSpecialties();
    this.loadDoctors();
  }

  // =========================
  // API CONFIGURATION
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
    if (Array.isArray(data?.specialties)) return data.specialties;
    if (Array.isArray(data?.slots)) return data.slots;

    return [];
  }

  private handleApiError(error: any): void {
    this.errorMessage =
      error.error?.message ||
      'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
  }

  // =========================
  // PATIENT PROFILE
  // =========================

  loadProfile(): void {
    this.http.get<any>(
      `${this.apiUrl}/profile`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: response => {
        this.profile = this.getData(response);
      },
      error: error => this.handleApiError(error)
    });
  }

  // =========================
  // SPECIALTIES
  // =========================

  loadSpecialties(): void {
    this.http.get<any>(
      `${this.apiUrl}/specialties`,
      { headers: this.getHeaders() }
    ).subscribe({
      next: response => {
        this.specialties = this.getList(response);
      },
      error: error => this.handleApiError(error)
    });
  }

  getSelectedSpecialtyName(): string {
    const specialty = this.specialties.find(
      item => item.id === Number(this.selectedSpecialtyId)
    );

    return specialty?.name || 'Chưa chọn';
  }

  onSpecialtyChange(): void {
    this.selectedDoctorId = '';
    this.selectedDoctor = null;
    this.selectedDate = '';
    this.selectedSlotId = '';
    this.selectedSlot = null;
    this.availableSlots = [];

    this.loadDoctors();
  }

  // =========================
  // DOCTORS
  // =========================

  loadDoctors(): void {
    let params = new HttpParams()
      .set('page', '1')
      .set('limit', '100');

    if (this.selectedSpecialtyId) {
      params = params.set('specialtyId', this.selectedSpecialtyId);
    }

    this.loading = true;

    this.http.get<any>(
      `${this.apiUrl}/doctors`,
      {
        headers: this.getHeaders(),
        params
      }
    ).subscribe({
      next: response => {
        this.doctors = this.getList(response);
        this.loading = false;

        if (this.initialDoctor) {
          const doctor = this.doctors.find(
            item => item.id === this.initialDoctor?.id
          );

          if (doctor) {
            this.selectDoctor(doctor);
          } else {
            this.selectedDoctor = this.initialDoctor;
            this.selectedDoctorId = String(this.initialDoctor.id);

            if (this.initialDoctor.specialty_id) {
              this.selectedSpecialtyId =
                String(this.initialDoctor.specialty_id);
            }
          }
        }
      },
      error: error => {
        this.loading = false;
        this.handleApiError(error);
      }
    });
  }

  selectDoctor(doctor: Doctor): void {
    this.selectedDoctor = doctor;
    this.selectedDoctorId = String(doctor.id);

    if (doctor.specialty_id) {
      this.selectedSpecialtyId = String(doctor.specialty_id);
    }

    this.selectedDate = '';
    this.selectedSlotId = '';
    this.selectedSlot = null;
    this.availableSlots = [];
  }

  onDoctorChange(): void {
    this.selectedDoctor =
      this.doctors.find(
        doctor => doctor.id === Number(this.selectedDoctorId)
      ) || null;

    this.selectedDate = '';
    this.selectedSlotId = '';
    this.selectedSlot = null;
    this.availableSlots = [];

    if (this.selectedDoctor?.specialty_id) {
      this.selectedSpecialtyId =
        String(this.selectedDoctor.specialty_id);
    }
  }

  // =========================
  // DOCTOR SLOTS
  // =========================

  onDateChange(): void {
    this.selectedSlotId = '';
    this.selectedSlot = null;
    this.availableSlots = [];
    this.errorMessage = '';

    if (!this.selectedDoctorId || !this.selectedDate) {
      return;
    }

    const params = new HttpParams()
      .set('date', this.selectedDate);

    this.http.get<any>(
      `${this.apiUrl}/doctors/${this.selectedDoctorId}/slots`,
      {
        headers: this.getHeaders(),
        params
      }
    ).subscribe({
      next: response => {
        this.availableSlots = this.getList(response);
      },
      error: error => this.handleApiError(error)
    });
  }

  selectSlot(slot: DoctorSlot): void {
    this.selectedSlotId = String(slot.id);
    this.selectedSlot = slot;
  }

  isSlotSelected(slotId: number): boolean {
    return this.selectedSlotId === String(slotId);
  }

  getSlotTime(slot: DoctorSlot): string {
    return `${this.formatTime(slot.start_time)} - ${this.formatTime(slot.end_time)}`;
  }

  // =========================
  // BOOKING PROCESS
  // =========================

  continueToConfirmation(): void {
    this.errorMessage = '';

    if (!this.selectedSpecialtyId) {
      this.errorMessage = 'Vui lòng chọn chuyên khoa.';
      return;
    }

    if (!this.selectedDoctorId || !this.selectedDoctor) {
      this.errorMessage = 'Vui lòng chọn bác sĩ.';
      return;
    }

    if (!this.selectedDate) {
      this.errorMessage = 'Vui lòng chọn ngày khám.';
      return;
    }

    if (!this.selectedSlotId || !this.selectedSlot) {
      this.errorMessage = 'Vui lòng chọn khung giờ khám.';
      return;
    }

    if (!this.reason.trim()) {
      this.errorMessage = 'Vui lòng nhập lý do khám.';
      return;
    }

    this.currentStep = 2;
  }

  backToInformation(): void {
    this.currentStep = 1;
    this.errorMessage = '';
  }

  confirmBooking(): void {
    if (!this.selectedDoctor || !this.selectedSlot) {
      this.errorMessage = 'Thông tin đặt lịch không hợp lệ.';
      return;
    }

    this.bookingLoading = true;
    this.errorMessage = '';

    const body = {
      doctorId: Number(this.selectedDoctorId),
      slotId: Number(this.selectedSlotId),
      reason: this.reason.trim()
    };

    this.http.post<any>(
      `${this.apiUrl}/appointments`,
      body,
      { headers: this.getHeaders() }
    ).subscribe({
      next: response => {
        this.bookingLoading = false;

        if (response?.success === false) {
          this.errorMessage =
            response.message || 'Đặt lịch không thành công.';
          return;
        }

        this.currentStep = 3;
        this.successMessage = 'Đặt lịch khám thành công!';
      },
      error: error => {
        this.bookingLoading = false;
        this.handleApiError(error);
      }
    });
  }

  finishBooking(): void {
    this.bookingCompleted.emit();
  }

  // =========================
  // DATE AND TIME
  // =========================

  formatDate(date: string | undefined): string {
    if (!date) return '--';

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return date;

    return value.toLocaleDateString('vi-VN');
  }

  formatTime(date: string | undefined): string {
    if (!date) return '--:--';

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return date;

    return value.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  getMinDate(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  goBack(): void {
    this.back.emit();
  }
}
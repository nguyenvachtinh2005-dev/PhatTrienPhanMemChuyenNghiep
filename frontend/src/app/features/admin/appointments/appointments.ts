
import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpHeaders,
  HttpParams
} from '@angular/common/http';

import {
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  takeUntil
} from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';

interface Appointment {
  id: number;

  patient_id: number;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string | null;

  doctor_id: number;
  doctor_name: string;
  doctor_email?: string;
  doctor_phone?: string | null;
  doctor_degree?: string | null;
  specialty_id?: number | null;

  slot_id: number;
  slot_start_time: string;
  slot_end_time: string;
  slot_status?: string;

  appointment_date: string;
  reason: string | null;

  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'REJECTED';

  status_history?: any;
  created_at?: string;
  updated_at?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.html',
  styleUrl: './appointments.css'
})
export class AppointmentsComponent implements OnInit, OnDestroy {

  private readonly apiUrl =
    'http://localhost:3001/api/admin/appointments';

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  private listSubscription?: Subscription;
  private detailSubscription?: Subscription;

  // Danh sách lịch khám
  appointments: Appointment[] = [];

  // Lịch khám đang xem chi tiết
  selectedAppointment: Appointment | null = null;

  // Bộ lọc
  searchText = '';
  selectedStatus = '';
  selectedDate = '';

  // Phân trang
  currentPage = 1;
  pageSize = 10;

  totalAppointments = 0;
  totalPages = 0;

  // Trạng thái giao diện
  isLoading = false;
  isUpdating = false;
  showDetailModal = false;

  errorMessage = '';
  successMessage = '';

  // Các trạng thái lịch khám
  readonly statusOptions = [
    { value: 'PENDING', label: 'Chờ xác nhận' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'REJECTED', label: 'Từ chối' }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  // Khởi tạo component
  ngOnInit(): void {

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadAppointments();
    });

    this.loadAppointments();
  }

  // Hủy subscription khi rời trang
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.listSubscription?.unsubscribe();
    this.detailSubscription?.unsubscribe();
  }

  // Lấy JWT để xác thực API
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // Tạo tham số tìm kiếm, lọc và phân trang
  private getQueryParams(): HttpParams {
    let params = new HttpParams()
      .set('page', this.currentPage)
      .set('limit', this.pageSize);

    if (this.searchText.trim()) {
      params = params.set('search', this.searchText.trim());
    }

    if (this.selectedStatus) {
      params = params.set('status', this.selectedStatus);
    }

    if (this.selectedDate) {
      params = params.set('date', this.selectedDate);
    }

    return params;
  }

  // Lấy danh sách lịch khám
  loadAppointments(): void {

    this.listSubscription?.unsubscribe();

    this.isLoading = true;
    this.errorMessage = '';

    this.cdr.detectChanges();

    const startTime = Date.now();

    this.listSubscription = this.http.get<ApiResponse<Appointment[]>>(
      this.apiUrl,
      {
        headers: this.getHeaders(),
        params: this.getQueryParams()
      }
    ).subscribe({

      next: (response) => {

        if (response.success) {

          this.appointments = response.data || [];

          this.totalAppointments =
            response.pagination?.total || 0;

          this.totalPages =
            response.pagination?.totalPages || 0;

        } else {

          this.appointments = [];
          this.totalAppointments = 0;
          this.totalPages = 0;

          this.errorMessage =
            response.message ||
            'Không thể tải danh sách lịch khám.';
        }

        this.isLoading = false;

        console.log(
          `[Appointments] Tải danh sách: ${Date.now() - startTime}ms`
        );

        console.log(
          '[Appointments] Số lịch khám:',
          this.appointments.length
        );

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Lỗi lấy danh sách lịch khám:',
          error
        );

        this.appointments = [];
        this.totalAppointments = 0;
        this.totalPages = 0;

        this.errorMessage =
          error.error?.message ||
          'Không thể kết nối đến máy chủ. Vui lòng thử lại.';

        this.isLoading = false;

        this.cdr.detectChanges();
      }
    });
  }

  // Tìm kiếm có trì hoãn
  onSearchChange(value: string): void {
    this.searchText = value;
    this.searchSubject.next(value.trim());
  }

  // Lọc theo trạng thái
  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    this.selectedStatus = value;
    this.currentPage = 1;

    this.loadAppointments();
  }

  // Lọc theo ngày khám
  onDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.selectedDate = value;
    this.currentPage = 1;

    this.loadAppointments();
  }

  // Lọc dữ liệu
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadAppointments();
  }

  // Chuyển trang
  goToPage(page: number): void {

    if (
      page < 1 ||
      page > this.totalPages ||
      page === this.currentPage
    ) {
      return;
    }

    this.currentPage = page;
    this.loadAppointments();
  }

  // Các số trang cần hiển thị
  get pageNumbers(): number[] {
    const pages: number[] = [];

    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(
      this.totalPages,
      this.currentPage + 2
    );

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    return pages;
  }

  // Kiểm tra lịch khám đã hoàn thành chưa
  isCompleted(appointment: Appointment | null): boolean {
    return appointment?.status === 'COMPLETED';
  }

  // Xem chi tiết lịch khám
  openDetail(appointment: Appointment): void {

    this.errorMessage = '';
    this.successMessage = '';

    this.selectedAppointment = { ...appointment };
    this.showDetailModal = true;

    this.cdr.detectChanges();

    this.detailSubscription?.unsubscribe();

    this.detailSubscription = this.http.get<ApiResponse<Appointment>>(
      `${this.apiUrl}/${appointment.id}`,
      {
        headers: this.getHeaders()
      }
    ).subscribe({

      next: (response) => {

        if (
          response.success &&
          response.data &&
          this.selectedAppointment?.id === appointment.id
        ) {
          this.selectedAppointment = response.data;
        }

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Lỗi lấy chi tiết lịch khám:',
          error
        );

        this.errorMessage =
          error.error?.message ||
          'Không thể lấy thông tin chi tiết lịch khám.';

        this.cdr.detectChanges();
      }
    });
  }

  // Tải lại chi tiết sau khi cập nhật
  private reloadAppointmentDetail(id: number): void {

    this.detailSubscription?.unsubscribe();

    this.detailSubscription = this.http.get<ApiResponse<Appointment>>(
      `${this.apiUrl}/${id}`,
      {
        headers: this.getHeaders()
      }
    ).subscribe({

      next: (response) => {

        if (
          response.success &&
          response.data &&
          this.selectedAppointment?.id === id
        ) {
          this.selectedAppointment = response.data;
        }

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Lỗi tải lại chi tiết lịch khám:',
          error
        );

        this.cdr.detectChanges();
      }
    });
  }

  // Đóng cửa sổ chi tiết
  closeDetail(): void {

    if (this.isUpdating) {
      return;
    }

    this.detailSubscription?.unsubscribe();

    this.showDetailModal = false;
    this.selectedAppointment = null;

    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  // Cập nhật trạng thái lịch khám
  updateStatus(): void {

    if (
      !this.selectedAppointment ||
      this.isUpdating
    ) {
      return;
    }

    // Không cho sửa lịch khám đã hoàn thành
    if (this.isCompleted(this.selectedAppointment)) {

      this.errorMessage =
        'Lịch khám đã hoàn thành, không thể thay đổi trạng thái!';

      this.cdr.detectChanges();
      return;
    }

    const appointmentId = this.selectedAppointment.id;
    const newStatus = this.selectedAppointment.status;

    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();

    this.http.patch<ApiResponse<any>>(
      `${this.apiUrl}/${appointmentId}/status`,
      { status: newStatus },
      {
        headers: this.getHeaders()
      }
    ).subscribe({

      next: (response) => {

        if (response.success) {

          this.successMessage =
            response.message ||
            'Cập nhật trạng thái thành công!';

          this.loadAppointments();

          this.reloadAppointmentDetail(appointmentId);

        } else {

          this.errorMessage =
            response.message ||
            'Không thể cập nhật trạng thái.';
        }

        this.isUpdating = false;

        this.cdr.detectChanges();
      },

      error: (error) => {

        console.error(
          'Lỗi cập nhật trạng thái:',
          error
        );

        this.errorMessage =
          error.error?.message ||
          'Không thể cập nhật trạng thái lịch khám.';

        this.isUpdating = false;

        this.cdr.detectChanges();
      }
    });
  }

  // Tên trạng thái tiếng Việt
  getStatusLabel(status: string): string {

    const item = this.statusOptions.find(
      option => option.value === status
    );

    return item?.label || status;
  }

  // Xóa bộ lọc
  resetFilters(): void {

    this.searchText = '';
    this.selectedStatus = '';
    this.selectedDate = '';

    this.currentPage = 1;

    this.searchSubject.next('');

    this.loadAppointments();
  }
}


import { Component, OnDestroy } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationEnd
} from '@angular/router';

import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { filter, Subscription, finalize } from 'rxjs';

import {
  AuthService,
  User
} from '../../core/services/auth.service';

interface DoctorAppointment {
  id: number;
  patient_name: string;
  appointment_date: string;
  slot_start_time?: string;
  slot_end_time?: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  status: string;
}

interface DoctorDashboard {
  statistics: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    rejected: number;
  };
  upcomingAppointments: DoctorAppointment[];
}

@Component({
  selector: 'app-doctor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './doctor.html',
  styleUrl: './doctor.css'
})
export class DoctorComponent implements OnDestroy {

  user: User | null = null;

  successMessage = '';
  isDashboard = true;

  isLoading = false;
  dashboardLoaded = false;
  errorMessage = '';

  totalAppointments = 0;
  pendingAppointments = 0;
  confirmedAppointments = 0;
  completedAppointments = 0;
  rejectedAppointments = 0;

  upcomingAppointments: DoctorAppointment[] = [];

  private routerSubscription?: Subscription;
  private dashboardSubscription?: Subscription;

  private readonly API_URL = 'http://localhost:3001/api/doctor';

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {
    this.user = this.authService.getUser();
    this.successMessage = history.state?.loginSuccess || '';

    this.updateCurrentPage();

    // Hiển thị dữ liệu đã lưu trước khi gọi API.
    this.loadCachedDashboard();

    // Theo dõi chuyển trang.
    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        const wasDashboard = this.isDashboard;

        this.updateCurrentPage();

        if (this.isDashboard && !wasDashboard) {
          this.loadCachedDashboard();
          this.loadDashboard();
        }

        if (!this.isDashboard) {
          this.cancelDashboardRequest();
        }
      });

    // Gọi API cập nhật dữ liệu khi vào trang chủ.
    if (this.isDashboard) {
      this.loadDashboard();
    }
  }

  // =====================================
  // XÁC ĐỊNH TRANG HIỆN TẠI
  // =====================================

  updateCurrentPage(): void {
    const currentUrl = this.router.url.split('?')[0];

    this.isDashboard =
      currentUrl === '/doctor' ||
      currentUrl === '/doctor/';
  }

  // =====================================
  // KEY LƯU DỮ LIỆU THEO TÀI KHOẢN
  // =====================================

  private getCacheKey(): string {
    return `healbooking_doctor_dashboard_${this.user?.email || 'current'}`;
  }

  // =====================================
  // GÁN DỮ LIỆU DASHBOARD
  // =====================================

  private applyDashboard(data: DoctorDashboard): void {
    const statistics = data?.statistics;

    if (statistics) {
      this.totalAppointments = Number(statistics.total ?? 0);
      this.pendingAppointments = Number(statistics.pending ?? 0);
      this.confirmedAppointments = Number(statistics.confirmed ?? 0);
      this.completedAppointments = Number(statistics.completed ?? 0);
      this.rejectedAppointments = Number(statistics.rejected ?? 0);
    }

    this.upcomingAppointments =
      Array.isArray(data?.upcomingAppointments)
        ? data.upcomingAppointments
        : [];

    this.dashboardLoaded = true;
  }

  // =====================================
  // ĐỌC DỮ LIỆU ĐÃ LƯU
  // =====================================

  private loadCachedDashboard(): void {
    try {
      const cachedData = sessionStorage.getItem(
        this.getCacheKey()
      );

      if (!cachedData) {
        return;
      }

      const data = JSON.parse(cachedData) as DoctorDashboard;

      this.applyDashboard(data);

      console.log('[Doctor Dashboard] Đã hiển thị dữ liệu lưu trước đó');

    } catch (error) {
      console.error('Không thể đọc dữ liệu Dashboard đã lưu:', error);
    }
  }

  // =====================================
  // LƯU DỮ LIỆU DASHBOARD
  // =====================================

  private saveCachedDashboard(data: DoctorDashboard): void {
    try {
      sessionStorage.setItem(
        this.getCacheKey(),
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Không thể lưu dữ liệu Dashboard:', error);
    }
  }

  // =====================================
  // HEADER XÁC THỰC
  // =====================================

  private getHeaders(): HttpHeaders | null {
    const token = this.authService.getToken();

    if (!token) {
      this.authService.logout();
      this.router.navigate(['/login']);
      return null;
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // =====================================
  // HỦY REQUEST
  // =====================================

  private cancelDashboardRequest(): void {
    this.dashboardSubscription?.unsubscribe();
    this.dashboardSubscription = undefined;
    this.isLoading = false;
  }

  // =====================================
  // TẢI DASHBOARD TỪ BACKEND
  // =====================================

  loadDashboard(): void {
    if (!this.isDashboard) {
      return;
    }

    const headers = this.getHeaders();

    if (!headers) {
      return;
    }

    // Hủy request cũ nếu có.
    this.dashboardSubscription?.unsubscribe();

    this.isLoading = true;
    this.errorMessage = '';

    this.dashboardSubscription = this.http
      .get<any>(
        `${this.API_URL}/dashboard`,
        { headers }
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.dashboardSubscription = undefined;
        })
      )
      .subscribe({

        next: (response) => {
          console.log('[Doctor Dashboard] API:', response);

          const data = response?.data ?? response;

          const dashboard: DoctorDashboard = {
            statistics: {
              total: Number(data?.statistics?.total ?? 0),
              pending: Number(data?.statistics?.pending ?? 0),
              confirmed: Number(data?.statistics?.confirmed ?? 0),
              completed: Number(data?.statistics?.completed ?? 0),
              rejected: Number(data?.statistics?.rejected ?? 0)
            },
            upcomingAppointments:
              Array.isArray(data?.upcomingAppointments)
                ? data.upcomingAppointments
                : []
          };

          // Cập nhật giao diện bằng dữ liệu mới nhất.
          this.applyDashboard(dashboard);

          // Lưu lại để lần sau mở trang hiển thị ngay.
          this.saveCachedDashboard(dashboard);

          this.errorMessage = '';

          console.log('[Doctor Dashboard] Đã cập nhật dữ liệu mới');
        },

        error: (error) => {
          console.error('[Doctor Dashboard] Lỗi:', error);

          if (
            error.status === 401 ||
            error.status === 403
          ) {
            this.authService.logout();
            this.router.navigate(['/login']);
            return;
          }

          this.errorMessage =
            error.error?.message ||
            `Không thể cập nhật dữ liệu (HTTP ${error.status || 'không xác định'}).`;

          // Không xóa dữ liệu cũ nếu API gặp lỗi.
          this.dashboardLoaded = true;
        }
      });
  }

  // =====================================
  // LÀM MỚI DASHBOARD
  // =====================================

  refreshDashboard(): void {
  // Hủy request cũ nếu đang tải.
  this.dashboardSubscription?.unsubscribe();
  this.dashboardSubscription = undefined;

  // Cho phép tải lại dữ liệu.
  this.isLoading = false;

  // Gọi API lấy dữ liệu mới nhất.
  this.loadDashboard();
}

  // =====================================
  // THỜI GIAN LỊCH KHÁM
  // =====================================

  getAppointmentStartTime(
    appointment: DoctorAppointment
  ): string {
    return appointment.slot_start_time ||
      appointment.start_time ||
      '--:--';
  }

  getAppointmentEndTime(
    appointment: DoctorAppointment
  ): string {
    return appointment.slot_end_time ||
      appointment.end_time ||
      '--:--';
  }

  // =====================================
  // TRẠNG THÁI LỊCH KHÁM
  // =====================================

  getStatusText(status: string): string {
    const statuses: Record<string, string> = {
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      REJECTED: 'Đã từ chối'
    };

    return statuses[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'status-pending',
      CONFIRMED: 'status-confirmed',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
      REJECTED: 'status-rejected'
    };

    return classes[status] || '';
  }

  // =====================================
  // ĐĂNG XUẤT
  // =====================================

  logout(): void {
    this.cancelDashboardRequest();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // =====================================
  // HỦY SUBSCRIPTION
  // =====================================

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    this.dashboardSubscription?.unsubscribe();
  }
}

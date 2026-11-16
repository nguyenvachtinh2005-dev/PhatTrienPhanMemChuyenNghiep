
import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService, User } from '../../../core/services/auth.service';

interface Account {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  account_status: string;
  created_at?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: Account[] | { accounts?: Account[] };
}

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './accounts.html',
  styleUrl: './accounts.css'
})
export class AccountComponent implements OnInit {

  private readonly apiUrl = 'http://localhost:3001/api/admin/accounts';

  user: User | null = null;

  accounts: Account[] = [];
  filteredAccounts: Account[] = [];

  searchText = '';
  selectedRole = '';
  selectedStatus = '';

  isLoading = false;
  isUpdating = false;

  successMessage = '';
  errorMessage = '';

  selectedAccount: Account | null = null;

  // PHÂN TRANG
  currentPage = 1;
  pageSize = 10;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.user = this.authService.getUser();
  }

  ngOnInit(): void {
    this.loadAccounts();
  }

  // HEADER XÁC THỰC
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // TẢI DANH SÁCH TÀI KHOẢN
  loadAccounts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.http.get<ApiResponse>(this.apiUrl, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data;

        if (Array.isArray(data)) {
          this.accounts = data;
        } else {
          this.accounts = data?.accounts ?? [];
        }

        // Sắp xếp mã tài khoản tăng dần
        this.accounts.sort((a, b) => a.id - b.id);

        this.searchText = '';
        this.selectedRole = '';
        this.selectedStatus = '';
        this.currentPage = 1;

        this.applyFilters();

        this.isLoading = false;
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Lỗi tải danh sách tài khoản:', error);

        this.isLoading = false;

        this.errorMessage =
          error.error?.message ||
          'Không thể tải danh sách tài khoản.';

        this.cdr.detectChanges();
      }
    });
  }

  // TÌM KIẾM VÀ LỌC TÀI KHOẢN
  applyFilters(): void {
    const keyword = this.searchText.trim().toLowerCase();

    this.filteredAccounts = this.accounts.filter(account => {

      const matchesKeyword =
        !keyword ||
        account.full_name?.toLowerCase().includes(keyword) ||
        account.email?.toLowerCase().includes(keyword) ||
        account.phone?.toLowerCase().includes(keyword) ||
        String(account.id).includes(keyword);

      const matchesRole =
        !this.selectedRole ||
        account.role === this.selectedRole;

      const matchesStatus =
        !this.selectedStatus ||
        account.account_status === this.selectedStatus;

      return matchesKeyword && matchesRole && matchesStatus;
    });

    this.currentPage = 1;
  }

  // DANH SÁCH HIỂN THỊ TRÊN TRANG HIỆN TẠI
  get paginatedAccounts(): Account[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;

    return this.filteredAccounts.slice(
      startIndex,
      startIndex + this.pageSize
    );
  }

  // TỔNG SỐ TRANG
  get totalPages(): number {
    return Math.ceil(this.filteredAccounts.length / this.pageSize);
  }

  // CHUYỂN TRANG
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  // XÓA BỘ LỌC
  resetFilters(): void {
    this.searchText = '';
    this.selectedRole = '';
    this.selectedStatus = '';

    this.applyFilters();
  }

  // XEM CHI TIẾT TÀI KHOẢN
  viewAccount(account: Account): void {
    this.selectedAccount = account;
  }

  closeDetails(): void {
    this.selectedAccount = null;
  }

  // KHÓA / MỞ KHÓA TÀI KHOẢN
  changeAccountStatus(account: Account): void {
    const newStatus =
      account.account_status === 'LOCKED'
        ? 'ACTIVE'
        : 'LOCKED';

    const action =
      newStatus === 'LOCKED' ? 'khóa' : 'mở khóa';

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn ${action} tài khoản "${account.full_name}" không?`
    );

    if (!confirmed) return;

    this.isUpdating = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.patch<ApiResponse>(
      `${this.apiUrl}/${account.id}/status`,
      { account_status: newStatus },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (response) => {
        account.account_status = newStatus;

        this.applyFilters();

        this.successMessage =
          response.message ||
          (newStatus === 'LOCKED'
            ? 'Khóa tài khoản thành công!'
            : 'Mở khóa tài khoản thành công!');

        this.isUpdating = false;
        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('Lỗi cập nhật trạng thái:', error);

        this.errorMessage =
          error.error?.message ||
          'Không thể cập nhật trạng thái tài khoản.';

        this.isUpdating = false;
        this.cdr.detectChanges();
      }
    });
  }

  // TÊN VAI TRÒ
  getRoleLabel(role: string): string {
    switch (role) {
      case 'PATIENT':
        return 'Bệnh nhân';

      case 'DOCTOR':
        return 'Bác sĩ';

      case 'ADMIN':
        return 'Quản trị viên';

      default:
        return role;
    }
  }

  // TÊN TRẠNG THÁI
  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Đang hoạt động';

      case 'INACTIVE':
        return 'Ngừng hoạt động';

      case 'LOCKED':
        return 'Đã khóa';

      default:
        return status || 'Không xác định';
    }
  }
  // xóa tài khoản
  deleteAccount(account: Account): void {
  // Không cho xóa tài khoản ADMIN trên giao diện
  if (account.role === 'ADMIN') {
    this.errorMessage = 'Không thể xóa tài khoản quản trị viên.';
    return;
  }

  const confirmed = window.confirm(
    `Bạn có chắc chắn muốn xóa tài khoản "${account.full_name}" không?\nThao tác này không thể hoàn tác.`
  );

  if (!confirmed) return;

  this.isUpdating = true;
  this.successMessage = '';
  this.errorMessage = '';

  this.http.delete<ApiResponse>(
    `${this.apiUrl}/${account.id}`,
    { headers: this.getHeaders() }
  ).subscribe({
    next: (response) => {
      // Xóa tài khoản khỏi danh sách đang hiển thị
      this.accounts = this.accounts.filter(item => item.id !== account.id);

      // Đóng cửa sổ chi tiết
      this.selectedAccount = null;

      // Cập nhật lại danh sách sau khi xóa
      this.applyFilters();

      this.successMessage = response.message || 'Xóa tài khoản thành công!';
      this.isUpdating = false;
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Lỗi xóa tài khoản:', error);

      this.errorMessage =
        error.error?.message || 'Không thể xóa tài khoản.';

      this.isUpdating = false;
      this.cdr.detectChanges();
    }
  });
}

  // ĐĂNG XUẤT
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

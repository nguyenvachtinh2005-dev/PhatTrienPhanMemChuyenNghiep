
import { Component, OnDestroy } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationEnd
} from '@angular/router';

import { filter, Subscription } from 'rxjs';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnDestroy {

  user: User | null = null;
  successMessage = '';

  // Trạng thái thông báo chưa đọc
  // Mặc định false vì hiện tại chưa triển khai API thông báo
  hasUnreadNotifications = false;

  // Kiểm tra đang ở trang chủ Admin hay chức năng khác
  isDashboard = true;

  private routerSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Lấy thông tin tài khoản Admin đang đăng nhập
    this.user = this.authService.getUser();

    // Lấy thông báo đăng nhập thành công
    this.successMessage = history.state?.loginSuccess || '';

    this.updateCurrentPage();

    // Theo dõi khi chuyển trang
    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.updateCurrentPage();
      });
  }

  // Kiểm tra trang hiện tại
  updateCurrentPage(): void {
    this.isDashboard =
      this.router.url === '/admin' ||
      this.router.url === '/admin/';
  }

  // Đăng xuất
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Hủy đăng ký sự kiện khi component bị hủy
  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }
}

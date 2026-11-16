
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-patient',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient.html',
  styleUrl: './patient.css'
})
export class PatientComponent {
  user: User | null = null;

  functions = [
    {
      icon: '👤',
      title: 'Thông tin cá nhân',
      description: 'Xem và cập nhật thông tin tài khoản của bạn.'
    },
    {
      icon: '🔍',
      title: 'Tìm kiếm bác sĩ',
      description: 'Tìm bác sĩ theo tên và chuyên khoa.'
    },
    {
      icon: '📝',
      title: 'Đặt lịch khám',
      description: 'Chọn bác sĩ và đặt lịch khám bệnh trực tuyến.'
    },
    {
      icon: '📅',
      title: 'Lịch khám của tôi',
      description: 'Theo dõi trạng thái các lịch hẹn đã đặt.'
    },
    {
      icon: '📁',
      title: 'Lịch sử khám bệnh',
      description: 'Xem lại thông tin và hồ sơ khám bệnh.'
    },
    {
      icon: '⭐',
      title: 'Đánh giá bác sĩ',
      description: 'Gửi nhận xét và đánh giá sau khi khám.'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user = this.authService.getUser();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

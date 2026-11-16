
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';

@Component({
  selector: 'app-doctor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doctor.html',
  styleUrl: './doctor.css'
})
export class DoctorComponent {
  user: User | null = null;

  functions = [
    {
      icon: '👨‍⚕️',
      title: 'Thông tin cá nhân',
      description: 'Xem và cập nhật thông tin hồ sơ bác sĩ.'
    },
    {
      icon: '🕒',
      title: 'Quản lý lịch làm việc',
      description: 'Tạo và quản lý thời gian khám bệnh.'
    },
    {
      icon: '📅',
      title: 'Lịch hẹn khám bệnh',
      description: 'Theo dõi và xử lý các lịch hẹn của bệnh nhân.'
    },
    {
      icon: '📁',
      title: 'Hồ sơ bệnh án',
      description: 'Quản lý thông tin và hồ sơ khám bệnh.'
    },
    {
      icon: '⭐',
      title: 'Đánh giá',
      description: 'Xem đánh giá và nhận xét từ bệnh nhân.'
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

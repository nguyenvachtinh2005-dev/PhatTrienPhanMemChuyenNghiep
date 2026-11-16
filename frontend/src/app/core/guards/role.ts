
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();
  const token = authService.getToken();

  const allowedRoles = route.data['roles'] as string[];

  // Chưa đăng nhập thì chuyển về trang đăng nhập
  if (!token || !user) {
    router.navigate(['/login']);
    return false;
  }

  // Không có quyền truy cập thì chuyển về trang theo vai trò
  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') {
      router.navigate(['/admin']);
    } else if (user.role === 'DOCTOR') {
      router.navigate(['/doctor']);
    } else {
      router.navigate(['/patient']);
    }

    return false;
  }

  return true;
};

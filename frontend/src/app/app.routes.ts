
import { Routes } from '@angular/router';

// Các component xác thực
import { LoginComponent } from './features/login.component/login.component';
import { RegisterComponent } from './features/register.component/register.component';

// Các component theo vai trò
import { Admin } from './features/admin/admin';
import { DoctorComponent } from './features/doctor/doctor';
import { PatientComponent } from './features/patient/patient';

// Guard phân quyền
import { roleGuard } from './core/guards/role';

// Chức năng Admin
import { AccountComponent } from './features/admin/accounts/accounts';

// Component lịch hẹn dùng chung cho Admin và Doctor
import { Appointments } from './share/appointments/appointments';

export const routes: Routes = [

  // Trang mặc định
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // Đăng nhập
  {
    path: 'login',
    component: LoginComponent
  },

  // Đăng ký
  {
    path: 'register',
    component: RegisterComponent
  },

  // Đăng ký bệnh nhân
  {
    path: 'register/patient',
    component: RegisterComponent,
    data: { role: 'PATIENT' }
  },

  // Đăng ký bác sĩ
  {
    path: 'register/doctor',
    component: RegisterComponent,
    data: { role: 'DOCTOR' }
  },

  // =========================
  // ADMIN
  // =========================
  {
    path: 'admin',
    component: Admin,
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },
    children: [
      {
        path: 'accounts',
        component: AccountComponent
      },
      {
        path: 'appointments',
        component: Appointments
      }
    ]
  },

  // =========================
  // DOCTOR
  // =========================
  {
    path: 'doctor',
    component: DoctorComponent,
    canActivate: [roleGuard],
    data: { roles: ['DOCTOR'] },
    children: [
      {
        path: 'appointments',
        component: Appointments
      }
    ]
  },

  // =========================
  // PATIENT
  // =========================
  {
    path: 'patient',
    component: PatientComponent,
    canActivate: [roleGuard],
    data: { roles: ['PATIENT'] }
  },

  // Không tìm thấy đường dẫn
  {
    path: '**',
    redirectTo: 'login'
  }

];

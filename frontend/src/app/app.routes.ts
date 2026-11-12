
import { Routes } from '@angular/router';

import { LoginComponent } from './features/login.component/login.component';
import { RegisterComponent } from './features/register.component/register.component';

import { Admin } from './features/admin/admin';
import { DoctorComponent } from './features/doctor/doctor';
import { PatientComponent } from './features/patient/patient';

import { roleGuard } from './core/guards/role';

import { AccountComponent } from './features/admin/accounts/accounts';

import { AppointmentsComponent } from './features/admin/appointments/appointments';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // ĐĂNG NHẬP
  {
    path: 'login',
    component: LoginComponent
  },

  // ĐĂNG KÝ
  {
    path: 'register',
    component: RegisterComponent
  },

  {
    path: 'register/patient',
    component: RegisterComponent,
    data: { role: 'PATIENT' }
  },

  {
    path: 'register/doctor',
    component: RegisterComponent,
    data: { role: 'DOCTOR' }
  },

  // ADMIN VÀ CÁC CHỨC NĂNG CON
  {
    path: 'admin',
    component: Admin,
    canActivate: [roleGuard],
    data: { roles: ['ADMIN'] },

    children: [

      // Quản lý tài khoản
      {
        path: 'accounts',
        component: AccountComponent
      },
      // quản lý lịch khám
      {
        path: 'appointments',
        component: AppointmentsComponent
      },

    ]
  },

  // BÁC SĨ
  {
    path: 'doctor',
    component: DoctorComponent,
    canActivate: [roleGuard],
    data: { roles: ['DOCTOR'] }
  },

  // BỆNH NHÂN
  {
    path: 'patient',
    component: PatientComponent,
    canActivate: [roleGuard],
    data: { roles: ['PATIENT'] }
  },

  // ĐƯỜNG DẪN KHÔNG TỒN TẠI
  {
    path: '**',
    redirectTo: 'login'
  }

];

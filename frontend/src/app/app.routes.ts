import { Routes } from '@angular/router';
import { LoginComponent } from './features/login.component/login.component';
import { WelcomeComponent } from './features/welcome.component/welcome.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'welcome', component: WelcomeComponent }
];
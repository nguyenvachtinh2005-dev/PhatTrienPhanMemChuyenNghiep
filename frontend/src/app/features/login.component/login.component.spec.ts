import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent] // Vì component là standalone nên đưa vào imports
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // 1. Kiểm thử với dữ liệu ảo KHÔNG HỢP LỆ (Bỏ trống)
  it('should validate form as invalid when fields are empty', () => {
    component.loginForm.setValue({
      emailOrPhone: '',
      password: ''
    });

    expect(component.loginForm.valid).toBeFalsy();
  });

  // 2. Kiểm thử với dữ liệu ảo HỢP LỆ
  it('should validate form as valid with correct dummy data', () => {
    // Điền dữ liệu ảo vào các trường form
    component.loginForm.setValue({
      emailOrPhone: 'thaind@example.com',
      password: 'matkhau123'
    });

    expect(component.loginForm.valid).toBeTruthy();
  });

  // 3. Kiểm thử hành vi khi nhấn đăng nhập (onSubmit) với dữ liệu ảo
  it('should set submitted to true and process login when form is submitted', () => {
    // Gán dữ liệu ảo
    component.loginForm.setValue({
      emailOrPhone: '0987654321',
      password: 'password123'
    });

    // Gọi trực tiếp hàm onSubmit
    component.onSubmit();

    // Kiểm tra cờ submitted đã được chuyển thành true
    expect(component.submitted).toBeTruthy();
  });
});